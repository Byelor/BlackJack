import RedisClient from "../../database/redis.js";
import type UserSession from "../models/userSession.dto.js";

//sessionToken = sess: + generatedShit

const PREFIXES = {
        session: "sess-",
        userSession: "user_session-"
    };
class UserSessionRedisRepository{

    
    getUserSessionByToken = async (sessionToken: string) =>{
        const obj = await RedisClient.hGetAll(sessionToken);
        if(!obj["userId"])
        {
            return null;
        }
        const session: UserSession = {
            "name": obj["name"] as string,
            "email": obj["email"] as string,
            "balance": Number(obj["balance"]),
            "userId": Number(obj["userId"]),
        }
        return session;
    }
    //добавить транзакцию в будующем
    setSession = async (session: UserSession, generatedToken: string, expirationDate: number) : Promise<string>=>{
        await this.deleteSessionByUserId(session.userId);
        const sessionToken = `${PREFIXES.session}${generatedToken}`;
        //создание новой сессии 
        const sessionTokenHSetResult = await RedisClient.hSet(sessionToken, session as any); // user as any для уточнения, что объект просто и без вложенностей
        const userId = `${PREFIXES.userSession}${session.userId}`;
        const userIdSetResult = await RedisClient.set(userId, sessionToken, {EX: expirationDate});
        await RedisClient.expire(sessionToken, expirationDate);
        return sessionToken;
    }


    deleteSessionByUserId = async(userId: number)=>{
        const session = await this.getSessionByUserId(userId);
        if(!session)
        {
            return null;
        }
        const userSession = `${PREFIXES.userSession}${userId}`;
        await RedisClient.del([session, userSession]);
    }


    getSessionByUserId = async(userId: number)=>{
        const userSession = `${PREFIXES.userSession}${userId}`;
        return await RedisClient.get(userSession);
    }
}

export default new UserSessionRedisRepository();