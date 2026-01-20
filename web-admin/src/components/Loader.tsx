import { Loader2 } from "lucide-react";
import { motion } from "motion/react";

export const Loader = ({ message }: { message?: string }) => {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center gap-4 z-10"
      >
        <div className="relative flex items-center justify-center">
          <motion.span
            className="absolute inset-[-16px] rounded-full "
            animate={{ opacity: [0.6, 0.15, 0.6], scale: [1, 1.08, 1] }}
            transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
          />
          <Loader2 className="w-12 h-12 text-primary animate-spin drop-shadow-[0_0_18px_hsl(var(--primary)/0.35)]" />
        </div>
        <p className="text-sm text-muted-foreground font-sans tracking-wide">
          {message ? `${message}...` : "Loading..."}
        </p>
      </motion.div>
    </div>
  );
};
