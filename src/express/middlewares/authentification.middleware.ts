import CryptoGenerator from "../support/cryptoGenerator.js";
import type { Request, Response, NextFunction } from "express";
import UserSessionService from "../services/userSession.service.js";

class AuthorizationMiddleware{
    checkUserByCookie = async (req: Request, res: Response, next: NextFunction)=>{
        const sessionToken = req.cookies["sessionToken"];
        const userSession = await UserSessionService.getSessionByToken(sessionToken);
        if(!userSession)
        {
            return next();
        }
        req.userSession = userSession;
        return next();
    }
}
export default new AuthorizationMiddleware();