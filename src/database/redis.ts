import {createClient} from "redis";

const client = createClient();

client.on("error", (err)=>{
    console.log(`reddis error: ${err}`);
})
client.on("ready", ()=>{console.log("connected to redis!")});

export default client;