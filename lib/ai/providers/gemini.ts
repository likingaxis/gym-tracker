import { readFileSync } from "fs";
import { join } from "path";
import { extractFirstJsonObject } from "@/lib/ai/extractJson";

type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

type GeminiGenerateOptions = {
  prompt: string;
  text?: string;
  file?: {
    mimeType: string;
    base64: string;
  };
  includeExerciseDbCsv?: boolean;
};

type CandidateSelectionRequest = {
  key: string;
  exercise: {
    name?: string;
    exercise_db_query?: string;
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
    variant_hints?: unknown;
  };
  candidates: Array<{
    exercise_db_id: string;
    name: string;
    bodyParts?: string[];
    equipments?: string[];
    targetMuscles?: string[];
    secondaryMuscles?: string[];
    movement_patterns?: string[];
    aliases?: string[];
    italian_aliases?: string[];
    short?: {
      id: string;
      n: string;
      eq: string;
      bp: string;
      tm: string;
      sec: string;
      pat: string;
      aka: string;
    };
    score?: number;
  }>;
};

export type CandidateSelection = {
  key: string;
  selected_exercise_db_id: string;
  confidence: "high" | "medium" | "low";
  reason: string;
};

function extractGeminiText(data: any): string {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts.map((part) => (typeof part?.text === "string" ? part.text : "")).join("\n").trim();
}

let cachedExerciseDbCsv: string | null = null;

function getExerciseDbCsvForPrompt() {
  if (cachedExerciseDbCsv !== null) return cachedExerciseDbCsv;

  try {
    const csvPath = join(process.cwd(), "data", "exercisedb-index-compact.csv");
    cachedExerciseDbCsv = readFileSync(csvPath, "utf8").trim();
  } catch {
    cachedExerciseDbCsv = "";
  }

  return cachedExerciseDbCsv;
}

async function callGeminiJson(parts: GeminiPart[], temperature = 0.15) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY non configurata.");
  }

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.error?.message || `Gemini API error ${response.status}`;
    throw new Error(message);
  }

  const text = extractGeminiText(data);
  if (!text) {
    throw new Error("Gemini non ha restituito testo valido.");
  }

  return text;
}

function parseJsonObject(text: string) {
  return extractFirstJsonObject(text);
}

export async function generateWorkoutPlanWithGemini(options: GeminiGenerateOptions) {
  const parts: GeminiPart[] = [{ text: options.prompt }];

  if (options.text?.trim()) {
    parts.push({ text: `\n\nCONTENUTO SCHEDA:\n${options.text.trim()}` });
  }

  if (options.includeExerciseDbCsv) {
    const catalogCsv = getExerciseDbCsvForPrompt();
    if (catalogCsv) {
      parts.push({
        text: `

CATALOGO ESERCIZI EXERCISEDB UFFICIALE CSV
Usa solo questi ID e questi gifUrl quando vuoi compilare exercise_db_id e media_url.
Se non trovi un esercizio sicuro nel catalogo, lascia exercise_db_id e media_url vuoti.

${catalogCsv}`,
      });
    }
  }

  if (options.file) {
    parts.push({ inlineData: { mimeType: options.file.mimeType, data: options.file.base64 } });
  }

  return callGeminiJson(parts, 0.12);
}

export async function selectExerciseDbCandidatesWithGemini(
  requests: CandidateSelectionRequest[],
): Promise<CandidateSelection[]> {
  if (requests.length === 0) return [];

  const compactRequests = requests.slice(0, 80).map((request) => ({
    key: request.key,
    exercise: request.exercise,
    // Mini catalogo short: Gemini vede solo 5-8 candidati reali, compatti e senza URL.
    // Il backend conserva il catalogo completo e copia gifUrl solo dopo una scelta high-confidence.
    candidates: request.candidates.slice(0, 8).map((candidate) => candidate.short ?? ({
      id: candidate.exercise_db_id,
      n: candidate.name,
      eq: (candidate.equipments ?? []).join(", "),
      bp: (candidate.bodyParts ?? []).join(", "),
      tm: (candidate.targetMuscles ?? []).join(", "),
      sec: (candidate.secondaryMuscles ?? []).slice(0, 3).join(", "),
      pat: (candidate.movement_patterns ?? []).join(", "),
      aka: [...(candidate.aliases ?? []), ...(candidate.italian_aliases ?? [])].slice(0, 8).join(" | "),
    })),
  }));

  const prompt = `Sei un selettore prudente di esercizi ExerciseDB. Il primo modello ha gia normalizzato gli esercizi usando un vocabolario controllato ExerciseDB.

Per ogni esercizio della scheda devi scegliere il candidato migliore SOLO dalla mini-lista compatta fornita.
Non puoi inventare ID, nomi o URL.
Se nessun candidato rappresenta chiaramente lo stesso esercizio, lascia selected_exercise_db_id vuoto e confidence "low".
Usa confidence "high" solo quando movimento, attrezzatura, posizione/presa/variante quando rilevanti e muscolo principale corrispondono bene.
Usa confidence "medium" se il candidato e' simile ma non abbastanza sicuro: in quel caso l'app NON applichera' la GIF automaticamente.
Non sostituire esercizi diversi solo perche' hanno muscoli simili. Esempio: dead hang non e' hanging leg raise.
I candidati sono in formato short: id=exercise_db_id, n=nome, eq=attrezzatura, bp=distretto, tm=muscolo target, sec=secondari, pat=pattern, aka=alias utili.

Rispondi SOLO JSON valido con questa struttura:
{
  "selections": [
    {
      "key": "day.exercise",
      "selected_exercise_db_id": "",
      "confidence": "high",
      "reason": "breve motivo"
    }
  ]
}

Richieste:
${JSON.stringify(compactRequests)}`;

  const text = await callGeminiJson([{ text: prompt }], 0.05);
  const parsed = parseJsonObject(text);
  const selections = Array.isArray(parsed?.selections) ? parsed.selections : [];

  return selections
    .map((selection: any): CandidateSelection | null => {
      const key = String(selection?.key ?? "").trim();
      if (!key) return null;
      const confidence = String(selection?.confidence ?? "low").toLowerCase();
      return {
        key,
        selected_exercise_db_id: String(selection?.selected_exercise_db_id ?? selection?.id ?? "").trim(),
        confidence: confidence === "high" || confidence === "medium" ? confidence : "low",
        reason: String(selection?.reason ?? "").trim(),
      };
    })
    .filter(Boolean) as CandidateSelection[];
}
