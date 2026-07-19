import { Router } from "express";
import { authenticateToken, requireCreator } from "../middleware/auth";
import * as problemController from "../controller/problem.controller";

const router = Router();

// Creator-only authoring endpoints. These return answer keys and hidden test
// data — never loosen `requireCreator` here to serve the catalogue; the public
// catalogue has its own projection below (PRACTICE_MODE_AND_NAVIGATION.md §4.4).
router.get("/mcq", authenticateToken, requireCreator, problemController.getAllMcqQuestions);
router.get("/dsa", authenticateToken, requireCreator, problemController.getAllDsaProblems);
router.post("/mcq", authenticateToken, requireCreator, problemController.createMcqQuestion);
router.post("/dsa", authenticateToken, requireCreator, problemController.createDsaProblem);
router.get("/mcq/:questionId", authenticateToken, requireCreator, problemController.getMcqQuestionById);
router.get("/dsa/:problemId", authenticateToken, requireCreator, problemController.getDsaProblemById);
router.patch("/mcq/:questionId", authenticateToken, requireCreator, problemController.updateMcqQuestion);
router.patch("/dsa/:problemId", authenticateToken, requireCreator, problemController.updateDsaProblem);

// Public practice catalogue. `/tags` is declared before `/:slug` so the literal
// segment isn't swallowed by the param route.
router.get("/", authenticateToken, problemController.getPracticeProblems);
router.get("/tags", authenticateToken, problemController.getPracticeTags);
router.get("/:slug", authenticateToken, problemController.getPracticeProblemBySlug);

export default router;
