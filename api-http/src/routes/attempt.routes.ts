import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import * as attemptController from "../controller/attempt.controller";

const router = Router();

router.get("/", authenticateToken, attemptController.listAttempts);
router.get(
  "/:attemptId/results",
  authenticateToken,
  attemptController.getAttemptResults
);

export default router;
