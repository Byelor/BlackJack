export class Card {
    readonly suit: string;
    readonly rank: string;
    readonly value: number;

    constructor(suit: string, rank: string, value: number) {
        this.suit = suit;
        this.rank = rank;
        this.value = value;
    }

    toString(): string {
        return `${this.rank} of ${this.suit}`;
    }
}

export class Deck {
    private cards: Card[] = [];

    constructor(deckCount: number = 1) {
        this.generateDeck(deckCount);
    }

    private generateDeck(deckCount: number): void {
        const suits = ["Hearts", "Diamonds", "Clubs", "Spades"] as const;
        const ranks: { rank: string; value: number }[] = [
            { rank: "2",  value: 2  },
            { rank: "3",  value: 3  },
            { rank: "4",  value: 4  },
            { rank: "5",  value: 5  },
            { rank: "6",  value: 6  },
            { rank: "7",  value: 7  },
            { rank: "8",  value: 8  },
            { rank: "9",  value: 9  },
            { rank: "10", value: 10 },
            { rank: "J",  value: 10 },
            { rank: "Q",  value: 10 },
            { rank: "K",  value: 10 },
            { rank: "A",  value: 11 }, // туз — 11 по умолчанию, пересчёт в countCards
        ];

        for (let i = 0; i < deckCount; i++) {
            for (const suit of suits) {
                for (const { rank, value } of ranks) {
                    this.cards.push(new Card(suit, rank, value));
                }
            }
        }
    }

    // Алгоритм Фишера-Йетса
    shuffle(): void {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j]!, this.cards[i]!];
        }
    }

    get isEmpty(): boolean {
        return this.cards.length === 0;
    }

    get remaining(): number {
        return this.cards.length;
    }

    // Возвращает карту или бросает ошибку если колода пуста
    getCard(): Card {
        const card = this.cards.pop();
        if (!card) throw new Error("Deck is empty");
        return card;
    }
}