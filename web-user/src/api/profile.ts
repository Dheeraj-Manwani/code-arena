import api from "@/lib/axios";
import type { ProfileResponse } from "@/schema/profile.schema";

export const getProfile = async (): Promise<ProfileResponse> => {
  const res = await api.get<{ success: boolean; data: ProfileResponse }>(
    "/api/profile",
  );
  if (!res.data.data) {
    throw new Error("Profile not found");
  }
  return res.data.data;
};
