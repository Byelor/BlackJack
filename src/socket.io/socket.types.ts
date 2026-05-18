import type UserSession from "../express/models/userSession.dto.js";

// ─── Статусы ────────────────────────────────────────────────────────────────

export type HandStatus = "ACTIVE" | "STOOD" | "DOUBLE-HIT" | "SURRENDER" | "BUST" | "BLACKJACK";
export type RoomStatus = "PLAYING" | "BETTING";
export type RoundResult = "blackjack" | "win" | "lose" | "push";

// ─── Игровые объекты ─────────────────────────────────────────────────────────

export interface HandState {
    bet: number;
    cards: string[];        // компактный формат: "AH", "TS", "KD"
    status: HandStatus;
    score: number;
}

export interface PlayerState {
    userId: number;
    name: string;
    balance: number;
    currentHandIndex: number;
    hands: HandState[];
}

export interface RoomState {
    roomId: string;
    status: RoomStatus;
    currentPlayerId: number | null;
    dealer: {
        cards: string[];    // во время игры вторая карта = "??" (скрыта)
        score: number;      // 0 пока скрыта
    };
    players: PlayerState[];
    deckRemaining: number;
}

export interface PlayerActionEvent {
    userId: number;
    action: "HIT" | "STAND" | "DOUBLE" | "SPLIT" | "SURRENDER";
    hands: HandState[];
    currentHandIndex: number;
}

export interface RoundResultEntry {
    userId: number;
    name: string;
    result: RoundResult;
    payout: number;      // всего возвращено на счёт (включая ставку)
    netProfit: number;   // чистая прибыль/убыток за раунд
    newBalance: number;
    hands: HandState[];
}

export interface RoundResultEvent {
    results: RoundResultEntry[];
    dealer: {
        cards: string[];
        score: number;
    };
}

// ─── Socket.IO типизированные интерфейсы ─────────────────────────────────────

export interface ClientToServerEvents {
    ROOM_JOIN:      (data: { roomId: string }) => void;
    ROOM_LEAVE:     () => void;
    PLACE_BET:      (data: { roomId: string; amount: number }) => void;
    HIT:            (data: { roomId: string }) => void;
    STAND:          (data: { roomId: string }) => void;
    DOUBLE:         (data: { roomId: string }) => void;
    SPLIT:          (data: { roomId: string }) => void;
    SURRENDER:      (data: { roomId: string }) => void;
    CHAT_MESSAGE:   (data: { roomId: string; text: string }) => void;
    GET_ROOM_STATE: (data: { roomId: string }) => void;
}

export interface ServerToClientEvents {
    ROOM_STATE:        (data: RoomState) => void;
    PLAYER_JOINED:     (data: { userId: number; name: string }) => void;
    PLAYER_LEFT:       (data: { userId: number }) => void;
    GAME_STARTED:      (data: RoomState) => void;
    PLAYER_ACTION:     (data: PlayerActionEvent) => void;
    TURN_CHANGED:      (data: { userId: number }) => void;
    DEALER_PLAY:       (data: { cards: string[]; score: number }) => void;
    ROUND_RESULT:      (data: RoundResultEvent) => void;
    BETTING_PHASE:     (data: { deckShuffled?: boolean }) => void;
    DECK_SHUFFLED:     (data: { remainingCards: number }) => void;
    ERROR:             (data: { code: string; message: string }) => void;
    CHAT_MESSAGE:      (data: { userId: number; name: string; text: string }) => void;
    FORCE_DISCONNECT:  (data: { reason: string }) => void;
    BET_CONFIRMED:     (data: { balance: number }) => void;
    SESSION_INVALID:   () => void;
}

// ─── Данные сокета (socket.data) ─────────────────────────────────────────────

export interface SocketData {
    userSession: UserSession | null;
    sessionToken: string | null;
    currentRoomId: string | null;
}
