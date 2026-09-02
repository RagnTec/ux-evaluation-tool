import { describe, it, expect } from "vitest";
import {
  createManualDesignElement,
  recomputeElementDerivedState,
  type DerivedEvaluationContext
} from "../../src/utils/interactionGeometry";
import type { DesignElement, LogicalUnitMapping } from "../../src/types/designElement";

describe("Phase 3I: Derived Evaluation Recompute Workflow", () => {
  const mismatchedContext: DerivedEvaluationContext = {
    imageNaturalWidth: 1080,
    imageNaturalHeight: 1920, // 16:9 ratio
    calibrationMode: "full_screen",
    allowEstimation: false,
    displaySize: "6.1\"",
    resolution: "1170 x 2532", // ~19.5:9 ratio (mismatch)
    logicalMapping: null
  };

  it("P0-CAL-02: element created on mismatched aspect ratio is relative_only initially", () => {
    const el = createManualDesignElement(
      { x: 0.1, y: 0.1, width: 0.2, height: 0.2 },
      1080,
      1920,
      1,
      mismatchedContext.calibrationMode,
      mismatchedContext.allowEstimation,
      mismatchedContext.displaySize,
      mismatchedContext.resolution
    );

    expect(el.physical_geometry?.calibration_quality).toBe("relative_only");
    expect(el.physical_geometry?.is_calibrated).toBe(false);
    expect(el.physical_geometry?.width_mm).toBeUndefined();
    expect(el.physical_geometry?.height_mm).toBeUndefined();
  });

  it("P0-CAL-02: enabling allowEstimation immediately recomputes physical dimensions on existing elements", () => {
    const el = createManualDesignElement(
      { x: 0.1, y: 0.1, width: 0.2, height: 0.2 },
      1080,
      1920,
      1,
      mismatchedContext.calibrationMode,
      mismatchedContext.allowEstimation,
      mismatchedContext.displaySize,
      mismatchedContext.resolution
    );

    // User enables '允许启用等比贴合 (Letterbox / Contain) 粗略估算'
    const updatedContext: DerivedEvaluationContext = {
      ...mismatchedContext,
      allowEstimation: true
    };

    const recomputed = recomputeElementDerivedState(el, updatedContext);

    expect(recomputed.physical_geometry?.calibration_quality).toBe("estimated");
    expect(recomputed.physical_geometry?.is_calibrated).toBe(true);
    expect(recomputed.physical_geometry?.width_mm).toBeGreaterThan(0);
    expect(recomputed.physical_geometry?.height_mm).toBeGreaterThan(0);
    expect(recomputed.physical_geometry?.calibration_message).toContain("等比贴合");
  });

  it("P0-CAL-02: disabling allowEstimation immediately revokes physical dimensions on existing elements", () => {
    const enabledContext: DerivedEvaluationContext = {
      ...mismatchedContext,
      allowEstimation: true
    };

    const el = createManualDesignElement(
      { x: 0.1, y: 0.1, width: 0.2, height: 0.2 },
      1080,
      1920,
      1,
      enabledContext.calibrationMode,
      enabledContext.allowEstimation,
      enabledContext.displaySize,
      enabledContext.resolution
    );

    const recomputedWithEst = recomputeElementDerivedState(el, enabledContext);
    expect(recomputedWithEst.physical_geometry?.calibration_quality).toBe("estimated");

    // User unchecks allow estimation
    const disabledContext: DerivedEvaluationContext = {
      ...mismatchedContext,
      allowEstimation: false
    };

    const recomputedWithoutEst = recomputeElementDerivedState(recomputedWithEst, disabledContext);
    expect(recomputedWithoutEst.physical_geometry?.calibration_quality).toBe("relative_only");
    expect(recomputedWithoutEst.physical_geometry?.is_calibrated).toBe(false);
    expect(recomputedWithoutEst.physical_geometry?.width_mm).toBeUndefined();
    expect(recomputedWithoutEst.physical_geometry?.height_mm).toBeUndefined();
  });

  it("P0-CAL-02: changing screen hardware resolution / display size recalculates physical dimensions", () => {
    const baseContext: DerivedEvaluationContext = {
      imageNaturalWidth: 1170,
      imageNaturalHeight: 2532,
      calibrationMode: "full_screen",
      allowEstimation: false,
      displaySize: "6.1\"",
      resolution: "1170 x 2532"
    };

    const el = createManualDesignElement(
      { x: 0.1, y: 0.1, width: 0.5, height: 0.1 },
      1170,
      2532,
      1,
      baseContext.calibrationMode,
      baseContext.allowEstimation,
      baseContext.displaySize,
      baseContext.resolution
    );

    const recomputed1 = recomputeElementDerivedState(el, baseContext);
    expect(recomputed1.physical_geometry?.calibration_quality).toBe("exact");
    const widthMm1 = recomputed1.physical_geometry?.width_mm;

    // Switch to larger screen size (e.g. 6.7" with same resolution or different resolution)
    const largerContext: DerivedEvaluationContext = {
      ...baseContext,
      displaySize: "6.7\"",
      resolution: "1170 x 2532"
    };

    const recomputed2 = recomputeElementDerivedState(recomputed1, largerContext);
    expect(recomputed2.physical_geometry?.width_mm).toBeGreaterThan(widthMm1!);
  });

  it("P0-CAL-02: adding logical unit mapping recomputes target size and text evaluations", () => {
    const initialContext: DerivedEvaluationContext = {
      imageNaturalWidth: 1170,
      imageNaturalHeight: 2532,
      calibrationMode: "full_screen",
      allowEstimation: false,
      logicalMapping: null
    };

    const buttonEl: DesignElement = {
      ...createManualDesignElement({ x: 0.1, y: 0.1, width: 0.3, height: 0.05 }, 1170, 2532, 1),
      element_type: "button",
      interaction_type: "tap",
      touch_bounds: { x: 0.1, y: 0.1, width: 0.3, height: 0.05 },
      touch_bounds_source: "visual_copy"
    };

    const recomputedNoMap = recomputeElementDerivedState(buttonEl, initialContext);
    expect(recomputedNoMap.target_size_evaluation).toBeUndefined();

    // Configure iOS 3x logical mapping (1170px = 390pt)
    const iosMapping: LogicalUnitMapping = {
      platform: "ios",
      unit: "pt",
      image_reference_width: 1170,
      logical_reference_width: 390,
      scale_x: 390 / 1170,
      scale_y: 390 / 1170,
      quality: "exact_reference"
    };

    const mappedContext: DerivedEvaluationContext = {
      ...initialContext,
      logicalMapping: iosMapping
    };

    const recomputedWithMap = recomputeElementDerivedState(buttonEl, mappedContext);
    expect(recomputedWithMap.target_size_evaluation).toBeDefined();
    expect(recomputedWithMap.target_size_evaluation?.unit).toBe("pt");
    expect(recomputedWithMap.target_size_evaluation?.measured_width).toBeCloseTo(117);
  });

  it("recomputes contrast evaluation when colors or element types change", () => {
    const context: DerivedEvaluationContext = {
      imageNaturalWidth: 1000,
      imageNaturalHeight: 1000,
      calibrationMode: "full_screen",
      allowEstimation: false
    };

    const textEl: DesignElement = {
      ...createManualDesignElement({ x: 0.1, y: 0.1, width: 0.3, height: 0.05 }, 1000, 1000, 1),
      element_type: "text",
      foreground_color: "#000000",
      background_color: "#FFFFFF",
      foreground_color_state: "confirmed",
      background_color_state: "confirmed"
    };

    const recomputed = recomputeElementDerivedState(textEl, context);
    expect(recomputed.contrast_evaluation).toBeDefined();
    expect(recomputed.contrast_evaluation?.passed).toBe(true);
    expect(recomputed.contrast_evaluation?.contrast_ratio).toBe(21);

    // Change background to dark grey so contrast fails
    const lowContrastEl: DesignElement = {
      ...textEl,
      background_color: "#333333"
    };

    const recomputedLow = recomputeElementDerivedState(lowContrastEl, context);
    expect(recomputedLow.contrast_evaluation?.passed).toBe(false);
    expect(recomputedLow.contrast_evaluation?.contrast_ratio).toBeLessThan(4.5);
  });

  it("P0-CAL-02: cropped scale mode recomputes physical dimensions with originalImageReferenceWidth", () => {
    const croppedContextUnknown: DerivedEvaluationContext = {
      imageNaturalWidth: 600,
      imageNaturalHeight: 800,
      calibrationMode: "cropped",
      croppedScaleMode: "unknown_or_resized",
      allowEstimation: false,
      displaySize: "6.1\"",
      resolution: "1170 x 2532"
    };

    const el = createManualDesignElement(
      { x: 0.1, y: 0.1, width: 0.5, height: 0.2 },
      600,
      800,
      1,
      croppedContextUnknown.calibrationMode,
      croppedContextUnknown.allowEstimation,
      croppedContextUnknown.displaySize,
      croppedContextUnknown.resolution
    );

    const recomputedUnknown = recomputeElementDerivedState(el, croppedContextUnknown);
    expect(recomputedUnknown.physical_geometry?.calibration_quality).toBe("relative_only");
    expect(recomputedUnknown.physical_geometry?.width_mm).toBeUndefined();

    // Now switch to preserved_pixel_scale with full device width basis (1170)
    const croppedContextPreserved: DerivedEvaluationContext = {
      ...croppedContextUnknown,
      croppedScaleMode: "preserved_pixel_scale",
      originalImageReferenceWidth: 1170
    };

    const recomputedPreserved = recomputeElementDerivedState(el, croppedContextPreserved);
    expect(recomputedPreserved.physical_geometry?.calibration_quality).toBe("estimated");
    expect(recomputedPreserved.physical_geometry?.width_mm).toBeGreaterThan(0);
    expect(recomputedPreserved.physical_geometry?.height_mm).toBeGreaterThan(0);
  });

  it("P1-INSPECTOR-01: outside-click predicate dismisses on empty canvas and preserves on annotations/modals", () => {
    // Helper simulating the pointerdown dismissal logic in App.tsx
    function shouldDismissInspector(target: {
      closest: (selector: string) => boolean | null;
    }): boolean {
      if (target.closest(".detailDrawer")) return false;
      if (
        target.closest(".parametersModalOverlay") ||
        target.closest(".definitionModalOverlay") ||
        target.closest(".reportModalOverlay")
      ) {
        return false;
      }
      if (
        target.closest(".manualAnnotationBox") ||
        target.closest(".annotationBox") ||
        target.closest(".elementCard") ||
        target.closest(".manualElementListItem")
      ) {
        return false;
      }
      return true;
    }

    // Inside drawer -> do NOT dismiss
    expect(shouldDismissInspector({ closest: (s) => s === ".detailDrawer" })).toBe(false);

    // Inside parameters modal -> do NOT dismiss
    expect(shouldDismissInspector({ closest: (s) => s === ".parametersModalOverlay" })).toBe(false);

    // Clicking another annotation box on canvas -> do NOT dismiss (let click handler select the new element directly)
    expect(shouldDismissInspector({ closest: (s) => s === ".manualAnnotationBox" })).toBe(false);

    // Clicking an element card in the right panel -> do NOT dismiss (switches active element)
    expect(shouldDismissInspector({ closest: (s) => s === ".elementCard" })).toBe(false);

    // Clicking empty canvas area or blank app background -> dismisses inspector
    expect(shouldDismissInspector({ closest: () => null })).toBe(true);
  });
});
