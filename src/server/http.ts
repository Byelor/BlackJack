import app from "./express.js";
import http from "node:http";

const server = http.createServer(app);

export default server;