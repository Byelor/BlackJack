import type { Request, Response, NextFunction } from "express";
import UserService from "../../services/user.service.js";
import userSessionService from "../../services/userSession.service.js";
import userService from "../../services/user.service.js";
class AuthorizationApiController{
    login = async (req: Request, res: Response, next: NextFunction)=>{
        if(!req.body)
        {
            res.json({"Message": "Empty req.body"});
            return;
        }
        const {identifier, password} : Record<string, string> = req.body;
        if(!identifier || !password){
            res.status(400).json({"message": "Empty values for identifier or password!"});
            return;
        }
        const userSession = await userService.authenticate(identifier, password);
        if(!userSession){
            console.log("нет юзера с таким идентификатором, либо пароль не подошел, доделать, сделать описание точнвым");
            res.status(404).json({"message": "нет юзера с таким идентификатором, либо пароль не подошел, доделать, сделать описание точнвым"});
            return;
        }
        
        const session = await userSessionService.setSession(userSession);
        if(!session)
        {
            res.status(500).json({"message": "проблема с бдшкой, поменять статус код в коде"});
            return;
        }
        res.status(202).json({"message": "all good", "session": session});
    }
    register = async (req: Request, res: Response, next: NextFunction)=>{
        
    }

}
export default new AuthorizationApiController();