import express from "express";
import hbs from "express-hbs";
import path from "path";
import cp from "cookie-parser";

import authorizationViewRouter from "../express/views/routes/authorization.view.router.js";
import MainViewRouter from "../express/views/routes/main.view.router.js";
import roomViewRouter from "../express/views/routes/room.view.router.js";

import authorizationApiRouter from "../express/api/routers/authorization.api.router.js";
import roomsApiRouter from "../express/api/routers/rooms.api.router.js";

import AuthorizationMiddleware from "../express/middlewares/authentification.middleware.js";
import refreshCookieMiddleware from "../express/middlewares/refreshCookie.middleware.js";
import checkForAuthentificationMiddleware from "../express/middlewares/checkForAuthentification.middleware.js";
import setCookie from "../express/support/setCookie.support.js";

import checkForAuthAPIMiddleware from "../express/middlewares/checkForAuthAPI.middleware.js";

import HandlebarsHelpers from "../../handlebars_helpers/registerHelpers.js";


//configuration
const app = express();
const __dirname = import.meta.dirname;
app.use(express.static(path.join(__dirname, "../../public")));
app.engine('hbs', hbs.express4({partialsDir: path.join(__dirname, "../../views/partials"), layoutsDir: path.join(__dirname, "../../views/layouts")}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, "../../views"));
HandlebarsHelpers(hbs);


app.get('/setcookie', setCookie);

//middlware
app.use(cp());

app.use(AuthorizationMiddleware.checkUserByCookie);
app.use(refreshCookieMiddleware.refreshSession);

//routes

app.use("/authorization", authorizationViewRouter);

app.use("/lobby", checkForAuthentificationMiddleware.checkUser, roomViewRouter);   
app.use("/main", MainViewRouter);

app.use(express.json());
app.use("/api/lobby", checkForAuthAPIMiddleware.checkUser, roomsApiRouter);
app.use("/api/authorization", authorizationApiRouter);

app.use("/", (req, res)=>{
    res.redirect("/main");
})  

export default app;