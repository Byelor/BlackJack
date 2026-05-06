import UserRedisRepository from "../repositories/user.redis.repository.js";
import UserPgRepository from "../repositories/user.pg.repository.js";
import type User from "../../game/user.dto.js";
class UserService{
    getUserByToken = async (sessionToken: string)=>{
        return UserRedisRepository.getUserByToken(sessionToken);
    }
    getUserById = async (userId: number)=>{
        return UserPgRepository.getUserById(userId);
    }
    setUser(user: User)
    {
        return UserPgRepository.setUser(user);
    }
}

export default new UserService();