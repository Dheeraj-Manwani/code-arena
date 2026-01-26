import { Toaster } from "react-hot-toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { RouterProvider } from "react-router-dom";
import { AppErrorBoundary } from "./components/ErrorBoundary";
import { AppInitializer } from "./components/AppInitializer";
import { router } from "./routes";
import { queryClient } from "./lib/queryClient";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppErrorBoundary>
      <AppInitializer>
        <TooltipProvider>
          <Toaster
            position="top-center"
            toastOptions={{
              className: "toast",
              duration: 3000,
              style: {
                background: "hsl(var(--card))",
                color: "hsl(var(--foreground))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.5rem",
                fontFamily: '"Inter", system-ui, sans-serif',
              },
              success: {
                iconTheme: {
                  primary: "hsl(142 72% 42%)", 
                  secondary: "hsl(0 0% 100%)",
                },
              },
              error: {
                iconTheme: {
                  primary: "hsl(var(--destructive))",
                  secondary: "hsl(var(--destructive-foreground))",
                },
                style: {
                  border: "1px solid hsl(var(--destructive) / 0.5)",
                },
              },
            }}
          />
          <RouterProvider router={router} />
        </TooltipProvider>
      </AppInitializer>
    </AppErrorBoundary>
    <ReactQueryDevtools initialIsOpen={false} />
  </QueryClientProvider>
);

export default App;
