import { ContestStatus } from "@prisma/client";
import { AppError } from "./app-error";

export class ContestNotFoundError extends AppError {
  constructor() {
    super("Contest not found", 404);
  }
}

export class ContestAlreadyStartedError extends AppError {
  constructor() {
    super("Contest has already started", 409);
  }
}

export class ContestNotActiveError extends AppError {
  constructor() {
    super("Contest is not active", 400);
  }
}

export class InvalidContestStatusTransitionError extends AppError {
  constructor(from: ContestStatus, to: ContestStatus) {
    super(`Invalid contest status transition from ${from} to ${to}`, 400);
  }
}

export class ContestRunningAndCannotBeUpdatedError extends AppError {
  constructor() {
    super("Contest is currently running and cannot be updated", 400);
  }
}

export class ContestEndedAndCannotBeUpdatedError extends AppError {
  constructor() {
    super("Contest has ended and cannot be updated", 400);
  }
}
