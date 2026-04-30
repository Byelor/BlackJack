import { Deck, Card } from "./deck.js";

// ─── Интерфейс для всех, кто держит карты ────────────────────────────────────

interface Handable {
    hand: Card[];
    takeCard(card: Card): void;
    clearHand(): void;
    countCards(): number;
    isDone(): boolean;
}

// ─── Базовый класс с общей логикой руки ──────────────────────────────────────

abstract class HandHolder implements Handable {
    hand: Card[] = [];

    takeCard(card: Card): void {
        this.hand.push(card);
    }

    clearHand(): void {
        this.hand = [];
    }

    // Подсчёт с учётом туза (11 → 1 если перебор)
    countCards(): number {
        let total = 0;
        let aces = 0;

        for (const card of this.hand) {
            total += card.value;
            if (card.rank === "A") aces++;
        }

        while (total > 21 && aces > 0) {
            total -= 10; // туз становится 1
            aces--;
        }

        return total;
    }

    abstract isDone(): boolean;
}

// ─── Пользователь (аккаунт) ───────────────────────────────────────────────────

export class User {
    readonly userId: number;
    readonly name: string;
    balance: number;

    private static nextId = 1;

    constructor(name: string, balance: number = 500) {
        this.userId = User.nextId++;
        this.name = name;
        this.balance = balance;
    }
}

// ─── Игрок за столом ──────────────────────────────────────────────────────────

export class Player extends HandHolder {
    readonly user: User;
    currentBet: number = 0;
    lastBet: number = 0;
    isStanding: boolean = false;

    constructor(user: User) {
        super();
        this.user = user;
    }

    get name(): string {
        return this.user.name;
    }

    placeBet(amount: number): void {
        if (amount <= 0) throw new Error("Ставка должна быть больше нуля");
        if (amount > this.user.balance) throw new Error("Недостаточно средств");
        this.lastBet = this.currentBet;
        this.currentBet = amount;
        this.user.balance -= amount;
    }

    // Перебор
    isBust(): boolean {
        return this.countCards() > 21;
    }

    // Блекджек (туз + карта 10)
    hasBlackjack(): boolean {
        return this.hand.length === 2 && this.countCards() === 21;
    }

    // Игрок больше не тянет карты
    isDone(): boolean {
        return this.isStanding || this.isBust();
    }

    stand(): void {
        this.isStanding = true;
    }

    resetRound(): void {
        this.clearHand();
        this.currentBet = 0;
        this.isStanding = false;
    }
}

// ─── Дилер ───────────────────────────────────────────────────────────────────

export class Dealer extends HandHolder {
    // Дилер останавливается на 17+
    isDone(): boolean {
        return this.countCards() >= 17;
    }

    isBust(): boolean {
        return this.countCards() > 21;
    }
}

// ─── Комната (стол) ───────────────────────────────────────────────────────────

export class Room {
    private static readonly MAX_PLAYERS = 6;
    private static readonly DEFAULT_DECK_COUNT = 8;

    private players: Player[] = [];
    private dealer: Dealer = new Dealer();
    private gameDeck: Deck;

    constructor(deckCount: number = Room.DEFAULT_DECK_COUNT) {
        this.gameDeck = new Deck(deckCount);
        this.gameDeck.shuffle();
    }

    get isFull(): boolean {
        return this.players.length >= Room.MAX_PLAYERS;
    }

    get playerCount(): number {
        return this.players.length;
    }

    getPlayers(): ReadonlyArray<Player> {
        return this.players;
    }

    addPlayer(user: User): Player {
        if (this.isFull) throw new Error("Стол переполнен");
        const player = new Player(user);
        this.players.push(player);
        return player;
    }

    removePlayer(user: User): void {
        const index = this.players.findIndex((p) => p.user.userId === user.userId);
        if (index === -1) throw new Error(`Игрок "${user.name}" не найден за столом`);
        this.players.splice(index, 1); // исправлен баг: передаём deleteCount = 1
    }

    dealCard(target: Handable): void {
        // Перетасовать если колода почти кончилась
        if (this.gameDeck.remaining < 10) {
            this.gameDeck = new Deck(Room.DEFAULT_DECK_COUNT);
            this.gameDeck.shuffle();
            console.log("Колода перетасована заново");
        }
        target.takeCard(this.gameDeck.getCard());
    }

    dealInitialCards(): void {
        // Раздаём по 2 карты каждому игроку и дилеру
        for (let i = 0; i < 2; i++) {
            for (const player of this.players) {
                this.dealCard(player);
            }
            this.dealCard(this.dealer);
        }
    }

    getDealerScore(): number {
        return this.dealer.countCards();
    }

    getDealerHand(): ReadonlyArray<Card> {
        return this.dealer.hand;
    }

    isDealerDone(): boolean {
        return this.dealer.isDone();
    }

    dealerHit(): void {
        if (!this.dealer.isDone()) {
            this.dealCard(this.dealer);
        }
    }

    resetRound(): void {
        for (const player of this.players) {
            player.resetRound();
        }
        this.dealer.clearHand();
    }
}

// ─── Результат раунда ─────────────────────────────────────────────────────────

export type RoundResult = "blackjack" | "win" | "lose" | "push";

// ─── Игра ─────────────────────────────────────────────────────────────────────

export class Game {
    private room: Room;

    constructor(deckCount: number = 8) {
        this.room = new Room(deckCount);
    }

    // ── Управление игроками ──

    addUser(user: User): Player {
        return this.room.addPlayer(user);
    }

    removeUser(user: User): void {
        this.room.removePlayer(user);
    }

    // ── Раунд ──

    startRound(): void {
        if (this.room.playerCount === 0) throw new Error("Нет игроков за столом");
        this.room.resetRound();
        this.room.dealInitialCards();
    }

    // Игрок берёт карту
    hit(player: Player): void {
        if (player.isDone()) throw new Error("Игрок уже завершил ход");
        this.room.dealCard(player);
    }

    // Игрок останавливается
    stand(player: Player): void {
        player.stand();
    }

    // Дабл — удваивает ставку, берёт одну карту и останавливается
    double(player: Player): void {
        if (player.hand.length !== 2) throw new Error("Дабл доступен только на первых двух картах");
        player.placeBet(player.currentBet); // удвоение ставки
        this.room.dealCard(player);
        player.stand();
    }

    // Ход дилера — тянет пока не выполнит условие
    playDealer(): void {
        while (!this.room.isDealerDone()) {
            this.room.dealerHit();
        }
    }

    // Подсчёт результатов для всех игроков
    settleRound(): Map<Player, RoundResult> {
        this.playDealer();

        const results = new Map<Player, RoundResult>();
        const dealerScore = this.room.getDealerScore();
        const dealerBust = dealerScore > 21;

        for (const player of this.room.getPlayers()) {
            const result = this.resolvePlayer(player, dealerScore, dealerBust);
            results.set(player, result);
            this.applyPayout(player, result);
        }

        return results;
    }

    private resolvePlayer(
        player: Player,
        dealerScore: number,
        dealerBust: boolean
    ): RoundResult {
        const playerScore = player.countCards();

        if (player.isBust()) return "lose";
        if (player.hasBlackjack() && dealerScore !== 21) return "blackjack";
        if (dealerBust) return "win";
        if (playerScore > dealerScore) return "win";
        if (playerScore < dealerScore) return "lose";
        return "push"; // ничья
    }

    private applyPayout(player: Player, result: RoundResult): void {
        switch (result) {
            case "blackjack":
                player.user.balance += Math.floor(player.currentBet * 2.5); // 3:2
                break;
            case "win":
                player.user.balance += player.currentBet * 2; // возврат + выигрыш
                break;
            case "push":
                player.user.balance += player.currentBet; // возврат ставки
                break;
            case "lose":
                break; // ставка уже списана
        }
    }

    // Состояние стола для отладки
    printState(): void {
        console.log("\n=== Состояние стола ===");
        console.log(`Дилер: ${this.room.getDealerScore()} очков`);
        for (const player of this.room.getPlayers()) {
            console.log(
                `${player.name}: ${player.countCards()} очков | ` +
                `баланс: ${player.user.balance} | ставка: ${player.currentBet}`
            );
        }
        console.log("======================\n");
    }
}