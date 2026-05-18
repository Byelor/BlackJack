import {server} from "./server/server.js";
import redisClient from "./database/redis.js";
import "./socket.io/socket.io.js"; // регистрируем все socket.io обработчики

server.listen(process.env.PORT, ()=>{
    console.log(`server starts listening on http://127.0.0.1:${process.env.PORT}`);
});

redisClient.connect();

