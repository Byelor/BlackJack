import type { Request, Response, NextFunction } from "express";

class CheckForAuthAPIMiddleware{
    checkUser = async (req: Request, res: Response, next: NextFunction)=>{
       if(!req.userSession){
            res.status(401).json({message: "you need to login first!"});
            return;
       }
       next();
    }
}
export default new CheckForAuthAPIMiddleware();