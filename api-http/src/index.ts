import { env } from "./config/env"; // validates environment at startup — must be imported first
import http from "http";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes";
import contestRoutes from "./routes/contest.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import submissionRoutes from "./routes/submission.routes";
import problemRoutes from "./routes/problem.routes";
import practiceRoutes from "./routes/practice.routes";
import leaderboardRoutes from "./routes/leaderboard.routes";
import statsRoutes from "./routes/stats.routes";
import profileRoutes from "./routes/profile.routes";
import attemptRoutes from "./routes/attempt.routes";
import runRoutes from "./routes/run.routes";
import adminLearnRoutes from "./routes/adminLearn.routes";
import learnRoutes from "./routes/learn.routes";
import { errorHandler } from "./middleware/error-handler";
import { configurePassport, passport } from "./auth/passport";
import { attachRealtime } from "./realtime/server";
import { reconcilePendingSubmissions } from "./jobs/reconcile";
import { reconcileLearnProgress } from "./jobs/reconcileLearn";
import { submitPool } from "./jobs/pool";
import { sweepOrphanedWorkspaces } from "./judge/local/workspace";
import { logger } from "./lib/logger";

const app = express();
app.get("/health", (_, res) => res.send("ok"));

const PORT = env.PORT;
const allowedOrigins = env.ALLOWED_HOSTS
  ? env.ALLOWED_HOSTS.split(",").map((origin) => origin.trim())
  : ["http://localhost:5173"];

app.disable("x-powered-by");

app
  .use(
    cors({
      origin: allowedOrigins,
      credentials: true,
    })
  )
  .use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"))
  .use(cookieParser())
  .use(bodyParser.json({ limit: "10kb" }))
  .use(bodyParser.urlencoded({ extended: true, limit: "20kb" }));

// Passport runs the Google handshake only — no `passport.session()`, because
// this process is session-free and mints its own JWTs (see auth/passport.ts).
configurePassport();
app.use(passport.initialize());

app.use("/api/auth", authRoutes);
app.use("/api/contests", contestRoutes);
app.use("/api", dashboardRoutes);
app.use("/api", submissionRoutes);
app.use("/api/problems", problemRoutes);
app.use("/api/practice", practiceRoutes);
app.use("/api/contests", leaderboardRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/attempts", attemptRoutes);
app.use("/api/run", runRoutes);
app.use("/api/admin/learn", adminLearnRoutes);
app.use("/api/learn", learnRoutes);

app.use(errorHandler);

// Economy Service (Phase 4): one HTTP server shared by REST and WebSocket, one
// port, one process. The judge runs in-process via the pool (jobs/pool.ts) — no
// Redis, no separate worker/gateway processes.
const server = http.createServer(app);
attachRealtime(server);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // Re-enqueue any submissions left `pending` by a previous crash (Phase 3).
  reconcilePendingSubmissions().catch((err) =>
    logger.error({ err: err instanceof Error ? err.message : String(err) }, "Reconciliation failed")
  );
  // Repair learn counters left behind by a best-effort verdict fan-out that
  // failed (LEARN_PATHS.md Phase 4). Idempotent, so a clean boot is a no-op.
  reconcileLearnProgress().catch((err) =>
    logger.error(
      { err: err instanceof Error ? err.message : String(err) },
      "Learn progress reconciliation failed"
    )
  );
  // Remove judge workspaces orphaned by a crash (SELF_HOSTED_JUDGE.md §4.2).
  // Cheap and a no-op on a clean boot; skipping it leaks a directory per
  // in-flight submission every time the process dies.
  sweepOrphanedWorkspaces().catch((err) =>
    logger.error(
      { err: err instanceof Error ? err.message : String(err) },
      "Judge workspace sweep failed"
    )
  );
});

// Graceful shutdown: stop accepting connections, drain in-flight judging, exit.
let shuttingDown = false;
const shutdown = async (signal: string): Promise<void> => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, "Shutting down");
  server.close();
  await submitPool.close();
  process.exit(0);
};
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
