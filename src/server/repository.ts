class Repository{
    rooms = new Map();
    getRoom = async(roomId: number)=>{
        return this.rooms.get(roomId);
    }
    constructor(){
        this.rooms.set(2, {players: [{balance: 500, hand: [], userId: 1}]});
    }
}

export default new Repository();