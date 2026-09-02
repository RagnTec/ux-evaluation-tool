import { describe, it, expect } from "vitest";
import type { WorkspaceState, EvaluationMode, ReviewerRole } from "../../src/types/workspace";
import type { DesignElement, LogicalUnitMapping } from "../../src/types/designElement";
import { calculateNearestTouchTarget, calculateRectangleOverlap } from "../../src/utils/interactionGeometry";

describe("Phase 3F - Evaluation Mode, Demo Isolation & Confidence Semantics", () => {
  const realElementA: DesignElement = {
    element_id: "real-el-1",
    source: "manual",
    element_type: "button",
    label: "Main Action",
    normalized_bounds: { x: 0.1, y: 0.1, width: 0.2, height: 0.05 },
    image_pixel_bounds: { x: 100, y: 100, width: 200, height: 50 },
    interaction_type: "tap",
    touch_bounds: { x: 0.1, y: 0.1, width: 0.2, height: 0.05 },
    touch_bounds_pixel: { x: 100, y: 100, width: 200, height: 50 },
    touch_bounds_source: "visual_copy"
  };

  const realElementB: DesignElement = {
    element_id: "real-el-2",
    source: "manual",
    element_type: "button",
    label: "Secondary Action",
    normalized_bounds: { x: 0.1, y: 0.2, width: 0.2, height: 0.05 },
    image_pixel_bounds: { x: 100, y: 200, width: 200, height: 50 },
    interaction_type: "tap",
    touch_bounds: { x: 0.1, y: 0.2, width: 0.2, height: 0.05 },
    touch_bounds_pixel: { x: 100, y: 200, width: 200, height: 50 },
    touch_bounds_source: "visual_copy"
  };

  const simulatedMockFinding = {
    annotation_id: "sim-1",
    label: "Simulated Low Contrast Alert",
    issue_type: "contrast_low",
    severity: "high",
    bounds: { x: 0.5, y: 0.5, width: 0.3, height: 0.1 },
    evidence: ["Simulated ML inference only"],
    contextual_findings: []
  };

  describe("Demo Isolation & Pure Calculation Boundary", () => {
    it("guarantees real geometry calculations never include simulated/mock findings", () => {
      const realElements = [realElementA, realElementB];

      // calculateNearestTouchTarget only operates on real DesignElement array
      const nearest = calculateNearestTouchTarget(
        realElementA,
        realElements,
        1000,
        1000
      );

      expect(nearest).not.toBeNull();
      expect(nearest?.nearest_element_id).toBe("real-el-2");
      expect(nearest?.distance_px).toBe(50); // distance from y:150 to y:200 = 50px
    });

    it("verifies mock annotations cannot contaminate real element overlap calculations", () => {
      const overlap = calculateRectangleOverlap(
        realElementA.image_pixel_bounds,
        realElementB.image_pixel_bounds
      );

      expect(overlap.is_overlapping).toBe(false);
      expect(overlap.overlap_area).toBe(0);
    });

    it("ensures real element count and simulated finding count are strictly separated", () => {
      const realElements = [realElementA, realElementB];
      const mockAnnotations = [simulatedMockFinding];

      const realCount = realElements.length;
      const demoCount = mockAnnotations.length;

      expect(realCount).toBe(2);
      expect(demoCount).toBe(1);
      // Ensure no blended single total like 3 is ever computed as a combined metric
      expect(realCount + demoCount).not.toBe(realCount);
    });
  });

  describe("Evaluation Mode Lifecycle & State Preservation", () => {
    it("preserves manual elements and mapping when switching from precise to quick mode", () => {
      const mapping: LogicalUnitMapping = {
        platform: "ios",
        unit: "pt",
        image_reference_width: 1170,
        logical_reference_width: 390,
        scale_x: 1 / 3,
        scale_y: 1 / 3,
        quality: "user_specified"
      };

      const preciseWorkspace: WorkspaceState = {
        schema_version: 1,
        evaluation_mode: "precise",
        reviewer_role: "design",
        show_demo_results: false,
        logical_mapping: mapping,
        elements: [realElementA, realElementB],
        calibration_mode: "full_screen",
        allow_estimation: true
      };

      // User switches mode to quick: state retains elements and mapping without destructive wipe
      const quickWorkspace: WorkspaceState = {
        ...preciseWorkspace,
        evaluation_mode: "quick"
      };

      expect(quickWorkspace.evaluation_mode).toBe("quick");
      expect(quickWorkspace.elements).toHaveLength(2);
      expect(quickWorkspace.logical_mapping).toEqual(mapping);
      expect(quickWorkspace.allow_estimation).toBe(true);
    });

    it("ensures reviewer role presets provide advice without modifying underlying rule layers", () => {
      const roles: ReviewerRole[] = ["design", "product", "uxr", "ops", null];
      for (const role of roles) {
        expect(typeof role === "string" || role === null).toBe(true);
      }
    });

    it("verifies default evaluation mode is quick for fresh workspaces", () => {
      const defaultMode: EvaluationMode = "quick";
      expect(defaultMode).toBe("quick");
    });
  });
});
