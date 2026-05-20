export enum room_status{
    PLAYING = "PLAYING",
    BETTING = "BETTING",
}

export interface Room{
    roomId: string,
    dealer: string[],           // карты дилера в компактном формате ["AH","KS"]
    status: room_status,
    currentPlayer: number | null,
    deck: string[],             // оставшиеся карты в колоде
    reshufflePending: boolean,  // перетасовать перед следующим раундом
    playerOrder: number[],      // порядок ходов (userId[]) — устанавливается при startGame
}