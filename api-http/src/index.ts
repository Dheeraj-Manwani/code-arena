import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes";
import contestRoutes from "./routes/contest.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import submissionRoutes from "./routes/submission.routes";
import problemRoutes from "./routes/problem.routes";
import leaderboardRoutes from "./routes/leaderboard.routes";
import statsRoutes from "./routes/stats.routes";
import profileRoutes from "./routes/profile.routes";
import runRoutes from "./routes/run.routes";
import { errorHandler } from "./middleware/error-handler";

dotenv.config();

const app = express();
app.get("/health", (_, res) => res.send("ok"));

const PORT = process.env.PORT || 3000;
const allowedOrigins = process.env.ALLOWED_HOSTS
  ? process.env.ALLOWED_HOSTS.split(",").map((origin) => origin.trim())
  : ["http://localhost:5173"];

app.disable("x-powered-by");

app
  .use(
    cors({
      origin: allowedOrigins,
      credentials: true,
    })
  )
  .use(morgan("dev"))
  .use(cookieParser())
  .use(bodyParser.json({ limit: "10kb" }))
  .use(bodyParser.urlencoded({ extended: true, limit: "20kb" }));

app.use("/api/auth", authRoutes);
app.use("/api/contests", contestRoutes);
app.use("/api", dashboardRoutes);
app.use("/api", submissionRoutes);
app.use("/api/problems", problemRoutes);
app.use("/api/contests", leaderboardRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/run", runRoutes);

app.use(errorHandler);
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
