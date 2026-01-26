import { useAuthStore } from "@/stores/auth.store";
import { Navigate, Outlet } from "react-router-dom";
import AccessDenied from "@/pages/AccessDenied";

export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== "creator") {
    return <AccessDenied />;
  }

  return <Outlet />;
}
