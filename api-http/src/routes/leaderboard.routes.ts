import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import * as leaderboardController from "../controller/leaderboard.controller";

const router = Router();

router.get(
  "/:contestId/leaderboard",
  authenticateToken,
  leaderboardController.getLeaderboard
);

export default router;
