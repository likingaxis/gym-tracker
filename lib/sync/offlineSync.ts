"use client";

import { useEffect, useState } from "react";

export interface PendingPatch {
  sessionId: string;
  payload: any;
  updatedAt: number;
}

function getQueueKey(sessionId: string) {
  return `gym_offline_patch_${sessionId}`;
}

export function savePendingPatch(sessionId: string, payload: any) {
  if (typeof window === "undefined") return;
  try {
    const item: PendingPatch = {
      sessionId,
      payload,
      updatedAt: Date.now(),
    };
    localStorage.setItem(getQueueKey(sessionId), JSON.stringify(item));
  } catch (err) {
    console.error("Errore salvataggio patch offline:", err);
  }
}

export function getPendingPatch(sessionId: string): PendingPatch | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(getQueueKey(sessionId));
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function clearPendingPatch(sessionId: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(getQueueKey(sessionId));
  } catch {}
}

export async function syncPendingPatchToServer(sessionId: string): Promise<boolean> {
  const pending = getPendingPatch(sessionId);
  if (!pending) return true;

  try {
    const response = await fetch(`/api/workout-sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pending.payload),
    });

    if (response.ok) {
      clearPendingPatch(sessionId);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsOnline(window.navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}

export function saveSessionSnapshot(key: string, fullState: any) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`gym_snapshot_${key}`, JSON.stringify(fullState));
  } catch (err) {
    console.error("Errore salvataggio snapshot:", err);
  }
}

export function getSessionSnapshot(key: string): any | null {
  if (typeof window === "undefined") return null;
  try {
    const data = localStorage.getItem(`gym_snapshot_${key}`);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    return null;
  }
}
