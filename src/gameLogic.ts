import {Deck} from "./deck.js";
class Game{
    gameDeck: Deck;
    room: Room;
    constructor(deckSize: number)
    {
        this.gameDeck = new Deck(deckSize);
        this.room = new Room();
        //функция для шафла
    }
    cycle
}

class Room{
    
    private room: User[] = [];
    private static MAX_USERS: number = 6;
    private playersCounter: number = 0;
    private isFull = false;
    private roomId?: number;

    checkForFull = () =>{
        return this.playersCounter === Room.MAX_USERS;
    }
    
    addUser = async (player: User) => {
        if(this.checkForFull())
        {
            console.log("This room is full!");
            return;
        }
        this.room.push(player);
        this.playersCounter++;
    }
    deleteUser = async (player: User)=>{
        if(this.room.includes(player)){
            this.room.splice(this.room.indexOf(player));
            this.playersCounter--;
        }
        else{
            console.log("There is no this player in room!");
        }
        
    }
}

class User{
    userId?: number;
    name: string;
    balance: number = 500;
    constructor(name: string){
        this.name = name;
    }
}

class Player{
    user: User;
    lot: number;
    hand: Card[];
}