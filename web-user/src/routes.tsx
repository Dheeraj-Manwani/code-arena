import { createBrowserRouter, Navigate } from "react-router-dom";
import { AuthRoute } from "./components/AuthRoute";
import { LegacyRedirect } from "./components/LegacyRedirect";
import { AppLayout } from "./components/layouts/AppLayout";
import { FocusLayout } from "./components/layouts/FocusLayout";
import { RouteErrorBoundary } from "./components/RouteErrorBoundary";
import { paths, routePatterns } from "./lib/paths";
import Dashboard from "@/pages/Dashboard";
import Contests from "@/pages/Contests";
import Learn from "@/pages/Learn";
import LearnPath from "@/pages/LearnPath";
import LearnLesson from "@/pages/LearnLesson";
import Problems from "@/pages/Problems";
import ProblemDetails from "@/pages/ProblemDetails";
import ProblemSolve from "@/pages/ProblemSolve";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import ForgotPassword from "@/pages/ForgotPassword";
import NotFound from "@/pages/NotFound";
import ContestDetails from "./pages/ContestDetails";
import ContestPage from "./components/contest/ContestPage";
import MyContests from "./pages/MyContests";
import Leaderboard from "./pages/Leaderboard";
import Profile from "./pages/Profile";
import ContestResultsPage from "./pages/ContestResultsPage";
import ContestLeaderboardPage from "./pages/ContestLeaderboardPage";

export const router = createBrowserRouter([
  {
    element: <AuthRoute />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { path: paths.login, element: <Login /> },
      { path: paths.signup, element: <Signup /> },
      { path: paths.forgotPassword, element: <ForgotPassword /> },
    ],
  },

  // Authenticated pages with app chrome.
  {
    element: <AppLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        // The front door (LEARN_PATHS.md D10). Deliberately the last thing this
        // work changed: the plan sequenced it after everything else so the page
        // was worth landing on before anyone was sent there.
        //
        // Third front-door change in this codebase — /dashboard → /problems →
        // /learn — which is why the target lives in `paths` and every legacy
        // path still redirects rather than 404ing.
        path: "/",
        element: <Navigate to={paths.learn} replace />,
      },

      { path: paths.learn, element: <Learn /> },
      { path: routePatterns.learnPath, element: <LearnPath /> },
      { path: routePatterns.learnLesson, element: <LearnLesson /> },

      { path: paths.problems, element: <Problems /> },
      { path: routePatterns.problem, element: <ProblemDetails /> },

      { path: paths.dashboard, element: <Dashboard /> },
      { path: paths.contests, element: <Contests /> },
      { path: routePatterns.contest, element: <ContestDetails /> },
      { path: routePatterns.contestLeaderboard, element: <Leaderboard /> },

      { path: paths.myContests, element: <MyContests /> },
      { path: paths.profile, element: <Profile /> },
      { path: routePatterns.submission, element: <ContestResultsPage /> },
    ],
  },

  // Authenticated full-screen surfaces (no navbar).
  {
    element: <FocusLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { path: routePatterns.problemSolve, element: <ProblemSolve /> },
      { path: routePatterns.contestAttempt, element: <ContestPage /> },
      {
        path: routePatterns.contestAttemptLeaderboard,
        element: <ContestLeaderboardPage />,
      },
    ],
  },

  // Legacy paths. Kept so links already shared or bookmarked keep resolving.
  {
    path: "/contest/:contestId/details",
    element: <LegacyRedirect to={(p) => paths.contest(p.contestId)} />,
  },
  {
    path: "/contest/:contestId/attempt/:attemptId",
    element: (
      <LegacyRedirect to={(p) => paths.contestAttempt(p.contestId, p.attemptId)} />
    ),
  },
  {
    path: "/contest/:contestId/attempt/:attemptId/leaderboard",
    element: (
      <LegacyRedirect
        to={(p) => paths.contestAttemptLeaderboard(p.contestId, p.attemptId)}
      />
    ),
  },
  { path: "/my-contests", element: <Navigate to={paths.myContests} replace /> },
  {
    path: "/results/:attemptId",
    element: <LegacyRedirect to={(p) => paths.submission(p.attemptId)} />,
  },
  {
    path: "/leaderboard/:contestId",
    element: <LegacyRedirect to={(p) => paths.contestLeaderboard(p.contestId)} />,
  },
  // `/leaderboard` with no contest had no page of its own — it rendered the same
  // component with an undefined param. Send it to the contest list.
  { path: "/leaderboard", element: <Navigate to={paths.contests} replace /> },

  { path: "*", element: <NotFound /> },
]);
