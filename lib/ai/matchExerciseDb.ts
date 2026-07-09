import { getExerciseDbCatalog, type ExerciseDbCatalogItem } from "@/lib/ai/exerciseDbCatalog";

type AiExerciseLike = {
  name?: string;
  exercise_db_query?: string;
  alternative_queries?: unknown;
  equipment_hint?: string;
  target_muscle_hint?: string;
  body_part_hint?: string;
  movement_pattern?: string;
};

export type ExerciseDbCandidate = {
  exercise_db_id: string;
  name: string;
  gifUrl: string;
  score: number;
  reasons: string[];
};

export type ExerciseDbMatchResult = {
  item: ExerciseDbCatalogItem | null;
  confidence: "high" | "medium" | "low";
  score: number;
  candidates: ExerciseDbCandidate[];
};

const STOPWORDS = new Set([
  "the", "and", "with", "for", "from", "into", "onto", "classic", "variation", "male", "female",
  "esercizio", "giorno", "serie", "ripetizioni", "rec", "recupero", "alla", "allo", "alle", "con", "per",
]);

const IT_EN_SYNONYMS: Record<string, string[]> = {
  manubri: ["dumbbell"],
  manubrio: ["dumbbell"],
  bilanciere: ["barbell"],
  cavi: ["cable"],
  cavo: ["cable"],
  panca: ["bench"],
  inclinata: ["incline"],
  declinata: ["decline"],
  spinte: ["press"],
  distensioni: ["press"],
  croci: ["fly"],
  rematore: ["row"],
  pulley: ["cable", "row"],
  trazioni: ["pull", "pullup"],
  lat: ["lat", "pulldown"],
  machine: ["machine", "pulldown"],
  pressa: ["leg", "press"],
  multipower: ["smith", "machine"],
  petto: ["chest", "pectorals"],
  schiena: ["back", "lats"],
  dorsali: ["back", "lats"],
  spalle: ["shoulders", "delts"],
  bicipiti: ["biceps"],
  tricipiti: ["triceps"],
  quadricipiti: ["quadriceps", "quads"],
  femorali: ["hamstrings"],
  glutei: ["glutes"],
  polpacci: ["calves"],
  addome: ["abs", "core"],
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toTokens(value: string) {
  const base = normalize(value)
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));

  const expanded = new Set<string>();
  for (const token of base) {
    expanded.add(token);
    for (const synonym of IT_EN_SYNONYMS[token] ?? []) expanded.add(synonym);
  }
  return Array.from(expanded);
}

function asStringArray(value: unknown) {
  if (Array.isArray(value)) return value.map((entry) => String(entry)).filter(Boolean);
  if (value === null || value === undefined) return [];
  return [String(value)];
}

function getQueryText(exercise: AiExerciseLike) {
  return [
    exercise.name,
    exercise.exercise_db_query,
    ...asStringArray(exercise.alternative_queries),
    exercise.equipment_hint,
    exercise.target_muscle_hint,
    exercise.body_part_hint,
    exercise.movement_pattern,
  ].filter(Boolean).join(" ");
}

function includesAny(haystack: string, values: string[]) {
  return values.some((value) => value && haystack.includes(normalize(value)));
}

function fieldText(values: string[]) {
  return normalize(values.join(" "));
}

function scoreCandidate(queryText: string, queryTokens: string[], exercise: AiExerciseLike, item: ExerciseDbCatalogItem) {
  const normalizedQuery = normalize(queryText);
  const name = normalize(item.name);
  const aliases = fieldText(item.aliases);
  const italianAliases = fieldText(item.italian_aliases);
  const equipment = fieldText(item.equipments);
  const bodyParts = fieldText(item.bodyParts);
  const target = fieldText(item.targetMuscles);
  const secondary = fieldText(item.secondaryMuscles);
  const patterns = fieldText(item.movement_patterns);
  const search = item.search_text;

  let score = 0;
  const reasons: string[] = [];

  if (normalizedQuery && name === normalizedQuery) {
    score += 100;
    reasons.push("nome esatto");
  }

  if (exercise.exercise_db_query) {
    const mainQuery = normalize(exercise.exercise_db_query);
    if (name === mainQuery) {
      score += 80;
      reasons.push("query principale identica al nome ExerciseDB");
    } else if (name.includes(mainQuery) || mainQuery.includes(name)) {
      score += 40;
      reasons.push("query principale molto vicina");
    } else if (aliases.includes(mainQuery)) {
      score += 34;
      reasons.push("query principale negli alias");
    }
  }

  for (const alternative of asStringArray(exercise.alternative_queries).slice(0, 6)) {
    const alt = normalize(alternative);
    if (!alt) continue;
    if (name.includes(alt) || aliases.includes(alt) || italianAliases.includes(alt)) {
      score += 18;
      reasons.push("query alternativa compatibile");
      break;
    }
  }

  let tokenHits = 0;
  for (const token of queryTokens) {
    if (search.includes(token)) tokenHits += 1;
    if (name.includes(token)) score += 2;
  }
  if (tokenHits > 0) score += tokenHits * 2;

  if (exercise.equipment_hint && includesAny(equipment, toTokens(exercise.equipment_hint))) {
    score += 16;
    reasons.push("attrezzatura coerente");
  }
  if (exercise.body_part_hint && includesAny(bodyParts, toTokens(exercise.body_part_hint))) {
    score += 12;
    reasons.push("distretto coerente");
  }
  if (exercise.target_muscle_hint && (includesAny(target, toTokens(exercise.target_muscle_hint)) || includesAny(secondary, toTokens(exercise.target_muscle_hint)))) {
    score += 14;
    reasons.push("muscolo coerente");
  }
  if (exercise.movement_pattern && includesAny(patterns, toTokens(exercise.movement_pattern))) {
    score += 18;
    reasons.push("pattern coerente");
  }

  return { score, reasons };
}

function toCandidate(entry: { item: ExerciseDbCatalogItem; score: number; reasons: string[] }): ExerciseDbCandidate {
  return {
    exercise_db_id: entry.item.exercise_db_id,
    name: entry.item.name,
    gifUrl: entry.item.gifUrl,
    score: entry.score,
    reasons: entry.reasons,
  };
}

export function findExerciseDbMatch(exercise: AiExerciseLike): ExerciseDbMatchResult {
  const catalog = getExerciseDbCatalog();
  if (catalog.length === 0) return { item: null, confidence: "low", score: 0, candidates: [] };

  const queryText = getQueryText(exercise);
  const queryTokens = toTokens(queryText);
  if (queryTokens.length === 0) return { item: null, confidence: "low", score: 0, candidates: [] };

  const ranked = catalog
    .map((item) => ({ item, ...scoreCandidate(queryText, queryTokens, exercise, item) }))
    .filter((entry) => entry.score >= 12)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const best = ranked[0];
  if (!best) return { item: null, confidence: "low", score: 0, candidates: [] };

  const second = ranked[1];
  const margin = best.score - (second?.score ?? 0);
  const high = best.score >= 62 && margin >= 8;
  const medium = !high && best.score >= 42;

  return {
    item: high ? best.item : null,
    confidence: high ? "high" : medium ? "medium" : "low",
    score: best.score,
    candidates: ranked.map(toCandidate),
  };
}
