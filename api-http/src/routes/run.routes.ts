import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import * as runController from "../controller/run.controller";

const router = Router();

router.post("/", authenticateToken, runController.runCode);

export default router;