"use client";

import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Dumbbell, History, Home, TrendingUp } from "lucide-react";
import { MotionPage } from "@/components/motion/MotionPage";
import { ActiveWorkoutMiniPlayer } from "@/components/layout/ActiveWorkoutMiniPlayer";
import { SELECTED_PROFILE_COOKIE } from "@/lib/api-client/profiles";

import { useSyncEngine } from "@/lib/sync/offlineSync";

function SyncEngineRunner() {
  useSyncEngine();
  return null;
}

function ProfileCookieSync() {
  const pathname = usePathname();
  useEffect(() => {
    if (typeof window === "undefined") return;
    const profileId = localStorage.getItem("active_profile_id");
    if (profileId) {
      document.cookie = `${SELECTED_PROFILE_COOKIE}=${encodeURIComponent(profileId)}; path=/; max-age=31536000; SameSite=Lax`;
    }
  }, [pathname]);
  return null;
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isProfiles = pathname === "/profiles" || pathname.startsWith("/profiles/");
  const isActiveWorkout = /^\/workout\/(?!edit(?:\/|$)|archive(?:\/|$))[^/]+\/?$/.test(pathname);
  const hideBottomNav = isProfiles || isActiveWorkout || pathname.startsWith("/workout/edit");
  const modeClass = isProfiles ? "mode-profiles" : isActiveWorkout ? "mode-workout" : "mode-consultation";

  return (
    <main
      className={`officina-page ${modeClass} mx-auto flex min-h-dvh max-w-md flex-col bg-gym-bg text-gym-soft ${isProfiles ? "pb-8" : hideBottomNav ? "pb-28" : "pb-44"}`}
    >
      <SyncEngineRunner />
      <ProfileCookieSync />
      <div className={`flex-1 px-4 ${isActiveWorkout ? "py-3" : "py-5"}`}>
        <MotionPage>{children}</MotionPage>
      </div>
      {!hideBottomNav ? <ActiveWorkoutMiniPlayer /> : null}
      {!hideBottomNav ? (
        <nav
          className="fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-50 mx-auto grid max-w-sm grid-cols-4 items-center gap-1 rounded-full border border-white/10 bg-[#0b0f11]/95 px-2 py-1.5 shadow-2xl backdrop-blur-xl"
          aria-label="Navigazione principale"
        >
          <NavItem href="/" icon={<Home size={19} />} label="Home" />
          <NavItem href="/workout" icon={<Dumbbell size={19} />} label="Scheda" />
          <NavItem href="/history" icon={<History size={19} />} label="Storico" />
          <NavItem href="/progress" icon={<TrendingUp size={19} />} label="Progressi" />
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
        aria-label={label}
        className={`relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-full px-2 py-1.5 transition-colors duration-200 ${
          isActive ? "text-white" : "text-gym-muted hover:text-white"
        }`}
      >
        {isActive ? (
          <motion.span
            layoutId="nav-pill-bg"
            className="absolute inset-0 z-0 rounded-full border border-white/10 bg-white/10 shadow-sm"
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
        ) : null}
        <span className={`relative z-10 shrink-0 ${isActive ? "text-gym-accent" : ""}`}>{icon}</span>
        <span className="relative z-10 text-[11px] font-bold leading-none whitespace-nowrap">
          {label}
        </span>
      </Link>
    </motion.div>
  );
}
