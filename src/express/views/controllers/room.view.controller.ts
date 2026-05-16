import type { Request, Response, NextFunction } from "express";
class RoomViewController{
    RenderRoomsPage = async (req: Request, res: Response, next: NextFunction)=>{
        res.render("rooms", {layout: "layout", });
    }
}
export default new RoomViewController();