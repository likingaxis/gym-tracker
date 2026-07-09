"use client";

import { motion, useReducedMotion } from "framer-motion";

export function AnimatedProgressBar({ value }: { value: number }) {
  const reduceMotion = useReducedMotion();
  const safeValue = Math.min(100, Math.max(0, value));

  return (
    <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
      <motion.div
        className="h-full rounded-full bg-gym-accent"
        initial={false}
        animate={{ width: `${safeValue}%` }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.3, ease: "easeOut" }}
      />
    </div>
  );
}
