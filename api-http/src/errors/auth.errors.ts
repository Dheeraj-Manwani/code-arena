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

export class OtpLockedError extends AppError {
  constructor() {
    super(
      "Too many incorrect attempts. Please request a new code.",
      429,
      "OTP_LOCKED"
    );
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

/**
 * The account exists but has no password — it was created through Google, so
 * there is nothing to compare against.
 *
 * Naming the provider is deliberate: without it the user gets "invalid
 * credentials" for a password they never set and has no way to recover. It
 * reveals no more than the existing `UserNotFoundError` already does (which
 * discloses account existence), and it is what the identity providers
 * themselves do in this situation.
 */
export class PasswordLoginUnavailableError extends AppError {
  constructor() {
    super(
      "This account uses Google sign-in. Continue with Google instead.",
      409,
      "PASSWORD_LOGIN_UNAVAILABLE"
    );
  }
}

/**
 * Google returned a profile whose email it has not itself verified. Trusting it
 * would let anyone who can create an unverified Google account on someone
 * else's address take over that account.
 */
export class GoogleEmailUnverifiedError extends AppError {
  constructor() {
    super(
      "Your Google account's email is not verified.",
      403,
      "GOOGLE_EMAIL_UNVERIFIED"
    );
  }
}

export class OAuthStateInvalidError extends AppError {
  constructor() {
    super("Sign-in request expired or invalid. Please try again.", 403, "OAUTH_STATE_INVALID");
  }
}

export class OAuthNotConfiguredError extends AppError {
  constructor() {
    super("Google sign-in is not configured.", 501, "OAUTH_NOT_CONFIGURED");
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
