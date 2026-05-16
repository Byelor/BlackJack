import type User from "../models/user.dto.js";
import type UserSession from "../models/userSession.dto.js";

import roomRedisRepository from "../repositories/room.redis.repository.js";
import type {RoomMeta} from "../models/room.meta.dto.js";
import type { Room } from "../models/Room.dto.js";
class RoomService{
    getPlayersCount = async(roomId: string)=>{
        return ;
    }
    getAllRoomsMeta = async()=>{
        
    }
}

export default new RoomService();