import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import morgan from "morgan";
import authRouter from "./routes/auth.route";
import adminContestRouter from "./routes/contest.route";
import { authMiddleware, requiredRole } from "./middleware/auth";
import { globalLimiter } from "./middleware/rate-limit";
import helmet from "helmet";
import { errorHandler } from "./middleware/error-handler";
import { Role } from "@prisma/client";

dotenv.config();

const app = express();
app.get("/health", (_, res) => res.send("ok"));

const PORT = process.env.PORT || 3001;
const allowedHosts = process.env.ALLOWED_HOSTS?.split(",") || [];

app.disable("x-powered-by");

app
  .use(
    cors({
      origin: allowedHosts,
      credentials: true,
    })
  )
  .use(morgan("dev"))
  .use(cookieParser())
  .use(bodyParser.json({ limit: "10kb" }))
  .use(bodyParser.urlencoded({ extended: true, limit: "20kb" }))
  .use(
    helmet({
      contentSecurityPolicy: false,
    })
  )
  .use(globalLimiter);

app.use("/api/v1/auth", authRouter);

app.use(authMiddleware);

app.use("/api/v1/admin/contest", requiredRole(Role.ADMIN), adminContestRouter);

app.use(errorHandler);
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
