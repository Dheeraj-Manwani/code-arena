import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import * as profileController from "../controller/profile.controller";

const router = Router();

router.get("/profile", authenticateToken, profileController.getProfile);

export default router;
