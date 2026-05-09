import pool from "../../database/database.js";
import type User from "../models/user.dto.js";

class UserPGRepository{
    getUserById = async (userId: number)=>{
        const data = await pool.query(`SELECT user_id as userId, email, name, hpassword, balance FROM users WHERE id=$1;`, [userId]);
        const rows = data.rows;
        return rows[0] as User;
    }
    setUser = async (user: User)=>{
        const answer = await pool.query(`INSERT INTO users(email, name, hpassword, balance) VALUES($1,$2,$3,$4)`,[user.email, user.name, user.hpassword, user.balance]);
    }
    getUserByEmail = async (email: string)=>{
        const data = await pool.query(`SELECT user_id as userId, email, name, hpassword, balance FROM users WHERE email=$1;`, [email]);
        const rows = data.rows;
        return rows[0] as User;    
    }
    getUserByName = async (name: string)=>{
        const data = await pool.query(`SELECT user_id as userId, email, name, hpassword, balance FROM users WHERE name=$1;`, [name]);
        const rows = data.rows;
        return rows[0] as User;      
    }
}
export default new UserPGRepository();