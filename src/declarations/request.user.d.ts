import type User from "../game/user.dto.ts";
declare global{
    namespace Express{
        interface Request{
            user?: User | null;
        }
    }
}