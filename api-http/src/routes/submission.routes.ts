import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import * as submissionController from "../controller/submission.controller";

const router = Router();

router.post(
  "/contests/:contestId/mcq/:questionId/submit",
  authenticateToken,
  submissionController.submitMcq
);

router.post('/contests/:contestId/attempt', authenticateToken, submissionController.createAttempt)

router.get("/contests/:contestId/attempt/:attemptId", authenticateToken, submissionController.getContestAttempt);

router.put(
  "/contests/:contestId/attempt/:attemptId/draft/mcq/:questionId",
  authenticateToken,
  submissionController.saveMcqDraft
);

router.put(
  "/contests/:contestId/attempt/:attemptId/draft/dsa/:problemId",
  authenticateToken,
  submissionController.saveDsaDraft
);

export default router;
