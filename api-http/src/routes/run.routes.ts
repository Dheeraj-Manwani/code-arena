import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import { runRateLimiter } from "../middleware/rate-limit";
import * as runController from "../controller/run.controller";

const router = Router();

router.post("/", authenticateToken, runRateLimiter, runController.runCode);

export default router;