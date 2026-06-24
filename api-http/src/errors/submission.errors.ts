import { AppError } from "./app-error";
import { ContestNotActiveError, ForbiddenError } from "./contest.errors";

export class AttemptNotFoundError extends AppError {
  constructor() {
    super("Attempt not found", 404, "ATTEMPT_NOT_FOUND");
  }
}

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

export class AttemptDeadlinePassedError extends AppError {
  constructor() {
    super(
      "The deadline for this attempt has passed. Your attempt has been closed.",
      400,
      "ATTEMPT_DEADLINE_PASSED"
    );
  }
}

export { ContestNotActiveError, ForbiddenError };
