import RoomService from "./service.js";
import type {Request, Response, NextFunction} from "express";
import cookie from "cookie";
import Repository from "./userSessions.js";

import cp from "cookie-parser";
class RoomController{
    renderRoom(req: Request, res: Response, next: NextFunction){
        //проверки всякие
        
        const cookieObj = cookie.parseCookie(req.headers["cookie"] || "");
        const user = Repository.get(cookieObj["sessionToken"] || "");
        res.render("room", {
            layout: "layout",
            user: user
        }, (err, html)=>{console.log("Кто-то зашел в комнату!", user ? user.name : "");
            res.send(html);
            
        });
    }
}

export default new RoomController();