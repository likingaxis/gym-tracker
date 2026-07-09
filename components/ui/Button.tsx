"use client";

import { clsx } from "clsx";
import { motion, useReducedMotion } from "framer-motion";
import type { HTMLMotionProps } from "framer-motion";

export function Button({ className, ...props }: HTMLMotionProps<"button">) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.button
      whileTap={reduceMotion ? undefined : { scale: 0.97 }}
      transition={{ duration: 0.12 }}
      className={clsx(
        "rounded-2xl bg-gym-accent px-4 py-3 font-bold text-slate-950 shadow-glow transition disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}
