import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface MatchScoreRingProps {
  score: number;
  size?: "sm" | "md" | "lg" | "hero";
  className?: string;
}

export function MatchScoreRing({ score, size = "md", className }: MatchScoreRingProps) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  let colorClass = "text-primary";
  let gradientId = "indigo-gradient";
  
  if (score >= 80) {
    colorClass = "text-accent";
    gradientId = "green-gradient";
  } else if (score < 50) {
    colorClass = "text-destructive";
    gradientId = "red-gradient";
  } else if (score < 80 && score >= 50) {
    colorClass = "text-amber-500";
    gradientId = "amber-gradient";
  }

  const dimensions = {
    sm: "w-16 h-16",
    md: "w-32 h-32",
    lg: "w-48 h-48",
    hero: "w-28 h-28 sm:w-36 sm:h-36 lg:w-48 lg:h-48",
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-4xl",
    lg: "text-6xl",
    hero: "text-3xl sm:text-5xl lg:text-6xl",
  };

  return (
    <div className={cn("relative flex items-center justify-center", dimensions[size], className)}>
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="indigo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(243.4 75.4% 58.6%)" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
          <linearGradient id="green-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(142.1 70.6% 45.3%)" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
          <linearGradient id="amber-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(37.7 92.1% 50.2%)" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          <linearGradient id="red-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(0 84.2% 60.2%)" />
            <stop offset="100%" stopColor="#b91c1c" />
          </linearGradient>
        </defs>
        
        {/* Background Track */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth="8"
          className="text-slate-100"
        />
        
        {/* Progress Track */}
        <motion.circle
          cx="50"
          cy="50"
          r={radius}
          fill="transparent"
          stroke={`url(#${gradientId})`}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
        />
      </svg>
      
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span 
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className={cn("font-display font-bold text-foreground", textSizes[size])}
        >
          {score}
        </motion.span>
      </div>
    </div>
  );
}
