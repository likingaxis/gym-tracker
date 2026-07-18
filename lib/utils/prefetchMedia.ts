"use client";

export function prefetchImage(url: string): Promise<void> {
  return new Promise((resolve) => {
    if (!url || typeof window === "undefined") {
      resolve();
      return;
    }

    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve(); // Always resolve so failure doesn't block other downloads
    img.src = url;
  });
}

export function prefetchExerciseMedia(
  items: Array<{ media_url?: string | null }>
): Promise<void[]> {
  if (typeof window === "undefined" || !items || !items.length) {
    return Promise.resolve([]);
  }

  const urls = items
    .map((item) => item.media_url?.trim())
    .filter((url): url is string => Boolean(url && url.length > 0));

  const uniqueUrls = Array.from(new Set(urls));

  return Promise.all(uniqueUrls.map((url) => prefetchImage(url)));
}
