import {server} from "./server/server.js";

server.listen(process.env.PORT, ()=>{
    console.log(`server starts listening on port ${process.env.PORT}`);
})