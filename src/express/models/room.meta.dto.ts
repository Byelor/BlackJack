export interface RoomMeta{
    roomId: string,
    name: string, 
    description: string,
    maxPlayersCount: number,
    currentPlayersCount: number,
    is_private: boolean,
    password: string,
};