import RedisClient from "../../database/redis.js";
import type {RoomMeta} from "../models/room.meta.dto.js";
import type { Room } from "../models/Room.dto.js";
const PREFIXES = {
    roomsActive: "rooms:active",
    roomMeta: (roomId: string)=>{return `room:meta:${roomId}`},
    roomUser: (roomId: string, userId: number)=>{ return `room:player:${roomId}:user:${userId}`;  },
    roomUsers: (roomId: string) => {return `room:users:${roomId}`},
    roomGame: (roomId: string) => {return `room:game"${roomId}`},
    userIdRoom: (userId: string)=> {return `user:id:room:{}`}
}
class RoomRedisRepository{
    getPlayersCount = async (roomId: string)=>{
        return RedisClient.sCard(PREFIXES.roomUsers(roomId));
    }

    getRoomMetas = async() =>{
        const multi = RedisClient.multi();
        const rooms = await this.getActiveRoomIds();
        if(!rooms)
        {
            return null;
        }
        const roomCount = rooms.length;
        rooms.forEach((id)=>{
            multi.hGetAll(PREFIXES.roomMeta(id));
        });
        rooms.forEach((id)=>{
            multi.sCard(PREFIXES.roomUsers(id));
        });
        const raw = await multi.exec();

        const rawMetas = raw.splice(0, roomCount) as unknown as Record<string, string>[];
        const userCounts = raw;
        const metas: RoomMeta[] = [];
        rooms.forEach((id, ind)=>{
            const rawMeta = rawMetas[ind];
            if (!rawMeta || Object.keys(rawMeta).length === 0) return;
            const meta: RoomMeta = {
                roomId: id,
                name: rawMeta["name"] || "",
                description: rawMeta["description"] || "",
                maxPlayersCount: Number(rawMeta["max_players_count"]),
                isPrivate: (rawMeta["is_private"] === "true"),
                password: rawMeta["password"] || "",
                currentPlayersCount: Number(userCounts[ind]),

            }
            metas.push(meta);
        });
        
        return metas;
    }
    getActiveRoomIds = async ()=>{
        const rooms = await RedisClient.sMembers(PREFIXES.roomsActive);
        if(!rooms)
        {
            return null;
        }
        return rooms;
    }

}
export default new RoomRedisRepository();