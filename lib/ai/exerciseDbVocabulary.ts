import promptVocabulary from "@/data/exercisedb-prompt-vocabulary.json";
import italianSynonyms from "@/data/exercise-it-synonyms.json";

type SynonymEntry = {
  equipment_hint?: string;
  body_part_hint?: string;
  target_muscle_hint?: string;
  movement_pattern?: string;
  variant_hints?: string[];
  query_terms?: string[];
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

export function getPromptVocabularyForLlm() {
  return JSON.stringify(promptVocabulary, null, 2);
}

export function getItalianSynonymItems(): Record<string, SynonymEntry> {
  const items = (italianSynonyms as any)?.items;
  return items && typeof items === "object" ? items as Record<string, SynonymEntry> : {};
}

export function expandItalianSynonyms(value: string) {
  const text = normalize(value);
  const items = getItalianSynonymItems();
  const expanded = new Set<string>();

  Object.entries(items).forEach(([rawKey, entry]) => {
    const key = normalize(rawKey);
    if (!key || !text.includes(key)) return;

    expanded.add(key);
    for (const term of entry.query_terms ?? []) expanded.add(normalize(term));
    if (entry.equipment_hint) expanded.add(normalize(entry.equipment_hint));
    if (entry.body_part_hint) expanded.add(normalize(entry.body_part_hint));
    if (entry.target_muscle_hint) expanded.add(normalize(entry.target_muscle_hint));
    if (entry.movement_pattern) expanded.add(normalize(entry.movement_pattern));
    for (const term of entry.variant_hints ?? []) expanded.add(normalize(term));
  });

  return Array.from(expanded).filter(Boolean);
}
