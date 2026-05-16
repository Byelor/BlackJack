export enum room_status{
    PLAYING = "PLAYING",
    BETTING = "BETTING",
}

export interface Room{
    roomId: string,
    dealer: string[],
    status: room_status,
    current_player: string,
    deck: string[]
}