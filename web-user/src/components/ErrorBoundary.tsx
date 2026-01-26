import { ErrorBoundary, type FallbackProps } from "react-error-boundary";
import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const isDev = import.meta.env.DEV;

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
          <h1 className="text-3xl font-bold tracking-tight">Something went wrong</h1>
          <p className="text-lg text-muted-foreground">
            We encountered an unexpected error. Don't worry, our team has been notified.
          </p>
        </div>

        {/* Error Details (Development Only) */}
        {isDev && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-left">
            <div className="mb-2 flex items-center gap-2 font-semibold text-destructive">
              <Bug className="size-4" />
              <span>Error Details (Development Only)</span>
            </div>
            <div className="space-y-2 font-mono text-sm">
              <div>
                <span className="font-semibold text-muted-foreground">Error:</span>
                <p className="mt-1 break-all text-destructive">
                  {error instanceof Error ? error.message : String(error)}
                </p>
              </div>
              {error instanceof Error && error.stack && (
                <details className="mt-3">
                  <summary className="cursor-pointer font-semibold text-muted-foreground hover:text-foreground">
                    Stack Trace
                  </summary>
                  <pre className="mt-2 max-h-60 overflow-auto rounded bg-background p-3 text-xs">
                    {error.stack}
                  </pre>
                </details>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button
            onClick={resetErrorBoundary}
            size="lg"
            className="w-full sm:w-auto"
          >
            <RefreshCw className="mr-2 size-4" />
            Try Again
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => (window.location.href = "/dashboard")}
            className="w-full sm:w-auto"
          >
            <Home className="mr-2 size-4" />
            Go to Dashboard
          </Button>
        </div>

        {/* Help Text */}
        <p className="text-sm text-muted-foreground">
          If this problem persists, please contact support.
        </p>
      </div>
    </div>
  );
}

export function AppErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(err: unknown, info) => {
        console.error("Error caught by boundary:", err);
        console.error("Error info:", info);
      }}
      onReset={() => {
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
