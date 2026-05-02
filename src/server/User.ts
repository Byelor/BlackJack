class User{
    name: string;
    userId: number;
    balance: number;
    constructor(name: string, userId: number, balance: number=500)
    {
        this.name = name;
        this.userId = userId;
        this.balance = balance;
    }
}