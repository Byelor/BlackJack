import userRedisRepository from "../repositories/user.redis.repository.js";
import UserRedisRepository from "../repositories/user.redis.repository.js";
class userService{
    getUserByToken = async (sessionToken: string)=>{
        return userRedisRepository.getUserByToken(sessionToken);
    }
}

export default new userService();