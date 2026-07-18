"use client";

import { useEffect } from "react";
import { prefetchExerciseMedia } from "@/lib/utils/prefetchMedia";

export function MediaPrefetcher({
  exercises,
}: {
  exercises: Array<{ media_url?: string | null }>;
}) {
  useEffect(() => {
    prefetchExerciseMedia(exercises);
  }, [exercises]);

  return null;
}
