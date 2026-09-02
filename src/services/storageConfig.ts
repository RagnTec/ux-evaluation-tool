export const DB_NAME = "ux_evaluation_workspace_db";
export const DB_VERSION = 2;

export const STORE_WORKSPACE = "workspace";
export const STORE_PROJECTS = "projects";
export const STORE_META = "meta";

export const LEGACY_RECORD_KEY = "active_workspace";
export const ACTIVE_PROJECT_KEY = "active_project_id";

/**
 * Single authoritative IndexedDB connection opener across the application.
 * Manages schema upgrades consistently.
 */
export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB is not available in this environment."));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Keep legacy workspace store
      if (!db.objectStoreNames.contains(STORE_WORKSPACE)) {
        db.createObjectStore(STORE_WORKSPACE);
      }

      // Add projects store with indexes
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        const projStore = db.createObjectStore(STORE_PROJECTS, { keyPath: "project_id" });
        projStore.createIndex("updated_at", "updated_at", { unique: false });
        projStore.createIndex("image_hash", "image_hash", { unique: false });
      }

      // Add meta store for active project tracking
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error("Failed to open IndexedDB."));
    };
  });
}
