import z from "zod";

export const LeaderboardEntryApiSchema = z.object({
  userId: z.number(),
  name: z.string(),
  totalPoints: z.number(),
  rank: z.number(),
});

export const LeaderboardEntrySchema = z.object({
  rank: z.number(),
  userId: z.string(),
  userName: z.string(),
  avatarUrl: z.string().optional(),
  totalPoints: z.number(),
  timeTakenMs: z.number(),
  questionsAttempted: z.number(),
  isCurrentUser: z.boolean().optional(),
});

export type LeaderboardEntry = z.infer<typeof LeaderboardEntrySchema>;
export type LeaderboardEntryApi = z.infer<typeof LeaderboardEntryApiSchema>;

export type LeaderboardResponse = {
  success: boolean;
  data: z.infer<typeof LeaderboardEntryApiSchema>[];
};
