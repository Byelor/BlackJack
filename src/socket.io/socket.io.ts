import type { Server, Socket } from "socket.io";
import { socketio } from "../server/server.js";
import { authenticateSocket, guardSession } from "./socket.middleware.js";
import engine from "../game/BlackjackEngine.js";
import roomService from "../express/services/room.service.js";
import type {
    ClientToServerEvents,
    ServerToClientEvents,
    SocketData,
} from "./socket.types.js";

// Типизируем сервер
const io = socketio as unknown as Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>;

// ─── Middleware аутентификации (для всех подключений) ─────────────────────────
io.use(authenticateSocket as any);

// ─── Вспомогательная функция: обработать след. ход ───────────────────────────
async function handleNextTurn(roomId: string, userId: number) {
    const turn = await engine.nextTurn(roomId, userId);

    if ("nextUserId" in turn) {
        io.to(roomId).emit("TURN_CHANGED", { userId: turn.nextUserId });
        return;
    }

    if ("dealerPlaying" in turn) {
        // Дилер тянет карты
        const dealerResult = await engine.playDealer(roomId);
        io.to(roomId).emit("DEALER_PLAY", dealerResult);

        // Итоги раунда
        const settle = await engine.settleRound(roomId);

        io.to(roomId).emit("ROUND_RESULT", {
            results:     settle.results,
            dealer:      { cards: settle.dealerCards, score: settle.dealerScore },
        });

        if (settle.reshuffled) {
            const game = await import("../express/repositories/room.redis.repository.js");
            const g    = await (await import("../express/repositories/room.redis.repository.js")).default.getRoomGame(roomId);
            io.to(roomId).emit("DECK_SHUFFLED", { remainingCards: g?.deck.length ?? 0 });
        }

        // Сброс раунда
        await engine.resetRound(roomId);

        // Небольшая задержка перед следующей фазой ставок
        setTimeout(() => {
            io.to(roomId).emit("BETTING_PHASE", {});
        }, 3000);
    }
}

// ─── Основной обработчик подключений ─────────────────────────────────────────
io.on("connection", async (socket: Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>) => {
    const { userSession } = socket.data;
    if (!userSession) return;

    // Проверка сессии перед каждым ивентом
    socket.use(async ([event, ...args], next) => {
        await guardSession(socket as any, next);
    });

    console.log(`[socket] connected: userId=${userSession.userId}, socketId=${socket.id}`);

    // ── ROOM_JOIN ─────────────────────────────────────────────────────────────
    socket.on("ROOM_JOIN", async ({ roomId }) => {
        const { userSession } = socket.data;
        if (!userSession) return;

        // Проверить, что игрок числится в этой комнате в Redis
        const users = await roomService.getAllUsersFromRoom(roomId);
        if (!users.includes(String(userSession.userId))) {
            socket.emit("ERROR", { code: "NOT_IN_ROOM", message: "Вы не в этой комнате" });
            return;
        }

        // Выйти из предыдущей socket-комнаты
        if (socket.data.currentRoomId && socket.data.currentRoomId !== roomId) {
            socket.leave(socket.data.currentRoomId);
        }

        await socket.join(roomId);
        socket.data.currentRoomId = roomId;

        // Отправить текущее состояние только этому игроку
        const state = await engine.buildRoomState(roomId);
        socket.emit("ROOM_STATE", state);

        // Уведомить остальных
        socket.to(roomId).emit("PLAYER_JOINED", {
            userId: userSession.userId,
            name:   userSession.name,
        });
    });

    // ── ROOM_LEAVE ────────────────────────────────────────────────────────────
    socket.on("ROOM_LEAVE", async () => {
        await handleLeave(socket);
    });

    // ── disconnect ────────────────────────────────────────────────────────────
    socket.on("disconnect", async () => {
        await handleLeave(socket, true);
    });

    // ── GET_ROOM_STATE ────────────────────────────────────────────────────────
    socket.on("GET_ROOM_STATE", async ({ roomId }) => {
        const { userSession } = socket.data;
        if (!userSession) return;
        const state = await engine.buildRoomState(roomId);
        socket.emit("ROOM_STATE", state);
    });

    // ── PLACE_BET ─────────────────────────────────────────────────────────────
    socket.on("PLACE_BET", async ({ roomId, amount }) => {
        const { userSession } = socket.data;
        if (!userSession) return;

        const result = await engine.placeBet(roomId, userSession.userId, amount);
        if (!result) {
            socket.emit("ERROR", { code: "BET_FAILED", message: "Невозможно сделать ставку" });
            return;
        }

        socket.emit("BET_CONFIRMED", { balance: result.newBalance });

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

    // ── HIT ───────────────────────────────────────────────────────────────────
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

        // Если перебор — автоматически следующий ход
        const currentHand = result.hands[result.currentHandIndex];
        if (currentHand?.status === "BUST") {
            await handleNextTurn(roomId, userSession.userId);
        }
    });

    // ── STAND ─────────────────────────────────────────────────────────────────
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

    // ── DOUBLE ────────────────────────────────────────────────────────────────
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
        });

        await handleNextTurn(roomId, userSession.userId);
    });

    // ── SPLIT ─────────────────────────────────────────────────────────────────
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
        });

        // После сплита продолжаем с той же руки — не переходим к nextTurn
        io.to(roomId).emit("TURN_CHANGED", { userId: userSession.userId });
    });

    // ── SURRENDER ─────────────────────────────────────────────────────────────
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
        });

        await handleNextTurn(roomId, userSession.userId);
    });

    // ── CHAT_MESSAGE ──────────────────────────────────────────────────────────
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

// ─── Выход из комнаты ─────────────────────────────────────────────────────────
async function handleLeave(
    socket: Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>,
    isDisconnect = false
) {
    const { userSession, currentRoomId } = socket.data;
    if (!userSession || !currentRoomId) return;

    // Если шла игра — пометить руку как стенд и продвинуть ход
    try {
        await engine.forfeitPlayer(currentRoomId, userSession.userId);
        const game = await (await import("../express/repositories/room.redis.repository.js")).default.getRoomGame(currentRoomId);
        if (game?.currentPlayer === userSession.userId) {
            await handleNextTurn(currentRoomId, userSession.userId);
        }
    } catch { /* комната могла уже быть удалена */ }

    socket.to(currentRoomId).emit("PLAYER_LEFT", { userId: userSession.userId });

    if (!isDisconnect) {
        socket.leave(currentRoomId);
        socket.data.currentRoomId = null;
    }
}

export { io };