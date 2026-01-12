import { Request, Response } from "express";
import * as contestService from "../service/contest.service";
import { ContestNotFoundError } from "../errors/contest.errors";

export const getContests = async (req: Request, res: Response) => {
  const contests = await contestService.getContests(req.query);
  return res.json({ contests });
};

export const createContest = async (req: Request, res: Response) => {
  const contest = await contestService.createContest(req.body, req.user!.id);
  return res.status(201).json({ contest });
};

export const getContestById = async (req: Request, res: Response) => {
  const contest = await contestService.getContestById(req.params.id);

  if (!contest) {
    throw new ContestNotFoundError();
  }

  return res.json({ contest });
};

export const updateContest = async (req: Request, res: Response) => {
  const contest = await contestService.updateContest(req.params.id, req.body);
  return res.json({ contest });
};
