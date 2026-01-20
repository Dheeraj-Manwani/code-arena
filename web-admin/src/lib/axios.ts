import axios, { AxiosError } from "axios";
import { useAuthStore } from "@/stores/auth.store";
import { toast } from "react-hot-toast";
import { getErrorMessage } from "./error-messages";
import type { ApiErrorCode } from "@/schema/error.schema";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (
    error: AxiosError<{ success: boolean; error: ApiErrorCode; data: null }>
  ) => {
    if (error.response?.data?.error) {
      const errorCode = error.response.data.error;
      const errorMessage = getErrorMessage(errorCode);
      errorMessage && toast.error(errorMessage);
    } else if (error.message) {
      toast.error("Network error. Please check your connection.");
    } else {
      toast.error("An unexpected error occurred. Please try again.");
    }
    return Promise.reject(error);
  }
);

export default api;
