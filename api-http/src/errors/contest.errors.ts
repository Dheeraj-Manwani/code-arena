import { AppError } from "./app-error";

export class ContestNotFoundError extends AppError {
  constructor() {
    super("Contest not found", 404, "CONTEST_NOT_FOUND");
  }
}

export class ContestNotActiveError extends AppError {
  constructor() {
    super("Contest is not active", 400, "CONTEST_NOT_ACTIVE");
  }
}

export class ForbiddenError extends AppError {
  constructor() {
    super("Forbidden", 403, "FORBIDDEN");
  }
}
