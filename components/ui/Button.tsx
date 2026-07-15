"use client";

import { clsx } from "clsx";
import { motion, useReducedMotion } from "framer-motion";
import type { HTMLMotionProps } from "framer-motion";

export function Button({ className, ...props }: HTMLMotionProps<"button">) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.button
      whileTap={reduceMotion ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.09 }}
      className={clsx(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-gym-accent px-4 py-3 text-base font-bold text-white transition disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}
