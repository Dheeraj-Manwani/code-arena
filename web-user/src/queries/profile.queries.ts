import { useQuery } from "@tanstack/react-query";
import { getProfile } from "@/api/profile";

export const useProfileQuery = () => {
  return useQuery({
    queryKey: ["profile"],
    queryFn: getProfile,
    retry: false,
    staleTime: 60 * 1000,
  });
};
