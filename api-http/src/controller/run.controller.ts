import { Request, Response } from "express";
import { RunCodeSchema } from "../schema/submission.schema";
import * as runService from "../service/run.service";
import { sendSuccess } from "../util/response";

export const runCode = async (req: Request, res: Response) => {
    const data = RunCodeSchema.parse(req.body);
    const result = await runService.runCode(data);
    return sendSuccess(res, result, 200);
};