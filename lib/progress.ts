export type SessionLike = {
  id: string;
  status?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  workout_days?: { name?: string | null } | null;
  workout_plans?: { name?: string | null; month?: string | null } | null;
  session_exercises?: Array<{
    completed?: boolean | null;
    exercises?: {
      id?: string | null;
      name?: string | null;
      exercise_db_id?: string | null;
      muscle_group?: string | null;
    } | null;
    exercise_sets?: Array<{
      completed?: boolean | null;
      reps?: string | number | null;
      weight?: string | number | null;
      rpe?: number | null;
      set_number?: number | null;
    }> | null;
  }> | null;
};

export function getSessionSummary(session: SessionLike) {
  const exercises = session.session_exercises ?? [];
  const sets = exercises.flatMap((item) => item.exercise_sets ?? []);
  const completedSets = sets.filter((set) => set.completed).length;
  const totalSets = sets.length || exercises.length;
  const completedExercises = exercises.filter((item) => item.completed).length;
  const totalExercises = exercises.length;
  const rpeValues = sets
    .map((set) => Number(set.rpe))
    .filter((value) => Number.isFinite(value) && value > 0);
  const averageRpe = rpeValues.length
    ? rpeValues.reduce((sum, value) => sum + value, 0) / rpeValues.length
    : null;
  const volume = sets.reduce((sum, set) => sum + getSetVolume(set.weight, set.reps), 0);

  return {
    completedSets,
    totalSets,
    completedExercises,
    totalExercises,
    averageRpe,
    volume,
  };
}

export function getSetVolume(weight: string | number | null | undefined, reps: string | number | null | undefined) {
  const numericWeight = parseFirstNumber(weight);
  const numericReps = parseFirstNumber(reps);
  if (numericWeight === null || numericReps === null) return 0;
  return numericWeight * numericReps;
}

export function parseFirstNumber(value: string | number | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const match = String(value ?? "").replace(",", ".").match(/\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatCompactNumber(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "-";
  return new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0 }).format(value);
}

export function formatAverage(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "-";
  return value.toFixed(1).replace(".", ",");
}

export function normalizeExerciseKey(name: string | null | undefined, exerciseDbId?: string | null) {
  const id = exerciseDbId?.trim();
  if (id) return `db:${id}`;
  return `name:${normalizeText(name)}`;
}

export function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function buildProgressOverview(sessions: SessionLike[]) {
  const completedSessions = sessions.filter((session) => session.status === "completed");
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const sessionsThisWeek = completedSessions.filter((session) => new Date(session.started_at ?? 0) >= weekStart);
  const sessionsThisMonth = completedSessions.filter((session) => new Date(session.started_at ?? 0) >= monthStart);

  const totalSetsThisWeek = sessionsThisWeek.reduce((sum, session) => sum + getSessionSummary(session).completedSets, 0);
  const totalVolumeThisMonth = sessionsThisMonth.reduce((sum, session) => sum + getSessionSummary(session).volume, 0);
  const allRpeValues = sessionsThisMonth.flatMap((session) =>
    (session.session_exercises ?? []).flatMap((exercise) =>
      (exercise.exercise_sets ?? [])
        .map((set) => Number(set.rpe))
        .filter((value) => Number.isFinite(value) && value > 0),
    ),
  );
  const averageRpeThisMonth = allRpeValues.length
    ? allRpeValues.reduce((sum, value) => sum + value, 0) / allRpeValues.length
    : null;

  return {
    completedSessions,
    sessionsThisWeek,
    sessionsThisMonth,
    totalSetsThisWeek,
    totalVolumeThisMonth,
    averageRpeThisMonth,
  };
}

export function buildMuscleGroupSets(sessions: SessionLike[]) {
  const counts = new Map<string, number>();

  for (const session of sessions.filter((item) => item.status === "completed")) {
    for (const sessionExercise of session.session_exercises ?? []) {
      const group = sessionExercise.exercises?.muscle_group?.trim() || "Altro";
      const completedSets = (sessionExercise.exercise_sets ?? []).filter((set) => set.completed).length;
      counts.set(group, (counts.get(group) ?? 0) + completedSets);
    }
  }

  return Array.from(counts.entries())
    .map(([group, sets]) => ({ group, sets }))
    .sort((a, b) => b.sets - a.sets);
}

export function buildExerciseProgress(sessions: SessionLike[]) {
  const map = new Map<string, {
    key: string;
    name: string;
    muscleGroup: string;
    entries: Array<{ sessionId: string; date: string; averageWeight: number | null; maxWeight: number | null; repsLabel: string; volume: number; averageRpe: number | null }>;
  }>();

  for (const session of sessions.filter((item) => item.status === "completed")) {
    const date = session.started_at ?? "";
    for (const item of session.session_exercises ?? []) {
      const exercise = item.exercises;
      const key = normalizeExerciseKey(exercise?.name, exercise?.exercise_db_id);
      if (!key || key === "name:") continue;

      const weights = (item.exercise_sets ?? [])
        .map((set) => parseFirstNumber(set.weight))
        .filter((value): value is number => value !== null);
      const averageWeight = weights.length
        ? weights.reduce((sum, value) => sum + value, 0) / weights.length
        : null;
      const maxWeight = weights.length ? Math.max(...weights) : null;
      const rpeValues = (item.exercise_sets ?? [])
        .map((set) => Number(set.rpe))
        .filter((value) => Number.isFinite(value) && value > 0);
      const averageRpe = rpeValues.length
        ? rpeValues.reduce((sum, value) => sum + value, 0) / rpeValues.length
        : null;
      const repsLabel = (item.exercise_sets ?? [])
        .sort((a, b) => Number(a.set_number ?? 0) - Number(b.set_number ?? 0))
        .map((set) => set.reps || "-")
        .join("/");
      const volume = (item.exercise_sets ?? []).reduce((sum, set) => sum + getSetVolume(set.weight, set.reps), 0);

      if (!map.has(key)) {
        map.set(key, {
          key,
          name: exercise?.name ?? "Esercizio",
          muscleGroup: exercise?.muscle_group ?? "Altro",
          entries: [],
        });
      }

      map.get(key)?.entries.push({
        sessionId: session.id,
        date,
        averageWeight,
        maxWeight,
        repsLabel,
        volume,
        averageRpe,
      });
    }
  }

  return Array.from(map.values())
    .map((item) => ({
      ...item,
      entries: item.entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    }))
    .sort((a, b) => b.entries.length - a.entries.length || a.name.localeCompare(b.name));
}

export function getRecentImprovements(exercises: ReturnType<typeof buildExerciseProgress>) {
  return exercises
    .map((exercise) => {
      const entriesWithWeight = exercise.entries.filter((entry) => entry.averageWeight !== null);
      if (entriesWithWeight.length < 2) return null;
      const previous = entriesWithWeight[entriesWithWeight.length - 2];
      const current = entriesWithWeight[entriesWithWeight.length - 1];
      const diff = Number(current.averageWeight) - Number(previous.averageWeight);
      if (diff <= 0) return null;
      return { name: exercise.name, muscleGroup: exercise.muscleGroup, diff, current: current.averageWeight };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => b.diff - a.diff)
    .slice(0, 5) as Array<{ name: string; muscleGroup: string; diff: number; current: number | null }>;
}

export function formatShortDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
}

export function getSessionDate(session: SessionLike) {
  return session.completed_at ?? session.started_at ?? "";
}

export function isSameYearMonth(date: Date, year: number, month: number) {
  return date.getFullYear() === year && date.getMonth() === month;
}

export function buildMonthComparison(sessions: SessionLike[]) {
  const completed = sessions.filter((session) => session.status === "completed");
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const previous = new Date(currentYear, currentMonth - 1, 1);

  const currentMonthSessions = completed.filter((session) => {
    const date = new Date(getSessionDate(session));
    return isSameYearMonth(date, currentYear, currentMonth);
  });
  const previousMonthSessions = completed.filter((session) => {
    const date = new Date(getSessionDate(session));
    return isSameYearMonth(date, previous.getFullYear(), previous.getMonth());
  });

  const currentVolume = currentMonthSessions.reduce((sum, session) => sum + getSessionSummary(session).volume, 0);
  const previousVolume = previousMonthSessions.reduce((sum, session) => sum + getSessionSummary(session).volume, 0);
  const currentSets = currentMonthSessions.reduce((sum, session) => sum + getSessionSummary(session).completedSets, 0);
  const previousSets = previousMonthSessions.reduce((sum, session) => sum + getSessionSummary(session).completedSets, 0);

  return {
    currentMonthSessions,
    previousMonthSessions,
    currentVolume,
    previousVolume,
    currentSets,
    previousSets,
    sessionDiff: currentMonthSessions.length - previousMonthSessions.length,
    volumeDiff: currentVolume - previousVolume,
    setsDiff: currentSets - previousSets,
  };
}

export function buildMuscleGroupVolume(sessions: SessionLike[]) {
  const map = new Map<string, { group: string; sets: number; volume: number; averageRpe: number | null; rpeValues: number[] }>();

  for (const session of sessions.filter((item) => item.status === "completed")) {
    for (const sessionExercise of session.session_exercises ?? []) {
      const group = sessionExercise.exercises?.muscle_group?.trim() || "Altro";
      const record = map.get(group) ?? { group, sets: 0, volume: 0, averageRpe: null, rpeValues: [] };
      for (const set of sessionExercise.exercise_sets ?? []) {
        if (set.completed) record.sets += 1;
        record.volume += getSetVolume(set.weight, set.reps);
        const rpe = Number(set.rpe);
        if (Number.isFinite(rpe) && rpe > 0) record.rpeValues.push(rpe);
      }
      map.set(group, record);
    }
  }

  return Array.from(map.values())
    .map((item) => ({
      group: item.group,
      sets: item.sets,
      volume: item.volume,
      averageRpe: item.rpeValues.length
        ? item.rpeValues.reduce((sum, value) => sum + value, 0) / item.rpeValues.length
        : null,
    }))
    .sort((a, b) => b.sets - a.sets || b.volume - a.volume);
}

export function getTrainingStreak(sessions: SessionLike[]) {
  const days = Array.from(new Set(
    sessions
      .filter((session) => session.status === "completed")
      .map((session) => toDateKey(getSessionDate(session)))
      .filter(Boolean),
  )).sort((a, b) => b.localeCompare(a));

  if (days.length === 0) return { currentStreak: 0, lastTrainingDate: null as string | null, trainingDays: 0 };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const todayKey = toDateKey(today.toISOString());
  const yesterdayKey = toDateKey(yesterday.toISOString());

  let cursorKey = days.includes(todayKey) ? todayKey : days.includes(yesterdayKey) ? yesterdayKey : null;
  let currentStreak = 0;

  while (cursorKey && days.includes(cursorKey)) {
    currentStreak += 1;
    const cursor = new Date(`${cursorKey}T00:00:00`);
    cursor.setDate(cursor.getDate() - 1);
    cursorKey = toDateKey(cursor.toISOString());
  }

  return { currentStreak, lastTrainingDate: days[0], trainingDays: days.length };
}

export function toDateKey(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function getExerciseTrend(entries: Array<{ averageWeight: number | null }>) {
  const weighted = entries.filter((entry) => entry.averageWeight !== null) as Array<{ averageWeight: number }>;
  if (weighted.length < 2) return { label: "trend n/d", diff: null as number | null, direction: "flat" as const };
  const previous = weighted[weighted.length - 2].averageWeight;
  const current = weighted[weighted.length - 1].averageWeight;
  const diff = current - previous;
  if (diff > 0) return { label: `+${diff.toFixed(1).replace(".", ",")} kg`, diff, direction: "up" as const };
  if (diff < 0) return { label: `${diff.toFixed(1).replace(".", ",")} kg`, diff, direction: "down" as const };
  return { label: "stabile", diff: 0, direction: "flat" as const };
}

export function getExerciseRecords(exercises: ReturnType<typeof buildExerciseProgress>) {
  return exercises
    .map((exercise) => {
      const entriesWithWeight = exercise.entries.filter((entry) => entry.maxWeight !== null);
      if (!entriesWithWeight.length) return null;
      const best = entriesWithWeight.reduce((winner, entry) => Number(entry.maxWeight) > Number(winner.maxWeight) ? entry : winner, entriesWithWeight[0]);
      const last = exercise.entries[exercise.entries.length - 1];
      const trend = getExerciseTrend(exercise.entries);
      return {
        key: exercise.key,
        name: exercise.name,
        muscleGroup: exercise.muscleGroup,
        bestWeight: best.maxWeight,
        bestDate: best.date,
        lastAverageWeight: last.averageWeight,
        sessions: exercise.entries.length,
        trend,
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => Number(b.bestWeight ?? 0) - Number(a.bestWeight ?? 0)) as Array<{
      key: string;
      name: string;
      muscleGroup: string;
      bestWeight: number | null;
      bestDate: string;
      lastAverageWeight: number | null;
      sessions: number;
      trend: ReturnType<typeof getExerciseTrend>;
    }>;
}
