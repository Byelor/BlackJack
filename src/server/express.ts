import express from "express";
import hbs from "express-hbs";
import path from "path";
import ViewsRouter from "../express/routes/main.view.router.js";
import cp from "cookie-parser";

import AuthorizationMiddleware from "../express/middlewares/authentification.middleware.js";
import authorizationViewRouter from "../express/routes/authorization.view.router.js";
import authorizationApiRouter from "../express/api/routers/authorization.api.router.js";

//configuration
const app = express();
const __dirname = import.meta.dirname;
app.use(express.static(path.join(__dirname, "../../public")));
app.engine('hbs', hbs.express4({partialsDir: path.join(__dirname, "../../views/partials"), layoutsDir: path.join(__dirname, "../../views/layouts")}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, "../../views"));




//middlware
app.use(cp());

app.use(AuthorizationMiddleware.checkUserByCookie);

app.use("/authorization", authorizationViewRouter);

app.use("/main", ViewsRouter);

app.use(express.json());

app.use("/api/authorization", authorizationApiRouter);
//routes


export default app;