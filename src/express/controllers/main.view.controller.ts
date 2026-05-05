import type {Request, Response, NextFunction} from "express";
import UserService from "../services/user.service.js";

class MainViewController{
    renderPage = async (req: Request, res: Response, next: NextFunction)=>{
        const sessionToken = req.cookies["sessionToken"];
        const user = await UserService.getUserByToken(sessionToken);
        console.log(user);
        res.render("room", {
            layout: "layout",
            user: user
        }, (err, html)=>{
            console.log(err);
            console.log("Кто-то зашел в комнату!", user ? user["name"]: "");
            res.send(html);
            
        });
    }
}

export default new MainViewController();