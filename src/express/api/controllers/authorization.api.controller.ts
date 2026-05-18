import type { Request, Response, NextFunction } from "express";
import userSessionService from "../../services/userSession.service.js";
import userService from "../../services/user.service.js";
import roomService from "../../services/room.service.js";

class AuthorizationApiController{
    /**
     * Выкидывает пользователя из Socket.IO и его текущей Redis-комнаты.
     * Вызывается при логине/регистрации с тем же аккаунтом (TODO стр. 44-47).
     */
    private kickFromRoom = async (userId: number) => {
        try {
            const { socketio } = await import("../../../server/server.js");
            const sockets = await socketio.fetchSockets();
            for (const s of sockets) {
                if ((s.data as any)?.userSession?.userId === userId) {
                    s.emit("FORCE_DISCONNECT", { reason: "Выполнен вход с другого устройства" });
                    s.disconnect();
                }
            }
        } catch { /* socket может быть не инициализирован */ }
        // Убираем из Redis-комнаты в любом случае
        await roomService.removeUserFromCurrentRoom(userId);
    };

    login = async (req: Request, res: Response, next: NextFunction) => {
        if (!req.body) { res.json({ message: "Empty req.body" }); return; }
        const { identifier, password }: Record<string, string> = req.body;
        if (!identifier || !password) {
            res.status(400).json({ message: "Пустые значения для identifier или password" });
            return;
        }
        const userSession = await userService.authenticate(identifier, password);
        if (!userSession) {
            res.status(404).json({ message: "Неверный логин или пароль" });
            return;
        }
        // Кик старой сессии
        await this.kickFromRoom(userSession.userId);

        const token = await userSessionService.setSession(userSession);
        if (!token) {
            res.status(500).json({ message: "Ошибка при создании сессии" });
            return;
        }
        res.status(202).json({ message: "all good", sessionToken: token });
    };

    register = async (req: Request, res: Response, next: NextFunction) => {
        if (!req.body) { res.json({ message: "Empty req.body" }); return; }
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            res.status(400).json({ message: "Пустые значения для name, email или password" });
            return;
        }
        const userSession = await userService.addUser(name, email, password);
        if (!userSession) {
            res.status(400).json({ message: "Пользователь с такими данными уже существует" });
            return;
        }
        const token = await userSessionService.setSession(userSession);
        if (!token) {
            res.status(500).json({ message: "Ошибка при создании сессии" });
            return;
        }
        res.status(202).json({ message: "all good", sessionToken: token });
    };

    logout = async (req: Request, res: Response, next: NextFunction) => {
        const sessionToken = req.cookies["sessionToken"];
        if (!sessionToken) {
            res.status(400).json({ message: "Нет активной сессии" });
            return;
        }
        if (req.userSession?.userId) {
            await this.kickFromRoom(req.userSession.userId);
        }
        const result = await userSessionService.removeSessionByToken(sessionToken);
        if (!result) {
            res.status(400).json({ message: "Сессия не найдена" });
            return;
        }
        res.status(200).json({ message: "all good" });
    };
}
export default new AuthorizationApiController();