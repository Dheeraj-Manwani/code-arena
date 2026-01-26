import { Request, Response } from "express";
import * as contestService from "../service/contest.service";
import { sendSuccess } from "../util/response";

export const getDashboardFeed = async (_req: Request, res: Response) => {
  const feed = await contestService.getDashboardFeed();
  return sendSuccess(res, feed, 200);
};
