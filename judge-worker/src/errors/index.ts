export { UnrecoverableError } from "bullmq";

export class JudgeApiError extends Error {
  public readonly statusCode: number;
  public readonly body: unknown;

  constructor(statusCode: number, body: unknown) {
    super(`Judge0 API error: HTTP ${statusCode}`);
    this.name = "JudgeApiError";
    this.statusCode = statusCode;
    this.body = body;
  }
}

export class PollTimeoutError extends Error {
  public readonly token: string;

  constructor(token: string) {
    super(`Polling timed out for token: ${token}`);
    this.name = "PollTimeoutError";
    this.token = token;
  }
}

export class BackendApiError extends Error {
  public readonly statusCode: number;
  public readonly endpoint: string;

  constructor(statusCode: number, endpoint: string) {
    super(`Backend API error: HTTP ${statusCode} on ${endpoint}`);
    this.name = "BackendApiError";
    this.statusCode = statusCode;
    this.endpoint = endpoint;
  }
}
