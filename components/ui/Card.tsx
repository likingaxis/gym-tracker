"use client";

import { clsx } from "clsx";
import { motion, useReducedMotion } from "framer-motion";

type CardVariant = "default" | "primary" | "subtle" | "active" | "danger" | "info";

type CardProps = {
  className?: string;
  children: React.ReactNode;
  variant?: CardVariant;
};

const variants: Record<CardVariant, string> = {
  default: "border-white/10 bg-gym-card shadow-card",
  primary: "border-gym-accent/30 bg-gradient-to-br from-gym-active to-gym-card shadow-card",
  subtle: "border-white/[0.07] bg-white/[0.045] shadow-sm",
  active: "border-gym-info/25 bg-gym-active shadow-info",
  danger: "border-red-400/25 bg-red-500/[0.07] shadow-sm",
  info: "border-gym-info/25 bg-blue-500/[0.08] shadow-info"
};

export function Card({ className, children, variant = "default" }: CardProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      layout={reduceMotion ? false : true}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className={clsx("rounded-3xl border p-4", variants[variant], className)}
    >
      {children}
    </motion.section>
  );
}
