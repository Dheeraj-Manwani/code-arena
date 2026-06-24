import { NextFunction, Request, Response, Router } from "express";
import crypto from "crypto";
import { z } from "zod";
import prisma from "../lib/db";
import { redisPublisher } from "../lib/redisPublisher";
import { SubmissionStatusEnum } from "../schema/submission.schema";
import { sendError, sendSuccess } from "../util/response";

const router = Router();

/**
 * Constant-time string comparison for the shared internal secret (issues.md §3.2).
 * Reject on length mismatch first — timingSafeEqual requires equal-length buffers,
 * and the length itself is not secret here.
 */
function timingSafeEqualStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

function authenticateInternalRequest(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  const expectedSecret = process.env.BACKEND_INTERNAL_SECRET;

  if (!authHeader || !expectedSecret) {
    return sendError(res, "UNAUTHORIZED", 401);
  }

  const expectedHeader = `Bearer ${expectedSecret}`;
  if (!timingSafeEqualStrings(authHeader, expectedHeader)) {
    return sendError(res, "UNAUTHORIZED", 401);
  }

  return next();
}

router.use(authenticateInternalRequest);

const updateSubmissionBodySchema = z.object({
  status: SubmissionStatusEnum.exclude(["pending"]),
  pointsEarned: z.number().int().min(0),
  testCasesPassed: z.number().int().min(0),
  totalTestCases: z.number().int().min(0),
  executionTime: z.number().int().nullable(),
});

const updateAttemptScoreBodySchema = z.object({
  pointsToAdd: z.number().int(),
});

router.patch("/submissions/dsa/:dsaSubmissionId", async (req: Request, res: Response) => {
  const dsaSubmissionId = Number.parseInt(String(req.params.dsaSubmissionId), 10);
  if (Number.isNaN(dsaSubmissionId)) {
    return sendError(res, "INVALID_REQUEST", 400);
  }

  const payload = updateSubmissionBodySchema.parse(req.body);

  const updatedSubmission = await prisma.dsaSubmission.update({
    where: { id: dsaSubmissionId },
    data: {
      status: payload.status,
      pointsEarned: payload.pointsEarned,
      testCasesPassed: payload.testCasesPassed,
      totalTestCases: payload.totalTestCases,
      executionTime: payload.executionTime,
    },
    include: {
      attempt: {
        select: {
          contestId: true,
        },
      },
    },
  });

  const eventPayload = {
    type: "SUBMISSION_RESULT" as const,
    dsaSubmissionId: updatedSubmission.id,
    attemptId: updatedSubmission.attemptId,
    userId: updatedSubmission.userId,
    contestId: updatedSubmission.attempt.contestId,
    status: updatedSubmission.status,
    pointsEarned: updatedSubmission.pointsEarned,
    testCasesPassed: updatedSubmission.testCasesPassed,
    totalTestCases: updatedSubmission.totalTestCases,
  };

  const channel = `contest:${updatedSubmission.attempt.contestId}:submission`;
  await redisPublisher.publish(channel, JSON.stringify(eventPayload));

  return sendSuccess(res, { success: true }, 200);
});

router.patch("/attempts/:attemptId/score", async (req: Request, res: Response) => {
  const attemptId = Number.parseInt(String(req.params.attemptId), 10);
  if (Number.isNaN(attemptId)) {
    return sendError(res, "INVALID_REQUEST", 400);
  }

  const { pointsToAdd } = updateAttemptScoreBodySchema.parse(req.body);

  await prisma.contestAttempt.update({
    where: { id: attemptId },
    data: {
      totalPoints: {
        increment: pointsToAdd,
      },
    },
  });

  return sendSuccess(res, { success: true }, 200);
});

export default router;
