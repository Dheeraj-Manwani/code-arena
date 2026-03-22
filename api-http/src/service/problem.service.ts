import * as problemRepo from "../repositories/problem.repository";
import { ProblemNotFoundError } from "../errors/problem.errors";

export const getProblemById = async (problemId: number) => {
  const problem = await problemRepo.getDsaProblem(problemId);

  if (!problem) {
    throw new ProblemNotFoundError();
  }

  if (!problem.contestLinks || problem.contestLinks.length === 0) {
    throw new ProblemNotFoundError();
  }

  const response = {
    id: problem.id,
    contestId: problem.contestLinks[0].contest.id,
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

export const getAllMcqQuestions = async (page: number, limit: number, search?: string) => {
  return await problemRepo.getAllMcqQuestions(page, limit, search);
};

export const getAllDsaProblems = async (page: number, limit: number, search?: string) => {
  return await problemRepo.getAllDsaProblems(page, limit, search);
};

// TODO: remove any
export const createStandaloneMcqQuestion = async (data: any, creatorId: number) => {
  return await problemRepo.createStandaloneMcqQuestion({
    ...data,
    creatorId,
  });
};

// TODO: remove any
export const createStandaloneDsaProblem = async (data: any, testCases: any[], creatorId: number) => {
  return await problemRepo.createStandaloneDsaProblem(
    {
      ...data,
      creatorId,
    },
    testCases
  );
};

export const updateMcqQuestion = async (questionId: number, data: any, creatorId: number) => {
  // Verify ownership
  const question = await problemRepo.getMcqQuestionById(questionId);
  if (!question) {
    throw new ProblemNotFoundError();
  }
  if (question.creatorId !== creatorId) {
    throw new ProblemNotFoundError(); // Or create a ForbiddenError
  }

  return await problemRepo.updateMcqQuestion(questionId, data);
};

export const updateDsaProblem = async (problemId: number, data: any, testCases: any[] | undefined, creatorId: number) => {
  // Verify ownership
  const problem = await problemRepo.getDsaProblemById(problemId);
  if (!problem) {
    throw new ProblemNotFoundError();
  }

  return await problemRepo.updateDsaProblem(problemId, data, testCases);
};

export const getMcqQuestionById = async (questionId: number) => {
  const question = await problemRepo.getMcqQuestionById(questionId);
  if (!question) {
    throw new ProblemNotFoundError();
  }
  return question;
};

export const getDsaProblemById = async (problemId: number) => {
  const problem = await problemRepo.getDsaProblemById(problemId);
  if (!problem) {
    throw new ProblemNotFoundError();
  }
  return problem;
};