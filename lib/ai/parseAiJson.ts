import { extractFirstJsonObject } from "@/lib/ai/extractJson";

export function parseAiJson(text: string) {
  return extractFirstJsonObject(text);
}
