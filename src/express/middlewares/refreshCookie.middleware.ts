import type { Request, Response, NextFunction } from "express";
import UserSessionService from "../services/userSession.service.js";
import { EXPIRATION_TIME } from "../support/expirationTime.helper.js";
class RefreshSessionMiddleware{
    refreshSession = async (req: Request, res: Response, next: NextFunction)=>{
        const sessionToken = req.cookies["sessionToken"];
        if(!sessionToken)
        {
            return next();
        }
            res.cookie("sessionToken", sessionToken, {
                maxAge: EXPIRATION_TIME.cookie,
                path: "/",
                httpOnly: true
            });

        return next();
    }
}
export default new RefreshSessionMiddleware();