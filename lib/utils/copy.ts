export function formatCount(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function formatWorkoutCount(count: number) {
  return formatCount(count, "allenamento", "allenamenti");
}

export function formatExerciseCount(count: number) {
  return formatCount(count, "esercizio", "esercizi");
}

export function formatDayCount(count: number) {
  return formatCount(count, "giorno", "giorni");
}

export function formatCompletedSetCount(count: number) {
  return formatCount(count, "serie completata", "serie completate");
}

export function formatSetCount(count: number) {
  return formatCount(count, "serie", "serie");
}
