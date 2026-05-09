import UserPgRepository from "../repositories/user.pg.repository.js";
import type User from "../models/user.dto.js";
class UserService{

    getUserById = async (userId: number)=>{
        return UserPgRepository.getUserById(userId);
    }
    setNewUser(user: User)
    {
        return UserPgRepository.setUser(user);
    }

}

export default new UserService();