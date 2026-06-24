import { Router } from "express";
import * as authController from "../controller/auth.controller";
import { authRateLimiter, otpRateLimiter } from "../middleware/rate-limit";

const router = Router();

router.post("/refresh", authController.refreshAuth);
router.post("/signup", authRateLimiter, authController.signUp);
router.post("/login", authRateLimiter, authController.loginUser);
router.post("/verify", otpRateLimiter, authController.verifyUser);
router.post("/logout", authController.logout);
router.post("/forgot-password", otpRateLimiter, authController.forgotPassword);
router.post("/reset-password", otpRateLimiter, authController.resetPassword);

export default router;
