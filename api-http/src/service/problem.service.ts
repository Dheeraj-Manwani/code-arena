import * as problemRepo from "../repositories/problem.repository";
import { ProblemNotFoundError } from "../errors/problem.errors";

export const getProblemById = async (problemId: number) => {
  const problem = await problemRepo.getDsaProblem(problemId);

  if (!problem) {
    throw new ProblemNotFoundError();
  }

  const response = {
    id: problem.id,
    contestId: problem.contestId,
    title: problem.title,
    description: problem.description,
    tags: problem.tags,
    points: problem.points,
    timeLimit: problem.timeLimit,
    memoryLimit: problem.memoryLimit,
    visibleTestCases: problem.testCases.map((tc) => ({
      input: tc.input,
      expectedOutput: tc.expectedOutput,
    })),
  };

  return response;
};

export const getProblemWithAllTestCases = async (problemId: number) => {
  const problem = await problemRepo.getDsaProblemWithAllTestCases(problemId);

  if (!problem) {
    throw new ProblemNotFoundError();
  }

  return problem;
};
