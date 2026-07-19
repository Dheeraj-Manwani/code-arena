import { Router } from "express";
import * as authController from "../controller/auth.controller";
import * as googleAuthController from "../controller/googleAuth.controller";
import { authRateLimiter, otpRateLimiter } from "../middleware/rate-limit";

const router = Router();

router.post("/refresh", authController.refreshAuth);

// Google OAuth. Both are browser navigations, not XHR — they redirect rather
// than return JSON. Rate-limited like the other credential entry points.
router.get("/google", authRateLimiter, googleAuthController.startGoogleAuth);
router.get("/google/callback", authRateLimiter, googleAuthController.googleCallback);

router.post("/signup", authRateLimiter, authController.signUp);
router.post("/login", authRateLimiter, authController.loginUser);
router.post("/verify", otpRateLimiter, authController.verifyUser);
router.post("/logout", authController.logout);
router.post("/forgot-password", otpRateLimiter, authController.forgotPassword);
router.post("/reset-password", otpRateLimiter, authController.resetPassword);

export default router;
