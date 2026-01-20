import { useAuthInitQuery } from "@/queries/auth.queries";
import { Loader } from "@/components/Loader";

export function AppInitializer({ children }: { children: React.ReactNode }) {
  const { isLoading } = useAuthInitQuery();

  if (isLoading) {
    return <Loader />;
  }

  return <>{children}</>;
}
