import { Navigate, Outlet, ScrollRestoration } from "react-router-dom";
import { useAuthStore } from "@/stores/auth.store";
import { paths } from "@/lib/paths";

export function AuthRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (isAuthenticated) {
    return <Navigate to={paths.problems} replace />;
  }

  return (
    <>
      <ScrollRestoration />
      <Outlet />
    </>
  );
}
