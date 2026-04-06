import { ApiErrorCode } from "@/schema/error.schema";

const errorMessages = {
  [ApiErrorCode.INVALID_CREDENTIALS]:
    "Invalid email or password. Please try again.",
  [ApiErrorCode.EMAIL_ALREADY_EXISTS]:
    "An account with this email already exists.",
  [ApiErrorCode.UNAUTHORIZED]: "You are not authorized to perform this action.",
  [ApiErrorCode.INVALID_OTP]:
    "Invalid or expired OTP. Please request a new one.",
  [ApiErrorCode.INVALID_TOKEN]:
    "Your session has expired. Please log in again.",
  [ApiErrorCode.TOO_MANY_OTP_REQUESTS]:
    "Too many OTP requests. Please wait a moment before trying again.",
  [ApiErrorCode.USER_NOT_FOUND]: "User not found.",
  [ApiErrorCode.USER_NOT_VERIFIED]:
    "Your email is not verified. Please verify your email to continue.",
  [ApiErrorCode.CONTEST_NOT_FOUND]: "Contest not found.",
  [ApiErrorCode.CONTEST_NOT_ACTIVE]:
    "This contest is not currently active. Please check the contest schedule.",
  [ApiErrorCode.FORBIDDEN]: "You don't have permission to perform this action.",
  [ApiErrorCode.PROBLEM_NOT_FOUND]: "Problem not found.",
  [ApiErrorCode.QUESTION_NOT_FOUND]: "Question not found.",
  [ApiErrorCode.ALREADY_SUBMITTED]:
    "You have already submitted this question/problem.",
  [ApiErrorCode.INVALID_REQUEST]:
    "Invalid request. Please check your input and try again.",
  [ApiErrorCode.INTERNAL_SERVER_ERROR]:
    "An unexpected error occurred. Please try again later.",
  [ApiErrorCode.RUN_EXECUTION_FAILED]:
    "Code execution failed. Check your code or try again.",

  // Error not required
  [ApiErrorCode.REFRESH_TOKEN_NOT_FOUND]: undefined,
};

export const getErrorMessage = (
  errorCode: ApiErrorCode
): string | undefined => {
  return errorMessages[errorCode];
};
