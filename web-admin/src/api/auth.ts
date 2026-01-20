import api from "@/lib/axios";
import type {
  AuthResponse,
  LoginInput,
  SignUpInput,
  VerifyOtpInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from "@/schema/auth.schema";

export const authApi = {
  signUp: async (data: SignUpInput): Promise<{ message: string }> => {
    const res = await api.post("/api/auth/signup", data);
    return res.data.data;
  },

  login: async (data: LoginInput): Promise<AuthResponse> => {
    const res = await api.post("/api/auth/login", data);
    return res.data.data;
  },

  logout: async (): Promise<void> => {
    await api.post("/api/auth/logout");
  },

  refresh: async (): Promise<AuthResponse> => {
    const res = await api.post("/api/auth/refresh");
    return res.data.data;
  },

  verifyEmailOtp: async (data: VerifyOtpInput): Promise<AuthResponse> => {
    const res = await api.post("/api/auth/verify", data);
    return res.data.data;
  },

  forgotPassword: async (
    data: ForgotPasswordInput
  ): Promise<{ message: string }> => {
    const res = await api.post("/api/auth/forgot-password", data);
    return res.data.data;
  },

  resetPassword: async (
    data: ResetPasswordInput
  ): Promise<{ message: string }> => {
    const res = await api.post("/api/auth/reset-password", data);
    return res.data.data;
  },
};
