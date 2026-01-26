import { z } from "zod";
import { RoleEnum } from "./user.schema";

export const ProfileStatsSchema = z.object({
  totalContestsParticipated: z.number(),
  totalContestsCompleted: z.number(),
  averageScore: z.number(),
  bestRank: z.number(),
  competitiveContests: z.number(),
  practiceContests: z.number(),
});

export const ProfileRecentAttemptSchema = z.object({
  id: z.number(),
  contestTitle: z.string(),
  startedAt: z.string(),
  status: z.enum(["in_progress", "submitted", "timed_out", "abandoned"]),
  totalPoints: z.number(),
  maxPoints: z.number(),
});

export const ProfileUserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  imageUrl: z.string().nullable(),
  role: RoleEnum,
  createdAt: z.string(),
  stats: ProfileStatsSchema,
});

export const ProfileResponseSchema = z.object({
  user: ProfileUserSchema,
  recentAttempts: z.array(ProfileRecentAttemptSchema),
});

export type ProfileResponse = z.infer<typeof ProfileResponseSchema>;
export type ProfileUser = z.infer<typeof ProfileUserSchema>;
export type ProfileRecentAttempt = z.infer<typeof ProfileRecentAttemptSchema>;
