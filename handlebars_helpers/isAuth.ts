import type UserSession from "../src/express/models/userSession.dto.js";
export const isAuth = (hbsInstance: any)=>{
    hbsInstance.registerHelper("isAuth", function (this: any, userSession: UserSession, options: any){
    if(userSession)
    {
        return options.fn(this);
    }
    else{
        return options.inverse(this);
    }
})};