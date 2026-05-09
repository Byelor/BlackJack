import CryptoGenerator from "../support/cryptoGenerator.js";
import type { Request, Response, NextFunction } from "express";
import UserService from "../services/user.service.js";

class AuthorizationMiddleware{
    checkUserByCookie = async (req: Request, res: Response, next: NextFunction)=>{
        const sessionToken = req.cookies["sessionToken"];
        console.log(sessionToken);
        const user = await UserService.getUserByToken(sessionToken);
        req.user = user;
        next();
    }
}
export default new AuthorizationMiddleware();