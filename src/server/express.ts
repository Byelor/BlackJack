import express from "express";
import hbs from "express-hbs";
import path from "path";
import ViewsRouter from "../express/routes/views.router.js";
import cp from "cookie-parser";

import AuthorizationMiddleware from "../express/middlewares/authentification.js";
import authorizationRouter from "../express/routes/authorization.router.js";


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


//routes
app.use("/authorization", authorizationRouter);

app.use("/main", ViewsRouter);
app.get("/", (req, res)=>{
    console.log(req.user);
    res.render("index", {layout: "layout", scripts: "scripts", user: req.user});
})

export default app;