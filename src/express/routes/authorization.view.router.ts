import { Router } from "express";
import AuthorizationViewController from "../views/controllers/authorization.view.controller.js";
 
class AuthorizationViewRouter{
    router: Router = Router();

    constructor()
    {
        this.initialRoutes();
    }
    initialRoutes(){
        this.router.get("/login", AuthorizationViewController.renderLoginPage);
    }
}
export default new AuthorizationViewRouter().router;