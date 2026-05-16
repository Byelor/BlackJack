import roomRedisRepository from "./express/repositories/room.redis.repository.js";
import RedisClient from "./database/redis.js";
await RedisClient.connect();
const row = await roomRedisRepository.getRoomMetas();
console.log(row);

await roomRedisRepository.createRoom("qwerty", 4, {
    roomId: "qwerty",
    name: "hello",
    description: "salam",
    maxPlayersCount: 5,
    currentPlayersCount: 1,
    isPrivate: true,
    password: "12345",
});

await roomRedisRepository.deleteRoom("qwerty");