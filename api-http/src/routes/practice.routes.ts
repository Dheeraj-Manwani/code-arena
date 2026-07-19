import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import { practiceSubmitRateLimiter } from "../middleware/rate-limit";
import * as practiceController from "../controller/practice.controller";

const router = Router();

// Keyed by the problem's own slug — practice has no ContestQuestion row to
// address, which is why none of the contest submit routes could be reused
// (PRACTICE_MODE_AND_NAVIGATION.md §4.8).
//
// The rate limiter sits after authenticateToken so it can key on userId (§4.3).
router.post(
  "/problems/:slug/submit",
  authenticateToken,
  practiceSubmitRateLimiter,
  practiceController.submitPracticeSolution,
);

router.get(
  "/problems/:slug/submissions",
  authenticateToken,
  practiceController.getPracticeHistory,
);

router.get("/problems/:slug/draft", authenticateToken, practiceController.getPracticeDraft);
router.put("/problems/:slug/draft", authenticateToken, practiceController.savePracticeDraft);

router.get(
  "/submissions/:submissionId",
  authenticateToken,
  practiceController.getPracticeSubmission,
);

export default router;
