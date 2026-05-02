import {EventEmitter} from "node:events";
import Controller from "./controller.js";
const myEmitter = new EventEmitter();

myEmitter.on("bet", Controller.bet);

myEmitter.on("hit", Controller.hit);

myEmitter.on("stand", Controller.stand);

myEmitter.on("doubleDown", Controller.doubleDown);

myEmitter.on("split", Controller.split);

export default myEmitter;