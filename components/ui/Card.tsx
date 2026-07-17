"use client";

import { clsx } from "clsx";
import { motion, useReducedMotion } from "framer-motion";

type CardVariant = "default" | "primary" | "subtle" | "active" | "danger" | "info" | "success";

type CardProps = {
  className?: string;
  children: React.ReactNode;
  variant?: CardVariant;
};

const variants: Record<CardVariant, string> = {
  default: "border-white/10/50 bg-white/[0.03]",
  primary: "border-gym-accent/45 bg-gym-raised",
  subtle: "border-white/10/45 bg-white/[0.025]",
  active: "border-gym-accent/45 bg-gym-active",
  danger: "border-gym-danger/35 bg-gym-danger/10",
  info: "border-gym-info/30 bg-gym-info/10",
  success: "border-gym-success/35 bg-gym-success/10"
};

export function Card({ className, children, variant = "default" }: CardProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      layout={reduceMotion ? false : true}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className={clsx("rounded-[1.15rem] border p-4", variants[variant], className)}
    >
      {children}
    </motion.section>
  );
}
