import { Router } from "express";
import { authenticateToken, requireCreator } from "../middleware/auth";
import { uploadImageFile, handleImageUploadError } from "../middleware/upload";
import { imageUploadRateLimiter } from "../middleware/rate-limit";
import * as uploadController from "../controller/upload.controller";

/**
 * Image uploads for problem descriptions.
 *
 * **Creator-only, and that is the primary control.** Anything stored here is
 * served from a public URL under our own domain, so an open upload endpoint is
 * an open file host — and one that could be used to serve content that appears
 * to come from us. `requireCreator` is what keeps that surface to the small set
 * of people who already author problems.
 *
 * The rate limiter behind it bounds how fast one of those accounts can fill the
 * bucket, whether by mistake (a retry loop) or otherwise.
 */
const router = Router();

router.post(
  "/image",
  authenticateToken,
  requireCreator,
  imageUploadRateLimiter,
  uploadImageFile,
  handleImageUploadError,
  uploadController.uploadImage,
);

export default router;
