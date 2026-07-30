import { openDB, IDBPDatabase } from "idb";

export const DB_NAME = "gym_tracker_db";
export const DB_VERSION = 1;

export type StoreName =
  | "profiles"
  | "workout_plans"
  | "workout_days"
  | "exercises"
  | "workout_sessions"
  | "session_exercises"
  | "exercise_sets"
  | "sync_queue"
  | "api_cache";

export interface SyncQueueItem {
  id?: number;
  action: string;
  payload: any;
  createdAt: number;
  retryCount?: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

/**
 * Initializes and returns the IndexedDB instance.
 * Safe for Server-Side Rendering (returns null on server).
 */
export async function initDB(): Promise<IDBPDatabase | null> {
  if (typeof window === "undefined") {
    return null;
  }

  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("profiles")) {
          db.createObjectStore("profiles", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("workout_plans")) {
          db.createObjectStore("workout_plans", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("workout_days")) {
          db.createObjectStore("workout_days", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("exercises")) {
          db.createObjectStore("exercises", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("workout_sessions")) {
          db.createObjectStore("workout_sessions", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("session_exercises")) {
          db.createObjectStore("session_exercises", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("exercise_sets")) {
          db.createObjectStore("exercise_sets", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("sync_queue")) {
          db.createObjectStore("sync_queue", { keyPath: "id", autoIncrement: true });
        }
        if (!db.objectStoreNames.contains("api_cache")) {
          db.createObjectStore("api_cache", { keyPath: "id" });
        }
      },
    });
  }

  return dbPromise;
}

/**
 * Get a single item by key from the specified store.
 */
export async function getFromDB<T = any>(
  storeName: StoreName,
  id: string | number
): Promise<T | undefined> {
  const db = await initDB();
  if (!db) return undefined;
  return db.get(storeName, id);
}

/**
 * Add or update an item in the specified store.
 */
export async function putInDB<T = any>(
  storeName: StoreName,
  value: T
): Promise<IDBValidKey | undefined> {
  const db = await initDB();
  if (!db) return undefined;
  return db.put(storeName, value);
}

/**
 * Put multiple items in a single transaction for better performance.
 */
export async function putAllInDB<T = any>(
  storeName: StoreName,
  items: T[]
): Promise<void> {
  const db = await initDB();
  if (!db) return;
  const tx = db.transaction(storeName, "readwrite");
  const store = tx.objectStore(storeName);
  for (const item of items) {
    await store.put(item);
  }
  await tx.done;
}

/**
 * Delete an item by key from the specified store.
 */
export async function deleteFromDB(
  storeName: StoreName,
  id: string | number
): Promise<void> {
  const db = await initDB();
  if (!db) return;
  await db.delete(storeName, id);
}

/**
 * Get all items from the specified store.
 */
export async function getAllFromDB<T = any>(
  storeName: StoreName
): Promise<T[]> {
  const db = await initDB();
  if (!db) return [];
  return db.getAll(storeName);
}

/**
 * Clear all records from a given store.
 */
export async function clearStore(storeName: StoreName): Promise<void> {
  const db = await initDB();
  if (!db) return;
  await db.clear(storeName);
}
