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
        this.router.post("/register", AuthorizationApiController.register);
        this.router.get("/logout", AuthorizationApiController.logout);
    }
}
export default new AuthorizationApiRouter().router;