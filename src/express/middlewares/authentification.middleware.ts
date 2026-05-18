import CryptoGenerator from "../support/cryptoGenerator.js";
import type { Request, Response, NextFunction } from "express";
import UserSessionService from "../services/userSession.service.js";

class AuthentificationMiddleware{
    checkUserByCookie = async (req: Request, res: Response, next: NextFunction)=>{
        const sessionToken = req.cookies["sessionToken"];
        if(!sessionToken)
        {
            req.userSession = null;
            return next();
        }
        const userSession = await UserSessionService.getUserSessionByToken(sessionToken);
        if(!userSession)
        {
            req.userSession = null;
            return next();
        }
        req.userSession = userSession;
        return next();
    }
}
export default new AuthentificationMiddleware();