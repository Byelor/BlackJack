import type UserSession from "../express/models/userSession.dto.ts";
declare global{
    namespace Express{
        interface Request{
            userSession?: User | null;
        }
    }
}