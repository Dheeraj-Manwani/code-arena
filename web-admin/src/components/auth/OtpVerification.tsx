import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

interface OtpVerificationProps {
  otp: string;
  onOtpChange: (otp: string) => void;
  onSubmit: () => void;
  onResend: () => void;
  onBack?: () => void;
  email: string;
  title?: string;
  description?: string;
  submitLabel?: string;
  submitLoadingLabel?: string;
  isSubmitting?: boolean;
  error?: string;
  disabled?: boolean;
  showBackButton?: boolean;
}

export function OtpVerification({
  otp,
  onOtpChange,
  onSubmit,
  onResend,
  onBack,
  email,
  title = "Verify your email",
  description = "Enter the 6-digit code sent to",
  submitLabel = "Verify",
  submitLoadingLabel = "Verifying...",
  isSubmitting = false,
  error,
  disabled = false,
  showBackButton = true,
}: OtpVerificationProps) {
  const isDisabled = disabled || isSubmitting;
  const canSubmit = otp.length === 6 && !isDisabled;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSubmit) {
      onSubmit();
    }
  };

  return (
    <>
      {showBackButton && onBack && (
        <button
          onClick={onBack}
          disabled={isDisabled}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      )}

      <h2 className="text-xl font-mono font-semibold text-foreground mb-2">
        {title}
      </h2>
      <p className="text-muted-foreground text-sm mb-6">
        {description} <span className="text-foreground">{email}</span>
      </p>

      <form onSubmit={handleFormSubmit} className="space-y-6">
        <div className="flex justify-center">
          <InputOTP
            maxLength={6}
            value={otp}
            onChange={onOtpChange}
            disabled={isDisabled}
          >
            <InputOTPGroup className="flex justify-center gap-1.5">
              <InputOTPSlot index={0} className="arena-input" />
              <InputOTPSlot index={1} className="arena-input" />
              <InputOTPSlot index={2} className="arena-input" />
              <InputOTPSlot index={3} className="arena-input" />
              <InputOTPSlot index={4} className="arena-input" />
              <InputOTPSlot index={5} className="arena-input" />
            </InputOTPGroup>
          </InputOTP>
        </div>

        <Button type="submit" className="w-full" disabled={!canSubmit}>
          {isSubmitting ? submitLoadingLabel : submitLabel}
        </Button>

        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}

        <div className="text-center text-sm text-muted-foreground">
          Didn't receive the code?{" "}
          <button
            type="button"
            onClick={onResend}
            disabled={isDisabled}
            className="text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Resend OTP
          </button>
        </div>
      </form>
    </>
  );
}
