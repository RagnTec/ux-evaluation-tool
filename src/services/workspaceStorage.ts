import type {
  WorkspaceState,
  WorkspaceSerializedState,
  WorkspaceSaveResult,
  WorkspaceLoadResult
} from "../types/workspace";
import { WORKSPACE_SCHEMA_VERSION } from "../types/workspace";
import {
  STORE_WORKSPACE,
  LEGACY_RECORD_KEY,
  openDatabase
} from "./storageConfig";

const STORE_NAME = STORE_WORKSPACE;
const RECORD_KEY = LEGACY_RECORD_KEY;

/**
 * Pure serialization helper: strips any runtime/ephemeral object URLs and guarantees schema structure.
 */
export function serializeWorkspace(state: WorkspaceState): WorkspaceSerializedState {
  return {
    schema_version: WORKSPACE_SCHEMA_VERSION,
    updated_at: state.updated_at || new Date().toISOString(),
    device_profile: state.device_profile,
    display_size: state.display_size,
    resolution: state.resolution,
    viewing_distance: state.viewing_distance,
    scenario: state.scenario,
    user_groups: state.user_groups ? [...state.user_groups] : undefined,
    rule_sets: state.rule_sets ? [...state.rule_sets] : undefined,
    dimensions: state.dimensions ? [...state.dimensions] : undefined,
    calibration_mode: state.calibration_mode,
    cropped_scale_mode: state.cropped_scale_mode,
    original_image_reference_width: state.original_image_reference_width,
    allow_estimation: state.allow_estimation,
    logical_mapping: state.logical_mapping ? { ...state.logical_mapping } : undefined,
    design_info_status: state.design_info_status,
    context_environment: state.context_environment,
    context_operation_state: state.context_operation_state,
    evaluation_mode: state.evaluation_mode,
    reviewer_role: state.reviewer_role,
    show_demo_results: state.show_demo_results,
    elements: state.elements ? JSON.parse(JSON.stringify(state.elements)) : undefined,
    image_name: state.image_name,
    image_width: state.image_width,
    image_height: state.image_height,
    image_blob: state.image_blob instanceof Blob ? state.image_blob : undefined
  };
}

/**
 * Pure deserialization helper: validates schema_version and constructs safe WorkspaceState.
 */
export function deserializeWorkspace(data: any): {
  valid: boolean;
  workspace?: WorkspaceState;
  error?: "version_mismatch" | "corrupted";
} {
  if (!data || typeof data !== "object") {
    return { valid: false, error: "corrupted" };
  }

  if (typeof data.schema_version !== "number" || data.schema_version !== WORKSPACE_SCHEMA_VERSION) {
    return { valid: false, error: "version_mismatch" };
  }

  const workspace: WorkspaceState = {
    schema_version: data.schema_version,
    updated_at: typeof data.updated_at === "string" ? data.updated_at : new Date().toISOString(),
    device_profile: typeof data.device_profile === "string" ? data.device_profile : undefined,
    display_size: typeof data.display_size === "string" ? data.display_size : undefined,
    resolution: typeof data.resolution === "string" ? data.resolution : undefined,
    viewing_distance: typeof data.viewing_distance === "string" ? data.viewing_distance : undefined,
    scenario: typeof data.scenario === "string" ? data.scenario : undefined,
    user_groups: Array.isArray(data.user_groups) ? data.user_groups : undefined,
    rule_sets: Array.isArray(data.rule_sets) ? data.rule_sets : undefined,
    dimensions: Array.isArray(data.dimensions) ? data.dimensions : undefined,
    calibration_mode: data.calibration_mode === "cropped" ? "cropped" : "full_screen",
    cropped_scale_mode: data.cropped_scale_mode === "preserved_pixel_scale" ? "preserved_pixel_scale" : "unknown_or_resized",
    original_image_reference_width: typeof data.original_image_reference_width === "number" ? data.original_image_reference_width : undefined,
    allow_estimation: Boolean(data.allow_estimation),
    design_info_status: typeof data.design_info_status === "string" ? data.design_info_status : undefined,
    context_environment: typeof data.context_environment === "string" ? data.context_environment : undefined,
    context_operation_state: typeof data.context_operation_state === "string" ? data.context_operation_state : undefined,
    evaluation_mode: typeof data.evaluation_mode === "string" ? data.evaluation_mode : "quick",
    reviewer_role: typeof data.reviewer_role === "string" ? data.reviewer_role : undefined,
    show_demo_results: typeof data.show_demo_results === "boolean"
      ? data.show_demo_results
      : (Array.isArray(data.elements) && data.elements.length > 0 ? false : true),
    logical_mapping: data.logical_mapping && typeof data.logical_mapping === "object" ? {
      ...data.logical_mapping,
      scale_x: data.logical_mapping.scale_x,
      scale_y: data.logical_mapping.scale_y ?? data.logical_mapping.scale_x
    } : undefined,
    elements: Array.isArray(data.elements) ? data.elements : [],
    image_name: typeof data.image_name === "string" ? data.image_name : undefined,
    image_width: typeof data.image_width === "number" ? data.image_width : undefined,
    image_height: typeof data.image_height === "number" ? data.image_height : undefined,
    image_blob: data.image_blob instanceof Blob ? data.image_blob : undefined
  };

  return { valid: true, workspace };
}

/**
 * Saves current workspace state into IndexedDB.
 */
export async function saveWorkspace(state: WorkspaceState): Promise<WorkspaceSaveResult> {
  try {
    const serialized = serializeWorkspace(state);
    const db = await openDatabase();

    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const putRequest = store.put(serialized, RECORD_KEY);

      putRequest.onsuccess = () => {
        resolve({ success: true, updated_at: serialized.updated_at });
      };

      putRequest.onerror = () => {
        resolve({
          success: false,
          error: putRequest.error?.message || "Failed to write workspace to IndexedDB."
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
 * Loads saved workspace state from IndexedDB.
 */
export async function loadWorkspace(): Promise<WorkspaceLoadResult> {
  try {
    const db = await openDatabase();

    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(RECORD_KEY);

      getRequest.onsuccess = () => {
        const rawData = getRequest.result;
        if (!rawData) {
          return resolve({ success: true, workspace: null });
        }

        const deserialized = deserializeWorkspace(rawData);
        if (!deserialized.valid) {
          if (deserialized.error === "version_mismatch") {
            return resolve({
              success: false,
              error: "version_mismatch",
              message: "本地工作区版本不兼容，无法自动恢复。"
            });
          }
          return resolve({
            success: false,
            error: "corrupted",
            message: "本地工作区数据损坏，无法恢复。"
          });
        }

        resolve({ success: true, workspace: deserialized.workspace });
      };

      getRequest.onerror = () => {
        resolve({
          success: false,
          error: "read_failed",
          message: getRequest.error?.message || "Failed to read workspace from IndexedDB."
        });
      };
    });
  } catch (err: any) {
    return {
      success: false,
      error: "storage_unavailable",
      message: err?.message || "Storage unavailable."
    };
  }
}

/**
 * Clears saved workspace state from IndexedDB.
 */
export async function clearWorkspace(): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await openDatabase();

    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const deleteRequest = store.delete(RECORD_KEY);

      deleteRequest.onsuccess = () => {
        resolve({ success: true });
      };

      deleteRequest.onerror = () => {
        resolve({
          success: false,
          error: deleteRequest.error?.message || "Failed to clear workspace."
        });
      };
    });
  } catch (err: any) {
    return { success: false, error: err?.message || "Storage unavailable." };
  }
}
