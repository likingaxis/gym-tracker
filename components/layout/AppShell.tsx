"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Dumbbell, History, Home, TrendingUp } from "lucide-react";
import { MotionPage } from "@/components/motion/MotionPage";
import { ActiveWorkoutMiniPlayer } from "@/components/layout/ActiveWorkoutMiniPlayer";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col bg-gym-bg pb-60">
      <div className="flex-1 px-4 py-5">
        <MotionPage>{children}</MotionPage>
      </div>
      <ActiveWorkoutMiniPlayer />
      <nav className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md border-t border-white/10 bg-gym-panel/95 px-4 py-3 backdrop-blur">
        <div className="grid grid-cols-4 gap-2 text-xs text-slate-300">
          <NavItem href="/" icon={<Home size={20} />} label="Home" />
          <NavItem href="/workout" icon={<Dumbbell size={20} />} label="Allenati" />
          <NavItem href="/history" icon={<History size={20} />} label="Storico" />
          <NavItem href="/progress" icon={<TrendingUp size={20} />} label="Progressi" />
        </div>
      </nav>
    </main>
  );
}

function NavItem({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <motion.div whileTap={reduceMotion ? undefined : { scale: 0.96 }} transition={{ duration: 0.12 }}>
      <Link
        href={href}
        className={`relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 transition ${
          isActive ? "bg-gym-accent/15 text-gym-accent" : "hover:bg-white/10"
        }`}
      >
        {isActive ? (
          <motion.span
            layoutId="bottom-nav-active"
            className="absolute inset-0 rounded-2xl border border-gym-accent/20"
            transition={{ duration: 0.18, ease: "easeOut" }}
          />
        ) : null}
        <span className="relative">{icon}</span>
        <span className="relative font-bold">{label}</span>
      </Link>
    </motion.div>
  );
}
