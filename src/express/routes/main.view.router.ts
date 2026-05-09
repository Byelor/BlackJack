import {Router} from "express";
import MainViewController from "../views/controllers/main.view.controller.js";


class MainViewRouter{
    router: Router = Router();
    constructor()
    {
        this.initialRoutes();
    }
    initialRoutes(){
        this.router.get("", MainViewController.renderPage);
    }
}
export default new MainViewRouter().router;