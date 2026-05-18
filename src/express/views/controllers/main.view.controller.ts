import type {Request, Response, NextFunction} from "express";
import UserService from "../../services/user.service.js";
import UserSessionService from "../../services/userSession.service.js";

class MainViewController{
    renderPage = async (req: Request, res: Response, next: NextFunction)=>{
        console.log(req.userSession);
        res.render("main", {
            layout: "layout",
            "user": req.userSession,
        }, (err, html)=>{
            console.log("error:", err);
            res.send(html);
            
        });
    }
}

export default new MainViewController();