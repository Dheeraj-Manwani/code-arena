import { Response } from "express";
import { AuthRequest } from "../types/express.d";
import { sendSuccess } from "../util/response";
import * as uploadService from "../service/upload.service";
import { AppError } from "../errors/app-error";

/** POST /api/uploads/image — store a description image, return its public URL. */
export const uploadImage = async (req: AuthRequest, res: Response) => {
  if (!req.file?.buffer?.length) {
    throw new AppError("Attach an image file", 400, "UPLOAD_NO_FILE");
  }

  return sendSuccess(res, await uploadService.uploadImage(req.file.buffer), 201);
};
