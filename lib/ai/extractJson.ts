export function extractFirstJsonObject(text: string) {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    // Continue with robust extraction.
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  if (fenced) {
    try {
      return JSON.parse(fenced.trim());
    } catch {
      // Continue with robust extraction.
    }
  }

  const firstBrace = trimmed.indexOf("{");
  if (firstBrace < 0) {
    throw new Error("La risposta AI non contiene un oggetto JSON valido.");
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = firstBrace; i < trimmed.length; i += 1) {
    const char = trimmed[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;

    if (depth === 0) {
      const jsonText = trimmed.slice(firstBrace, i + 1);
      return JSON.parse(jsonText);
    }
  }

  throw new Error("La risposta AI non contiene un oggetto JSON completo.");
}
