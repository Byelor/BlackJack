import Repository from "./repository.js";
class Service{
    bet = async(userId: number, amount: number, roomId: number)=>{
        const room = await Repository.getRoom(roomId);
        room.players.forEach((el: any)=>{
            if(el.userId === userId)
            {   
                console.log(`Баланс был: ${el.balance}`);
                el.balance -= amount;
                console.log(`Баланс стал: ${el.balance}`);
            }
        });
    }
}

export default new Service();