import Service from "./service.js";
import type {betArgs} from "./eventArgs.js";
class Controller{
    bet = async (obj: betArgs, ws: any)=>{
        console.log(obj);
        Service.bet( obj.userId, obj.betAmount, obj.roomId);
    };
    
}
export default new Controller();