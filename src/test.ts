import roomRedisRepository from "./express/repositories/room.redis.repository.js";
import RedisClient from "./database/redis.js";
await RedisClient.connect();


const meta = await roomRedisRepository.getRoomMeta("qwerty");
console.log(meta);