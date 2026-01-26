import { createBrowserRouter, Navigate, } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Dashboard from "@/pages/Dashboard";
import Contests from "@/pages/Contests";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import ForgotPassword from "@/pages/ForgotPassword";
import NotFound from "@/pages/NotFound";
import { AuthRoute } from "./components/AuthRoute";
import ContestDetails from "./pages/ContestDetails";
import ContestPage from "./components/contest/ContestPage";
import MyContests from "./pages/MyContests";
import Leaderboard from "./pages/Leaderboard";
import Profile from "./pages/Profile";
import ContestResultsPage from "./pages/ContestResultsPage";
import { RouteErrorBoundary } from "./components/RouteErrorBoundary";

export const router = createBrowserRouter([
  {
    element: <AuthRoute />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        path: "/login",
        element: <Login />,
      },
      {
        path: "/signup",
        element: <Signup />,
      },
      {
        path: "/forgot-password",
        element: <ForgotPassword />,
      },
    ],
  },

  {
    element: <ProtectedRoute />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        path: "/",
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: "/dashboard",
        element: <Dashboard />,
      },
      {
        path: "/contests",
        element: <Contests />,
      },
      {
        path: "/contest/:id/details",
        element: <ContestDetails />,
      },
      {
        path: "/contest/:id",
        element: <ContestPage />,
      },
      {
        path: "/my-contests",
        element: <MyContests />,
      },
      {
        path: "/leaderboard/:contestId?",
        element: <Leaderboard />,
      },
      {
        path: "/profile",
        element: <Profile />,
      },
      {
        path: "/results/:attemptId",
        element: <ContestResultsPage />,
      },
    ],
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);
