"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Dumbbell, History, Home, TrendingUp } from "lucide-react";
import { MotionPage } from "@/components/motion/MotionPage";
import { ActiveWorkoutMiniPlayer } from "@/components/layout/ActiveWorkoutMiniPlayer";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isProfiles = pathname === "/profiles" || pathname.startsWith("/profiles/");
  const isActiveWorkout = /^\/workout\/(?!edit(?:\/|$)|archive(?:\/|$))[^/]+\/?$/.test(pathname);
  const modeClass = isProfiles ? "mode-profiles" : isActiveWorkout ? "mode-workout" : "mode-consultation";

  return (
    <main
      className={`officina-page ${modeClass} mx-auto flex min-h-dvh max-w-md flex-col bg-gym-bg text-gym-soft ${isProfiles ? "pb-8" : "pb-52"}`}
    >
      <div className={`flex-1 px-4 ${isActiveWorkout ? "py-3" : "py-5"}`}>
        <MotionPage>{children}</MotionPage>
      </div>
      {!isProfiles ? <ActiveWorkoutMiniPlayer /> : null}
      {!isProfiles ? (
        <nav
          className="fixed inset-x-4 bottom-[calc(1.5rem+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-sm items-center justify-between rounded-full border border-white/10 bg-[#0b0f11]/95 px-2 py-2 shadow-2xl backdrop-blur-xl"
          aria-label="Navigazione principale"
        >
          <NavItem href="/" icon={<Home size={22} />} label="Home" />
          <NavItem href="/workout" icon={<Dumbbell size={22} />} label="Scheda" />
          <NavItem href="/history" icon={<History size={22} />} label="Storico" />
          <NavItem href="/progress" icon={<TrendingUp size={22} />} label="Progressi" />
        </nav>
      ) : null}
    </main>
  );
}

function NavItem({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <motion.div whileTap={reduceMotion ? undefined : { scale: 0.94 }} transition={{ duration: 0.1 }}>
      <Link
        href={href}
        className={`relative flex min-h-12 items-center justify-center gap-2 rounded-full transition-all duration-200 ${
          isActive
            ? "bg-white/10 px-4 py-2 text-white shadow-sm"
            : "px-3 py-2 text-gym-muted hover:text-white"
        }`}
      >
        <span className="relative z-10 shrink-0">{icon}</span>
        {isActive ? (
          <motion.span
            layoutId="nav-label"
            className="relative z-10 text-[0.85rem] font-bold"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            transition={{ duration: 0.2 }}
          >
            {label}
          </motion.span>
        ) : null}
        {isActive ? (
          <motion.span
            layoutId="nav-pill-bg"
            className="absolute inset-0 z-0 rounded-full bg-white/5"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        ) : null}
      </Link>
    </motion.div>
  );
}
