export default class User{
    name: string;
    email: string;
    userId: number;
    balance: number;
    constructor(name: string, userId: number, email: string, balance: number=500)
    {
        this.name = name;
        this.userId = userId;
        this.balance = balance;
        this.email = email;
    }
}