/**
 * Minimal structured logger with a pino-like API (`info`/`warn`/`error`/`debug`
 * + `child`). Used by the in-process judge worker and realtime modules that were
 * ported in from the standalone services (Economy Service — Phase 1).
 *
 * Kept dependency-free (console-backed) so the monolith doesn't pull in pino just
 * for the judge/realtime code paths. Emits one JSON line per call in production
 * and the same JSON in development (no pretty-printer, by design).
 */
type LogContext = Record<string, unknown>;
type LogLevel = "debug" | "info" | "warn" | "error";

class Logger {
  constructor(private readonly base: LogContext = {}) {}

  private emit(level: LogLevel, a?: string | LogContext, b?: string): void {
    const [obj, msg] = typeof a === "string" ? [undefined, a] : [a, b];
    const line = JSON.stringify({
      level,
      time: new Date().toISOString(),
      ...this.base,
      ...(obj ?? {}),
      ...(msg ? { msg } : {}),
    });
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  }

  debug(obj: LogContext, msg?: string): void;
  debug(msg: string): void;
  debug(a?: string | LogContext, b?: string): void {
    this.emit("debug", a, b);
  }

  info(obj: LogContext, msg?: string): void;
  info(msg: string): void;
  info(a?: string | LogContext, b?: string): void {
    this.emit("info", a, b);
  }

  warn(obj: LogContext, msg?: string): void;
  warn(msg: string): void;
  warn(a?: string | LogContext, b?: string): void {
    this.emit("warn", a, b);
  }

  error(obj: LogContext, msg?: string): void;
  error(msg: string): void;
  error(a?: string | LogContext, b?: string): void {
    this.emit("error", a, b);
  }

  child(context: LogContext): Logger {
    return new Logger({ ...this.base, ...context });
  }
}

export const logger = new Logger();

export function childLogger(context: LogContext): Logger {
  return logger.child(context);
}
