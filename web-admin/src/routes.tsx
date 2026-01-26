import { createBrowserRouter, Navigate, } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Dashboard from "@/pages/Dashboard";
import CreateContest from "@/pages/CreateContest";
import ContestDetail from "@/pages/ContestDetail";
import QuestionBank from "@/pages/QuestionBank";
import CreateQuestion from "@/pages/CreateQuestion";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import ForgotPassword from "@/pages/ForgotPassword";
import NotFound from "@/pages/NotFound";
import { AuthRoute } from "./components/AuthRoute";
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
        path: "/contests/new",
        element: <CreateContest />,
      },
      {
        path: "/contests/:id",
        element: <ContestDetail />,
      },
      {
        path: "/questions",
        element: <QuestionBank />,
      },
      {
        path: "/questions/new",
        element: <CreateQuestion />,
      },
    ],
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);
