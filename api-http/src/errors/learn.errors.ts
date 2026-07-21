import { AppError } from "./app-error";

export class LearnPathNotFoundError extends AppError {
  constructor() {
    super("Learn path not found", 404, "LEARN_PATH_NOT_FOUND");
  }
}

export class LearnModuleNotFoundError extends AppError {
  constructor() {
    super("Module not found", 404, "LEARN_MODULE_NOT_FOUND");
  }
}

export class LearnLessonNotFoundError extends AppError {
  constructor() {
    super("Lesson not found", 404, "LEARN_LESSON_NOT_FOUND");
  }
}

export class LearnQuestionNotFoundError extends AppError {
  constructor() {
    super("Question not found", 404, "LEARN_QUESTION_NOT_FOUND");
  }
}

export class DuplicateLearnQuestionError extends AppError {
  constructor() {
    super("That question is already in this lesson", 400, "LEARN_QUESTION_DUPLICATE");
  }
}

/**
 * The contest-integrity guard (LEARN_PATHS.md §5.6, PRACTICE_MODE §4.4).
 *
 * Names the contest, because a curator who is only told "no" will reasonably
 * assume the tool is broken and try again tomorrow.
 */
export class ProblemInLiveContestError extends AppError {
  constructor(contestTitle: string) {
    super(
      `That problem is in "${contestTitle}", a competitive contest that has not finished. ` +
        `Adding it to a learn path would let participants practise it with the same test cases.`,
      400,
      "LEARN_PROBLEM_IN_LIVE_CONTEST",
    );
  }
}

/** Raised by publish validation; carries the specific reasons. */
export class LearnPathNotPublishableError extends AppError {
  readonly problems: string[];

  constructor(problems: string[]) {
    super("This path is not ready to publish", 400, "LEARN_PATH_NOT_PUBLISHABLE");
    this.problems = problems;
  }
}
