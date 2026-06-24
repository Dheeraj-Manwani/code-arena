export { UnrecoverableError } from "bullmq";

/**
 * HTTP statuses we treat as transient (judge/backend overloaded or rate-limited):
 * retry with backoff rather than failing the job permanently (issues.md §7.5).
 */
const TRANSIENT_HTTP_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

export class JudgeApiError extends Error {
  public readonly statusCode: number;
  public readonly body: unknown;

  constructor(statusCode: number, body: unknown) {
    super(`Judge0 API error: HTTP ${statusCode}`);
    this.name = "JudgeApiError";
    this.statusCode = statusCode;
    this.body = body;
  }

  get isTransient(): boolean {
    return TRANSIENT_HTTP_STATUSES.has(this.statusCode);
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

  get isTransient(): boolean {
    return TRANSIENT_HTTP_STATUSES.has(this.statusCode);
  }
}

/**
 * Classify an error as transient (worth retrying) vs terminal. Network blips,
 * poll timeouts, and 429/5xx from Judge0/backend are transient; everything else
 * (4xx user/config errors, malformed payloads) is terminal.
 */
export function isTransientError(err: unknown): boolean {
  if (err instanceof JudgeApiError || err instanceof BackendApiError) {
    return err.isTransient;
  }
  if (err instanceof PollTimeoutError) {
    return true;
  }
  // Axios/network errors without an HTTP response (ECONNRESET, ETIMEDOUT, etc.)
  if (err && typeof err === "object" && "code" in err) {
    const code = String((err as { code: unknown }).code);
    return ["ECONNRESET", "ETIMEDOUT", "ECONNREFUSED", "EAI_AGAIN", "ENOTFOUND"].includes(code);
  }
  return false;
}
