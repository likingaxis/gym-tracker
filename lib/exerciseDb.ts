export type ExerciseDbResolvedMedia = {
  id: string;
  gifUrl: string;
  matchStatus: "matched_by_id";
};

const EXERCISE_DB_MEDIA_BASE_URL = "https://static.exercisedb.dev/media";

export function isDirectImageUrl(value?: string | null) {
  if (!value) return false;
  return /\.(png|jpe?g|gif|webp|avif)(\?.*)?$/i.test(value.trim());
}

export function cleanExerciseDbId(value?: string | null) {
  const id = value?.trim();
  if (!id) return null;

  // ExerciseDB public ids in the OSS dataset are short slug-like strings.
  // Keep this strict so a dirty pasted value cannot become part of a URL.
  if (!/^[A-Za-z0-9_-]{3,64}$/.test(id)) return null;
  return id;
}

export function buildExerciseDbGifUrl(id?: string | null) {
  const cleanId = cleanExerciseDbId(id);
  if (!cleanId) return null;
  return `${EXERCISE_DB_MEDIA_BASE_URL}/${cleanId}.gif`;
}

export function resolveExerciseDbMediaById(id?: string | null): ExerciseDbResolvedMedia | null {
  const cleanId = cleanExerciseDbId(id);
  if (!cleanId) return null;

  return {
    id: cleanId,
    gifUrl: buildExerciseDbGifUrl(cleanId)!,
    matchStatus: "matched_by_id",
  };
}
