"use client";

import { clsx } from "clsx";
import { motion, useReducedMotion } from "framer-motion";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      layout={reduceMotion ? false : true}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className={clsx("rounded-3xl border border-white/10 bg-gym-card p-4 shadow-sm", className)}
    >
      {children}
    </motion.section>
  );
}
