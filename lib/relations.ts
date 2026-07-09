export function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export function relationName(value: { name?: string | null } | Array<{ name?: string | null }> | null | undefined, fallback = "") {
  return firstRelation(value)?.name ?? fallback;
}
