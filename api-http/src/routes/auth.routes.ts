import { Router } from "express";
import * as authController from "../controller/auth.controller";

const router = Router();

router.post("/refresh", authController.refreshAuth);
router.post("/signup", authController.signUp);
router.post("/login", authController.loginUser);
router.post("/verify", authController.verifyUser);
router.post("/logout", authController.logout);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

export default router;
