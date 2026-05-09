import crypto from "node:crypto";

class CryptoGenerator{
    generateSessionToken = (length: number)=>{
        return crypto.randomBytes(length).toString('hex');
    }
}
export default new CryptoGenerator();
