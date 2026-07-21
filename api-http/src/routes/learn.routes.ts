import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import { learnAnswerRateLimiter } from "../middleware/rate-limit";
import * as learnController from "../controller/learn.controller";

/**
 * Learner-facing learn routes (LEARN_PATHS.md Phase 3).
 *
 * Auth-walled, consistent with the settled access decision in PRACTICE_MODE.
 * These are **not** re-authorised versions of the creator routes in
 * `adminLearn.routes.ts` — they run against a separate repository with a
 * separate projection, because the creator one carries authoring metadata and
 * the learner one must never grow a field that leaks an answer (§5.7).
 *
 * Phase 4 adds the write endpoints below. They are all user-scoped: every one
 * derives its target from `req.userId`, so a request can only ever change the
 * caller’s own progress.
 */
const router = Router();

router.use(authenticateToken);

router.get("/paths", learnController.getGallery);
router.get("/paths/:slug", learnController.getPath);
router.get("/lessons/:lessonId", learnController.getLesson);

router.put("/questions/:questionId/complete", learnController.selfMarkQuestion);
router.delete("/questions/:questionId/complete", learnController.unmarkQuestion);
// Rate limiter after authenticateToken so it can key on userId (§5.7).
router.post(
  "/questions/:questionId/answer",
  learnAnswerRateLimiter,
  learnController.answerMcq,
);
router.post("/modules/:moduleId/unlock", learnController.unlockModule);
router.post("/paths/:slug/reset", learnController.resetPath);

// Momentum loop (Phase 6).
router.get("/paths/:slug/celebrations", learnController.getCelebrations);
router.get("/paths/:slug/questions/:questionId/next", learnController.getNextQuestion);
router.post("/lessons/:lessonId/celebrated", learnController.acknowledgeLesson);
router.post("/modules/:moduleId/celebrated", learnController.acknowledgeModule);

export default router;
