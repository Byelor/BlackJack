class Card {
    suit: string;
    rank: string;
    value: number;

    constructor(suit: string, rank: string, value: number) {
        this.suit = suit;
        this.rank = rank; // Добавлено
        this.value = value;
    }
}

class Deck {
    cards: Array<Card> = [];

    constructor(count: number = 1) {
        this.generateDeck(count);
    }

    private generateDeck(count: number): void {
        const suits = ['Hearts', 'Diamonds', 'Clubs', 'Spades'];
        const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

        for (let i = 0; i < count; i++) {
            for (const suit of suits) {
                for (const rank of ranks) {
                    let value: number;

                    // Логика определения очков для блекджека
                    if (['J', 'Q', 'K'].includes(rank)) {
                        value = 10;
                    } else if (rank === 'A') {
                        value = 11;
                    } else {
                        value = parseInt(rank);
                    }

                    this.cards.push(new Card(suit, rank, value));
                }
            }
        }
    }
    //сделать функцию для шафла
    //сделать функцию для доставании карты 
}
