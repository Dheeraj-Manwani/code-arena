import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/stores/auth.store";
import { paths } from "@/lib/paths";

/**
 * Authenticated pages that own the whole viewport: the contest runner and (from
 * Phase 4) the practice solve view. No navbar, and no ScrollRestoration — these
 * pages manage their own scroll containers.
 */
export function FocusLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to={paths.login} replace />;
  }

  return <Outlet />;
}
