import RedisClient from "../../database/redis.js";
import type {RoomMeta} from "../models/room.meta.dto.js";
import type { Room } from "../models/Room.dto.js";
const PREFIXES = {
    roomsActive: "rooms:active",
    roomMeta: (roomId: string)=>{return `room:meta:${roomId}`},
    RoomUser: (roomId: string, userId: number)=>{ return `room:player:${roomId}:user:${userId}`;  },
    roomUsers: (roomId: string) => {return `room:users:${roomId}`}
}
class RoomRedisRepository{
    getPlayersCount = async(roomK: string)=>{
        RedisClient.sCard("")
    }
    getAllRoomsMeta = async()=>{
        
    }
    getActiveRoomIds = async ()=>{
        const rooms = await RedisClient.sMembers(PREFIXES.roomsActive);
    }
}
export default new RoomRedisRepository();