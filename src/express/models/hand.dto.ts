enum hand_status{
    ACTIVE = "ACTIVE",
    STOOD = "STOOD", 
    DOUBLE = "DOUBLE-HIT",
    SURRENDER = "SURRENDER",
    BUST = "BUST",
    BLACKJACK = "BLACKJACK",
}
export interface Hand{
    bet: number,
    cards: string[],
    status: hand_status
}