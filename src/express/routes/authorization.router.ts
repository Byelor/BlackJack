import { Router } from "express";
import AuthorizationViewController from "../controllers/authorization.view.controller.js";
 
class AuthorizationRouter{
    router: Router = Router();

    constructor()
    {
        this.initialRoutes();
    }
    initialRoutes(){
        this.router.get("/login", AuthorizationViewController.renderLoginPage);
    }
}
export default new AuthorizationRouter().router;