import userSessionRedisRepository from "../repositories/userSession.redis.repository.js";
import type UserSession from "../models/userSession.dto.js";
import cryptoGenerator from "../support/cryptoGenerator.js";
class UserSessionService{
    //login service method
    setSession = async (userSession: UserSession)=>{
        if(!await userSessionRedisRepository.getSessionByUserId(userSession.userId)){
            await userSessionRedisRepository.deleteSessionByUserId(userSession.userId);
        }
        const generatedToken = cryptoGenerator.generateSessionToken(16);

        const fullSessionToken = await userSessionRedisRepository.setSession(userSession, generatedToken, 43200);
        return fullSessionToken;
    }
    getUserSessionByToken = async (sessionToken: string)=>{
        return await userSessionRedisRepository.getUserSessionByToken(sessionToken);
    }

    removeSessionByToken = async (sessionToken: string)=>{
        return await userSessionRedisRepository.deleteSessionBySessionToken(sessionToken);
    }
}

export default new UserSessionService();