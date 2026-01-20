import { type LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import { fadeIn, STAGGER_DELAY } from "@/lib/animations";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
  index?: number;
}

export const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  index = 0,
}: StatCardProps) => {
  return (
    <motion.div
      className="arena-stat-card"
      variants={fadeIn}
      initial="initial"
      animate="animate"
      transition={{ delay: index * STAGGER_DELAY }}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {title}
        </span>
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div className="font-mono text-3xl font-bold text-foreground mb-1">
        {value}
      </div>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </motion.div>
  );
};
