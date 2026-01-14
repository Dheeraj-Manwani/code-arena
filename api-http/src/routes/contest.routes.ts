import { Router } from "express";
import { authenticateToken, requireCreator } from "../middleware/auth";
import * as contestController from "../controller/contest.controller";

const router = Router();

router.post(
  "/",
  authenticateToken,
  requireCreator,
  contestController.createContest
);

router.get("/:contestId", authenticateToken, contestController.getContestById);

router.post(
  "/:contestId/mcq",
  authenticateToken,
  requireCreator,
  contestController.addMcq
);

router.post(
  "/:contestId/dsa",
  authenticateToken,
  requireCreator,
  contestController.addDsa
);

export default router;
