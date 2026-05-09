import type User from "../express/models/user.dto.ts";
declare global{
    namespace Express{
        interface Request{
            user?: User | null;
        }
    }
}