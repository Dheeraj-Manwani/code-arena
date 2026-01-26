import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OtpVerification } from "@/components/auth/OtpVerification";
import { toast } from "react-hot-toast";
import { Eye, EyeOff, Shield } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { pageVariants } from "@/lib/animations";
import {
  useSignUpMutation,
  useVerifyOtpMutation,
} from "@/queries/auth.mutations";
import { SignUpSchema, VerifyOtpSchema } from "@/schema/auth.schema";
import type { ZodError } from "zod";

type Step = "registration" | "otp";

const Signup = () => {
  const { mutate: signUp, isPending: isSigningUp } = useSignUpMutation();
  const { mutate: verifyOtp, isPending: isVerifyingOtp } =
    useVerifyOtpMutation();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("registration");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "creator",
  });
  const [otp, setOtp] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      const validatedData = SignUpSchema.parse(formData);

      signUp(validatedData, {
        onSuccess: () => {
          setStep("otp");
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
      } else {
        toast.error("Please fix the errors in the form");
      }
    }
  };

  const handleVerifyOtp = () => {
    setErrors({});

    try {
      const validatedData = VerifyOtpSchema.parse({
        email: formData.email,
        otp,
      });

      verifyOtp(validatedData, {
        onSuccess: () => {
          toast.success("Account created successfully!");
          navigate("/dashboard");
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
    toast.success("OTP resent to your email!");
  };

  const handleBack = () => {
    setStep("registration");
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
        <div className="text-center mb-6">
          <div className="flex flex-col items-center gap-2 mb-4">
            <div className="w-16 h-16 rounded-lg bg-primary/20 border-2 border-primary/30 flex items-center justify-center mb-2">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h1 className="font-mono text-3xl font-bold">
              <span className="text-primary">Code</span>
              <span className="text-foreground">Arena</span>
            </h1>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground uppercase tracking-wider">Administrator Access</p>
            <p className="text-xs text-muted-foreground">Secure registration for authorized personnel only</p>
          </div>
        </div>

        {/* Form */}
        <div className="arena-card border-2 border-primary/20 bg-card/80 backdrop-blur-sm">
          <AnimatePresence mode="wait">
            {step === "registration" ? (
              <motion.div
                key="registration"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="mb-6 pb-4 border-b border-border">
                  <h2 className="text-xl font-mono font-semibold text-foreground mb-1">
                    Create Admin Account
                  </h2>
                  <p className="text-xs text-muted-foreground">Enter your details to create an administrator account</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <Label htmlFor="name" className="arena-label">
                      Full Name
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={(e) => {
                        setFormData({ ...formData, name: e.target.value });
                        if (errors.name) setErrors({ ...errors, name: "" });
                      }}
                      disabled={isSigningUp}
                      className={`arena-input w-full ${errors.name
                        ? "border-destructive focus:border-destructive"
                        : ""
                        }`}
                    />
                    {errors.name && (
                      <p className="mt-1.5 text-sm text-destructive">
                        {errors.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="email" className="arena-label">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@codearena.dev"
                      value={formData.email}
                      onChange={(e) => {
                        setFormData({ ...formData, email: e.target.value });
                        if (errors.email) setErrors({ ...errors, email: "" });
                      }}
                      disabled={isSigningUp}
                      className={`arena-input w-full ${errors.email
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
                    <Label htmlFor="password" className="arena-label">
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            password: e.target.value,
                          });
                          if (errors.password)
                            setErrors({ ...errors, password: "" });
                        }}
                        disabled={isSigningUp}
                        className={`arena-input w-full pr-10 ${errors.password
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
                    {errors.password && (
                      <p className="mt-1.5 text-sm text-destructive">
                        {errors.password}
                      </p>
                    )}
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Must be at least 6 characters or more
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword" className="arena-label">
                      Confirm Password
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
                        disabled={isSigningUp}
                        className={`arena-input w-full pr-10 ${errors.confirmPassword
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
                    disabled={isSigningUp}
                  >
                    {isSigningUp ? "Creating Account..." : "Create Admin Account"}
                  </Button>
                </form>

                <div className="mt-6 text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
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
                  onSubmit={handleVerifyOtp}
                  onResend={handleResendOtp}
                  onBack={handleBack}
                  email={formData.email}
                  title="Verify your email"
                  description="Enter the 6-digit code sent to"
                  submitLabel="Verify & Create Admin Account"
                  submitLoadingLabel="Verifying..."
                  isSubmitting={isVerifyingOtp}
                  error={errors.otp}
                  disabled={isVerifyingOtp}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default Signup;
