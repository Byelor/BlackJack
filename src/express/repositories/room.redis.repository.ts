import RedisClient from "../../database/redis.js";
import type { RoomMeta } from "../models/room.meta.dto.js";
import type { Room } from "../models/room.dto.js";
import { room_status } from "../models/room.dto.js";
import type { Hand } from "../models/hand.dto.js";

const PREFIXES = {
    roomsActive: "rooms:active",
    roomMeta:  (roomId: string)  => `room:meta:${roomId}`,
    roomUser:  (roomId: string, userId: number) => `room:player:${roomId}:user:${userId}`,
    roomUsers: (roomId: string)  => `room:users:${roomId}`,
    roomGame:  (roomId: string)  => `room:game:${roomId}`,
    userIdRoom:(userId: number)  => `user:id:room:${userId}`,
};

class RoomRedisRepository {


    getPlayersCount = async (roomId: string) => {
        return RedisClient.sCard(PREFIXES.roomUsers(roomId));
    };

    getActiveRoomIds = async () => {
        const rooms = await RedisClient.sMembers(PREFIXES.roomsActive);
        return rooms.length ? rooms : null;
    };

    getRoomMetas = async () => {
        const rooms = await this.getActiveRoomIds();
        if (!rooms) return null;
        const multi = RedisClient.multi();
        rooms.forEach(id => multi.hGetAll(PREFIXES.roomMeta(id)));
        rooms.forEach(id => multi.sCard(PREFIXES.roomUsers(id)));
        const raw = await multi.exec();
        const roomCount = rooms.length;
        const rawMetas = raw.slice(0, roomCount) as unknown as Record<string, string>[];
        const userCounts = raw.slice(roomCount);
        const metas: RoomMeta[] = [];
        rooms.forEach((id, i) => {
            const m = rawMetas[i];
            if (!m || Object.keys(m).length === 0) return;
            metas.push({
                roomId: id,
                name: m["name"] || "",
                description: m["description"] || "",
                maxPlayersCount: Number(m["max_players_count"]),
                isPrivate: m["is_private"] === "true",
                password: m["password"] || "",
                currentPlayersCount: Number(userCounts[i]),
                deckCount: Number(m["deck_count"]) || 6,
            });
        });
        return metas;
    };

    getRoomMeta = async (roomId: string): Promise<RoomMeta | null> => {
        const multi = RedisClient.multi();
        multi.hGetAll(PREFIXES.roomMeta(roomId));
        multi.sCard(PREFIXES.roomUsers(roomId));
        const raw = await multi.exec();
        const obj = raw[0] as unknown as Record<string, string>;
        if (!obj || Object.keys(obj).length === 0) {
            return null;
        }

        const roomMeta: RoomMeta = {
            roomId,
            name: obj["name"] || "",
            description: obj["description"] || "",
            maxPlayersCount: Number(obj["max_players_count"]),
            isPrivate: obj["is_private"] === "true",
            password: obj["password"] || "",
            currentPlayersCount: Number(raw[1]),
            deckCount: Number(obj["deck_count"]) || 6,
        };
        return roomMeta;
    };

    getUserCurrentRoomId = async (userId: number) => {
        return await RedisClient.get(PREFIXES.userIdRoom(userId));
    };

    getAllUsersFromRoom = async (roomId: string) => {
        return await RedisClient.sMembers(PREFIXES.roomUsers(roomId));
    };

    getRoomUsers = async (roomId: string) => {
        return await RedisClient.sMembers(PREFIXES.roomUsers(roomId));
    };


    createRoom = async (roomId: string, userId: number, roomMeta: RoomMeta) => {
        const multi = RedisClient.multi();
        multi.hSet(PREFIXES.roomMeta(roomId), {
            name:              roomMeta.name,
            description:       roomMeta.description,
            max_players_count: String(roomMeta.maxPlayersCount),
            is_private:        roomMeta.isPrivate ? "true" : "false",
            password:          roomMeta.password,
            deck_count:        String(roomMeta.deckCount ?? 6),
        });
        multi.sAdd(PREFIXES.roomUsers(roomId), String(userId));
        multi.hSet(PREFIXES.roomGame(roomId), {
            room_id:           roomId,
            dealer:            "[]",
            deck:              "[]",
            current_player:    "",
            status:            room_status.BETTING,
            reshuffle_pending: "false",
            player_order:      "[]",
        });
        multi.set(PREFIXES.userIdRoom(userId), roomId);
        multi.hSet(PREFIXES.roomUser(roomId, userId), {
            current_hand_index: "0",
            hands:              "[]",
        });
        multi.sAdd(PREFIXES.roomsActive, roomId);
        await multi.exec();
        return roomId;
    };

    deleteRoom = async (roomId: string) => {
        const multi = RedisClient.multi();
        const usersInRoom = await RedisClient.sMembers(PREFIXES.roomUsers(roomId));
        usersInRoom.forEach(uid =>
            multi.del([PREFIXES.roomUser(roomId, Number(uid)), PREFIXES.userIdRoom(Number(uid))])
        );
        multi.del([PREFIXES.roomMeta(roomId), PREFIXES.roomGame(roomId), PREFIXES.roomUsers(roomId)]);
        multi.sRem(PREFIXES.roomsActive, roomId);
        await multi.exec();
        return roomId;
    };

    deleteRoomIfEmpty = async (roomId: string) => {
        const usersKey = PREFIXES.roomUsers(roomId);
        const initialCount = await RedisClient.sCard(usersKey);
        if (initialCount !== 0) return false;

        await RedisClient.watch(usersKey);
        const latestCount = await RedisClient.sCard(usersKey);
        if (latestCount !== 0) {
            await RedisClient.unwatch();
            return false;
        }

        const multi = RedisClient.multi();
        multi.del([PREFIXES.roomMeta(roomId), PREFIXES.roomGame(roomId), usersKey]);
        multi.sRem(PREFIXES.roomsActive, roomId);

        const result = await multi.exec();
        return Array.isArray(result);
    };

    addUserToRoom = async (roomId: string, userId: number) => {
        await RedisClient.watch(PREFIXES.roomMeta(roomId));
        const multi = RedisClient.multi();
        const prevRoom = await RedisClient.get(PREFIXES.userIdRoom(userId));
        if (prevRoom) multi.sRem(PREFIXES.roomUsers(prevRoom), String(userId));
        multi.set(PREFIXES.userIdRoom(userId), roomId);
        multi.hSet(PREFIXES.roomUser(roomId, userId), { current_hand_index: "0", hands: "[]" });
        multi.sAdd(PREFIXES.roomUsers(roomId), String(userId));
        const result = await multi.exec();
        return result ? roomId : null;
    };

    removeUserFromRoom = async (roomId: string, userId: number) => {
        const currentRoom = await RedisClient.get(PREFIXES.userIdRoom(userId));
        const multi = RedisClient.multi();
        multi.sRem(PREFIXES.roomUsers(roomId), String(userId));
        multi.del(PREFIXES.roomUser(roomId, userId));
        if (currentRoom === roomId) multi.del(PREFIXES.userIdRoom(userId));
        await multi.exec();
        return roomId;
    };

    removeUserFromCurrentRoom = async (userId: number) => {
        const roomId = await RedisClient.get(PREFIXES.userIdRoom(userId));
        if (!roomId) return null;
        await this.removeUserFromRoom(roomId, userId);
        return roomId;
    };


    getRoomGame = async (roomId: string): Promise<Room | null> => {
        const raw = await RedisClient.hGetAll(PREFIXES.roomGame(roomId));
        if (!raw || !raw["room_id"]) return null;
        return {
            roomId:           raw["room_id"],
            dealer:           JSON.parse(raw["dealer"]       || "[]"),
            deck:             JSON.parse(raw["deck"]         || "[]"),
            status:           (raw["status"] as room_status) || room_status.BETTING,
            currentPlayer:    raw["current_player"] ? Number(raw["current_player"]) : null,
            reshufflePending: raw["reshuffle_pending"] === "true",
            playerOrder:      JSON.parse(raw["player_order"] || "[]"),
        };
    };

    setRoomGameFields = async (roomId: string, fields: Record<string, string>) => {
        await RedisClient.hSet(PREFIXES.roomGame(roomId), fields);
    };

    getPlayerState = async (roomId: string, userId: number): Promise<{ hands: Hand[]; currentHandIndex: number } | null> => {
        const raw = await RedisClient.hGetAll(PREFIXES.roomUser(roomId, userId));
        if (!raw || raw["hands"] === undefined) return null;
        return {
            hands:            JSON.parse(raw["hands"] || "[]"),
            currentHandIndex: Number(raw["current_hand_index"] || 0),
        };
    };

    setPlayerState = async (roomId: string, userId: number, hands: Hand[], currentHandIndex: number) => {
        await RedisClient.hSet(PREFIXES.roomUser(roomId, userId), {
            current_hand_index: String(currentHandIndex),
            hands:              JSON.stringify(hands),
        });
    };

    getDeckCount = async (roomId: string): Promise<number> => {
        const val = await RedisClient.hGet(PREFIXES.roomMeta(roomId), "deck_count");
        return val ? Number(val) : 6;
    };

    getAllPlayersStates = async (roomId: string): Promise<Map<number, { hands: Hand[]; currentHandIndex: number }>> => {
        const userIds = await RedisClient.sMembers(PREFIXES.roomUsers(roomId));
        const multi = RedisClient.multi();
        userIds.forEach(id => multi.hGetAll(PREFIXES.roomUser(roomId, Number(id))));
        const raws = await multi.exec() as unknown as Record<string, string>[];
        const result = new Map<number, { hands: Hand[]; currentHandIndex: number }>();
        userIds.forEach((id, i) => {
            const raw = raws[i];
            if (raw && raw["hands"] !== undefined) {
                result.set(Number(id), {
                    hands:            JSON.parse(raw["hands"] || "[]"),
                    currentHandIndex: Number(raw["current_hand_index"] || 0),
                });
            }
        });
        return result;
    };
}

export { PREFIXES };
export default new RoomRedisRepository();