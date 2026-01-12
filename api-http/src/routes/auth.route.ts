import { Router } from "express";
import * as authController from "../controller/auth.controller";
import {
  otpSendLimiter,
  otpVerifyLimiter,
  refreshLimiter,
  logoutLimiter,
} from "../middleware/rate-limit";
import { validate } from "../middleware/validate";
import {
  LoginUserSchema,
  RegisterUserSchema,
  VerifyUserSchema,
} from "../schema/user.schema";

const router = Router();

router.get("/refresh", refreshLimiter, authController.refreshAuth);
router.post(
  "/register",
  otpSendLimiter,
  validate(RegisterUserSchema),
  authController.registerUser
);
router.post(
  "/login",
  otpSendLimiter,
  validate(LoginUserSchema),
  authController.loginUser
);
router.post(
  "/verify",
  otpVerifyLimiter,
  validate(VerifyUserSchema),
  authController.verifyUser
);
router.post("/logout", logoutLimiter, authController.logout);

export default router;
