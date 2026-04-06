import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

export const logger = pino({
  level: "info",
  ...(isProduction
    ? {}
    : { transport: { target: "pino-pretty", options: { colorize: true } } }),
});

export function childLogger(context: Record<string, unknown>) {
  return logger.child(context);
}
