import {server} from "./server/server.js";

server.listen(process.env.PORT, ()=>{
    console.log(`server starts listening on http://127.0.0.1:${process.env.PORT}`);
})


