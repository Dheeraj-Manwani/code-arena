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

export class InvalidOtpError extends AppError {
  constructor() {
    super("Invalid or expired OTP", 401, "INVALID_OTP");
  }
}

export class InvalidTokenError extends AppError {
  constructor() {
    super("Invalid token", 401, "INVALID_TOKEN");
  }
}

export class TooManyOtpRequestsError extends AppError {
  constructor() {
    super(
      "Too many OTP requests. Try again later.",
      429,
      "TOO_MANY_OTP_REQUESTS"
    );
  }
}

export class UserNotFoundError extends AppError {
  constructor() {
    super("User not found", 404, "USER_NOT_FOUND");
  }
}

export class RefreshTokenNotFoundError extends AppError {
  constructor() {
    super("Refresh token not found", 401, "REFRESH_TOKEN_NOT_FOUND");
  }
}

export class UserNotVerifiedError extends AppError {
  constructor() {
    super(
      "User not verified. Please verify your email.",
      403,
      "USER_NOT_VERIFIED"
    );
  }
}
