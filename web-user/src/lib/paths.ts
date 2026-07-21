/**
 * Every route path in one place.
 *
 * Route strings were previously inlined at ~20 call sites, so a rename meant
 * grepping and hoping. Builders take the same params as the route pattern.
 */

export const paths = {
  // Auth
  login: "/login",
  signup: "/signup",
  forgotPassword: "/forgot-password",

  // Learn
  learn: "/learn",
  learnPath: (slug: string) => `/learn/${slug}`,
  learnLesson: (slug: string, lessonId: number | string) =>
    `/learn/${slug}/lessons/${lessonId}`,

  // Practice
  problems: "/problems",
  problem: (slug: string) => `/problems/${slug}`,
  problemSolve: (slug: string) => `/problems/${slug}/solve`,

  // Contests
  dashboard: "/dashboard",
  contests: "/contests",
  contest: (contestId: number | string) => `/contests/${contestId}`,
  contestLeaderboard: (contestId: number | string) =>
    `/contests/${contestId}/leaderboard`,
  contestAttempt: (contestId: number | string, attemptId: number | string) =>
    `/contests/${contestId}/attempts/${attemptId}`,
  contestAttemptLeaderboard: (
    contestId: number | string,
    attemptId: number | string,
  ) => `/contests/${contestId}/attempts/${attemptId}/leaderboard`,

  // User-scoped
  myContests: "/my/contests",
  profile: "/profile",
  submission: (attemptId: number | string) => `/submissions/${attemptId}`,
} as const;

/** Route patterns (with `:params`) for router config and `useMatch`. */
export const routePatterns = {
  learnPath: "/learn/:slug",
  learnLesson: "/learn/:slug/lessons/:lessonId",
  problem: "/problems/:slug",
  problemSolve: "/problems/:slug/solve",
  contest: "/contests/:contestId",
  contestLeaderboard: "/contests/:contestId/leaderboard",
  contestAttempt: "/contests/:contestId/attempts/:attemptId",
  contestAttemptLeaderboard: "/contests/:contestId/attempts/:attemptId/leaderboard",
  submission: "/submissions/:attemptId",
} as const;
