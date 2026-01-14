import { AppError } from "./app-error";

export class InvalidCredentialsError extends AppError {
  constructor() {
    super("Invalid credentials", 401, "INVALID_CREDENTIALS");
  }
}

export class EmailAlreadyExistsError extends AppError {
  constructor() {
    super("Email already exists", 400, "EMAIL_ALREADY_EXISTS");
  }
}

export class UnauthorizedError extends AppError {
  constructor() {
    super("Unauthorized", 401, "UNAUTHORIZED");
  }
}
