import express from "express";
import hbs from "express-hbs";
import path from "path";


const app = express();

const __dirname = import.meta.dirname;
app.use(express.static(path.join(__dirname, "../../public")));
app.engine('hbs', hbs.express4({partialsDir: path.join(__dirname, "../../views/partials"), layoutsDir: path.join(__dirname, "../../views/layouts")}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, "../../views"));


app.get("/", (req, res)=>{
    res.render("index", {layout: "layout", scripts: "scripts"});
})

export default app;