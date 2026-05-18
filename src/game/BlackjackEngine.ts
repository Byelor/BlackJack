import RedisClient from "../database/redis.js";
import roomRepo from "../express/repositories/room.redis.repository.js";
import userSessionRepo from "../express/repositories/userSession.redis.repository.js";
import userPGRepo from "../express/repositories/user.pg.repository.js";
import { hand_status } from "../express/models/hand.dto.js";
import { room_status } from "../express/models/room.dto.js";
import type { Hand } from "../express/models/hand.dto.js";
import type { PlayerState, HandState, RoomState, RoundResultEntry, RoundResult } from "../socket.io/socket.types.js";

// ─── Константы ───────────────────────────────────────────────────────────────

const RANKS = ["2","3","4","5","6","7","8","9","T","J","Q","K","A"] as const;
const SUITS = ["H","D","C","S"] as const;
const RESHUFFLE_THRESHOLD = 52; // перетасовать если осталось < 1 колоды

// ─── Утилиты карт ────────────────────────────────────────────────────────────

export function cardValue(card: string): number {
    if (!card) return 0;
    const r = card[0]!;
    if (r === "A") return 11;
    if (["T","J","Q","K"].includes(r)) return 10;
    return parseInt(r, 10);
}

export function cardRank(card: string): string { return card[0]!; }

export function countHand(cards: string[]): number {
    let total = 0, aces = 0;
    for (const c of cards) {
        if (!c || c === "??") continue;
        total += cardValue(c);
        if (c[0] === "A") aces++;
    }
    while (total > 21 && aces > 0) { total -= 10; aces--; }
    return total;
}

export function generateDeck(deckCount: number): string[] {
    const deck: string[] = [];
    for (let n = 0; n < deckCount; n++)
        for (const s of SUITS)
            for (const r of RANKS)
                deck.push(r + s);
    return deck;
}

export function shuffleDeck(deck: string[]): void {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j]!, deck[i]!];
    }
}

export function shouldReshuffle(deck: string[]): boolean {
    return deck.length < RESHUFFLE_THRESHOLD;
}

export function canSplit(hand: Hand): boolean {
    return hand.cards.length === 2 && cardRank(hand.cards[0]!) === cardRank(hand.cards[1]!);
}

export function canDouble(hand: Hand): boolean {
    return hand.cards.length === 2;
}

function isHandDone(hand: Hand): boolean {
    return hand.status !== hand_status.ACTIVE;
}

/** Натуральный блекджек: ровно 2 карты и 21 очко */
export function isNaturalBlackjack(cards: string[]): boolean {
    return cards.length === 2 && countHand(cards) === 21;
}

/** Исход одной руки и выплата (ставка уже списана при PLACE_BET) */
function resolveHand(
    hand: Hand,
    dealerCards: string[],
    dealerScore: number,
    dealerBust: boolean,
): { result: RoundResult; payout: number } {
    const playerScore = countHand(hand.cards);
    const playerBJ    = hand.status === hand_status.BLACKJACK || isNaturalBlackjack(hand.cards);
    const dealerBJ    = isNaturalBlackjack(dealerCards);

    if (hand.status === hand_status.SURRENDER) {
        return { result: "lose", payout: 0 };
    }
    if (hand.status === hand_status.BUST) {
        return { result: "lose", payout: 0 };
    }

    if (playerBJ) {
        if (dealerBJ) return { result: "push", payout: hand.bet };
        return { result: "blackjack", payout: Math.floor(hand.bet * 2.5) };
    }

    if (dealerBJ) {
        return { result: "lose", payout: 0 };
    }

    if (dealerBust) {
        return { result: "win", payout: hand.bet * 2 };
    }
    if (playerScore > dealerScore) {
        return { result: "win", payout: hand.bet * 2 };
    }
    if (playerScore < dealerScore) {
        return { result: "lose", payout: 0 };
    }
    return { result: "push", payout: hand.bet };
}

/** Сводный исход игрока (несколько рук при сплите) */
function summarizePlayerResult(
    handResults: RoundResult[],
    totalPayout: number,
    totalWagered: number,
): RoundResult {
    if (handResults.includes("blackjack")) return "blackjack";
    const netProfit = totalPayout - totalWagered;
    if (netProfit > 0) return "win";
    if (totalPayout > 0 && netProfit === 0) return "push";
    if (handResults.every(r => r === "push")) return "push";
    if (handResults.some(r => r === "win")) return "win";
    return "lose";
}

function toHandState(hand: Hand): HandState {
    return {
        bet:    hand.bet,
        cards:  hand.cards,
        status: hand.status as string as HandState["status"],
        score:  countHand(hand.cards),
    };
}

// ─── Blackjack Engine ────────────────────────────────────────────────────────

class BlackjackEngine {

    // ── Вспомогательные ──────────────────────────────────────────────────────

    /** Пополнить колоду, если она опустела до конца раунда */
    private refillDeck = async (roomId: string, deck: string[]): Promise<void> => {
        if (deck.length > 0) return;
        const deckCount = await roomRepo.getDeckCount(roomId);
        deck.push(...generateDeck(deckCount));
        shuffleDeck(deck);
        await roomRepo.setRoomGameFields(roomId, { reshuffle_pending: "false" });
    };

    /** Вытащить карту из колоды; если порог — выставить флаг reshuffle_pending */
    private popCard = async (roomId: string, deck: string[]): Promise<string> => {
        await this.refillDeck(roomId, deck);
        const card = deck.pop()!;
        if (shouldReshuffle(deck)) {
            await roomRepo.setRoomGameFields(roomId, { reshuffle_pending: "true" });
        }
        return card;
    };

    /** Построить RoomState из Redis для отправки клиенту */
    buildRoomState = async (roomId: string, revealDealer = false): Promise<RoomState> => {
        const game = await roomRepo.getRoomGame(roomId);
        if (!game) throw new Error("Room game not found");

        const allStates = await roomRepo.getAllPlayersStates(roomId);
        const userIds   = await roomRepo.getAllUsersFromRoom(roomId);

        // Имена и балансы из сессий Redis
        const players: PlayerState[] = [];
        for (const uid of userIds) {
            const userId  = Number(uid);
            const session = await userSessionRepo.getSessionByUserId(userId);
            const ps      = allStates.get(userId);
            if (!ps) continue;
            players.push({
                userId,
                name:             session ? (await userSessionRepo.getUserSessionByToken(session))?.name ?? uid : uid,
                balance:          session ? (await userSessionRepo.getUserSessionByToken(session))?.balance ?? 0 : 0,
                currentHandIndex: ps.currentHandIndex,
                hands:            ps.hands.map(toHandState),
            });
        }

        const dealerCards = game.dealer;
        const dealerScore = countHand(dealerCards);

        return {
            roomId,
            status:          game.status as RoomState["status"],
            currentPlayerId: game.currentPlayer,
            dealer: {
                // Во время игры скрываем вторую карту дилера
                cards: revealDealer || game.status === room_status.BETTING
                    ? dealerCards
                    : dealerCards.map((c, i) => i === 1 ? "??" : c),
                score: revealDealer ? dealerScore : (dealerCards[0] ? cardValue(dealerCards[0]) : 0),
            },
            players,
            deckRemaining: game.deck.length,
        };
    };

    // ── Управление ставками ──────────────────────────────────────────────────

    /**
     * Игрок делает ставку. Возвращает { newBalance, allBetsPlaced }.
     * Ставка списывается сразу из сессии Redis (и PG после раунда).
     */
    placeBet = async (roomId: string, userId: number, amount: number): Promise<{ newBalance: number; allBetsPlaced: boolean } | null> => {
        if (amount <= 0) return null;

        const game = await roomRepo.getRoomGame(roomId);
        if (!game || game.status !== room_status.BETTING) return null;

        const sessionToken = await userSessionRepo.getSessionByUserId(userId);
        if (!sessionToken) return null;
        const session = await userSessionRepo.getUserSessionByToken(sessionToken);
        if (!session || session.balance < amount) return null;

        // Сохраняем ставку в руке игрока
        const ps = await roomRepo.getPlayerState(roomId, userId) ?? { hands: [], currentHandIndex: 0 };
        ps.hands = [{ bet: amount, cards: [], status: hand_status.ACTIVE }];
        await roomRepo.setPlayerState(roomId, userId, ps.hands, 0);

        // Списываем баланс из сессии
        const newBalance = session.balance - amount;
        await userSessionRepo.setSession({ ...session, balance: newBalance }, sessionToken, 60 * 60 * 24);

        // Проверяем, все ли поставили
        const allStates = await roomRepo.getAllPlayersStates(roomId);
        const allBetsPlaced = [...allStates.values()].every(s => s.hands.length > 0 && s.hands[0]!.bet > 0);

        return { newBalance, allBetsPlaced };
    };

    // ── Начало игры ──────────────────────────────────────────────────────────

    /**
     * Запускает раунд: генерирует/обновляет колоду, раздаёт карты, проверяет блекджек.
     * Возвращает начальный RoomState.
     */
    startGame = async (roomId: string): Promise<RoomState> => {
        const game     = await roomRepo.getRoomGame(roomId);
        if (!game) throw new Error("Room not found");

        let deck = game.deck;

        // Первый старт или флаг — генерируем шу
        if (deck.length === 0 || game.reshufflePending) {
            const deckCount = await roomRepo.getDeckCount(roomId);
            deck = generateDeck(deckCount);
            shuffleDeck(deck);
        }

        const userIds     = (await roomRepo.getAllUsersFromRoom(roomId)).map(Number);
        const playerOrder = [...userIds];              // порядок ходов фиксируем
        const dealer:string[] = [];

        // Раздаём 2 карты каждому и 2 дилеру
        const playerHands = new Map<number, Hand[]>();
        for (const uid of playerOrder) {
            const ps = await roomRepo.getPlayerState(roomId, uid);
            const bet = ps?.hands[0]?.bet ?? 0;
            playerHands.set(uid, [{ bet, cards: [], status: hand_status.ACTIVE }]);
        }

        for (let round = 0; round < 2; round++) {
            for (const uid of playerOrder) {
                const card = await this.popCard(roomId, deck);
                playerHands.get(uid)![0]!.cards.push(card);
            }
            dealer.push(await this.popCard(roomId, deck));
        }

        const dealerHasBlackjack = isNaturalBlackjack(dealer);

        // Сохраняем карты игроков и проверяем натуральный блекджек
        for (const uid of playerOrder) {
            const hand = playerHands.get(uid)![0]!;
            if (isNaturalBlackjack(hand.cards)) {
                hand.status = hand_status.BLACKJACK;
            } else if (dealerHasBlackjack) {
                // У дилера блекджек — остальные не ходят
                hand.status = hand_status.STOOD;
            }
            await roomRepo.setPlayerState(roomId, uid, [hand], 0);
        }

        // Определяем первого активного игрока
        const firstActive = dealerHasBlackjack
            ? null
            : playerOrder.find(uid => playerHands.get(uid)![0]!.status === hand_status.ACTIVE) ?? null;

        await roomRepo.setRoomGameFields(roomId, {
            deck:              JSON.stringify(deck),
            dealer:            JSON.stringify(dealer),
            status:            room_status.PLAYING,
            current_player:    firstActive !== null ? String(firstActive) : "",
            player_order:      JSON.stringify(playerOrder),
            reshuffle_pending: "false",
        });

        return this.buildRoomState(roomId, false);
    };

    // ── Действия игрока ──────────────────────────────────────────────────────

    /** HIT — взять карту */
    playerHit = async (roomId: string, userId: number): Promise<{ hands: HandState[]; currentHandIndex: number } | null> => {
        const game = await roomRepo.getRoomGame(roomId);
        if (!game || game.status !== room_status.PLAYING || game.currentPlayer !== userId) return null;

        const ps = await roomRepo.getPlayerState(roomId, userId);
        if (!ps) return null;
        const hand = ps.hands[ps.currentHandIndex];
        if (!hand || isHandDone(hand)) return null;

        const deck = game.deck;
        const card = await this.popCard(roomId, deck);
        hand.cards.push(card);

        await roomRepo.setRoomGameFields(roomId, { deck: JSON.stringify(deck) });

        // Перебор?
        if (countHand(hand.cards) > 21) hand.status = hand_status.BUST;

        await roomRepo.setPlayerState(roomId, userId, ps.hands, ps.currentHandIndex);
        return { hands: ps.hands.map(toHandState), currentHandIndex: ps.currentHandIndex };
    };

    /** STAND — остановиться */
    playerStand = async (roomId: string, userId: number): Promise<{ hands: HandState[]; currentHandIndex: number } | null> => {
        const game = await roomRepo.getRoomGame(roomId);
        if (!game || game.status !== room_status.PLAYING || game.currentPlayer !== userId) return null;

        const ps = await roomRepo.getPlayerState(roomId, userId);
        if (!ps) return null;
        const hand = ps.hands[ps.currentHandIndex];
        if (!hand || isHandDone(hand)) return null;

        hand.status = hand_status.STOOD;
        await roomRepo.setPlayerState(roomId, userId, ps.hands, ps.currentHandIndex);
        return { hands: ps.hands.map(toHandState), currentHandIndex: ps.currentHandIndex };
    };

    /** DOUBLE — удвоить ставку, получить одну карту, стенд */
    playerDouble = async (roomId: string, userId: number): Promise<{ hands: HandState[]; currentHandIndex: number; balanceDeducted: number } | null> => {
        const game = await roomRepo.getRoomGame(roomId);
        if (!game || game.status !== room_status.PLAYING || game.currentPlayer !== userId) return null;

        const ps = await roomRepo.getPlayerState(roomId, userId);
        if (!ps) return null;
        const hand = ps.hands[ps.currentHandIndex];
        if (!hand || !canDouble(hand)) return null;

        // Проверить баланс
        const sessionToken = await userSessionRepo.getSessionByUserId(userId);
        if (!sessionToken) return null;
        const session = await userSessionRepo.getUserSessionByToken(sessionToken);
        if (!session || session.balance < hand.bet) return null;

        // Списать дополнительную ставку
        const newBalance = session.balance - hand.bet;
        await userSessionRepo.setSession({ ...session, balance: newBalance }, sessionToken, 60 * 60 * 24);
        hand.bet *= 2;

        // Дать одну карту
        const deck = game.deck;
        const card = await this.popCard(roomId, deck);
        hand.cards.push(card);
        await roomRepo.setRoomGameFields(roomId, { deck: JSON.stringify(deck) });

        // Стенд (даже при перебое)
        hand.status = countHand(hand.cards) > 21 ? hand_status.BUST : hand_status.DOUBLE;
        await roomRepo.setPlayerState(roomId, userId, ps.hands, ps.currentHandIndex);

        return { hands: ps.hands.map(toHandState), currentHandIndex: ps.currentHandIndex, balanceDeducted: hand.bet / 2 };
    };

    /** SPLIT — разделить одинаковые карты на 2 руки */
    playerSplit = async (roomId: string, userId: number): Promise<{ hands: HandState[]; currentHandIndex: number; balanceDeducted: number } | null> => {
        const game = await roomRepo.getRoomGame(roomId);
        if (!game || game.status !== room_status.PLAYING || game.currentPlayer !== userId) return null;

        const ps = await roomRepo.getPlayerState(roomId, userId);
        if (!ps) return null;
        const hand = ps.hands[ps.currentHandIndex];
        if (!hand || !canSplit(hand)) return null;

        const sessionToken = await userSessionRepo.getSessionByUserId(userId);
        if (!sessionToken) return null;
        const session = await userSessionRepo.getUserSessionByToken(sessionToken);
        if (!session || session.balance < hand.bet) return null;

        // Списать ставку за вторую руку
        const newBalance = session.balance - hand.bet;
        await userSessionRepo.setSession({ ...session, balance: newBalance }, sessionToken, 60 * 60 * 24);

        // Создаём две руки из одной
        const deck  = game.deck;
        const hand1: Hand = { bet: hand.bet, cards: [hand.cards[0]!, await this.popCard(roomId, deck)], status: hand_status.ACTIVE };
        const hand2: Hand = { bet: hand.bet, cards: [hand.cards[1]!, await this.popCard(roomId, deck)], status: hand_status.ACTIVE };
        await roomRepo.setRoomGameFields(roomId, { deck: JSON.stringify(deck) });

        // Заменяем текущую руку двумя
        ps.hands.splice(ps.currentHandIndex, 1, hand1, hand2);
        await roomRepo.setPlayerState(roomId, userId, ps.hands, ps.currentHandIndex);

        return { hands: ps.hands.map(toHandState), currentHandIndex: ps.currentHandIndex, balanceDeducted: hand.bet };
    };

    /** SURRENDER — сдаться, вернуть 50% ставки */
    playerSurrender = async (roomId: string, userId: number): Promise<{ hands: HandState[]; currentHandIndex: number; returned: number } | null> => {
        const game = await roomRepo.getRoomGame(roomId);
        if (!game || game.status !== room_status.PLAYING || game.currentPlayer !== userId) return null;

        const ps = await roomRepo.getPlayerState(roomId, userId);
        if (!ps) return null;
        const hand = ps.hands[ps.currentHandIndex];
        if (!hand || hand.cards.length !== 2 || isHandDone(hand)) return null;

        hand.status = hand_status.SURRENDER;
        const returned = Math.floor(hand.bet / 2);

        // Вернуть половину ставки
        const sessionToken = await userSessionRepo.getSessionByUserId(userId);
        if (sessionToken) {
            const session = await userSessionRepo.getUserSessionByToken(sessionToken);
            if (session) {
                await userSessionRepo.setSession({ ...session, balance: session.balance + returned }, sessionToken, 60 * 60 * 24);
            }
        }

        await roomRepo.setPlayerState(roomId, userId, ps.hands, ps.currentHandIndex);
        return { hands: ps.hands.map(toHandState), currentHandIndex: ps.currentHandIndex, returned };
    };

    // ── Управление ходами ────────────────────────────────────────────────────

    /**
     * Перейти к следующему ходу.
     * Возвращает: { nextUserId } | { dealerPlaying: true } | { roundOver: true, result }
     */
    nextTurn = async (roomId: string, currentUserId: number): Promise<
        | { nextUserId: number }
        | { dealerPlaying: true }
        | { roundOver: true; result: Awaited<ReturnType<BlackjackEngine["settleRound"]>> }
    > => {
        const game = await roomRepo.getRoomGame(roomId);
        if (!game) throw new Error("Game not found");

        const ps = await roomRepo.getPlayerState(roomId, currentUserId);
        if (ps) {
            // Если есть ещё незавершённые руки (сплит)
            const nextHandIdx = ps.hands.findIndex((h, i) => i > ps.currentHandIndex && !isHandDone(h));
            if (nextHandIdx !== -1) {
                await roomRepo.setPlayerState(roomId, currentUserId, ps.hands, nextHandIdx);
                await roomRepo.setRoomGameFields(roomId, { current_player: String(currentUserId) });
                return { nextUserId: currentUserId };
            }
        }

        // Ищем следующего активного игрока
        const order   = game.playerOrder;
        const currIdx = order.indexOf(currentUserId);
        for (let i = currIdx + 1; i < order.length; i++) {
            const nextId = order[i]!;
            const nextPs = await roomRepo.getPlayerState(roomId, nextId);
            if (nextPs && nextPs.hands.some(h => !isHandDone(h))) {
                await roomRepo.setRoomGameFields(roomId, { current_player: String(nextId) });
                return { nextUserId: nextId };
            }
        }

        // Все игроки завершили — ход дилера
        return { dealerPlaying: true };
    };

    /** Все ли игроки закончили ход (нет ACTIVE рук) */
    isPlayerPhaseComplete = async (roomId: string): Promise<{ fromUserId: number } | null> => {
        const game = await roomRepo.getRoomGame(roomId);
        if (!game || game.status !== room_status.PLAYING) return null;

        for (const uid of game.playerOrder) {
            const ps = await roomRepo.getPlayerState(roomId, uid);
            if (ps?.hands.some(h => h.status === hand_status.ACTIVE)) return null;
        }

        if (game.playerOrder.length === 0) return null;

        const fromUserId = game.currentPlayer ?? game.playerOrder[game.playerOrder.length - 1]!;
        return { fromUserId };
    };

    /** Дилер тянет карты пока счёт < 17 */
    playDealer = async (roomId: string): Promise<{ cards: string[]; score: number }> => {
        const game = await roomRepo.getRoomGame(roomId);
        if (!game) throw new Error("Game not found");

        const deck   = game.deck;
        const dealer = game.dealer.filter((c): c is string => !!c && c !== "??");

        while (countHand(dealer) < 17) {
            dealer.push(await this.popCard(roomId, deck));
        }

        await roomRepo.setRoomGameFields(roomId, {
            deck:   JSON.stringify(deck),
            dealer: JSON.stringify(dealer),
        });

        return { cards: dealer, score: countHand(dealer) };
    };

    // ── Итоги раунда ─────────────────────────────────────────────────────────

    settleRound = async (roomId: string): Promise<{ results: RoundResultEntry[]; dealerCards: string[]; dealerScore: number; reshuffled: boolean }> => {
        const game = await roomRepo.getRoomGame(roomId);
        if (!game) throw new Error("Game not found");

        const dealerCards = game.dealer;
        const dealerScore = countHand(dealerCards);
        const dealerBust  = dealerScore > 21;
        const results: RoundResultEntry[] = [];

        const allStates = await roomRepo.getAllPlayersStates(roomId);

        for (const [userId, ps] of allStates) {
            const sessionToken = await userSessionRepo.getSessionByUserId(userId);
            const session = sessionToken ? await userSessionRepo.getUserSessionByToken(sessionToken) : null;
            const name = session?.name ?? String(userId);

            let totalPayout = 0;
            let totalWagered = 0;
            const handResults: RoundResult[] = [];

            for (const hand of ps.hands) {
                totalWagered += hand.bet;
                const { result, payout } = resolveHand(hand, dealerCards, dealerScore, dealerBust);
                handResults.push(result);
                totalPayout += payout;
            }

            let newBalance = session?.balance ?? 0;
            if (totalPayout > 0 && session && sessionToken) {
                newBalance = session.balance + totalPayout;
                await userSessionRepo.setSession({ ...session, balance: newBalance }, sessionToken, 60 * 60 * 24);
                try { await userPGRepo.updateBalance(userId, newBalance); } catch { /* PG опционально */ }
            }

            // При surrender половина ставки уже возвращена в playerSurrender
            let netProfit = totalPayout - totalWagered;
            for (const hand of ps.hands) {
                if (hand.status === hand_status.SURRENDER) {
                    netProfit += Math.floor(hand.bet / 2);
                }
            }

            results.push({
                userId,
                name,
                result: summarizePlayerResult(handResults, totalPayout, totalWagered),
                payout:     totalPayout,
                netProfit,
                newBalance,
                hands:      ps.hands.map(toHandState),
            });
        }

        // Проверить нужна ли перетасовка
        let reshuffled = false;
        if (game.reshufflePending) {
            const deckCount = await roomRepo.getDeckCount(roomId);
            const newDeck   = generateDeck(deckCount);
            shuffleDeck(newDeck);
            await roomRepo.setRoomGameFields(roomId, {
                deck:              JSON.stringify(newDeck),
                reshuffle_pending: "false",
            });
            reshuffled = true;
        }

        return { results, dealerCards: game.dealer, dealerScore, reshuffled };
    };

    /** Сбросить руки всех игроков, вернуть к фазе BETTING */
    resetRound = async (roomId: string) => {
        const userIds = await roomRepo.getAllUsersFromRoom(roomId);
        const multi = RedisClient.multi();

        // Очищаем руки через setPlayerState-like hSet
        // (multi не поддерживает наши async методы, делаем hSet вручную)
        const { PREFIXES } = await import("../express/repositories/room.redis.repository.js");
        for (const uid of userIds) {
            multi.hSet(PREFIXES.roomUser(roomId, Number(uid)), {
                current_hand_index: "0",
                hands: "[]",
            });
        }

        multi.hSet(PREFIXES.roomGame(roomId), {
            dealer:         "[]",
            current_player: "",
            status:         room_status.BETTING,
            player_order:   "[]",
        });

        await multi.exec();
    };

    /** Принудительно завершить руку отключившегося игрока */
    forfeitPlayer = async (roomId: string, userId: number) => {
        const ps = await roomRepo.getPlayerState(roomId, userId);
        if (!ps) return;
        for (const hand of ps.hands) {
            if (!isHandDone(hand)) hand.status = hand_status.STOOD;
        }
        await roomRepo.setPlayerState(roomId, userId, ps.hands, ps.currentHandIndex);
    };
}

export default new BlackjackEngine();
