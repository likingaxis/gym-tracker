"use client";

import { useEffect, useState } from "react";
import { putInDB, getAllFromDB, deleteFromDB, SyncQueueItem } from "@/lib/db/indexeddb";

export async function queueMutation(action: string, payload: any) {
  try {
    await putInDB("sync_queue", {
      action,
      payload,
      createdAt: Date.now(),
      retryCount: 0,
    });
  } catch (err) {
    console.error("[queueMutation] Errore salvataggio in sync_queue:", err);
  }
}

export async function processSyncQueue() {
  if (typeof window === "undefined" || !navigator.onLine) return;

  try {
    const queue = await getAllFromDB<SyncQueueItem>("sync_queue");
    if (!queue || queue.length === 0) return;

    // Ordina per createdAt ascendente
    queue.sort((a, b) => a.createdAt - b.createdAt);

    for (const item of queue) {
      let success = false;

      try {
        if (item.action === "UPDATE_SESSION") {
          const m = await import("@/lib/api-client/workout-sessions");
          const profileId = localStorage.getItem("active_profile_id");
          const res = await m.updateSession(
            profileId || "",
            item.payload.sessionId,
            item.payload.data
          );
          if (res?.success) {
            success = true;
          }
        } else if (item.action === "CREATE_SESSION") {
          const m = await import("@/lib/api-client/workout-sessions");
          const profileId = localStorage.getItem("active_profile_id");
          const res = await m.createSession(
            profileId || "",
            item.payload.data || item.payload
          );
          if (res?.success) {
            success = true;
          }
        } else {
          // Azione sconosciuta o personalizzata: consideriamo processato per evitare blocchi
          success = true;
        }

        if (success && item.id !== undefined) {
          await deleteFromDB("sync_queue", item.id);
        }
      } catch (itemErr) {
        console.error("[processSyncQueue] Errore durante l'elaborazione dell'item:", item, itemErr);
      }
    }
  } catch (err) {
    console.error("[processSyncQueue] Errore lettura sync_queue:", err);
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

export function useSyncEngine() {
  const isOnline = useOnlineStatus();

  useEffect(() => {
    if (isOnline) {
      processSyncQueue();
    }
  }, [isOnline]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isOnline) {
        processSyncQueue();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isOnline]);

  return { isOnline };
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
