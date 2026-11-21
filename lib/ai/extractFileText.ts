const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export type ExtractedInput = {
  text?: string;
  file?: {
    mimeType: string;
    base64: string;
  };
  warnings: string[];
};

export const SUPPORTED_AI_IMPORT_TYPES = [
  "application/pdf",
  DOCX_MIME,
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/plain",
  "application/json",
];

export function isSupportedAiImportFile(file: File) {
  const name = file.name.toLowerCase();
  if (SUPPORTED_AI_IMPORT_TYPES.includes(file.type)) return true;
  return [".pdf", ".docx", ".png", ".jpg", ".jpeg", ".webp", ".txt", ".json"].some((extension) => name.endsWith(extension));
}

function inferMimeType(file: File) {
  if (file.type) return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return "application/pdf";
  if (name.endsWith(".docx")) return DOCX_MIME;
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".json")) return "application/json";
  return "text/plain";
}

function decodeBasicHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;|&apos;/gi, "'");
}

function htmlToStructuredText(html: string) {
  const withTables = html.replace(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi, (_rowMatch, rowInner: string) => {
    const cells: string[] = [];
    const cellRegex = /<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let match: RegExpExecArray | null;
    while ((match = cellRegex.exec(rowInner)) !== null) {
      const cleanedCell = decodeBasicHtmlEntities(match[1].replace(/<[^>]+>/g, " "))
        .replace(/\s+/g, " ")
        .trim();
      cells.push(cleanedCell);
    }
    return cells.length > 0 ? `\n| ${cells.join(" | ")} |\n` : "\n";
  });

  const withBlocks = withTables
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|blockquote)>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, "");

  return decodeBasicHtmlEntities(withBlocks)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extractDocxText(buffer: Buffer) {
  const mammoth = await import("mammoth");
  const htmlResult = await mammoth.convertToHtml({ buffer });
  const structured = htmlToStructuredText(htmlResult.value ?? "");
  if (structured) return structured;

  const rawResult = await mammoth.extractRawText({ buffer });
  return rawResult.value?.trim() ?? "";
}

export async function extractWorkoutInputFromFile(file: File): Promise<ExtractedInput> {
  const warnings: string[] = [];
  const mimeType = inferMimeType(file);
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (mimeType === "text/plain" || mimeType === "application/json" || file.name.toLowerCase().endsWith(".txt") || file.name.toLowerCase().endsWith(".json")) {
    return { text: buffer.toString("utf8"), warnings };
  }

  if (mimeType === DOCX_MIME || file.name.toLowerCase().endsWith(".docx")) {
    const text = await extractDocxText(buffer);
    if (!text) warnings.push("Il DOCX sembra non contenere testo leggibile. Prova con PDF o screenshot.");
    return { text, warnings };
  }

  return {
    file: {
      mimeType,
      base64: buffer.toString("base64"),
    },
    warnings,
  };
}
