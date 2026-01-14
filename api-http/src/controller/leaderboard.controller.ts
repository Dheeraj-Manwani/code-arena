import { Response } from "express";
import { AuthRequest } from "../types/express.d";
import * as leaderboardService from "../service/leaderboard.service";
import { sendSuccess } from "../util/response";
import { ContestNotFoundError } from "../errors/contest.errors";

export const getLeaderboard = async (req: AuthRequest, res: Response) => {
  const contestId = parseInt(String(req.params.contestId));
  if (isNaN(contestId)) {
    throw new ContestNotFoundError();
  }
  const leaderboard = await leaderboardService.getLeaderboard(contestId);
  return sendSuccess(res, leaderboard, 200);
};
