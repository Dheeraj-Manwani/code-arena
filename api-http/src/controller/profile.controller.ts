import { Request, Response } from "express";
import * as profileService from "../service/profile.service";
import { sendSuccess } from "../util/response";

export const getProfile = async (req: Request, res: Response) => {
  const profile = await profileService.getProfile(req.userId);
  return sendSuccess(res, profile, 200);
};
