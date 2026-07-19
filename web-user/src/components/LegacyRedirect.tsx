import { Navigate, useParams } from "react-router-dom";

interface LegacyRedirectProps {
  /** Builds the new path from the legacy route's params. */
  to: (params: Record<string, string>) => string;
}

/** Redirect a legacy URL to its new home, carrying route params across. */
export function LegacyRedirect({ to }: LegacyRedirectProps) {
  const params = useParams() as Record<string, string>;
  return <Navigate to={to(params)} replace />;
}
