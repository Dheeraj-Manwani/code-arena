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
  problem: "/problems/:slug",
  problemSolve: "/problems/:slug/solve",
  contest: "/contests/:contestId",
  contestLeaderboard: "/contests/:contestId/leaderboard",
  contestAttempt: "/contests/:contestId/attempts/:attemptId",
  contestAttemptLeaderboard: "/contests/:contestId/attempts/:attemptId/leaderboard",
  submission: "/submissions/:attemptId",
} as const;
