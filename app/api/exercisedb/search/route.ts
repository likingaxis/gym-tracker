import { NextResponse } from "next/server";
import { getExerciseDbCatalog, type ExerciseDbCatalogItem } from "@/lib/ai/exerciseDbCatalog";
import italianSynonymsData from "@/data/exercise-it-synonyms.json";

type SynonymEntry = {
  equipment_hint?: string;
  body_part_hint?: string;
  target_muscle_hint?: string;
  movement_pattern?: string;
  query_terms?: string[];
};

const italianSynonyms = (italianSynonymsData as { items?: Record<string, SynonymEntry> }).items ?? {};

const SEARCH_SYNONYMS: Record<string, string[]> = {
  pec: ["pectorals", "chest", "pec deck", "butterfly"],
  pecs: ["pectorals", "chest", "pec deck", "butterfly"],
  pectoral: ["pectorals", "chest"],
  pectorals: ["pectorals", "chest"],
  petto: ["chest", "pectorals"],
  pettorale: ["chest", "pectorals"],
  pettorali: ["chest", "pectorals"],
  butterfly: ["lever seated fly", "chest fly", "pectorals fly"],
  "pec deck": ["lever seated fly", "chest fly", "butterfly"],
  "pec fly": ["lever seated fly", "chest fly", "pectorals fly", "butterfly"],
  "machine fly": ["lever seated fly", "leverage machine fly", "chest fly"],
  flyes: ["fly"],

  lat: ["lats", "back"],
  "lat machine": ["lat pulldown", "cable pulldown", "lats pulldown"],
  "lat pull down": ["lat pulldown", "cable pulldown", "lats pulldown"],
  "lat pull-down": ["lat pulldown", "cable pulldown", "lats pulldown"],
  pulldown: ["pull down", "lat pulldown"],
  "pull down": ["pulldown", "lat pulldown"],

  pushdown: ["push down", "triceps pushdown", "cable pushdown"],
  "push down": ["pushdown", "triceps pushdown", "cable pushdown"],
  tricipiti: ["triceps", "upper arms"],
  tricipite: ["triceps", "upper arms"],

  croci: ["fly", "chest fly", "pectorals fly"],
  aperture: ["fly"],
  cavo: ["cable"],
  cavi: ["cable"],
  manubrio: ["dumbbell"],
  manubri: ["dumbbell"],
  bilanciere: ["barbell"],
  macchina: ["leverage machine", "machine", "lever"],
  machine: ["leverage machine", "lever"],
  lever: ["leverage machine"],

  seduto: ["seated"],
  seduta: ["seated"],
  sitted: ["seated"],
  seated: ["seated"],
  sdraiato: ["lying"],
  sdraiata: ["lying"],
  "in piedi": ["standing"],
  ginocchio: ["kneeling"],
  ginocchia: ["kneeling"],
  panca: ["bench"],
  inclinata: ["incline"],
  inclinato: ["incline"],
  declinata: ["decline"],
  supino: ["supinated", "underhand", "reverse grip"],
  prona: ["pronated", "overhand"],
  prono: ["pronated", "overhand"],
  larga: ["wide grip"],
  stretta: ["close grip"],
  neutra: ["neutral grip"],

  stacchi: ["deadlift"],
  stacco: ["deadlift"],
  regular: ["deadlift", "barbell deadlift"],
  rematore: ["row"],
  tirate: ["row", "pull"],
  tirata: ["row", "pull"],
  pulley: ["cable row", "seated row"],
  pressa: ["leg press", "sled press"],
  polpacci: ["calves", "calf raise"],
  polpaccio: ["calves", "calf raise"],
  calf: ["calves", "calf raise"],
  "calf machine": ["lever seated calf raise", "seated calf raise", "calf raise"],
  "sitted calf": ["seated calf raise", "lever seated calf raise"],
  "sitted calf machine": ["lever seated calf raise", "seated calf raise"],
  "leg curl": ["leg curl", "hamstrings", "lever lying leg curl", "lever seated leg curl"],
  femorali: ["hamstrings", "leg curl"],
};

const PHRASES = Object.keys(SEARCH_SYNONYMS).sort((a, b) => b.length - a.length);

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-_/]+/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function unique(values: string[]) {
  return Array.from(new Set(values.map(normalize).filter(Boolean)));
}

function getItemSearchText(item: ExerciseDbCatalogItem) {
  return normalize(item.search_text || [
    item.name,
    ...item.aliases,
    ...item.italian_aliases,
    ...item.bodyParts,
    ...item.equipments,
    ...item.targetMuscles,
    ...item.secondaryMuscles,
    ...item.movement_patterns,
  ].join(" "));
}

function getExpandedQuery(rawQuery: string) {
  const query = normalize(rawQuery);
  const baseTokens = query.split(" ").filter((token) => token.length > 1);
  const variants: string[] = [query];
  const expandedTokens: string[] = [...baseTokens];
  const boosts = {
    equipment: [] as string[],
    bodyPart: [] as string[],
    targetMuscle: [] as string[],
    movement: [] as string[],
    variants: [] as string[],
  };

  for (const phrase of PHRASES) {
    const normalizedPhrase = normalize(phrase);
    const isPhraseMatch = query === normalizedPhrase || query.includes(` ${normalizedPhrase} `) || query.startsWith(`${normalizedPhrase} `) || query.endsWith(` ${normalizedPhrase}`);
    if (!isPhraseMatch) continue;
    variants.push(...SEARCH_SYNONYMS[phrase]);
    expandedTokens.push(...SEARCH_SYNONYMS[phrase].join(" ").split(" "));
  }

  for (const token of baseTokens) {
    const direct = SEARCH_SYNONYMS[token];
    if (direct) {
      variants.push(...direct);
      expandedTokens.push(...direct.join(" ").split(" "));
    }

    const synonym = italianSynonyms[token];
    if (synonym) {
      if (synonym.equipment_hint) boosts.equipment.push(synonym.equipment_hint);
      if (synonym.body_part_hint) boosts.bodyPart.push(synonym.body_part_hint);
      if (synonym.target_muscle_hint) boosts.targetMuscle.push(synonym.target_muscle_hint);
      if (synonym.movement_pattern) boosts.movement.push(synonym.movement_pattern);
      if (Array.isArray(synonym.query_terms)) {
        variants.push(...synonym.query_terms);
        expandedTokens.push(...synonym.query_terms.join(" ").split(" "));
      }
    }
  }

  for (const [key, synonym] of Object.entries(italianSynonyms)) {
    const normalizedKey = normalize(key);
    if (!normalizedKey || normalizedKey.length < 3) continue;
    const isPhraseMatch = query === normalizedKey || query.includes(` ${normalizedKey} `) || query.startsWith(`${normalizedKey} `) || query.endsWith(` ${normalizedKey}`);
    if (!isPhraseMatch) continue;
    if (synonym.equipment_hint) boosts.equipment.push(synonym.equipment_hint);
    if (synonym.body_part_hint) boosts.bodyPart.push(synonym.body_part_hint);
    if (synonym.target_muscle_hint) boosts.targetMuscle.push(synonym.target_muscle_hint);
    if (synonym.movement_pattern) boosts.movement.push(synonym.movement_pattern);
    if (Array.isArray(synonym.query_terms)) variants.push(...synonym.query_terms);
  }

  if ((query.includes("pec") || query.includes("petto") || query.includes("pettoral")) && query.includes("fly")) {
    variants.push("lever seated fly", "chest fly", "pectorals fly", "butterfly", "leverage machine fly");
    boosts.bodyPart.push("chest");
    boosts.targetMuscle.push("pectorals");
    boosts.movement.push("fly");
    boosts.equipment.push("leverage machine");
  }

  if (query.includes("lat") && (query.includes("machine") || query.includes("pulldown") || query.includes("pull down"))) {
    variants.push("lat pulldown", "cable pulldown", "lats pulldown");
    boosts.bodyPart.push("back");
    boosts.targetMuscle.push("lats");
    boosts.movement.push("pulldown");
  }

  if (query.includes("leg curl")) {
    boosts.targetMuscle.push("hamstrings");
    boosts.movement.push("leg curl");
    variants.push("lever lying leg curl", "lever seated leg curl");
  }

  if (query.includes("calf") || query.includes("polpacc")) {
    boosts.targetMuscle.push("calves");
    boosts.movement.push("calf raise");
    variants.push("calf raise", "seated calf raise", "lever seated calf raise");
  }

  const normalizedVariants = unique(variants);
  return {
    query,
    tokens: unique(expandedTokens).filter((token) => token.length > 1),
    variants: normalizedVariants,
    boosts: {
      equipment: unique(boosts.equipment),
      bodyPart: unique(boosts.bodyPart),
      targetMuscle: unique(boosts.targetMuscle),
      movement: unique(boosts.movement),
      variants: unique(boosts.variants),
    },
  };
}

function arrayIncludesNormalized(values: string[], wanted: string) {
  const target = normalize(wanted);
  return values.some((value) => {
    const normalized = normalize(value);
    return normalized === target || normalized.includes(target) || target.includes(normalized);
  });
}

function scoreItem(item: ExerciseDbCatalogItem, expanded: ReturnType<typeof getExpandedQuery>) {
  const name = normalize(item.name);
  const searchText = getItemSearchText(item);
  const nameTokens = new Set(name.split(" ").filter(Boolean));

  let score = 0;

  for (const variant of expanded.variants) {
    if (!variant) continue;
    if (name === variant) score += variant === expanded.query ? 160 : 145;
    else if (name.startsWith(variant)) score += 105;
    else if (name.includes(variant)) score += 85;
    else if (searchText.includes(variant)) score += 52;
  }

  for (const token of expanded.tokens) {
    if (!token) continue;
    if (nameTokens.has(token)) score += 18;
    else if (name.includes(token)) score += 10;
    if (searchText.includes(token)) score += 7;
  }

  for (const equipment of expanded.boosts.equipment) {
    if (arrayIncludesNormalized(item.equipments, equipment) || searchText.includes(equipment)) score += 22;
  }
  for (const bodyPart of expanded.boosts.bodyPart) {
    if (arrayIncludesNormalized(item.bodyParts, bodyPart) || searchText.includes(bodyPart)) score += 20;
  }
  for (const targetMuscle of expanded.boosts.targetMuscle) {
    if (arrayIncludesNormalized(item.targetMuscles, targetMuscle) || searchText.includes(targetMuscle)) score += 28;
  }
  for (const movement of expanded.boosts.movement) {
    if (arrayIncludesNormalized(item.movement_patterns, movement) || name.includes(movement) || searchText.includes(movement)) score += 30;
  }

  // Penalize common false positives for chest fly searches: reverse fly targets delts/back, not pectorals.
  if ((expanded.query.includes("pec") || expanded.query.includes("petto") || expanded.query.includes("chest")) && expanded.query.includes("fly")) {
    if (name.includes("reverse fly") || arrayIncludesNormalized(item.targetMuscles, "delts")) score -= 45;
    if (arrayIncludesNormalized(item.targetMuscles, "pectorals")) score += 40;
    if (name === "lever seated fly") score += 55;
  }

  return score;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawQuery = String(searchParams.get("q") ?? "").trim();
  const limit = Math.min(30, Math.max(5, Number(searchParams.get("limit") ?? 18)));

  if (rawQuery.length < 2) {
    return NextResponse.json({ success: true, results: [], expanded_query: null });
  }

  const expanded = getExpandedQuery(rawQuery);

  const results = getExerciseDbCatalog()
    .map((item) => ({ item, score: scoreItem(item, expanded) }))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
    .slice(0, limit)
    .map(({ item, score }) => ({
      exercise_db_id: item.exercise_db_id,
      name: item.name,
      gifUrl: item.gifUrl,
      bodyParts: item.bodyParts,
      equipments: item.equipments,
      targetMuscles: item.targetMuscles,
      secondaryMuscles: item.secondaryMuscles,
      movement_patterns: item.movement_patterns,
      score,
    }));

  return NextResponse.json({
    success: true,
    results,
    expanded_query: {
      query: expanded.query,
      variants: expanded.variants.slice(0, 12),
      tokens: expanded.tokens.slice(0, 20),
    },
  });
}
