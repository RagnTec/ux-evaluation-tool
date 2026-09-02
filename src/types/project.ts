import type { WorkspaceSerializedState } from "./workspace";

export interface LocalProject {
  project_id: string;
  project_name: string;
  created_at: string;
  updated_at: string;
  image_hash?: string;
  image_name?: string;
  image_width?: number;
  image_height?: number;
  workspace: WorkspaceSerializedState;
}

export interface ProjectSummary {
  project_id: string;
  project_name: string;
  created_at: string;
  updated_at: string;
  image_name?: string;
  image_width?: number;
  image_height?: number;
  image_hash?: string;
  element_count: number;
}
