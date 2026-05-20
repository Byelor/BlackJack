import type { Server, Socket } from "socket.io";
import { socketio } from "../server/server.js";
import { authenticateSocket, guardSession } from "./socket.middleware.js";
import engine from "../game/BlackjackEngine.js";
import roomService from "../express/services/room.service.js";
import userSessionRepo from "../express/repositories/userSession.redis.repository.js";
import roomRepo from "../express/repositories/room.redis.repository.js";
import { room_status } from "../express/models/room.dto.js";
import type {
    ClientToServerEvents,
    ServerToClientEvents,
    SocketData,
} from "./socket.types.js";

const io = socketio as unknown as Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>;

const disconnectTimers = new Map<number, NodeJS.Timeout>();

io.use(authenticateSocket as any);

async function getPlayerBalance(userId: number): Promise<number> {
    const sessionToken = await userSessionRepo.getSessionByUserId(userId);
    if (!sessionToken) return 0;
    const session = await userSessionRepo.getUserSessionByToken(sessionToken);
    return session?.balance ?? 0;
}

async function handleNextTurn(roomId: string, userId: number) {
    const turn = await engine.nextTurn(roomId, userId);

    if ("nextUserId" in turn) {
        io.to(roomId).emit("TURN_CHANGED", { userId: turn.nextUserId, currentHandIndex: turn.currentHandIndex });
        return;
    }

    if ("dealerPlaying" in turn) {
        const dealerResult = await engine.playDealer(roomId);
        io.to(roomId).emit("DEALER_PLAY", dealerResult);

        const settle = await engine.settleRound(roomId);

        io.to(roomId).emit("ROUND_RESULT", {
            results:     settle.results,
            dealer:      { cards: settle.dealerCards, score: settle.dealerScore },
        });

        for (const r of settle.results) {
            io.to(roomId).emit("PLAYER_BALANCE", { userId: r.userId, balance: r.newBalance });
        }

        if (settle.reshuffled) {
            const game = await import("../express/repositories/room.redis.repository.js");
            const g    = await (await import("../express/repositories/room.redis.repository.js")).default.getRoomGame(roomId);
            io.to(roomId).emit("DECK_SHUFFLED", { remainingCards: g?.deck.length ?? 0 });
        }

        await engine.resetRound(roomId);

        setTimeout(async () => {
            io.to(roomId).emit("BETTING_PHASE", {});
            const state = await engine.buildRoomState(roomId);
            io.to(roomId).emit("ROOM_STATE", state);
        }, 3000);
    }
}

io.on("connection", async (socket: Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>) => {
    const { userSession } = socket.data;
    if (!userSession) return;

    socket.use(async ([event, ...args], next) => {
        await guardSession(socket as any, next);
    });

    console.log(`[socket] connected: userId=${userSession.userId}, socketId=${socket.id}`);

    socket.on("ROOM_JOIN", async ({ roomId }) => {
        const { userSession } = socket.data;
        if (!userSession) return;

        if (disconnectTimers.has(userSession.userId)) {
            clearTimeout(disconnectTimers.get(userSession.userId));
            disconnectTimers.delete(userSession.userId);
        }

        const users = await roomService.getAllUsersFromRoom(roomId);
        if (!users.includes(String(userSession.userId))) {
            socket.emit("ERROR", { code: "NOT_IN_ROOM", message: "Вы не в этой комнате" });
            return;
        }

        if (socket.data.currentRoomId && socket.data.currentRoomId !== roomId) {
            socket.leave(socket.data.currentRoomId);
        }

        await socket.join(roomId);
        socket.data.currentRoomId = roomId;

        const state = await engine.buildRoomState(roomId);
        socket.emit("ROOM_STATE", state);

        socket.to(roomId).emit("PLAYER_JOINED", {
            userId: userSession.userId,
            name:   userSession.name,
        });
    });

    socket.on("ROOM_LEAVE", async () => {
        await handleLeave(socket);
    });

    socket.on("disconnect", async () => {
        await handleLeave(socket, true);
        
        const { userSession, currentRoomId } = socket.data;
        if (!userSession) return;

        const timer = setTimeout(async () => {
            try {
                if (currentRoomId) {
                    await engine.forfeitPlayer(currentRoomId, userSession.userId);
                    const game = await (await import("../express/repositories/room.redis.repository.js")).default.getRoomGame(currentRoomId);
                    if (game?.currentPlayer === userSession.userId) {
                        await handleNextTurn(currentRoomId, userSession.userId);
                    }
                    io.to(currentRoomId).emit("PLAYER_LEFT", { userId: userSession.userId });
                }

                await roomService.removeUserFromCurrentRoom(userSession.userId);
                
                if (currentRoomId) {
                    const state = await engine.buildRoomState(currentRoomId);
                    io.to(currentRoomId).emit("ROOM_STATE", state);
                }
            } catch (err) {
                console.error("[disconnect timeout error]", err);
            }
            disconnectTimers.delete(userSession.userId);
        }, 15000);
        
        disconnectTimers.set(userSession.userId, timer);
    });

    socket.on("GET_ROOM_STATE", async (payload, ack) => {
        const { userSession } = socket.data;
        if (!userSession) {
            ack?.({ ok: false, message: "Не авторизован" });
            return;
        }

        const roomId = payload?.roomId ?? socket.data.currentRoomId;
        if (!roomId) {
            ack?.({ ok: false, message: "Комната не указана" });
            return;
        }

        try {
            const game = await roomRepo.getRoomGame(roomId);
            if (!game) {
                ack?.({ ok: false, message: "Игра не найдена" });
                return;
            }
            const revealDealer = game.status !== room_status.PLAYING;
            const state = await engine.buildRoomState(roomId, revealDealer);
            socket.emit("ROOM_STATE", state);
            ack?.({ ok: true });
        } catch (err) {
            console.error("[GET_ROOM_STATE]", err);
            socket.emit("ERROR", { code: "STATE_FAILED", message: "Не удалось обновить состояние" });
            ack?.({ ok: false, message: "Не удалось обновить состояние" });
        }
    });

    socket.on("PLACE_BET", async ({ roomId, amount }) => {
        const { userSession } = socket.data;
        if (!userSession) return;

        const result = await engine.placeBet(roomId, userSession.userId, amount);
        if (!result) {
            socket.emit("ERROR", { code: "BET_FAILED", message: "Невозможно сделать ставку" });
            return;
        }

        socket.emit("BET_CONFIRMED", { balance: result.newBalance });
        socket.to(roomId).emit("PLAYER_BALANCE", {
            userId: userSession.userId,
            balance: result.newBalance,
        });

        if (result.allBetsPlaced) {
            const gameState = await engine.startGame(roomId);
            io.to(roomId).emit("GAME_STARTED", gameState);

            const firstPlayer = gameState.currentPlayerId;
            if (firstPlayer !== null) {
                const fp = gameState.players.find(p => p.userId === firstPlayer);
                if (fp?.hands.every(h => h.status !== "ACTIVE")) {
                    await handleNextTurn(roomId, firstPlayer);
                }
            } else {
                const advance = await engine.isPlayerPhaseComplete(roomId);
                if (advance) {
                    await handleNextTurn(roomId, advance.fromUserId);
                }
            }
        }
    });

    socket.on("HIT", async ({ roomId }) => {
        const { userSession } = socket.data;
        if (!userSession) return;

        const result = await engine.playerHit(roomId, userSession.userId);
        if (!result) {
            socket.emit("ERROR", { code: "ACTION_FAILED", message: "Нельзя взять карту" });
            return;
        }

        io.to(roomId).emit("PLAYER_ACTION", {
            userId:           userSession.userId,
            action:           "HIT",
            hands:            result.hands,
            currentHandIndex: result.currentHandIndex,
        });

        const currentHand = result.hands[result.currentHandIndex];
        if (currentHand?.status === "BUST") {
            await handleNextTurn(roomId, userSession.userId);
        }
    });

    socket.on("STAND", async ({ roomId }) => {
        const { userSession } = socket.data;
        if (!userSession) return;

        const result = await engine.playerStand(roomId, userSession.userId);
        if (!result) {
            socket.emit("ERROR", { code: "ACTION_FAILED", message: "Нельзя остановиться" });
            return;
        }

        io.to(roomId).emit("PLAYER_ACTION", {
            userId:           userSession.userId,
            action:           "STAND",
            hands:            result.hands,
            currentHandIndex: result.currentHandIndex,
        });

        await handleNextTurn(roomId, userSession.userId);
    });

    socket.on("DOUBLE", async ({ roomId }) => {
        const { userSession } = socket.data;
        if (!userSession) return;

        const result = await engine.playerDouble(roomId, userSession.userId);
        if (!result) {
            socket.emit("ERROR", { code: "ACTION_FAILED", message: "Нельзя удвоить" });
            return;
        }

        io.to(roomId).emit("PLAYER_ACTION", {
            userId:           userSession.userId,
            action:           "DOUBLE",
            hands:            result.hands,
            currentHandIndex: result.currentHandIndex,
            balance:          await getPlayerBalance(userSession.userId),
        });

        await handleNextTurn(roomId, userSession.userId);
    });

    socket.on("SPLIT", async ({ roomId }) => {
        const { userSession } = socket.data;
        if (!userSession) return;

        const result = await engine.playerSplit(roomId, userSession.userId);
        if (!result) {
            socket.emit("ERROR", { code: "ACTION_FAILED", message: "Нельзя сделать сплит" });
            return;
        }

        io.to(roomId).emit("PLAYER_ACTION", {
            userId:           userSession.userId,
            action:           "SPLIT",
            hands:            result.hands,
            currentHandIndex: result.currentHandIndex,
            balance:          await getPlayerBalance(userSession.userId),
        });

        io.to(roomId).emit("TURN_CHANGED", { userId: userSession.userId, currentHandIndex: result.currentHandIndex });
    });

    socket.on("SURRENDER", async ({ roomId }) => {
        const { userSession } = socket.data;
        if (!userSession) return;

        const result = await engine.playerSurrender(roomId, userSession.userId);
        if (!result) {
            socket.emit("ERROR", { code: "ACTION_FAILED", message: "Нельзя сдаться" });
            return;
        }

        io.to(roomId).emit("PLAYER_ACTION", {
            userId:           userSession.userId,
            action:           "SURRENDER",
            hands:            result.hands,
            currentHandIndex: result.currentHandIndex,
            balance:          await getPlayerBalance(userSession.userId),
        });

        await handleNextTurn(roomId, userSession.userId);
    });

    socket.on("CHAT_MESSAGE", ({ roomId, text }) => {
        const { userSession } = socket.data;
        if (!userSession || !text.trim()) return;
        io.to(roomId).emit("CHAT_MESSAGE", {
            userId: userSession.userId,
            name:   userSession.name,
            text:   text.slice(0, 300),
        });
    });
});

async function handleLeave(
    socket: Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>,
    isDisconnect = false
) {
    const { userSession, currentRoomId } = socket.data;
    if (!userSession || !currentRoomId) return;

    if (!isDisconnect) {
        try {
            await engine.forfeitPlayer(currentRoomId, userSession.userId);
            const game = await (await import("../express/repositories/room.redis.repository.js")).default.getRoomGame(currentRoomId);
            if (game?.currentPlayer === userSession.userId) {
                await handleNextTurn(currentRoomId, userSession.userId);
            }
        } catch {  }

        socket.to(currentRoomId).emit("PLAYER_LEFT", { userId: userSession.userId });
        socket.leave(currentRoomId);
        socket.data.currentRoomId = null;
    }
}

export { io };