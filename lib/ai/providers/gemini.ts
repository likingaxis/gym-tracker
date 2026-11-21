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

const WORKOUT_PLAN_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    name: { type: "STRING" },
    month: { type: "STRING" },
    start_date: { type: "STRING" },
    end_date: { type: "STRING" },
    days: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          order: { type: "INTEGER" },
          description: { type: "STRING" },
          exercises: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                order: { type: "INTEGER" },
                name: { type: "STRING" },
                exercise_db_query: { type: "STRING" },
                alternative_queries: { type: "ARRAY", items: { type: "STRING" } },
                equipment_hint: { type: "STRING" },
                target_muscle_hint: { type: "STRING" },
                body_part_hint: { type: "STRING" },
                movement_pattern: { type: "STRING" },
                variant_hints: { type: "ARRAY", items: { type: "STRING" } },
                position_hint: { type: "STRING" },
                grip_hint: { type: "STRING" },
                bench_angle_hint: { type: "STRING" },
                side_hint: { type: "STRING" },
                exercise_db_id: { type: "STRING" },
                muscle_group: { type: "STRING" },
                sets: { type: "INTEGER" },
                reps: { type: "STRING" },
                rest_seconds: { type: "INTEGER" },
                target_rpe: { type: "STRING" },
                suggested_weight: { type: "STRING" },
                technique_notes: { type: "STRING" },
                tips: { type: "STRING" },
                video_url: { type: "STRING" },
                media_url: { type: "STRING" },
                trainer_notes: { type: "STRING" },
                group_type: { type: "STRING" },
                group_id: { type: "STRING" },
                group_order: { type: "INTEGER", nullable: true },
              },
              required: ["order", "name", "sets", "reps", "rest_seconds"],
            },
          },
        },
        required: ["name", "order", "exercises"],
      },
    },
  },
  required: ["name", "month", "days"],
};

const CANDIDATE_SELECTION_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    selections: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          key: { type: "STRING" },
          selected_exercise_db_id: { type: "STRING" },
          confidence: { type: "STRING", enum: ["high", "medium", "low"] },
          reason: { type: "STRING" },
        },
        required: ["key", "selected_exercise_db_id", "confidence", "reason"],
      },
    },
  },
  required: ["selections"],
};

const TRANSIENT_HTTP_STATUSES = new Set([429, 500, 502, 503, 504]);

class GeminiImportErrorFallback extends Error {}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function callGeminiJson(
  parts: GeminiPart[],
  temperature = 0.15,
  responseSchema?: Record<string, unknown>,
) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiImportErrorFallback("GEMINI_API_KEY non configurata.");
  }

  const model = process.env.GEMINI_MODEL || "gemini-4-hydrogen";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const maxRetries = 2;
  const timeoutMs = 45_000;

  let lastError: Error = new Error("Errore AI sconosciuto.");

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const generationConfig: Record<string, unknown> = {
        temperature,
        maxOutputTokens: 16384,
        responseMimeType: "application/json",
      };
      if (responseSchema) {
        generationConfig.responseSchema = responseSchema;
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig,
        }),
        signal: controller.signal,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const message = data?.error?.message || `Gemini API error ${response.status}`;
        lastError = new Error(message);
        if (TRANSIENT_HTTP_STATUSES.has(response.status) && attempt < maxRetries) {
          await sleep(500 * Math.pow(2, attempt));
          continue;
        }
        throw lastError;
      }

      const finishReason = data?.candidates?.[0]?.finishReason;
      if (finishReason === "MAX_TOKENS") {
        throw new Error(
          "La scheda è molto lunga e la risposta AI è stata troncata (MAX_TOKENS). Riprova o dividi il documento.",
        );
      }

      const text = extractGeminiText(data);
      if (!text) {
        throw new Error("Gemini non ha restituito testo valido.");
      }

      return text;
    } catch (error) {
      if ((error as Error)?.name === "AbortError") {
        lastError = new Error(`Timeout chiamata Gemini dopo ${timeoutMs / 1000}s.`);
        if (attempt < maxRetries) {
          await sleep(500 * Math.pow(2, attempt));
          continue;
        }
        throw lastError;
      }
      if (error instanceof GeminiImportErrorFallback) {
        throw error;
      }
      if (error instanceof TypeError && attempt < maxRetries) {
        lastError = error;
        await sleep(500 * Math.pow(2, attempt));
        continue;
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError;
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

  return callGeminiJson(parts, 0.12, WORKOUT_PLAN_RESPONSE_SCHEMA);
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

  const text = await callGeminiJson([{ text: prompt }], 0.05, CANDIDATE_SELECTION_RESPONSE_SCHEMA);
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
