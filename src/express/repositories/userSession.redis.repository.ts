import RedisClient from "../../database/redis.js";
import type UserSession from "../models/userSession.dto.js";

//sessionTokenKey = sess: + sessionToken

const PREFIXES = {
        session: "user:sess:",
        userSession: "user:id:sess:", // - хранит соответствие user_sess-userId : sess-dshgudshdgifsd
    };
class UserSessionRedisRepository{

    
    getUserSessionByToken = async (sessionToken: string) =>{
        const sessionTokenKey = `${PREFIXES.session}${sessionToken}`;
        const obj = await RedisClient.hGetAll(sessionTokenKey);
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
    setSession = async (session: UserSession, generatedToken: string, expirationTime: number) : Promise<string>=>{
        await this.deleteSessionByUserId(session.userId);
        const sessionTokenKey = `${PREFIXES.session}${generatedToken}`;
        //создание новой сессии 
        await RedisClient.hSet(sessionTokenKey, session as any); // user as any для уточнения, что объект просто и без вложенностей
        await RedisClient.expire(sessionTokenKey, expirationTime);
        const userSessionKey = `${PREFIXES.userSession}${session.userId}`;
        await RedisClient.set(userSessionKey, generatedToken, {EX: expirationTime});
        return generatedToken;
    }


    deleteSessionByUserId = async(userId: number)=>{
        const session = await this.getSessionByUserId(userId);
        if(!session)
        {
            return null;
        }
        const userSessionKey = `${PREFIXES.userSession}${userId}`;
        const sessionTokenKey = `${PREFIXES.session}${session}`
        await RedisClient.del([userSessionKey, sessionTokenKey]);
        return session;
    }

    deleteSessionBySessionToken = async (sessionToken: string)=>{
        
        if(!sessionToken)
        {
            return null;
        }
        const sessionTokenKey = `${PREFIXES.session}${sessionToken}`
        const userId = await RedisClient.hGet(sessionTokenKey , "userId");
        if(!userId)
        {
            return null;
        }
        const userSessionKey = `${PREFIXES.userSession}${userId}`;
        await RedisClient.del([userSessionKey, sessionTokenKey]);
        return sessionToken;
    }

    getSessionByUserId = async(userId: number)=>{
        const userSessionKey = `${PREFIXES.userSession}${userId}`;
        return await RedisClient.get(userSessionKey);
    }

    refreshSessionByToken = async(sessionToken: string, expirationTime: number)=>{
        if(!sessionToken)
        {
            return null;
        }
        const sessionTokenKey = `${PREFIXES.session}${sessionToken}`;
        const userSession = await this.getUserSessionByToken(sessionToken);
        if(!userSession)
        {
            return null;
        }
        await RedisClient.expire(sessionTokenKey, expirationTime);
        const userSessionKey = `${PREFIXES.userSession}${userSession.userId}`;
        await RedisClient.expire(userSessionKey, expirationTime);
        return sessionToken;
    }
}

export default new UserSessionRedisRepository();