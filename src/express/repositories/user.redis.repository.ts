import RedisClient from "../../database/redis.js";
import type User from "../../game/user.dto.js";
class UserRedisRepository{
    getUserByToken = async (sessionToken: string) =>{
        const obj = await RedisClient.hGetAll(sessionToken);
        if(!obj["user_id"])
        {
            return null;
        }
        const session: User = {
            "name": obj["name"] as string,
            "email": obj["email"] as string,
            "balance": Number(obj["balance"]),
            "userId": Number(obj["user_id"])
        }
        return session;
    }
}

export default new UserRedisRepository();