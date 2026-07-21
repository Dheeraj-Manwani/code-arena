import { Router } from "express";
import { authenticateToken, requireCreator } from "../middleware/auth";
import * as adminLearnController from "../controller/adminLearn.controller";

/**
 * The learn-path builder (LEARN_PATHS.md Phase 2).
 *
 * Every route is creator-gated. These responses describe curriculum structure
 * and carry problem/MCQ metadata; the learner-facing equivalents in Phase 3 are
 * a different router with a different projection, deliberately not a
 * re-authorised version of these (PRACTICE_MODE §4.4).
 */
const router = Router();

router.use(authenticateToken, requireCreator);

// Paths
router.get("/paths", adminLearnController.listPaths);
router.post("/paths", adminLearnController.createPath);
router.get("/paths/:pathId", adminLearnController.getPath);
router.patch("/paths/:pathId", adminLearnController.updatePath);
router.delete("/paths/:pathId", adminLearnController.archivePath);
router.get("/paths/:pathId/validate", adminLearnController.validatePath);
router.get("/paths/:pathId/impact", adminLearnController.getPathImpact);

// Modules
router.post("/paths/:pathId/modules", adminLearnController.createModule);
router.patch("/modules/:moduleId", adminLearnController.updateModule);
router.delete("/modules/:moduleId", adminLearnController.deleteModule);
router.patch("/modules/:moduleId/order", adminLearnController.reorderModule);

// Lessons
router.post("/modules/:moduleId/lessons", adminLearnController.createLesson);
router.patch("/lessons/:lessonId", adminLearnController.updateLesson);
router.delete("/lessons/:lessonId", adminLearnController.deleteLesson);
router.patch("/lessons/:lessonId/order", adminLearnController.reorderLesson);

// Questions
router.post("/lessons/:lessonId/questions", adminLearnController.attachQuestion);
router.patch("/questions/:questionId", adminLearnController.updateQuestion);
router.delete("/questions/:questionId", adminLearnController.detachQuestion);
router.patch("/questions/:questionId/order", adminLearnController.reorderQuestion);

// Picker support — why a problem may not be addable (§5.6).
router.get("/problems/:problemId/usage", adminLearnController.getProblemUsage);

export default router;
