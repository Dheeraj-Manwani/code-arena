import { Router } from "express";
import { authenticateToken, requireCreator } from "../middleware/auth";
import * as statsController from "../controller/stats.controller";

const router = Router();

router.get("/", authenticateToken, requireCreator, statsController.getStats);

export default router;
