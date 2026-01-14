import { AppError } from "./app-error";
import { ContestNotActiveError, ForbiddenError } from "./contest.errors";

export class QuestionNotFoundError extends AppError {
  constructor() {
    super("Question not found", 404, "QUESTION_NOT_FOUND");
  }
}

export class AlreadySubmittedError extends AppError {
  constructor() {
    super("Already submitted", 400, "ALREADY_SUBMITTED");
  }
}

export { ContestNotActiveError, ForbiddenError };
