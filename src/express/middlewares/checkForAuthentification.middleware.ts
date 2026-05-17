import type { Request, Response, NextFunction } from "express";

class CheckForAuthentificationnMiddleware{
    checkUser = async (req: Request, res: Response, next: NextFunction)=>{
       if(!req.userSession){
            res.redirect("/authorization/register");
            return;
       }
       next();
    }
}
export default new CheckForAuthentificationnMiddleware();