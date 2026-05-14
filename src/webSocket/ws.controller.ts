import {WebSocket} from "ws";
class WSController{

    bet = async(data: Object, ws: WebSocket)=>{
        console.log("hello");
    }
}
export default new WSController();