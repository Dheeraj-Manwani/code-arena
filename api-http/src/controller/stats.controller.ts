import { Request, Response } from "express";
import * as statsService from "../service/stats.service";
import { sendSuccess } from "../util/response";

export const getStats = async (req: Request, res: Response) => {
    const stats = await statsService.getStats();
    return sendSuccess(res, stats, 200);
};
