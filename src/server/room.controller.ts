import RoomService from "./service.js";
import type {Request, Response, NextFunction} from "express";

class RoomController{
    renderRoom(req: Request, res: Response, next: NextFunction){
        //проверки всякие
        res.render("room", {
            layout: "layout"
        }, (err, html)=>{console.log("Кто-то зашел в комнату!");
            res.send(html);
            
        });
    }
}

export default new RoomController();