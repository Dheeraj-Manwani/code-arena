import { useAuthStore } from "@/stores/auth.store";
import { Navigate, Outlet, ScrollRestoration, useLocation } from "react-router-dom";
import { AppNavbar, getNavbarLinks, isContestAttemptRoute } from "@/components/common/AppNavbar";

export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { pathname } = useLocation();
  const hideNavbar = isContestAttemptRoute(pathname);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      {!hideNavbar && <AppNavbar links={getNavbarLinks(pathname)} />}
      <ScrollRestoration />
      <Outlet />
    </>
  );
}
