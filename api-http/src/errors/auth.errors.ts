import { AppError } from "./app-error";

export class InvalidOtpError extends AppError {
  constructor() {
    super("Invalid or expired OTP", 401);
  }
}

export class InvalidTokenError extends AppError {
  constructor() {
    super("Invalid token", 401);
  }
}

export class TooManyOtpRequestsError extends AppError {
  constructor() {
    super("Too many OTP requests. Try again later.", 429);
  }
}

export class UserNotFoundError extends AppError {
  constructor() {
    super("User not found", 404);
  }
}

export class RefreshTokenNotFoundError extends AppError {
  constructor() {
    super("Refresh token not found", 401);
  }
}
