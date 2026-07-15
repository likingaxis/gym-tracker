import { firstRelation } from "@/lib/relations";

export const PLAN_COLORS = [
  "lime",
  "sky",
  "violet",
  "amber",
  "rose",
  "emerald",
  "cyan",
  "orange",
] as const;

export function pickPlanColor(index: number) {
  return PLAN_COLORS[Math.abs(index) % PLAN_COLORS.length];
}

export function getPlanNameSnapshot(session: any, fallback = "Scheda") {
  return (
    session?.workout_plan_name_snapshot ||
    firstRelation(session?.workout_plans)?.name ||
    fallback
  );
}

export function getDayNameSnapshot(session: any, fallback = "Allenamento") {
  return (
    session?.workout_day_name_snapshot ||
    firstRelation(session?.workout_days)?.name ||
    fallback
  );
}

export function getPlanColorSnapshot(sessionOrPlan: any) {
  return (
    sessionOrPlan?.workout_plan_color_snapshot ||
    firstRelation(sessionOrPlan?.workout_plans)?.color ||
    sessionOrPlan?.color ||
    "lime"
  );
}

export function getPlanDotClass(color: string | null | undefined) {
  switch (color) {
    case "sky":
      return "bg-sky-300";
    case "violet":
      return "bg-violet-300";
    case "amber":
      return "bg-amber-300";
    case "rose":
      return "bg-rose-300";
    case "emerald":
      return "bg-emerald-300";
    case "cyan":
      return "bg-cyan-300";
    case "orange":
      return "bg-orange-300";
    default:
      return "bg-gym-accent";
  }
}

export function getPlanBorderClass(color: string | null | undefined) {
  switch (color) {
    case "sky":
      return "border-sky-300/30";
    case "violet":
      return "border-violet-300/30";
    case "amber":
      return "border-amber-300/30";
    case "rose":
      return "border-rose-300/30";
    case "emerald":
      return "border-emerald-300/30";
    case "cyan":
      return "border-cyan-300/30";
    case "orange":
      return "border-orange-300/30";
    default:
      return "border-gym-accent/30";
  }
}

export function formatPlanDateRange(startDate?: string | null, endDate?: string | null) {
  if (!startDate && !endDate) return "Date non impostate";
  const start = startDate ? formatShortDate(startDate) : "inizio non impostato";
  const end = endDate ? formatShortDate(endDate) : "fine non impostata";
  return `${start} - ${end}`;
}

function formatShortDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
