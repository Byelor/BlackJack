import pool from "../../database/database.js";
import type User from "../models/user.dto.js";

class UserPGRepository{
    getUserById = async (userId: number)=>{
        const data = await pool.query(`SELECT user_id as "userId", email, name, hpassword, balance FROM users WHERE id=$1;`, [userId]);
        const rows = data.rows;
        return rows.length > 0 ? (rows[0] as User) : null;
    }
    setUser = async (user: User)=>{
        const answer = await pool.query(`INSERT INTO users(email, name, hpassword, balance) VALUES($1,$2,$3,$4) RETURNING user_id`,[user.email, user.name, user.hpassword, user.balance]);
        return Number(answer.rows[0]["user_id"]);
    }
    getUserByEmail = async (email: string)=>{
        const data = await pool.query(`SELECT user_id as "userId", email, name, hpassword, balance FROM users WHERE email=$1;`, [email]);
        const rows = data.rows;
        return rows.length > 0 ? (rows[0] as User) : null;
    }
    getUserByName = async (name: string)=>{
        const data = await pool.query(`SELECT user_id as "userId", email, name, hpassword, balance FROM users WHERE name=$1;`, [name]);
        const rows = data.rows;
        return rows.length > 0 ? (rows[0] as User) : null;
    }
    getUserByEmailOrName = async (nameOrEmail: string)=>{
        const data = await pool.query(`SELECT user_id as "userId", email, name, hpassword, balance FROM users WHERE name=$1 OR email=$1 LIMIT 1;`, [nameOrEmail]);
        const rows = data.rows;
        return rows.length > 0 ? (rows[0] as User) : null;
    }
    isUserCreated = async (identifier: string)=>{
        const data = await pool.query(`SELECT user_id as "userId", email, name, hpassword, balance FROM users WHERE name=$1 OR email=$1 LIMIT 1;`, [identifier]);
        return data.rows.length > 0 ? true : false;
    }
    updateBalance = async (userId: number, newBalance: number)=>{
        await pool.query(`UPDATE users SET balance=$1 WHERE user_id=$2;`, [newBalance, userId]);
    }
}
export default new UserPGRepository();