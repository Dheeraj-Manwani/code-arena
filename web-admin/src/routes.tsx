import { createBrowserRouter, Navigate, isRouteErrorResponse, useRouteError } from "react-router-dom";
import { AlertTriangle, Home, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
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

function RouteErrorBoundary() {
  const error = useRouteError();
  const isDev = import.meta.env.DEV;

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      return <NotFound />;
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-2xl space-y-6 text-center">
          {/* Error Icon */}
          <div className="flex justify-center">
            <div className="rounded-full bg-destructive/10 p-4">
              <AlertTriangle className="size-12 text-destructive" aria-hidden="true" />
            </div>
          </div>

          {/* Error Message */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              {error.status} Error
            </h1>
            <p className="text-lg text-muted-foreground">
              {error.statusText || "Something went wrong"}
            </p>
          </div>

          {/* Error Details (Development Only) */}
          {isDev && error.data && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-left">
              <div className="mb-2 flex items-center gap-2 font-semibold text-destructive">
                <Bug className="size-4" />
                <span>Error Details (Development Only)</span>
              </div>
              <pre className="mt-2 max-h-60 overflow-auto rounded bg-background p-3 text-xs">
                {JSON.stringify(error.data, null, 2)}
              </pre>
            </div>
          )}

          {/* Action Button */}
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="lg"
              onClick={() => (window.location.href = "/dashboard")}
            >
              <Home className="mr-2 size-4" />
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Handle other errors (thrown from loaders, actions, etc.)
  const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
  const errorStack = error instanceof Error ? error.stack : undefined;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl space-y-6 text-center">
        {/* Error Icon */}
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertTriangle className="size-12 text-destructive" aria-hidden="true" />
          </div>
        </div>

        {/* Error Message */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Route Error</h1>
          <p className="text-lg text-muted-foreground">{errorMessage}</p>
        </div>

        {/* Error Details (Development Only) */}
        {isDev && errorStack && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-left">
            <div className="mb-2 flex items-center gap-2 font-semibold text-destructive">
              <Bug className="size-4" />
              <span>Error Details (Development Only)</span>
            </div>
            <details className="mt-3">
              <summary className="cursor-pointer font-semibold text-muted-foreground hover:text-foreground">
                Stack Trace
              </summary>
              <pre className="mt-2 max-h-60 overflow-auto rounded bg-background p-3 text-xs">
                {errorStack}
              </pre>
            </details>
          </div>
        )}

        {/* Action Button */}
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="lg"
            onClick={() => (window.location.href = "/dashboard")}
          >
            <Home className="mr-2 size-4" />
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}

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
