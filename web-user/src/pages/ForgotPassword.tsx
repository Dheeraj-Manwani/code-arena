import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OtpVerification } from "@/components/auth/OtpVerification";
import { toast } from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { pageVariants } from "@/lib/animations";
import {
  useForgotPasswordMutation,
  useResetPasswordMutation,
} from "@/queries/auth.mutations";
import {
  ForgotPasswordSchema,
  ResetPasswordSchema,
} from "@/schema/auth.schema";
import type { ZodError } from "zod";

type Step = "request" | "otp";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { mutate: forgotPassword, isPending: isRequesting } =
    useForgotPasswordMutation();
  const { mutate: resetPassword, isPending: isResetting } =
    useResetPasswordMutation();
  const [step, setStep] = useState<Step>("request");
  const [formData, setFormData] = useState({
    email: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [otp, setOtp] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleRequestReset = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      const validatedData = ForgotPasswordSchema.parse(formData);

      forgotPassword(validatedData, {
        onSuccess: () => {
          setStep("otp");
          toast.success("OTP sent to your email!");
        },
      });
    } catch (error) {
      if (error instanceof Error && "issues" in error) {
        const zodError = error as ZodError;
        const fieldErrors: Record<string, string> = {};
        zodError.issues.forEach((issue) => {
          const path = issue.path[0] as string;
          if (path) {
            fieldErrors[path] = issue.message;
          }
        });
        setErrors(fieldErrors);

        const firstError = zodError.issues[0];
        if (firstError) {
          toast.error(firstError.message);
        }
      } else {
        toast.error("Please fix the errors in the form");
      }
    }
  };

  const handleResetPassword = () => {
    setErrors({});
    try {
      const validatedData = ResetPasswordSchema.parse({
        email: formData.email,
        otp,
        newPassword: formData.newPassword,
      });

      resetPassword(validatedData, {
        onSuccess: () => {
          toast.success("Password reset successfully!");
          navigate("/login");
        },
      });
    } catch (error) {
      if (error instanceof Error && "issues" in error) {
        const zodError = error as ZodError;
        const fieldErrors: Record<string, string> = {};
        zodError.issues.forEach((issue) => {
          const path = issue.path[0] as string;
          if (path) {
            fieldErrors[path] = issue.message;
          }
        });
        setErrors(fieldErrors);

        const firstError = zodError.issues[0];
        if (firstError) {
          toast.error(firstError.message);
        }
      } else {
        toast.error("Please enter a valid 6-digit OTP");
      }
    }
  };

  const handleResendOtp = () => {
    try {
      const validatedData = ForgotPasswordSchema.parse(formData);

      forgotPassword(validatedData, {
        onSuccess: () => {
          toast.success("OTP resent to your email!");
        },
      });
    } catch (error) {
      toast.error("Please check your email and password");
    }
  };

  const handleBack = () => {
    setStep("request");
    setOtp("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        className="w-full max-w-md"
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        {/* Logo */}
        <div className="text-center mb-4">
          <div className="flex flex-col items-center gap-1 mb-2">
            <img src="/logo.png" alt="Code Arena" className="h-12 w-auto" />
            <h1 className="font-mono text-3xl font-bold">
              <span className="text-primary">Code</span>
              <span className="text-foreground">Arena</span>
            </h1>
          </div>
          <p className="text-muted-foreground">Reset Password</p>
        </div>

        {/* Form */}
        <div className="arena-card">
          <AnimatePresence mode="wait">
            {step === "request" ? (
              <motion.div
                key="request"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="text-xl font-mono font-semibold text-foreground mb-6">
                  Reset your password
                </h2>

                <form onSubmit={handleRequestReset} className="space-y-5">
                  <div>
                    <Label htmlFor="email" className="arena-label">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={formData.email}
                      onChange={(e) => {
                        setFormData({ ...formData, email: e.target.value });
                        if (errors.email) setErrors({ ...errors, email: "" });
                      }}
                      disabled={isRequesting}
                      className={`arena-input w-full ${
                        errors.email
                          ? "border-destructive focus:border-destructive"
                          : ""
                      }`}
                    />
                    {errors.email && (
                      <p className="mt-1.5 text-sm text-destructive">
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="newPassword" className="arena-label">
                      New Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={formData.newPassword}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            newPassword: e.target.value,
                          });
                          if (errors.newPassword)
                            setErrors({ ...errors, newPassword: "" });
                        }}
                        disabled={isRequesting}
                        className={`arena-input w-full pr-10 ${
                          errors.newPassword
                            ? "border-destructive focus:border-destructive"
                            : ""
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors cursor-pointer"
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {errors.newPassword && (
                      <p className="mt-1.5 text-sm text-destructive">
                        {errors.newPassword}
                      </p>
                    )}
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Must be at least 6 characters
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword" className="arena-label">
                      Confirm New Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={formData.confirmPassword}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            confirmPassword: e.target.value,
                          });
                          if (errors.confirmPassword)
                            setErrors({ ...errors, confirmPassword: "" });
                        }}
                        disabled={isRequesting}
                        className={`arena-input w-full pr-10 ${
                          errors.confirmPassword
                            ? "border-destructive focus:border-destructive"
                            : ""
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors cursor-pointer"
                        aria-label={
                          showConfirmPassword
                            ? "Hide confirm password"
                            : "Show confirm password"
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="mt-1.5 text-sm text-destructive">
                        {errors.confirmPassword}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isRequesting}
                  >
                    {isRequesting ? "Sending OTP..." : "Send OTP"}
                  </Button>
                </form>

                <div className="mt-6 text-center text-sm text-muted-foreground">
                  Remember your password?{" "}
                  <Link to="/login" className="text-primary hover:underline">
                    Log in
                  </Link>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="otp"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <OtpVerification
                  otp={otp}
                  onOtpChange={setOtp}
                  onSubmit={handleResetPassword}
                  onResend={handleResendOtp}
                  onBack={handleBack}
                  email={formData.email}
                  title="Verify OTP"
                  description="Enter the 6-digit code sent to"
                  submitLabel="Reset Password"
                  submitLoadingLabel="Resetting..."
                  isSubmitting={isResetting}
                  error={errors.otp}
                  disabled={isResetting}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
