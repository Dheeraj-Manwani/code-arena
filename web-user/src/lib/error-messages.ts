import { ApiErrorCode } from "@/schema/error.schema";

const errorMessages = {
  [ApiErrorCode.INVALID_CREDENTIALS]:
    "Invalid email or password. Please try again.",
  [ApiErrorCode.EMAIL_ALREADY_EXISTS]:
    "An account with this email already exists.",
  [ApiErrorCode.UNAUTHORIZED]: "You are not authorized to perform this action.",
  [ApiErrorCode.INVALID_OTP]:
    "Invalid or expired OTP. Please request a new one.",
  [ApiErrorCode.OTP_LOCKED]:
    "Too many incorrect attempts. Please request a new code.",
  [ApiErrorCode.INVALID_TOKEN]:
    "Your session has expired. Please log in again.",
  [ApiErrorCode.TOO_MANY_OTP_REQUESTS]:
    "Too many OTP requests. Please wait a moment before trying again.",
  [ApiErrorCode.TOO_MANY_REQUESTS]:
    "Too many requests. Please slow down and try again shortly.",
  [ApiErrorCode.USER_NOT_FOUND]: "User not found.",
  [ApiErrorCode.USER_NOT_VERIFIED]:
    "Your email is not verified. Please verify your email to continue.",
  [ApiErrorCode.PASSWORD_LOGIN_UNAVAILABLE]:
    "This account uses Google sign-in. Use “Continue with Google” instead.",
  [ApiErrorCode.GOOGLE_EMAIL_UNVERIFIED]:
    "Your Google account's email address isn't verified, so we can't sign you in with it.",
  [ApiErrorCode.OAUTH_STATE_INVALID]:
    "That sign-in link expired. Please try signing in again.",
  [ApiErrorCode.OAUTH_NOT_CONFIGURED]:
    "Google sign-in isn't available right now.",
  [ApiErrorCode.OAUTH_FAILED]: "Google sign-in failed. Please try again.",
  [ApiErrorCode.CONTEST_NOT_FOUND]: "Contest not found.",
  [ApiErrorCode.CONTEST_NOT_ACTIVE]:
    "This contest is not currently active. Please check the contest schedule.",
  [ApiErrorCode.FORBIDDEN]: "You don't have permission to perform this action.",
  [ApiErrorCode.PROBLEM_NOT_FOUND]: "Problem not found.",
  [ApiErrorCode.QUESTION_NOT_FOUND]: "Question not found.",
  [ApiErrorCode.ALREADY_SUBMITTED]:
    "You have already submitted this question/problem.",
  [ApiErrorCode.ATTEMPT_DEADLINE_PASSED]:
    "The deadline for this attempt has passed. Your attempt has been closed.",
  [ApiErrorCode.INVALID_REQUEST]:
    "Invalid request. Please check your input and try again.",
  [ApiErrorCode.INTERNAL_SERVER_ERROR]:
    "An unexpected error occurred. Please try again later.",
  [ApiErrorCode.RUN_EXECUTION_FAILED]:
    "Code execution failed. Check your code or try again.",

  // Learn paths
  [ApiErrorCode.LEARN_PATH_NOT_FOUND]: "That learn path isn't available.",
  [ApiErrorCode.LEARN_LESSON_NOT_FOUND]: "That lesson isn't available.",
  [ApiErrorCode.LEARN_QUESTION_NOT_FOUND]: "That question no longer exists.",
  [ApiErrorCode.LEARN_SELF_MARK_UNSUPPORTED]:
    "Only coding questions can be marked done by hand.",
  // Deliberately not framed as a failure: the user's progress is intact and
  // better-evidenced than what they were trying to do.
  [ApiErrorCode.LEARN_CANNOT_UNMARK_VERIFIED]:
    "You solved this one on Code Arena, so it stays marked complete.",

  // Error not required
  [ApiErrorCode.REFRESH_TOKEN_NOT_FOUND]: undefined,
  // The user chose to back out at Google's consent screen — not a failure.
  [ApiErrorCode.OAUTH_CANCELLED]: undefined,
};

export const getErrorMessage = (
  errorCode: ApiErrorCode
): string | undefined => {
  return errorMessages[errorCode];
};
