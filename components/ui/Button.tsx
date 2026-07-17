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
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-[1rem] bg-gym-accent px-4 py-3 text-base font-extrabold text-[#050708] shadow-[0_4px_20px_rgba(198,95,55,0.3)] transition disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}
