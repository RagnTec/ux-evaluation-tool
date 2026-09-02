import type { LocalProject, ProjectSummary } from "../types/project";
import type { WorkspaceState } from "../types/workspace";
import { serializeWorkspace, deserializeWorkspace } from "./workspaceStorage";
import {
  STORE_WORKSPACE,
  STORE_PROJECTS,
  STORE_META,
  LEGACY_RECORD_KEY,
  ACTIVE_PROJECT_KEY,
  openDatabase
} from "./storageConfig";

/**
 * Computes native browser SHA-256 hex string for a given image Blob (100% local, zero network).
 */
export async function computeImageHash(blob: Blob): Promise<string> {
  try {
    if (typeof crypto === "undefined" || !crypto.subtle) {
      return "";
    }
    const buffer = await blob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return "";
  }
}

/**
 * Generates a unique project identifier.
 */
export function generateProjectId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "proj_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now();
}

/**
 * Saves or updates a LocalProject in IndexedDB without side effects on active_project_id.
 */
export async function saveProject(project: LocalProject): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_PROJECTS, "readwrite");
      const projStore = transaction.objectStore(STORE_PROJECTS);

      projStore.put(project);

      transaction.oncomplete = () => {
        resolve({ success: true });
      };

      transaction.onerror = () => {
        resolve({
          success: false,
          error: transaction.error?.message || "Failed to write project to IndexedDB."
        });
      };

      transaction.onabort = () => {
        resolve({ success: false, error: "Transaction aborted." });
      };
    });
  } catch (err: any) {
    return { success: false, error: err?.message || "Storage unavailable." };
  }
}

/**
 * Loads a specific project by project_id.
 */
export async function loadProject(projectId: string): Promise<LocalProject | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_PROJECTS, "readonly");
      const store = transaction.objectStore(STORE_PROJECTS);
      const request = store.get(projectId);

      request.onsuccess = () => {
        const raw = request.result;
        if (!raw) return resolve(null);
        resolve(raw as LocalProject);
      };

      request.onerror = () => {
        reject(request.error || new Error("Failed to load project."));
      };
    });
  } catch {
    return null;
  }
}

/**
 * Lists all local projects as summaries, sorted by updated_at descending.
 */
export async function listProjects(): Promise<ProjectSummary[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_PROJECTS, "readonly");
      const store = transaction.objectStore(STORE_PROJECTS);
      const request = store.getAll();

      request.onsuccess = () => {
        const rawList = (request.result || []) as LocalProject[];
        const summaries: ProjectSummary[] = rawList.map((p) => ({
          project_id: p.project_id,
          project_name: p.project_name || "",
          created_at: p.created_at,
          updated_at: p.updated_at,
          image_name: p.image_name,
          image_width: p.image_width,
          image_height: p.image_height,
          image_hash: p.image_hash,
          element_count: Array.isArray(p.workspace?.elements) ? p.workspace.elements.length : 0
        }));

        summaries.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        resolve(summaries);
      };

      request.onerror = () => {
        reject(request.error || new Error("Failed to list projects."));
      };
    });
  } catch {
    return [];
  }
}

/**
 * Finds existing projects matching an exact image SHA-256 hash.
 */
export async function findProjectsByImageHash(imageHash: string): Promise<LocalProject[]> {
  if (!imageHash) return [];
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_PROJECTS, "readonly");
      const store = transaction.objectStore(STORE_PROJECTS);
      const index = store.index("image_hash");
      const request = index.getAll(imageHash);

      request.onsuccess = () => {
        const list = (request.result || []) as LocalProject[];
        list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        resolve(list);
      };

      request.onerror = () => {
        resolve([]);
      };
    });
  } catch {
    return [];
  }
}

/**
 * Deletes a project by ID.
 */
export async function deleteProject(projectId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_PROJECTS, STORE_META], "readwrite");
      const projStore = transaction.objectStore(STORE_PROJECTS);
      const metaStore = transaction.objectStore(STORE_META);

      projStore.delete(projectId);

      const activeReq = metaStore.get(ACTIVE_PROJECT_KEY);
      activeReq.onsuccess = () => {
        if (activeReq.result === projectId) {
          metaStore.delete(ACTIVE_PROJECT_KEY);
        }
      };

      transaction.oncomplete = () => {
        resolve({ success: true });
      };

      transaction.onerror = () => {
        resolve({ success: false, error: transaction.error?.message || "Failed to delete project." });
      };
    });
  } catch (err: any) {
    return { success: false, error: err?.message || "Storage unavailable." };
  }
}

/**
 * Renames a project by ID.
 */
export async function renameProject(projectId: string, newName: string): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_PROJECTS, "readwrite");
      const store = transaction.objectStore(STORE_PROJECTS);
      const getReq = store.get(projectId);

      getReq.onsuccess = () => {
        const project = getReq.result as LocalProject | undefined;
        if (!project) {
          return resolve({ success: false, error: "Project not found." });
        }
        project.project_name = newName;
        project.updated_at = new Date().toISOString();
        store.put(project);
      };

      transaction.oncomplete = () => {
        resolve({ success: true });
      };

      transaction.onerror = () => {
        resolve({ success: false, error: transaction.error?.message || "Failed to rename project." });
      };
    });
  } catch (err: any) {
    return { success: false, error: err?.message || "Storage unavailable." };
  }
}

/**
 * Gets the active project ID.
 */
export async function getActiveProjectId(): Promise<string | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_META, "readonly");
      const store = transaction.objectStore(STORE_META);
      const request = store.get(ACTIVE_PROJECT_KEY);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        resolve(null);
      };
    });
  } catch {
    return null;
  }
}

/**
 * Sets the active project ID.
 */
export async function setActiveProjectId(projectId: string | null): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_META, "readwrite");
      const store = transaction.objectStore(STORE_META);
      if (projectId) {
        store.put(projectId, ACTIVE_PROJECT_KEY);
      } else {
        store.delete(ACTIVE_PROJECT_KEY);
      }
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => resolve();
    });
  } catch {
    // Ignore meta errors
  }
}

/**
 * Migrates legacy active_workspace to a LocalProject if no projects exist.
 * Preserves the original active_workspace record for backward safety.
 */
export async function migrateLegacyWorkspaceIfNeeded(): Promise<LocalProject | null> {
  try {
    const db = await openDatabase();

    // 1. Check if any project already exists
    const hasProjects = await new Promise<boolean>((resolve) => {
      const tx = db.transaction(STORE_PROJECTS, "readonly");
      const store = tx.objectStore(STORE_PROJECTS);
      const countReq = store.count();
      countReq.onsuccess = () => resolve(countReq.result > 0);
      countReq.onerror = () => resolve(false);
    });

    if (hasProjects) {
      return null;
    }

    // 2. Check if legacy active_workspace exists
    const legacyData = await new Promise<any>((resolve) => {
      const tx = db.transaction(STORE_WORKSPACE, "readonly");
      const store = tx.objectStore(STORE_WORKSPACE);
      const req = store.get(LEGACY_RECORD_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });

    if (!legacyData) {
      return null;
    }

    const deserialized = deserializeWorkspace(legacyData);
    if (!deserialized.valid || !deserialized.workspace) {
      return null;
    }

    const state = deserialized.workspace;
    const projectId = generateProjectId();
    const rawImageName = state.image_name || "Recovered Project";
    const projectName = rawImageName.replace(/\.[^/.]+$/, "");

    let imageHash = "";
    if (state.image_blob instanceof Blob) {
      imageHash = await computeImageHash(state.image_blob);
    }

    const newProject: LocalProject = {
      project_id: projectId,
      project_name: projectName,
      created_at: state.updated_at || new Date().toISOString(),
      updated_at: state.updated_at || new Date().toISOString(),
      image_name: state.image_name,
      image_width: state.image_width,
      image_height: state.image_height,
      image_hash: imageHash || undefined,
      workspace: serializeWorkspace(state)
    };

    await saveProject(newProject);
    await setActiveProjectId(newProject.project_id);
    return newProject;
  } catch {
    return null;
  }
}

/**
 * Clears all local projects, metadata, and legacy records from IndexedDB.
 */
export async function clearAllProjects(): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_PROJECTS, STORE_META, STORE_WORKSPACE], "readwrite");
      transaction.objectStore(STORE_PROJECTS).clear();
      transaction.objectStore(STORE_META).clear();
      transaction.objectStore(STORE_WORKSPACE).clear();
      transaction.oncomplete = () => resolve({ success: true });
      transaction.onerror = () => resolve({ success: false, error: transaction.error?.message || "Failed to clear database." });
    });
  } catch (err: any) {
    return { success: false, error: err?.message || "Storage unavailable." };
  }
}
