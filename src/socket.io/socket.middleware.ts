import type { Socket } from "socket.io";
import cookie from "cookie";
import userSessionService from "../express/services/userSession.service.js";
import type { SocketData } from "./socket.types.js";

type SocketWithData = Socket & { data: SocketData };

/**
 * Middleware подключения: читает куку, проверяет сессию в Redis,
 * сохраняет userSession и sessionToken в socket.data.
 * Вызывается один раз при установке соединения.
 */
export const authenticateSocket = async (
    socket: SocketWithData,
    next: (err?: Error) => void
) => {
    const cookies      = cookie.parse(socket.handshake.headers.cookie || "");
    const sessionToken = cookies["sessionToken"];

    if (!sessionToken) {
        socket.emit("SESSION_INVALID");
        return next(new Error("Not authenticated"));
    }

    const session = await userSessionService.getUserSessionByToken(sessionToken);
    if (!session) {
        socket.emit("SESSION_INVALID");
        return next(new Error("Session invalid or expired"));
    }

    socket.data.userSession  = session;
    socket.data.sessionToken = sessionToken;
    socket.data.currentRoomId = null;

    next();
};

/**
 * Проверяет сессию перед каждым ивентом.
 * Использовать как socket.use() внутри connection handler.
 */
export const guardSession = async (
    socket: SocketWithData,
    next: (err?: Error) => void
) => {
    const token = socket.data.sessionToken;
    if (!token) {
        socket.emit("SESSION_INVALID");
        socket.disconnect();
        return;
    }
    const session = await userSessionService.getUserSessionByToken(token);
    if (!session) {
        socket.emit("SESSION_INVALID");
        socket.disconnect();
        return;
    }
    // Обновляем данные сессии (баланс мог измениться)
    socket.data.userSession = session;
    next();
};
