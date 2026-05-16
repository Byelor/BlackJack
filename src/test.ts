import roomRedisRepository from "./express/repositories/room.redis.repository.js";
import RedisClient from "./database/redis.js";
await RedisClient.connect();
const row = await roomRedisRepository.getRoomMetas();
console.log(row);


