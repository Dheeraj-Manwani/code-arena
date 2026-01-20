import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { toast } from "react-hot-toast";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { pageVariants } from "@/lib/animations";
import { useLoginMutation } from "@/queries/auth.mutations";

const Login = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const { mutate: login, isPending: isLoading } = useLoginMutation();
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(formData);
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
          <p className="text-muted-foreground">Admin Portal</p>
        </div>

        {/* Form */}
        <div className="arena-card">
          <AnimatePresence mode="wait">
            <motion.div
              key="credentials"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="text-xl font-mono font-semibold text-foreground mb-6">
                Welcome back
              </h2>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <Label htmlFor="email" className="arena-label">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@codearena.dev"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    disabled={isLoading}
                    className="arena-input w-full"
                    required
                  />
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
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      disabled={isLoading}
                      className="arena-input w-full pr-10"
                      required
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
                </div>

                <div className="flex items-center justify-end text-sm">
                  <Link
                    to="/forgot-password"
                    className="text-primary hover:underline"
                    onClick={(e) => isLoading && e.preventDefault()}
                  >
                    Forgot password?
                  </Link>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Loggin In..." : "Log In"}
                </Button>
              </form>

              <div className="mt-6 text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link to="/signup" className="text-primary hover:underline">
                  Sign up
                </Link>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
