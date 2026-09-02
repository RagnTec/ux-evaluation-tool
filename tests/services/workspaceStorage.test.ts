import { describe, it, expect } from "vitest";
import {
  serializeWorkspace,
  deserializeWorkspace
} from "../../src/services/workspaceStorage";
import { WORKSPACE_SCHEMA_VERSION, type WorkspaceState } from "../../src/types/workspace";
import type { DesignElement } from "../../src/types/designElement";

describe("Local Workspace Persistence - Serialization & Schema Integrity", () => {
  const sampleElement: DesignElement = {
    element_id: "el-123",
    source: "manual",
    element_type: "button",
    label: "Submit Button",
    normalized_bounds: { x: 0.1, y: 0.2, width: 0.3, height: 0.1 },
    image_pixel_bounds: { x: 100, y: 200, width: 300, height: 100 },
    calibration_mode: "full_screen",
    allow_estimation: false,
    foreground_color: "#FFFFFF",
    background_color: "#007AFF",
    created_at: "2026-08-20T10:00:00.000Z"
  };

  const sampleState: WorkspaceState = {
    schema_version: WORKSPACE_SCHEMA_VERSION,
    updated_at: "2026-08-20T10:00:00.000Z",
    device_profile: "mobile",
    display_size: "6.1 inch",
    resolution: "1170x2532",
    viewing_distance: "30cm",
    scenario: "移动端 App - 室内",
    user_groups: ["东亚用户", "女性"],
    rule_sets: ["WCAG 2.2", "Apple HIG"],
    dimensions: ["触控目标", "色彩对比"],
    calibration_mode: "full_screen",
    allow_estimation: false,
    logical_mapping: {
      platform: "ios",
      unit: "pt",
      image_reference_width: 1170,
      logical_reference_width: 390,
      scale_x: 1 / 3,
      scale_y: 1 / 3,
      quality: "user_specified"
    },
    elements: [sampleElement],
    image_name: "test_screen.png",
    image_width: 1170,
    image_height: 2532
  };

  describe("serializeWorkspace", () => {
    it("should serialize state with valid schema version and deep copies", () => {
      const serialized = serializeWorkspace(sampleState);
      expect(serialized.schema_version).toBe(WORKSPACE_SCHEMA_VERSION);
      expect(serialized.device_profile).toBe("mobile");
      expect(serialized.elements).toHaveLength(1);
      expect(serialized.elements?.[0].element_id).toBe("el-123");
      expect(serialized.logical_mapping?.unit).toBe("pt");
    });

    it("should preserve Blob instances if present and never store object URLs", () => {
      const blob = new Blob(["test-image-content"], { type: "image/png" });
      const stateWithBlob: WorkspaceState = {
        ...sampleState,
        image_blob: blob
      };

      const serialized = serializeWorkspace(stateWithBlob);
      expect(serialized.image_blob).toBeInstanceOf(Blob);
    });
  });

  describe("deserializeWorkspace", () => {
    it("should deserialize valid serialized data into WorkspaceState", () => {
      const serialized = serializeWorkspace(sampleState);
      const res = deserializeWorkspace(serialized);
      expect(res.valid).toBe(true);
      expect(res.workspace).toBeDefined();
      expect(res.workspace?.schema_version).toBe(WORKSPACE_SCHEMA_VERSION);
      expect(res.workspace?.elements).toHaveLength(1);
      expect(res.workspace?.elements?.[0].label).toBe("Submit Button");
    });

    it("should reject corrupted or non-object payloads safely", () => {
      expect(deserializeWorkspace(null).valid).toBe(false);
      expect(deserializeWorkspace("invalid string").valid).toBe(false);
      expect(deserializeWorkspace(123).valid).toBe(false);
    });

    it("should reject incompatible schema versions gracefully", () => {
      const futureData = {
        ...sampleState,
        schema_version: 999
      };

      const res = deserializeWorkspace(futureData);
      expect(res.valid).toBe(false);
      expect(res.error).toBe("version_mismatch");
      expect(res.workspace).toBeUndefined();
    });

    it("should roundtrip evaluation_mode, reviewer_role, and show_demo_results fields", () => {
      const modeState: WorkspaceState = {
        ...sampleState,
        evaluation_mode: "guided",
        reviewer_role: "design",
        show_demo_results: false
      };

      const serialized = serializeWorkspace(modeState);
      expect(serialized.evaluation_mode).toBe("guided");
      expect(serialized.reviewer_role).toBe("design");
      expect(serialized.show_demo_results).toBe(false);

      const res = deserializeWorkspace(serialized);
      expect(res.valid).toBe(true);
      expect(res.workspace?.evaluation_mode).toBe("guided");
      expect(res.workspace?.reviewer_role).toBe("design");
      expect(res.workspace?.show_demo_results).toBe(false);
    });

    it("should roundtrip Phase 3I design_info_status, context_environment, and context_operation_state", () => {
      const phase3IState: WorkspaceState = {
        ...sampleState,
        design_info_status: "partial",
        context_environment: "户外强光",
        context_operation_state: "单手操作"
      };

      const serialized = serializeWorkspace(phase3IState);
      expect(serialized.design_info_status).toBe("partial");
      expect(serialized.context_environment).toBe("户外强光");
      expect(serialized.context_operation_state).toBe("单手操作");

      const res = deserializeWorkspace(serialized);
      expect(res.valid).toBe(true);
      expect(res.workspace?.design_info_status).toBe("partial");
      expect(res.workspace?.context_environment).toBe("户外强光");
      expect(res.workspace?.context_operation_state).toBe("单手操作");
    });

    it("should safely default evaluation_mode to quick and fallback missing scale_y to scale_x for legacy state", () => {
      const legacyStateNoMode = {
        ...sampleState,
        evaluation_mode: undefined,
        reviewer_role: undefined,
        show_demo_results: undefined,
        logical_mapping: {
          platform: "ios",
          unit: "pt",
          image_reference_width: 1170,
          logical_reference_width: 390,
          scale_x: 0.3333,
          // scale_y missing in legacy record
          quality: "user_specified"
        },
        elements: []
      };

      const res = deserializeWorkspace(legacyStateNoMode);
      expect(res.valid).toBe(true);
      expect(res.workspace?.evaluation_mode).toBe("quick");
      expect(res.workspace?.show_demo_results).toBe(true);
      expect(res.workspace?.logical_mapping?.scale_y).toBe(0.3333);
      expect(res.workspace?.logical_mapping?.scale_y).not.toBe(1);

      // With elements present in legacy state without explicit preference, default to false (hidden)
      const legacyStateWithElements = {
        ...legacyStateNoMode,
        elements: [sampleElement]
      };
      const resWithElements = deserializeWorkspace(legacyStateWithElements);
      expect(resWithElements.workspace?.show_demo_results).toBe(false);
    });

    it("should roundtrip interaction and touch bounds fields correctly", () => {
      const interactiveElement: DesignElement = {
        ...sampleElement,
        interaction_type: "tap_swipe",
        swipe_direction: "horizontal",
        touch_bounds: { x: 0.08, y: 0.18, width: 0.34, height: 0.14 },
        touch_bounds_source: "platform_reference",
        copied_from_element_id: "el-origin"
      };

      const state: WorkspaceState = {
        ...sampleState,
        elements: [interactiveElement]
      };

      const serialized = serializeWorkspace(state);
      const res = deserializeWorkspace(serialized);
      expect(res.valid).toBe(true);
      const el = res.workspace?.elements?.[0];
      expect(el?.interaction_type).toBe("tap_swipe");
      expect(el?.swipe_direction).toBe("horizontal");
      expect(el?.touch_bounds?.width).toBe(0.34);
      expect(el?.touch_bounds_source).toBe("platform_reference");
      expect(el?.copied_from_element_id).toBe("el-origin");
    });

    it("should load legacy v1 element without interaction fields safely", () => {
      const legacyData = {
        ...sampleState,
        elements: [
          {
            element_id: "legacy-1",
            source: "manual",
            element_type: "button",
            normalized_bounds: { x: 0, y: 0, width: 0.1, height: 0.1 },
            image_pixel_bounds: { x: 0, y: 0, width: 100, height: 100 },
            calibration_mode: "full_screen",
            created_at: "2026-08-20T00:00:00.000Z"
          }
        ]
      };

      const res = deserializeWorkspace(legacyData);
      expect(res.valid).toBe(true);
      expect(res.workspace?.elements?.[0].interaction_type).toBeUndefined();
    });

    it("should roundtrip cropped_scale_mode and original_image_reference_width correctly", () => {
      const state: WorkspaceState = {
        ...sampleState,
        calibration_mode: "cropped",
        cropped_scale_mode: "preserved_pixel_scale",
        original_image_reference_width: 2560
      };

      const serialized = serializeWorkspace(state);
      expect(serialized.cropped_scale_mode).toBe("preserved_pixel_scale");
      expect(serialized.original_image_reference_width).toBe(2560);

      const res = deserializeWorkspace(serialized);
      expect(res.valid).toBe(true);
      expect(res.workspace?.cropped_scale_mode).toBe("preserved_pixel_scale");
      expect(res.workspace?.original_image_reference_width).toBe(2560);
    });
  });
});
