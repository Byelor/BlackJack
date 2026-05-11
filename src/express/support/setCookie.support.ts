import type { Request, Response } from "express";

const setCookie = async (req: Request, res: Response)=>{
    const sessionToken = req.query["sessionToken"];
    res.cookie("sessionToken", sessionToken, {
        maxAge: 12*60*60*1000,
        path: "/",
        httpOnly: true
    })
    res.redirect("/main");
    
}
export default setCookie;