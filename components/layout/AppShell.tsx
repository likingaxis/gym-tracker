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
          className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md border-t border-gym-line/80 bg-gym-panel/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur"
          aria-label="Navigazione principale"
        >
          <div className="grid grid-cols-4 gap-1 text-[0.78rem] text-gym-muted">
            <NavItem href="/" icon={<Home size={20} />} label="Home" />
            <NavItem href="/workout" icon={<Dumbbell size={20} />} label="Scheda" />
            <NavItem href="/history" icon={<History size={20} />} label="Storico" />
            <NavItem href="/progress" icon={<TrendingUp size={20} />} label="Progressi" />
          </div>
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
    <motion.div whileTap={reduceMotion ? undefined : { scale: 0.98 }} transition={{ duration: 0.09 }}>
      <Link
        href={href}
        className={`relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 transition ${
          isActive ? "text-gym-soft" : "text-gym-muted hover:bg-white/[0.04] hover:text-gym-soft"
        }`}
      >
        {isActive ? (
          <motion.span
            layoutId="bottom-nav-active"
            className="absolute inset-x-5 top-1 h-0.5 rounded-full bg-gym-accent"
            transition={{ duration: 0.16, ease: "easeOut" }}
          />
        ) : null}
        <span className={`relative ${isActive ? "text-gym-accent" : ""}`}>{icon}</span>
        <span className={`relative ${isActive ? "font-bold" : "font-semibold"}`}>{label}</span>
      </Link>
    </motion.div>
  );
}
