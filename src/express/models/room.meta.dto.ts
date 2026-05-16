export interface RoomMeta{
    roomId: string,
    name: string, 
    description: string,
    maxPlayersCount: number,
    currentPlayersCount: number,
    isPrivate: boolean,
    password: string,
};