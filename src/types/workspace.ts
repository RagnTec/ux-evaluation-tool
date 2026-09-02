import type { DesignElement, LogicalUnitMapping, CalibrationMode } from "./designElement";

export const WORKSPACE_SCHEMA_VERSION = 1;

export type EvaluationMode = "quick" | "guided" | "precise";
export type ReviewerRole = "design" | "product" | "uxr" | "ops" | null;
export type CroppedScaleMode = "unknown_or_resized" | "preserved_pixel_scale";
export type DesignInfoStatus = "unknown" | "partial" | "source_available";
export type DeviceProfileId = string;

export interface WorkspaceState {
  schema_version: number;
  updated_at: string;
  // Scenario & device configuration
  device_profile?: string;
  display_size?: string;
  resolution?: string;
  viewing_distance?: string;
  scenario?: string;
  user_groups?: string[];
  rule_sets?: string[];
  dimensions?: string[];
  // Calibration & logical mapping
  calibration_mode?: CalibrationMode;
  cropped_scale_mode?: CroppedScaleMode;
  original_image_reference_width?: number;
  allow_estimation?: boolean;
  logical_mapping?: LogicalUnitMapping;
  design_info_status?: "unknown" | "partial" | "source_available";
  context_environment?: string;
  context_operation_state?: string;
  // Modes and prefs
  evaluation_mode?: EvaluationMode;
  reviewer_role?: ReviewerRole;
  show_demo_results?: boolean;
  // Design elements
  elements?: DesignElement[];
  // Image metadata & raw blob
  image_blob?: Blob;
  image_name?: string;
  image_width?: number;
  image_height?: number;
}

export interface WorkspaceSerializedState {
  schema_version: number;
  updated_at: string;
  device_profile?: string;
  display_size?: string;
  resolution?: string;
  viewing_distance?: string;
  scenario?: string;
  user_groups?: string[];
  rule_sets?: string[];
  dimensions?: string[];
  calibration_mode?: CalibrationMode;
  cropped_scale_mode?: CroppedScaleMode;
  original_image_reference_width?: number;
  allow_estimation?: boolean;
  logical_mapping?: LogicalUnitMapping;
  design_info_status?: "unknown" | "partial" | "source_available";
  context_environment?: string;
  context_operation_state?: string;
  evaluation_mode?: EvaluationMode;
  reviewer_role?: ReviewerRole;
  show_demo_results?: boolean;
  elements?: DesignElement[];
  image_name?: string;
  image_width?: number;
  image_height?: number;
  // Stored as Blob in IndexedDB object store
  image_blob?: Blob;
}

export interface WorkspaceSaveResult {
  success: boolean;
  error?: string;
  updated_at?: string;
}

export interface WorkspaceLoadResult {
  success: boolean;
  workspace?: WorkspaceState | null;
  error?: "version_mismatch" | "storage_unavailable" | "corrupted" | "read_failed";
  message?: string;
}
