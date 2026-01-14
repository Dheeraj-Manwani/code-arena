import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import * as submissionController from "../controller/submission.controller";

const router = Router();

router.post(
  "/contests/:contestId/mcq/:questionId/submit",
  authenticateToken,
  submissionController.submitMcq
);

export default router;
