import {server} from "./server/server.js";
import redisClient from "./database/redis.js";
import "./socket.io/socket.io.js";
import roomRedisRepository from "./express/repositories/room.redis.repository.js";

const bootstrap = async () => {
    try {
        await redisClient.connect();
    }
    catch (err) {
        console.error(`failed to connect to redis on startup: ${err}`);
        process.exit(1);
    }

    try {
        const removedRoomsCount = await roomRedisRepository.deleteAllRooms();
        if (removedRoomsCount > 0) {
            console.log(`deleted ${removedRoomsCount} rooms from Redis on startup`);
        }
    }
    catch (err) {
        console.error(`failed to clear redis rooms on startup: ${err}`);
    }

    server.listen(process.env.PORT, () => {
        console.log(`server starts listening on http://127.0.0.1:${process.env.PORT}`);
    });
};

void bootstrap();
