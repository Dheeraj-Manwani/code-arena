import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import * as dashboardController from "../controller/dashboard.controller";

const router = Router();

router.get("/dashboard-feed", authenticateToken, dashboardController.getDashboardFeed);

export default router;
