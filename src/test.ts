import { test, describe } from "node:test";
import assert from "node:assert";
import {
    cardValue,
    countHand,
    isNaturalBlackjack,
    canSplit,
    canDouble,
    generateDeck
} from "./game/BlackjackEngine.js";
import { hand_status } from "./express/models/hand.dto.js";

describe("Blackjack Pure Functions", () => {
    test("1. cardValue returns correct value for cards", () => {
        assert.strictEqual(cardValue("AH"), 11);
        assert.strictEqual(cardValue("TH"), 10);
        assert.strictEqual(cardValue("KS"), 10);
        assert.strictEqual(cardValue("7D"), 7);
    });

    test("2. countHand calculates standard hands correctly", () => {
        assert.strictEqual(countHand(["7D", "8S"]), 15);
        assert.strictEqual(countHand(["TH", "JS"]), 20);
        assert.strictEqual(countHand(["2C", "3D", "4H"]), 9);
    });

    test("3. countHand handles Aces correctly (soft/hard)", () => {
        assert.strictEqual(countHand(["AH", "9S"]), 20); // 11 + 9
        assert.strictEqual(countHand(["AH", "9S", "2D"]), 12); // 1 + 9 + 2 (Ace is 1 to avoid bust)
        assert.strictEqual(countHand(["AH", "AS"]), 12); // 11 + 1
    });

    test("4. countHand ignores hidden cards ('??')", () => {
        assert.strictEqual(countHand(["TH", "??"]), 10);
    });

    test("5. isNaturalBlackjack identifies 21 with 2 cards", () => {
        assert.strictEqual(isNaturalBlackjack(["AH", "TS"]), true);
        assert.strictEqual(isNaturalBlackjack(["KD", "AC"]), true);
        assert.strictEqual(isNaturalBlackjack(["9H", "AS"]), false); // 20
        assert.strictEqual(isNaturalBlackjack(["7D", "8S", "6C"]), false); // 21 but 3 cards
    });

    test("6. canSplit checks if two cards have the same rank", () => {
        const hand1 = { bet: 10, cards: ["7D", "7S"], status: hand_status.ACTIVE };
        const hand2 = { bet: 10, cards: ["TH", "JD"], status: hand_status.ACTIVE };
        const hand3 = { bet: 10, cards: ["7D", "7S", "7H"], status: hand_status.ACTIVE };
        
        assert.strictEqual(canSplit(hand1), true);
        // T and J have same value (10) but different rank, so cannot split!
        assert.strictEqual(canSplit(hand2), false); 
        // Can only split 2 cards
        assert.strictEqual(canSplit(hand3), false); 
    });

    test("7. canDouble is true only for exactly 2 cards", () => {
        const hand1 = { bet: 10, cards: ["7D", "8S"], status: hand_status.ACTIVE };
        const hand2 = { bet: 10, cards: ["7D", "8S", "2C"], status: hand_status.ACTIVE };
        assert.strictEqual(canDouble(hand1), true);
        assert.strictEqual(canDouble(hand2), false);
    });

    test("8. generateDeck creates correct number of cards", () => {
        const deck1 = generateDeck(1);
        assert.strictEqual(deck1.length, 52);
        
        const deck6 = generateDeck(6);
        assert.strictEqual(deck6.length, 52 * 6);
    });
});
