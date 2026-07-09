import catalogData from "@/data/exercisedb-catalog.json";

type RawCatalogItem = {
  exercise_db_id?: unknown;
  exerciseId?: unknown;
  id?: unknown;
  name?: unknown;
  gifUrl?: unknown;
  media_url?: unknown;
  gif_url?: unknown;
  bodyParts?: unknown;
  equipments?: unknown;
  targetMuscles?: unknown;
  secondaryMuscles?: unknown;
  movement_patterns?: unknown;
  aliases?: unknown;
  italian_aliases?: unknown;
  search_text?: unknown;
};

export type ExerciseDbCatalogItem = {
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
  search_text: string;
};

export type ExerciseDbCatalogMeta = {
  version?: string;
  source?: string;
  total: number;
};

function toArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((entry) => String(entry).trim()).filter(Boolean);
  if (value === null || value === undefined) return [];

  const raw = String(value).trim();
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map((entry) => String(entry).trim()).filter(Boolean);
  } catch {
    // Fall back to splitting below.
  }

  return raw
    .replace(/^\[|]$/g, "")
    .split(/[|,;]/)
    .map((entry) => entry.replace(/^['"]|['"]$/g, "").trim())
    .filter(Boolean);
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeItem(item: RawCatalogItem): ExerciseDbCatalogItem | null {
  const exercise_db_id = String(item?.exercise_db_id ?? item?.exerciseId ?? item?.id ?? "").trim();
  const name = String(item?.name ?? "").trim();
  const gifUrl = String(item?.gifUrl ?? item?.media_url ?? item?.gif_url ?? "").trim();
  if (!exercise_db_id || !name || !/^https?:\/\//i.test(gifUrl)) return null;

  const normalized: ExerciseDbCatalogItem = {
    exercise_db_id,
    name,
    gifUrl,
    bodyParts: toArray(item?.bodyParts),
    equipments: toArray(item?.equipments),
    targetMuscles: toArray(item?.targetMuscles),
    secondaryMuscles: toArray(item?.secondaryMuscles),
    movement_patterns: toArray(item?.movement_patterns),
    aliases: toArray(item?.aliases),
    italian_aliases: toArray(item?.italian_aliases),
    search_text: "",
  };

  normalized.search_text = normalizeSearchText(String(item?.search_text ?? [
    normalized.name,
    ...normalized.aliases,
    ...normalized.italian_aliases,
    ...normalized.bodyParts,
    ...normalized.equipments,
    ...normalized.targetMuscles,
    ...normalized.secondaryMuscles,
    ...normalized.movement_patterns,
  ].join(" ")));

  return normalized;
}

function getRawItems(): RawCatalogItem[] {
  if (Array.isArray(catalogData)) return catalogData as RawCatalogItem[];
  if (catalogData && typeof catalogData === "object" && Array.isArray((catalogData as any).items)) {
    return (catalogData as any).items as RawCatalogItem[];
  }
  return [];
}

let cachedCatalog: ExerciseDbCatalogItem[] | null = null;

export function getExerciseDbCatalog(): ExerciseDbCatalogItem[] {
  if (cachedCatalog) return cachedCatalog;
  cachedCatalog = getRawItems().map(normalizeItem).filter(Boolean) as ExerciseDbCatalogItem[];
  return cachedCatalog;
}

export function getExerciseDbCatalogMeta(): ExerciseDbCatalogMeta {
  const total = getExerciseDbCatalog().length;
  if (catalogData && typeof catalogData === "object" && !Array.isArray(catalogData)) {
    return {
      version: String((catalogData as any).version ?? ""),
      source: String((catalogData as any).source ?? ""),
      total,
    };
  }
  return { total };
}
