import crypto from "node:crypto";
import roomRedisRepository from "../repositories/room.redis.repository.js";
import type {RoomMeta} from "../models/room.meta.dto.js";

export type CreateRoomInput = {
    name: string;
    description?: string;
    maxPlayersCount?: number;
    isPrivate?: boolean;
    password?: string;
    deckCount?: number;
};

class RoomService{
    getPlayersCount = async(roomId: string)=>{
        return await roomRedisRepository.getPlayersCount(roomId);
    }
    getAllRoomsMeta = async()=>{
        return await roomRedisRepository.getRoomMetas();
    }
    createRoom = async(roomId: string, userId: number, roomMeta: RoomMeta)=>{
        return await roomRedisRepository.createRoom(roomId, userId, roomMeta);
    }

    createRoomForUser = async (userId: number, input: CreateRoomInput): Promise<{ roomId: string } | { error: string }> => {
        const name = input.name?.trim();
        if (!name) return { error: "Укажите название комнаты" };

        const maxPlayersCount = Number(input.maxPlayersCount ?? 5);
        if (!Number.isInteger(maxPlayersCount) || maxPlayersCount < 2 || maxPlayersCount > 7) {
            return { error: "Количество игроков: от 2 до 7" };
        }

        const deckCount = Number(input.deckCount ?? 6);
        if (!Number.isInteger(deckCount) || deckCount < 1 || deckCount > 8) {
            return { error: "Количество колод: от 1 до 8" };
        }

        const isPrivate = Boolean(input.isPrivate);
        const password = isPrivate ? (input.password?.trim() ?? "") : "";
        if (isPrivate && !password) {
            return { error: "Для приватной комнаты нужен пароль" };
        }

        const currentRoom = await roomRedisRepository.getUserCurrentRoomId(userId);
        if (currentRoom) {
            await roomRedisRepository.removeUserFromRoom(currentRoom, userId);
        }

        const roomId = crypto.randomUUID();
        const roomMeta: RoomMeta = {
            roomId,
            name,
            description: input.description?.trim() ?? "",
            maxPlayersCount,
            currentPlayersCount: 0,
            isPrivate,
            password,
            deckCount,
        };

        await roomRedisRepository.createRoom(roomId, userId, roomMeta);
        return { roomId };
    }
    deleteRoom = async(roomId: string)=>{

        return await roomRedisRepository.deleteRoom(roomId);
    }
    deleteEmptyRoom = async(roomId: string)=>{
        const roomMeta = await roomRedisRepository.getRoomMeta(roomId);
        if (!roomMeta) return false;

        return await roomRedisRepository.deleteRoomIfEmpty(roomId);
    }
    addUserToRoom = async(roomId: string, userId: number, password: string | null = null)=>{
        const meta = await roomRedisRepository.getRoomMeta(roomId);
        if(!meta)
        {
            return null;
        }
        if(meta.isPrivate){
            if(!meta.password || meta.password !== password)
            {
                return null;
            }
        }
        
        if(meta.currentPlayersCount >= meta.maxPlayersCount){
           return null; 
        }
        
        return await roomRedisRepository.addUserToRoom(roomId, userId);
    }
    removeUserFromRoom = async(roomId: string, userId: number)=>{
        
        return await roomRedisRepository.removeUserFromRoom(roomId, userId);
    }
    getRoomMeta = async(roomId: string)=>{
        return await roomRedisRepository.getRoomMeta(roomId);
    }
    removeUserFromCurrentRoom = async(userId: number)=>{
        const currentRoom = await roomRedisRepository.getUserCurrentRoomId(userId);
        if(!currentRoom)
        {
            return null;
        }
        await roomRedisRepository.removeUserFromRoom(currentRoom, userId);
        return currentRoom;
    }
    getAllUsersFromRoom = async(roomId: string)=>{
        return await roomRedisRepository.getAllUsersFromRoom(roomId);
    }
}

export default new RoomService();