import type { Request, Response, NextFunction } from "express";

class AuthorizationViewController{
    renderLoginPage = async (req: Request, res: Response, next: NextFunction)=>{
        res.render("authorization", {"layout": "layout", "scripts": "scripts/userLoginScript.js" })
    }

}
export default new AuthorizationViewController();