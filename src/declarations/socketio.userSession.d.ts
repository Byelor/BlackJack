import type UserSession from "../express/models/userSession.dto.ts";
declare module "socket.io"{
    interface Socket{
        userSession?: UserSession | null;
    }
}