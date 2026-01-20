import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/api/auth.ts";
import { useAuthStore } from "@/stores/auth.store";

export const useAuthInitQuery = () => {
  const setAuth = useAuthStore((s) => s.setAuth);
  const setUnauthenticated = useAuthStore((s) => s.setUnauthenticated);

  return useQuery({
    queryKey: ["auth-init"],
    queryFn: async () => {
      try {
        const data = await authApi.refresh();
        setAuth(data.user, data.accessToken);
        return data;
      } catch {
        setUnauthenticated();
        throw new Error("Auth refresh failed");
      }
    },
    retry: false,
    staleTime: Infinity,
  });
};
