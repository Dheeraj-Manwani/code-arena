import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import * as problemController from "../controller/problem.controller";
import * as submissionController from "../controller/submission.controller";

const router = Router();

router.get("/:problemId", authenticateToken, problemController.getProblemById);

router.post(
  "/:problemId/submit",
  authenticateToken,
  submissionController.submitDsa
);

export default router;
