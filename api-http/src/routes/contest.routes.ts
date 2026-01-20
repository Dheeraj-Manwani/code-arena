import { Router } from "express";
import { authenticateToken, requireCreator } from "../middleware/auth";
import * as contestController from "../controller/contest.controller";

const router = Router();


router.get("/", authenticateToken, contestController.getAllContests);

// TODO: if normal user tries to access this endpoint before the contest starts ?
router.get("/:contestId", authenticateToken, contestController.getContestById);

router.post(
  "/",
  authenticateToken,
  requireCreator,
  contestController.createContest
);

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

router.patch(
  "/:contestId",
  authenticateToken,
  requireCreator,
  contestController.updateContest
);

router.post(
  "/:contestId/link/mcq",
  authenticateToken,
  requireCreator,
  contestController.linkMcqToContest
);

router.post(
  "/:contestId/link/dsa",
  authenticateToken,
  requireCreator,
  contestController.linkDsaToContest
);

router.delete(
  "/:contestId/link/mcq/:questionId",
  authenticateToken,
  requireCreator,
  contestController.unlinkMcqFromContest
);

router.delete(
  "/:contestId/link/dsa/:problemId",
  authenticateToken,
  requireCreator,
  contestController.unlinkDsaFromContest
);

router.patch(
  "/:contestId/reorder",
  authenticateToken,
  requireCreator,
  contestController.reorderContestQuestions
);

export default router;
