import type User from "../game/User.js";

export class UserRepository{
    base: Map<string, User> = new Map();
    add(sessionToken: string, user: User){
        this.base.set(sessionToken, user);
    }
    get(sessionToken: string){
        return this.base.get(sessionToken);
    }
}
export default new UserRepository();