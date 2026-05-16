import RedisClient from "../../database/redis.js";
import type {RoomMeta} from "../models/room.meta.dto.js";
import type { Room } from "../models/Room.dto.js";
class RoomRedisRepository{
       getPlayersCount = async(roomK: string)=>{
        RedisClient.sCard("")
    }
}
export default new RoomRedisRepository();