import type { Request, Response } from "express";
import { EXPIRATION_TIME } from "./expirationTime.helper.js";
const setCookie = async (req: Request, res: Response)=>{
    const sessionToken = req.query["sessionToken"];
    res.cookie("sessionToken", sessionToken, {
        maxAge: EXPIRATION_TIME.cookie,
        path: "/",
        httpOnly: true
    })
    res.redirect("/main");
    
}
export default setCookie;