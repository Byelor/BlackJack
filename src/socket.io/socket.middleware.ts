import type { Socket } from "socket.io";
import cookie from "cookie";
import userSessionService from "../express/services/userSession.service.js";
import type { SocketData } from "./socket.types.js";

type SocketWithData = Socket & { data: SocketData };


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
    socket.data.userSession = session;
    next();
};
