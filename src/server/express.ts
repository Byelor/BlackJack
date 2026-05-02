import express from "express";
import hbs from "express-hbs";
import path from "path";
import RoomRouter from "./room.view.router.js";

import Repository from "./userSessions.js";


const app = express();

const __dirname = import.meta.dirname;
app.use(express.static(path.join(__dirname, "../../public")));
app.engine('hbs', hbs.express4({partialsDir: path.join(__dirname, "../../views/partials"), layoutsDir: path.join(__dirname, "../../views/layouts")}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, "../../views"));





app.use("/setCookie", (req,res, next)=>{
    res.setHeader("set-cookie", "sessionToken=QWERTY; expires=Thu, 31 Dec 2027 6:00:00 IST; path=/");
    Repository.add("QWERTY", {"userId": 4, "balance": 5000, "email": "zaqw1234bmbmbm@gmail.com", "name": "vkpvpk"});
    next();
})


app.use("/", (req, res, next)=>{
    console.log(req.headers["cookie"]);
    next();
});

app.use("/room", RoomRouter);

app.get("/", (req, res)=>{
    res.render("index", {layout: "layout", scripts: "scripts"});
})

export default app;