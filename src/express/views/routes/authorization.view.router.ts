import { Router } from "express";
import AuthorizationViewController from "../controllers/authorization.view.controller.js";
 
class AuthorizationViewRouter{
    router: Router = Router();

    constructor()
    {
        this.initialRoutes();
    }
    initialRoutes(){
        this.router.get("/login", AuthorizationViewController.renderLoginPage);
        this.router.get("/register", AuthorizationViewController.renderRegistrationPage);
    }
}
export default new AuthorizationViewRouter().router;