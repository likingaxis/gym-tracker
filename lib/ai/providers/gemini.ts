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
};

function extractGeminiText(data: any): string {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts.map((part) => (typeof part?.text === "string" ? part.text : "")).join("\n").trim();
}

export async function generateWorkoutPlanWithGemini(options: GeminiGenerateOptions) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY non configurata.");
  }

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const parts: GeminiPart[] = [{ text: options.prompt }];

  if (options.text?.trim()) {
    parts.push({ text: `\n\nCONTENUTO SCHEDA:\n${options.text.trim()}` });
  }

  if (options.file) {
    parts.push({ inlineData: { mimeType: options.file.mimeType, data: options.file.base64 } });
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: 0.15,
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
