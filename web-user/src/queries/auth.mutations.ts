import { useMutation } from "@tanstack/react-query";
import { authApi } from "@/api/auth.ts";
import { useAuthStore } from "@/stores/auth.store";
import type {
  LoginInput,
  SignUpInput,
  VerifyOtpInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from "@/schema/auth.schema";

export const useSignUpMutation = () => {
  return useMutation({
    mutationFn: (data: SignUpInput) => authApi.signUp(data),
  });
};

export const useVerifyOtpMutation = () => {
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: (data: VerifyOtpInput) => authApi.verifyEmailOtp(data),
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken);
    },
  });
};

export const useLoginMutation = () => {
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: (data: LoginInput) => authApi.login(data),
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken);
    },
  });
};

export const useLogoutMutation = () => {
  const logout = useAuthStore((s) => s.logout);

  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: logout,
  });
};

export const useForgotPasswordMutation = () => {
  return useMutation({
    mutationFn: (data: ForgotPasswordInput) => authApi.forgotPassword(data),
  });
};

export const useResetPasswordMutation = () => {
  return useMutation({
    mutationFn: (data: ResetPasswordInput) => authApi.resetPassword(data),
  });
};
