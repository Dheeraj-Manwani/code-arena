import { AppError } from "./app-error";

export class ProblemNotFoundError extends AppError {
  constructor() {
    super("Problem not found", 404, "PROBLEM_NOT_FOUND");
  }
}
