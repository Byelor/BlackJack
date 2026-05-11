import { Router } from "express";
import AuthorizationApiController from "../controllers/authorization.api.controller.js";
class AuthorizationApiRouter{
    router: Router = Router();
    constructor()
    {
        this.initialRoutes();
    }
    initialRoutes(){
        this.router.post("/login", AuthorizationApiController.login);
    }
}
export default new AuthorizationApiRouter().router;