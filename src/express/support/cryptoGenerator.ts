import crypto from "node:crypto";

export default class CryptoGenerator{
    generated: string;
    constructor(length: number)
    {
        this.generated = crypto.randomBytes(16).toString('hex');
    }
}