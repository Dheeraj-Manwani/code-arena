import { Router } from "express";
import { authenticateToken, requireCreator } from "../middleware/auth";
import * as problemController from "../controller/problem.controller";
import * as submissionController from "../controller/submission.controller";

const router = Router();

router.get("/mcq", authenticateToken, requireCreator, problemController.getAllMcqQuestions);
router.get("/dsa", authenticateToken, requireCreator, problemController.getAllDsaProblems);
router.post("/mcq", authenticateToken, requireCreator, problemController.createMcqQuestion);
router.post("/dsa", authenticateToken, requireCreator, problemController.createDsaProblem);
router.get("/mcq/:questionId", authenticateToken, requireCreator, problemController.getMcqQuestionById);
router.get("/dsa/:problemId", authenticateToken, requireCreator, problemController.getDsaProblemById);
router.patch("/mcq/:questionId", authenticateToken, requireCreator, problemController.updateMcqQuestion);
router.patch("/dsa/:problemId", authenticateToken, requireCreator, problemController.updateDsaProblem);
router.get("/:problemId", authenticateToken, problemController.getProblemById);

router.post(
  "/:problemId/submit",
  authenticateToken,
  submissionController.submitDsa
);

export default router;
