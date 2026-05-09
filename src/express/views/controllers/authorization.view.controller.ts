import type { Request, Response, NextFunction } from "express";

class AuthorizationViewController{
    renderLoginPage = async (req: Request, res: Response, next: NextFunction)=>{
        res.render("authorization", {"layout": "layout", "scripts": "loginScripts", "partial": "loginView"});
    }

}
export default new AuthorizationViewController();