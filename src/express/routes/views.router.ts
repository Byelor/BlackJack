import {Router} from "express";
import MainViewController from "../controllers/main.view.controller.js";


class ViewsRouter{
    router: Router = Router();
    constructor()
    {
        this.initialRoutes();
    }
    initialRoutes(){
        this.router.get("", MainViewController.renderPage);
    }
}
export default new ViewsRouter().router;