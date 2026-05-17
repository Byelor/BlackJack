import type User from "../models/user.dto.js";
import type UserSession from "../models/userSession.dto.js";

import roomRedisRepository from "../repositories/room.redis.repository.js";
import type {RoomMeta} from "../models/room.meta.dto.js";
import type { Room } from "../models/Room.dto.js";
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
    deleteRoom = async(roomId: string)=>{

        return await roomRedisRepository.deleteRoom(roomId);
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
}

export default new RoomService();