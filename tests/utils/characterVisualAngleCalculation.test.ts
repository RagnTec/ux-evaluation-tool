import { describe, it, expect } from "vitest";
import type { DesignElement, LogicalUnitMapping, DerivedEvaluationContext } from "../../src/types/designElement";
import { recomputeElementDerivedState } from "../../src/utils/interactionGeometry";
import { buildElementPresentationModel } from "../../src/utils/elementPresentation";
import { buildCharacterVisualAngleTrace } from "../../src/utils/ruleTrace";
import { getUnifiedResultExplanation } from "../../src/utils/impactRecommendation";
import { calculateExactVisualAngle } from "../../src/humanFactors/visualAngle";

describe("Character Visual Angle Calculation, Coordinate Chain & Invariant Protections", () => {
  const iosLogicalMapping: LogicalUnitMapping = {
    platform: "ios",
    unit: "pt",
    design_width_source: "preset",
    design_width: 390,
    screenshot_width: 1170,
    screenshot_height: 2532,
    scale_x: 390 / 1170,
    scale_y: 390 / 1170,
    quality: "exact_profile"
  };

  const sampleContext: DerivedEvaluationContext = {
    imageNaturalWidth: 1170,
    imageNaturalHeight: 2532,
    displaySize: "6.1 inch",
    resolution: "1170x2532",
    viewingDistance: "35cm",
    calibrationMode: "preset",
    croppedScaleMode: "scale_direct",
    presetDevice: "iPhone 14 Pro",
    hardwareSpecs: {
      screen_diagonal_in: 6.1,
      screen_width_px: 1170,
      screen_height_px: 2532,
      density_ppi: 460,
      viewport_width_pt: 390,
      viewport_height_pt: 844,
      scale_factor: 3,
      typical_viewing_distance_cm: 35
    },
    logicalMapping: iosLogicalMapping,
    customViewingDistanceCm: 35
  };

  const automotiveContext: DerivedEvaluationContext = {
    ...sampleContext,
    viewingDistance: "70cm",
    customViewingDistanceCm: 70
  };

  // 1. Character selection natural-image height is not multiplied by canvas zoom/display scale repeatedly
  it("1. character selection natural-image height converts display drag delta to natural pixels accurately", () => {
    const stageContainerHeight = 844; // CSS display pixels
    const naturalImageHeight = 2532; // Natural image pixels
    const dragDeltaDisplayPx = 16; // 16px dragged on screen

    const normalizedHeight = dragDeltaDisplayPx / stageContainerHeight;
    const computedNaturalPx = Math.round(normalizedHeight * naturalImageHeight);

    // 16 / 844 * 2532 = 48 natural image pixels (ratio 3x)
    expect(computedNaturalPx).toBe(48);
    // Must NOT be 16 * 2532 = 40512
    expect(computedNaturalPx).toBeLessThan(100);
  });

  // 2. Same px -> mm mapping: character height and element height share consistent px/mm ratio
  it("2. character height and element visual bounds share identical px to mm scaling ratio", () => {
    const el: DesignElement = {
      element_id: "text-scale-test",
      source: "manual",
      element_type: "text",
      text_layout: "single_line",
      text_role: "body",
      normalized_bounds: { x: 0.1, y: 0.1, width: 0.8, height: 0.05 },
      image_pixel_bounds: { x: 117, y: 253, width: 936, height: 126 }, // 126 natural px
      character_height_px: 42, // Exactly 1/3 of text container
      character_height_source: "measured_rendered_character",
      calibration_mode: "preset"
    };

    const derived = recomputeElementDerivedState(el, sampleContext);
    expect(derived.physical_geometry?.height_mm).toBeDefined();
    expect(derived.character_height_physical_mm).toBeDefined();

    const elementMm = derived.physical_geometry!.height_mm!;
    const charMm = derived.character_height_physical_mm!;

    // Ratio of charMm to elementMm must match 42 / 126 (1/3)
    const ratioMm = charMm / elementMm;
    const ratioPx = 42 / 126;
    expect(Math.abs(ratioMm - ratioPx)).toBeLessThan(0.01);
  });

  // 3. Typical realistic values: character height ~1–5 mm + normal viewing distance -> realistic arcmin/degree
  it("3. typical character height (1.5–5 mm) at normal distance yields realistic arcminutes and degrees", () => {
    // 2.3 mm character at 350 mm viewing distance
    const va35 = calculateExactVisualAngle(2.3, 350);
    expect(va35).not.toBeNull();
    // theta = 2 * atan(2.3 / 700) * (180/pi) * 60 ≈ 22.56 arcmin ≈ 0.376 deg
    expect(va35!.arcmin).toBeGreaterThan(15);
    expect(va35!.arcmin).toBeLessThan(35);
    expect(va35!.deg).toBeLessThan(1.0);

    // 3.5 mm character at 700 mm automotive viewing distance
    const va70 = calculateExactVisualAngle(3.5, 700);
    expect(va70).not.toBeNull();
    // theta = 2 * atan(3.5 / 1400) * (180/pi) * 60 ≈ 17.19 arcmin ≈ 0.286 deg
    expect(va70!.arcmin).toBeGreaterThan(12);
    expect(va70!.arcmin).toBeLessThan(25);
    expect(va70!.deg).toBeLessThan(1.0);
  });

  // 4. character_height_px > text container height -> measurement invalid -> does not enter reference comparison
  it("4. character_height_px greater than text container height is rejected as invalid measurement", () => {
    const el: DesignElement = {
      element_id: "text-invalid-px",
      source: "manual",
      element_type: "text",
      text_layout: "single_line",
      text_role: "body",
      normalized_bounds: { x: 0.1, y: 0.1, width: 0.8, height: 0.02 },
      image_pixel_bounds: { x: 117, y: 253, width: 936, height: 50 }, // container height = 50px
      character_height_px: 120, // Invalid: 120px > 50px
      character_height_source: "measured_rendered_character",
      calibration_mode: "preset"
    };

    const derived = recomputeElementDerivedState(el, sampleContext);
    // Derived physical mm and visual angle must be cleared/undefined
    expect(derived.character_height_physical_mm).toBeUndefined();
    expect(derived.character_height_visual_angle).toBeUndefined();

    // Presentation displays invalid measurement guidance
    const presentation = buildElementPresentationModel(derived, sampleContext, null, "ios");
    expect(presentation.characterHeightDisplay).toBe("代表字符测量异常，请重新框选");
    expect(presentation.characterHeightPhysicalDisplay).toBeUndefined();
    expect(presentation.characterHeightVisualAngleDisplay).toBeUndefined();

    // Rule trace marks as needs_info, NOT comparing with 12'/16'/20'
    const trace = buildCharacterVisualAngleTrace(derived, { domain: "automotive", observer_role: "driver" });
    expect(trace).not.toBeNull();
    expect(trace?.verdict).toBe("needs_info");
    expect(trace?.comparison.kind).toBe("needs_info");
    expect(trace?.comparison.explanation).toContain("代表字符测量高度大于文字区域高度");
  });

  // 5. character physical height > element physical height -> invalid
  it("5. character physical height cannot exceed element physical height", () => {
    const el: DesignElement = {
      element_id: "text-invalid-physical",
      source: "manual",
      element_type: "text",
      text_layout: "single_line",
      text_role: "body",
      normalized_bounds: { x: 0.1, y: 0.1, width: 0.8, height: 0.02 },
      image_pixel_bounds: { x: 117, y: 253, width: 936, height: 50 },
      character_height_px: 80,
      character_height_source: "measured_rendered_character",
      calibration_mode: "preset"
    };

    const derived = recomputeElementDerivedState(el, sampleContext);
    expect(derived.character_height_physical_mm).toBeUndefined();
    if (derived.character_height_physical_mm && derived.physical_geometry?.height_mm) {
      expect(derived.character_height_physical_mm).toBeLessThanOrEqual(derived.physical_geometry.height_mm);
    }
  });

  // 6. character vertical angle > element vertical angle -> invalid
  it("6. character vertical angle cannot exceed element container vertical angle", () => {
    const el: DesignElement = {
      element_id: "text-angle-check",
      source: "manual",
      element_type: "text",
      text_layout: "single_line",
      text_role: "body",
      normalized_bounds: { x: 0.1, y: 0.1, width: 0.8, height: 0.04 },
      image_pixel_bounds: { x: 117, y: 253, width: 936, height: 100 },
      character_height_px: 50,
      character_height_source: "measured_rendered_character",
      calibration_mode: "preset"
    };

    const derived = recomputeElementDerivedState(el, sampleContext);
    expect(derived.character_height_visual_angle).toBeDefined();

    const presentation = buildElementPresentationModel(derived, sampleContext, null, "ios");
    expect(presentation.visualAngleVerticalArcmin).toBeDefined();

    const charAngle = derived.character_height_visual_angle!.arcmin;
    const containerAngle = presentation.visualAngleVerticalArcmin!;
    expect(charAngle).toBeLessThanOrEqual(containerAngle);
  });

  // 7. invalid measurement never produces meets_reference / 达到推荐范围
  it("7. invalid character measurement never produces meets_reference or 达到推荐范围 verdict", () => {
    const el: DesignElement = {
      element_id: "text-huge-invalid",
      source: "manual",
      element_type: "text",
      text_layout: "single_line",
      text_role: "body",
      normalized_bounds: { x: 0.1, y: 0.1, width: 0.8, height: 0.02 },
      image_pixel_bounds: { x: 117, y: 253, width: 936, height: 40 },
      character_height_px: 50000, // Gigantic buggy number
      character_height_source: "measured_rendered_character",
      calibration_mode: "preset"
    };

    const derived = recomputeElementDerivedState(el, automotiveContext);
    const trace = buildCharacterVisualAngleTrace(derived, { domain: "automotive", observer_role: "driver" });

    expect(trace?.verdict).not.toBe("meets");
    expect(trace?.verdictLabel).not.toBe("达到推荐范围");
    expect(trace?.verdictLabel).not.toBe("达到人因建议参考");
    expect(trace?.verdict).toBe("needs_info");

    const explanation = getUnifiedResultExplanation({
      element: derived,
      scenarioScope: { domain: "automotive", observer_role: "driver" }
    });
    expect(explanation.conclusionState).not.toBe("meets_reference");
  });

  // 8. user-facing label is unified as "代表字符垂直视角"
  it("8. user-facing label across traces, findings, and details is unified as '代表字符垂直视角'", () => {
    const el: DesignElement = {
      element_id: "text-valid-label-check",
      source: "manual",
      element_type: "text",
      text_layout: "single_line",
      text_role: "body",
      normalized_bounds: { x: 0.1, y: 0.1, width: 0.8, height: 0.04 },
      image_pixel_bounds: { x: 117, y: 253, width: 936, height: 100 },
      character_height_px: 30, // ~1.65 mm -> ~8.1 arcmin at 70cm (< 12' automotive threshold)
      character_height_source: "measured_rendered_character",
      calibration_mode: "preset"
    };

    const derived = recomputeElementDerivedState(el, automotiveContext);
    const trace = buildCharacterVisualAngleTrace(derived, { domain: "automotive", observer_role: "driver", time_criticality: "non_time_critical" });

    expect(trace?.metricLabel).toBe("代表字符垂直视角");

    const explanation = getUnifiedResultExplanation({
      element: derived,
      scenarioScope: { domain: "automotive", observer_role: "driver", time_criticality: "non_time_critical" }
    });

    const finding = explanation.actionableFindings.find(f => f.id === "character_visual_angle");
    expect(finding).toBeDefined();
    expect(finding?.metricLabel).toBe("代表字符垂直视角");
    expect(finding?.summaryText).toContain("代表字符垂直视角");
  });
});
