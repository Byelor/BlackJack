import type { Request, Response, NextFunction } from "express";

class AuthorizationViewController{
    renderLoginPage = async (req: Request, res: Response, next: NextFunction)=>{
        res.render("authorization", {"layout": "layout", "scripts": "loginScripts", "partial": "loginView", "user": req.userSession});
    }
    renderRegistrationPage = async (req: Request, res: Response, next: NextFunction)=>{
        res.render("authorization", {"layout": "layout", "scripts": "registerScripts", "partial": "registerView", "user": req.userSession} )
    }


}
export default new AuthorizationViewController();