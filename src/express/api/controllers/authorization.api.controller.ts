import type { Request, Response, NextFunction } from "express";
import UserService from "../../services/user.service.js";
import userSessionService from "../../services/userSession.service.js";
class AuthorizationApiController{
    login = async (req: Request, res: Response, next: NextFunction)=>{
        //достать данные из тела запроса
        const currentUser = req.user;
        //добавить проверку, существует ли пользователь
        
        //взять данные пользователя из бд и поместить в сущность сессии
        //поместить сессию в метод ниже 
        const session = userSessionService.setSession();
        res.setHeader("set-Cookie", )
    }
}
export default new AuthorizationApiController();