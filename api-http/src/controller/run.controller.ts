import { Request, Response } from "express";
import { SubmitDsaSchema } from "../schema/submission.schema";
import * as runService from "../service/run.service";
import { sendSuccess } from "../util/response";

export const runCode = async (req: Request, res: Response) => {
    const data = SubmitDsaSchema.parse(req.body);
    const result = await runService.runCode(data);
    return sendSuccess(res, result, 200);
};