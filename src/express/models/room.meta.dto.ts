export interface RoomMeta{
    roomId: string,
    name: string, 
    description: string,
    maxPlayersCount: number,
    currentPlayersCount: number,
    isPrivate: boolean,
    password: string,
    deckCount: number,        // кол-во колод (1-8), задаётся при создании комнаты
};