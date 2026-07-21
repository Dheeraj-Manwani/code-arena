/**
 * Judge error classes + transient/terminal classification (ported from
 * judge-worker — Economy Service Phase 1).
 *
 * `BackendApiError` from the standalone worker is intentionally dropped: the
 * worker→api-http HTTP callback is now a direct in-process function call
 * (Phase 2), so there is no backend HTTP layer that can fail.
 */

/**
 * A terminal, non-retryable failure (bad payload, unsupported language, …).
 * Previously re-exported from bullmq; now a plain local class so the monolith
 * carries no BullMQ/Redis dependency (Economy Service Phase 3). `isTransientError`
 * returns false for it, so the pool fails the job fast instead of retrying.
 */
export class UnrecoverableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnrecoverableError";
  }
}

/**
 * HTTP statuses we treat as transient (judge overloaded or rate-limited):
 * retry with backoff rather than failing the job permanently (issues.md §1.4).
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

/**
 * The container runtime is unavailable — daemon down, `docker` not on PATH, or
 * `docker run` itself failing (exit 125).
 *
 * Classified transient below. This is infrastructure, not user code: the
 * submission never ran, so recording a verdict for it would be a lie. A daemon
 * restart mid-contest should delay a verdict, not fail it.
 */
export class DockerUnavailableError extends Error {
  constructor(message: string) {
    super(`Docker unavailable: ${message}`);
    this.name = "DockerUnavailableError";
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

/**
 * Classify an error as transient (worth retrying) vs terminal. Network blips,
 * poll timeouts, and 429/5xx from Judge0 are transient; everything else
 * (4xx user/config errors, malformed payloads) is terminal.
 */
export function isTransientError(err: unknown): boolean {
  if (err instanceof JudgeApiError) {
    return err.isTransient;
  }
  if (err instanceof PollTimeoutError) {
    return true;
  }
  if (err instanceof DockerUnavailableError) {
    return true;
  }
  // Axios/network errors without an HTTP response (ECONNRESET, ETIMEDOUT, etc.)
  if (err && typeof err === "object" && "code" in err) {
    const code = String((err as { code: unknown }).code);
    return ["ECONNRESET", "ETIMEDOUT", "ECONNREFUSED", "EAI_AGAIN", "ENOTFOUND"].includes(code);
  }
  return false;
}
