import { getExerciseDbCatalog, type ExerciseDbCatalogItem } from "@/lib/ai/exerciseDbCatalog";

type AiExerciseLike = {
  name?: string;
  exercise_db_query?: string;
  exercise_db_id?: string;
  alternative_queries?: unknown;
  equipment_hint?: unknown;
  target_muscle_hint?: unknown;
  body_part_hint?: unknown;
  movement_pattern?: unknown;
  movement_patterns?: unknown;
  position_hint?: unknown;
  grip_hint?: unknown;
  bench_angle_hint?: unknown;
  side_hint?: unknown;
};

export type ExerciseDbCandidate = {
  exercise_db_id: string;
  name: string;
  gifUrl: string;
  bodyParts: string[];
  equipments: string[];
  targetMuscles: string[];
  secondaryMuscles: string[];
  movement_patterns: string[];
  aliases: string[];
  italian_aliases: string[];
  short: {
    id: string;
    n: string;
    eq: string;
    bp: string;
    tm: string;
    sec: string;
    pat: string;
    aka: string;
  };
  score: number;
  reasons: string[];
};

export type ExerciseDbMatchResult = {
  item: ExerciseDbCatalogItem | null;
  confidence: "high" | "medium" | "low";
  score: number;
  candidates: ExerciseDbCandidate[];
};

const STOP_WORDS = new Set([
  "a", "an", "and", "ai", "al", "alla", "con", "da", "di", "del", "della", "for", "in", "il", "la", "le", "lo", "of", "on", "per", "the", "to", "with", "v", "serie", "recupero", "min", "sec",
]);

const IT_TO_EN_TERMS: Record<string, string[]> = {
  stacco: ["deadlift", "hinge"],
  stacchi: ["deadlift", "hinge"],
  regular: ["regular", "conventional", "barbell"],
  classico: ["conventional"],
  classici: ["conventional"],
  tirata: ["row", "pull"],
  tirate: ["row", "pull"],
  rematore: ["row"],
  pulley: ["cable row", "seated row"],
  lat: ["lat", "pulldown", "lats"],
  machine: ["machine", "lever", "leverage machine"],
  macchina: ["machine", "lever", "leverage machine"],
  cavo: ["cable"],
  cavi: ["cable"],
  manubrio: ["dumbbell"],
  manubri: ["dumbbell"],
  bilanciere: ["barbell"],
  panca: ["bench"],
  inclinata: ["incline"],
  inclinato: ["incline"],
  declinata: ["decline"],
  supino: ["underhand", "reverse grip", "supinated"],
  supina: ["underhand", "reverse grip", "supinated"],
  prona: ["overhand", "pronated"],
  prono: ["overhand", "pronated"],
  neutra: ["neutral grip"],
  neutro: ["neutral grip"],
  seduto: ["seated"],
  seduta: ["seated"],
  sitted: ["seated"],
  calf: ["calf", "calves"],
  polpacci: ["calves", "calf raise"],
  leg: ["leg"],
  curl: ["curl"],
  addome: ["abs", "waist"],
  petto: ["chest", "pectorals"],
  schiena: ["back", "lats", "upper back"],
  spalle: ["shoulders", "delts"],
  bicipiti: ["biceps"],
  tricipiti: ["triceps"],
  quadricipiti: ["quads", "quadriceps"],
  femorali: ["hamstrings"],
  glutei: ["glutes"],
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

function asStringArray(value: unknown) {
  if (Array.isArray(value)) return value.map((entry) => String(entry)).filter(Boolean);
  if (value === null || value === undefined) return [];
  return [String(value)];
}

function tokens(value: string) {
  return normalize(value)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function expandItalianGymTerms(value: string) {
  const expanded = new Set<string>();
  for (const token of tokens(value)) {
    expanded.add(token);
    for (const mapped of IT_TO_EN_TERMS[token] ?? []) {
      for (const mappedToken of tokens(mapped)) expanded.add(mappedToken);
      expanded.add(normalize(mapped));
    }
  }
  return Array.from(expanded).filter(Boolean);
}

function compactJoin(values: string[], max = 8) {
  return values.map((value) => value.trim()).filter(Boolean).slice(0, max).join(" | ");
}

function toCandidate(item: ExerciseDbCatalogItem, score: number, reasons: string[]): ExerciseDbCandidate {
  return {
    exercise_db_id: item.exercise_db_id,
    name: item.name,
    gifUrl: item.gifUrl,
    bodyParts: item.bodyParts,
    equipments: item.equipments,
    targetMuscles: item.targetMuscles,
    secondaryMuscles: item.secondaryMuscles,
    movement_patterns: item.movement_patterns,
    aliases: item.aliases ?? [],
    italian_aliases: item.italian_aliases ?? [],
    short: {
      id: item.exercise_db_id,
      n: item.name,
      eq: item.equipments.join(", "),
      bp: item.bodyParts.join(", "),
      tm: item.targetMuscles.join(", "),
      sec: item.secondaryMuscles.slice(0, 3).join(", "),
      pat: item.movement_patterns.join(", "),
      aka: compactJoin([...(item.aliases ?? []), ...(item.italian_aliases ?? [])], 8),
    },
    score: Math.round(score),
    reasons,
  };
}

function itemSearchValues(item: ExerciseDbCatalogItem) {
  return [
    item.name,
    ...(item.aliases ?? []),
    ...(item.italian_aliases ?? []),
  ].map(normalize).filter(Boolean);
}

function queryValues(exercise: AiExerciseLike) {
  const base = [
    exercise.exercise_db_query,
    exercise.name,
    ...asStringArray(exercise.alternative_queries).slice(0, 8),
  ].map((value) => normalize(String(value ?? ""))).filter(Boolean);

  const expanded = base.flatMap((query) => {
    const terms = expandItalianGymTerms(query);
    const combinations: string[] = [];
    if (terms.includes("deadlift") && terms.includes("barbell")) combinations.push("barbell deadlift");
    if (terms.includes("pulldown") && terms.includes("machine")) combinations.push("machine lat pulldown", "lever lat pulldown", "lat pulldown");
    if (terms.includes("row") && terms.includes("bench") && terms.includes("incline")) combinations.push("incline bench row", "chest supported incline row", "reverse grip incline bench row");
    if (terms.includes("calf") && terms.includes("seated")) combinations.push("seated calf raise", "lever seated calf raise");
    if (terms.includes("leg") && terms.includes("curl")) combinations.push("leg curl", "lever lying leg curl", "lever seated leg curl");
    return [query, ...terms, ...combinations].map(normalize).filter(Boolean);
  });

  return Array.from(new Set([...base, ...expanded])).filter(Boolean);
}

function hintValues(exercise: AiExerciseLike) {
  const raw = [
    ...asStringArray(exercise.equipment_hint),
    ...asStringArray(exercise.target_muscle_hint),
    ...asStringArray(exercise.body_part_hint),
    ...asStringArray(exercise.movement_pattern),
    ...asStringArray(exercise.movement_patterns),
    ...asStringArray(exercise.position_hint),
    ...asStringArray(exercise.grip_hint),
    ...asStringArray(exercise.bench_angle_hint),
    ...asStringArray(exercise.side_hint),
  ].map((value) => normalize(String(value ?? ""))).filter(Boolean);

  const expanded = raw.flatMap((hint) => [hint, ...expandItalianGymTerms(hint)]);
  return Array.from(new Set(expanded)).filter(Boolean);
}

function scoreItem(item: ExerciseDbCatalogItem, queries: string[], hints: string[]) {
  const reasons: string[] = [];
  let score = 0;
  const itemName = normalize(item.name);
  const searchValues = itemSearchValues(item);
  const searchText = normalize(item.search_text || searchValues.join(" "));
  const fieldText = normalize([
    ...item.equipments,
    ...item.bodyParts,
    ...item.targetMuscles,
    ...item.secondaryMuscles,
    ...item.movement_patterns,
  ].join(" "));

  for (const [index, query] of queries.entries()) {
    if (!query) continue;

    if (itemName === query) {
      score += index === 0 ? 110 : 92;
      reasons.push("nome ExerciseDB uguale alla query");
    } else if (searchValues.includes(query)) {
      score += index === 0 ? 100 : 86;
      reasons.push("alias ExerciseDB uguale alla query");
    } else if (searchText.includes(query) && query.length >= 8) {
      score += index === 0 ? 48 : 32;
      reasons.push("query contenuta nel catalogo short");
    }
  }

  const queryTokens = Array.from(new Set(queries.flatMap(tokens))).slice(0, 28);
  for (const token of queryTokens) {
    if (itemName.includes(token)) score += 6;
    else if (searchText.includes(token)) score += 3;
  }

  for (const hint of hints) {
    if (!hint) continue;
    const hintTokenSet = tokens(hint);
    if (hintTokenSet.length === 0) continue;

    const exactFieldMatch = [
      ...item.equipments,
      ...item.bodyParts,
      ...item.targetMuscles,
      ...item.secondaryMuscles,
      ...item.movement_patterns,
    ].some((field) => normalize(field) === hint);

    if (exactFieldMatch) {
      score += 14;
      reasons.push(`hint coerente: ${hint}`);
      continue;
    }

    const allHintTokensFound = hintTokenSet.every((token) => searchText.includes(token) || fieldText.includes(token));
    if (allHintTokensFound) score += 6;
  }

  return { score, reasons: Array.from(new Set(reasons)).slice(0, 5) };
}

export function findExerciseDbMatch(exercise: AiExerciseLike): ExerciseDbMatchResult {
  const catalog = getExerciseDbCatalog();
  if (catalog.length === 0) return { item: null, confidence: "low", score: 0, candidates: [] };

  const providedId = String(exercise.exercise_db_id ?? "").trim();
  if (providedId) {
    const byId = catalog.find((item) => item.exercise_db_id === providedId);
    if (byId) {
      return {
        item: byId,
        confidence: "high",
        score: 100,
        candidates: [toCandidate(byId, 100, ["ID ExerciseDB presente nel catalogo"])],
      };
    }
  }

  const queries = queryValues(exercise);
  if (queries.length === 0) return { item: null, confidence: "low", score: 0, candidates: [] };

  const exactMatches = catalog
    .map((item) => {
      const values = itemSearchValues(item);
      const exactIndex = queries.findIndex((query) => values.includes(query));
      if (exactIndex === -1) return null;
      const score = normalize(item.name) === queries[0] ? 98 : exactIndex === 0 ? 92 : 86;
      return { item, score, reasons: ["match testuale esatto su nome o alias"] };
    })
    .filter((entry): entry is { item: ExerciseDbCatalogItem; score: number; reasons: string[] } => Boolean(entry))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const bestExact = exactMatches[0];
  if (bestExact && bestExact.score >= 92) {
    return {
      item: bestExact.item,
      confidence: "high",
      score: bestExact.score,
      candidates: exactMatches.map((entry) => toCandidate(entry.item, entry.score, entry.reasons)),
    };
  }

  const candidates = findExerciseDbCandidates(exercise, 8);
  return {
    item: null,
    confidence: candidates.length > 0 ? "medium" : "low",
    score: candidates[0]?.score ?? 0,
    candidates,
  };
}

export function findExerciseDbCandidates(exercise: AiExerciseLike, limit = 8): ExerciseDbCandidate[] {
  const catalog = getExerciseDbCatalog();
  const queries = queryValues(exercise);
  if (catalog.length === 0 || queries.length === 0) return [];

  const hints = hintValues(exercise);

  return catalog
    .map((item) => {
      const { score, reasons } = scoreItem(item, queries, hints);
      if (score < 20) return null;
      return { item, score, reasons: reasons.length > 0 ? reasons : ["somiglianza con query, intent e catalogo short"] };
    })
    .filter((entry): entry is { item: ExerciseDbCatalogItem; score: number; reasons: string[] } => Boolean(entry))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => toCandidate(entry.item, entry.score, entry.reasons));
}
