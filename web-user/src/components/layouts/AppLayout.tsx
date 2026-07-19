import { Navigate, Outlet, ScrollRestoration } from "react-router-dom";
import { AppNavbar } from "@/components/common/AppNavbar";
import { useAuthStore } from "@/stores/auth.store";
import { paths } from "@/lib/paths";

/**
 * Authenticated pages that carry the app chrome.
 *
 * Navbar visibility is a property of the layout a route sits under, not of its
 * pathname — routes needing a full-screen surface use FocusLayout instead.
 */
export function AppLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to={paths.login} replace />;
  }

  return (
    <>
      <AppNavbar />
      <ScrollRestoration />
      <Outlet />
    </>
  );
}
