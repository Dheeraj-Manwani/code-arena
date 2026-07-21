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

  // Image uploads
  [ApiErrorCode.UPLOAD_NO_FILE]: "Choose an image to upload.",
  [ApiErrorCode.UPLOAD_TOO_LARGE]: "That image is too large — keep it under 2 MB.",
  [ApiErrorCode.UPLOAD_UNSUPPORTED_TYPE]:
    "Only PNG, JPEG, WebP and GIF images can be uploaded.",
  [ApiErrorCode.UPLOAD_NOT_CONFIGURED]:
    "Image uploads aren't set up on this server yet.",
  [ApiErrorCode.UPLOAD_FAILED]: "Couldn't store that image. Please try again.",

  // Learn paths
  [ApiErrorCode.LEARN_PATH_NOT_FOUND]: "Learn path not found.",
  [ApiErrorCode.LEARN_MODULE_NOT_FOUND]: "That module no longer exists.",
  [ApiErrorCode.LEARN_LESSON_NOT_FOUND]: "That lesson no longer exists.",
  [ApiErrorCode.LEARN_QUESTION_NOT_FOUND]: "That question no longer exists.",
  [ApiErrorCode.LEARN_QUESTION_DUPLICATE]:
    "That question is already in this lesson.",
  // The server knows *which* contest, but the error envelope carries only a
  // code — so the specific name is surfaced proactively in the question picker
  // instead, where the row is disabled and names the contest. This message is
  // the fallback for the race: a contest published between opening the picker
  // and clicking the row.
  [ApiErrorCode.LEARN_PROBLEM_IN_LIVE_CONTEST]:
    "That problem is in a competitive contest that hasn't finished. Adding it would let participants practise it with the same test cases.",
  [ApiErrorCode.LEARN_PATH_NOT_PUBLISHABLE]:
    "This path isn't ready to publish — check the issues listed above.",
  [ApiErrorCode.LEARN_PATH_SLUG_TAKEN]:
    "A path with that slug already exists. Pick another.",

  // Error not required
  [ApiErrorCode.REFRESH_TOKEN_NOT_FOUND]: undefined,
};

export const getErrorMessage = (
  errorCode: ApiErrorCode
): string | undefined => {
  return errorMessages[errorCode];
};
