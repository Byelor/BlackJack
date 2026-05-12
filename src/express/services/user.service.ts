import UserPgRepository from "../repositories/user.pg.repository.js";
import type User from "../models/user.dto.js";
import type UserSession from "../models/userSession.dto.js";
import userPgRepository from "../repositories/user.pg.repository.js";
function compare(str1: string, str2: string){
    return str1 === str2;
}
const UNKNOWN_USER_ID = -1000;
class UserService{

    getUserById = async (userId: number)=>{
        return await UserPgRepository.getUserById(userId);
    }
    setNewUser = async (user: User)=>{
        return await UserPgRepository.setUser(user);
    }
    getUserByEmail = async (email: string)=>{
        return await UserPgRepository.getUserByEmail(email);
    }
    authenticate = async (identifier: string, password: string)=>{
        const user = await UserPgRepository.getUserByEmailOrName(identifier);
        if(!user)
        {
            //throw new Error("There is no user with this login or email!");
            return null;
        }
        const isMatch = compare(password, user.hpassword);
        if(!isMatch){
            return null;
        }

        const {hpassword, ...userSession} = user;
        return userSession as UserSession;
    }
    
    addUser = async (name: string, email: string, password: string)=>{
        if(await userPgRepository.isUserCreated(name) || await userPgRepository.isUserCreated(email))
        {
            return null;
        }
        const user: User = {
            balance: 500,
            email: email,
            hpassword: password,
            name: name,
            userId: UNKNOWN_USER_ID
        }
        const userId = await userPgRepository.setUser(user);
        return {balance: user.balance, email: user.email, name: user.name, userId: userId};
    }
}

export default new UserService();