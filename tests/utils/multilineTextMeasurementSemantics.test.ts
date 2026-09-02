import { describe, it, expect } from "vitest";
import type {
  DesignElement,
  LogicalUnitMapping,
  DerivedEvaluationContext
} from "../../src/types/designElement";
import { recomputeElementDerivedState } from "../../src/utils/interactionGeometry";
import { buildElementPresentationModel } from "../../src/utils/elementPresentation";
import { createLogicalUnitMapping } from "../../src/utils/logicalMapping";
import { buildTextSizeTrace } from "../../src/utils/ruleTrace";

describe("Multiline Text Measurement Semantics & Visual Height Consistency", () => {
  const iosLogicalMapping = createLogicalUnitMapping(
    "ios",
    "pt",
    1170,
    390,
    undefined,
    undefined,
    "exact_profile"
  );

  const fullContext: DerivedEvaluationContext = {
    imageNaturalWidth: 1170,
    imageNaturalHeight: 2532,
    displaySize: "6.1 inch",
    resolution: "1170x2532",
    viewingDistance: "35cm",
    calibrationMode: "preset",
    croppedScaleMode: "scale_direct",
    logicalMapping: iosLogicalMapping,
    scenarioDomain: "mobile"
  };

  const contextWithoutMapping: DerivedEvaluationContext = {
    ...fullContext,
    logicalMapping: null
  };

  // 1. multi-line text + measured single rendered line -> gets px height
  it("1. multi-line text + measured single rendered line: can obtain single line visual px height", () => {
    const el: DesignElement = {
      element_id: "text-multi-single-line",
      source: "manual",
      element_type: "text",
      text_layout: "multi_line",
      text_visual_measurement_target: "single_rendered_line",
      text_role: "body",
      normalized_bounds: { x: 0.1, y: 0.2, width: 0.8, height: 30 / 2532 },
      image_pixel_bounds: { x: 117, y: 506, width: 936, height: 30 },
      calibration_mode: "preset",
      created_at: new Date().toISOString()
    };

    const derived = recomputeElementDerivedState(el, contextWithoutMapping);
    expect(derived.image_pixel_bounds.height).toBe(30);

    const presentation = buildElementPresentationModel(
      derived,
      contextWithoutMapping,
      null,
      2532,
      [derived]
    );
    expect(presentation.textVisualHeightDisplay).toBe("30 px");
    expect(presentation.isSingleLineVisual).toBe(true);
  });

  // 2. 上述场景 + logical mapping -> gets design-space height
  it("2. multi-line text + measured single line + logical mapping: can obtain design-space height", () => {
    const el: DesignElement = {
      element_id: "text-multi-single-line",
      source: "manual",
      element_type: "text",
      text_layout: "multi_line",
      text_visual_measurement_target: "single_rendered_line",
      text_role: "body",
      normalized_bounds: { x: 0.1, y: 0.2, width: 0.8, height: 30 / 2532 },
      image_pixel_bounds: { x: 117, y: 506, width: 936, height: 30 },
      calibration_mode: "preset",
      created_at: new Date().toISOString()
    };

    const derived = recomputeElementDerivedState(el, fullContext);
    const presentation = buildElementPresentationModel(
      derived,
      fullContext,
      fullContext.logicalMapping,
      2532,
      [derived]
    );
    // 30 px * (390 / 1170) = 10 pt
    expect(presentation.textVisualHeightDisplay).toBe("30 px (10 pt)");
    expect(presentation.textDesignHeightDisplay).toBe("约 10 pt");
  });

  // 3. + physical mapping -> gets physical height in mm
  it("3. multi-line text + measured single line + physical mapping: can obtain physical height in mm", () => {
    const el: DesignElement = {
      element_id: "text-multi-single-line",
      source: "manual",
      element_type: "text",
      text_layout: "multi_line",
      text_visual_measurement_target: "single_rendered_line",
      text_role: "body",
      normalized_bounds: { x: 0.1, y: 0.2, width: 0.8, height: 30 / 2532 },
      image_pixel_bounds: { x: 117, y: 506, width: 936, height: 30 },
      calibration_mode: "preset",
      created_at: new Date().toISOString()
    };

    const derived = recomputeElementDerivedState(el, fullContext);
    expect(derived.physical_geometry?.height_mm).toBeGreaterThan(0);

    const presentation = buildElementPresentationModel(
      derived,
      fullContext,
      fullContext.logicalMapping,
      2532,
      [derived]
    );
    expect(presentation.textPhysicalHeightDisplay).toMatch(/约 \d+(\.\d+)? mm/);
  });

  // 4. + viewing distance -> gets vertical visual angle
  it("4. multi-line text + measured single line + viewing distance: can obtain vertical visual angle", () => {
    const el: DesignElement = {
      element_id: "text-multi-single-line",
      source: "manual",
      element_type: "text",
      text_layout: "multi_line",
      text_visual_measurement_target: "single_rendered_line",
      text_role: "body",
      normalized_bounds: { x: 0.1, y: 0.2, width: 0.8, height: 30 / 2532 },
      image_pixel_bounds: { x: 117, y: 506, width: 936, height: 30 },
      calibration_mode: "preset",
      created_at: new Date().toISOString()
    };

    const derived = recomputeElementDerivedState(el, fullContext);
    const presentation = buildElementPresentationModel(
      derived,
      fullContext,
      fullContext.logicalMapping,
      2532,
      [derived]
    );
    expect(presentation.textVisualAngleDisplay).toMatch(/\d+(\.\d+)?′/);
    expect(presentation.visualAngleVerticalArcmin).toBeGreaterThan(0);
  });

  // 5. 相同 measurement bounds: single_line vs multi_line -> shared physical/visual measurement 结果一致
  it("5. same measurement bounds: single_line vs multi_line with single_rendered_line yields identical physical/visual results", () => {
    const singleLineEl: DesignElement = {
      element_id: "text-single",
      source: "manual",
      element_type: "text",
      text_layout: "single_line",
      text_visual_measurement_target: "single_rendered_line",
      text_role: "body",
      normalized_bounds: { x: 0.1, y: 0.2, width: 0.8, height: 30 / 2532 },
      image_pixel_bounds: { x: 117, y: 506, width: 936, height: 30 },
      calibration_mode: "preset",
      created_at: new Date().toISOString()
    };

    const multiLineEl: DesignElement = {
      ...singleLineEl,
      element_id: "text-multi",
      text_layout: "multi_line",
      text_visual_measurement_target: "single_rendered_line"
    };

    const derivedSingle = recomputeElementDerivedState(singleLineEl, fullContext);
    const derivedMulti = recomputeElementDerivedState(multiLineEl, fullContext);

    expect(derivedSingle.physical_geometry?.height_mm).toBe(derivedMulti.physical_geometry?.height_mm);

    const presSingle = buildElementPresentationModel(
      derivedSingle,
      fullContext,
      fullContext.logicalMapping,
      2532,
      [derivedSingle]
    );
    const presMulti = buildElementPresentationModel(
      derivedMulti,
      fullContext,
      fullContext.logicalMapping,
      2532,
      [derivedMulti]
    );

    expect(presSingle.textVisualHeightDisplay).toBe(presMulti.textVisualHeightDisplay);
    expect(presSingle.textDesignHeightDisplay).toBe(presMulti.textDesignHeightDisplay);
    expect(presSingle.textPhysicalHeightDisplay).toBe(presMulti.textPhysicalHeightDisplay);
    expect(presSingle.textVisualAngleDisplay).toBe(presMulti.textVisualAngleDisplay);
  });

  // 6. multi-line whole container -> NOT treated as single-line height / representative character height
  it("6. multi-line whole container bounds is NOT treated as single-line height or representative character height", () => {
    const wholeContainerEl: DesignElement = {
      element_id: "text-whole-paragraph",
      source: "manual",
      element_type: "text",
      text_layout: "multi_line",
      text_visual_measurement_target: "whole_text_bounds",
      text_role: "body",
      normalized_bounds: { x: 0.1, y: 0.2, width: 0.8, height: 180 / 2532 },
      image_pixel_bounds: { x: 117, y: 506, width: 936, height: 180 },
      calibration_mode: "preset",
      created_at: new Date().toISOString()
    };

    const derived = recomputeElementDerivedState(wholeContainerEl, fullContext);
    expect(derived.character_height_px).toBeUndefined();
    expect(derived.character_height_physical_mm).toBeUndefined();
    expect(derived.character_height_visual_angle).toBeUndefined();

    const presentation = buildElementPresentationModel(
      derived,
      fullContext,
      fullContext.logicalMapping,
      2532,
      [derived]
    );
    expect(presentation.isSingleLineVisual).toBe(false);
    expect(presentation.textSizeStatus).toBe("needs_confirmation");
    expect(presentation.characterHeightDisplay).toBeUndefined();
  });

  // 7. screenshot-derived design-space height -> NOT written into confirmed/source font size
  it("7. screenshot-derived visual height is not written into confirmed source font size", () => {
    const el: DesignElement = {
      element_id: "text-multi-single-line",
      source: "manual",
      element_type: "text",
      text_layout: "multi_line",
      text_visual_measurement_target: "single_rendered_line",
      text_role: "body",
      normalized_bounds: { x: 0.1, y: 0.2, width: 0.8, height: 30 / 2532 },
      image_pixel_bounds: { x: 117, y: 506, width: 936, height: 30 },
      text_size_source: "estimated_from_visual_bounds",
      calibration_mode: "preset",
      created_at: new Date().toISOString()
    };

    const derived = recomputeElementDerivedState(el, fullContext);
    expect(derived.text_size_source).not.toBe("user_confirmed");
    expect(derived.text_size_value).toBeUndefined();

    const presentation = buildElementPresentationModel(
      derived,
      fullContext,
      fullContext.logicalMapping,
      2532,
      [derived]
    );
    expect(presentation.textSizeStatus).not.toBe("user_confirmed");
  });

  // 8. representative character measurement on multi-line text -> preserves px/mm/angle capabilities
  it("8. representative character measurement on multi-line text preserves character px/mm/angle independently", () => {
    const el: DesignElement = {
      element_id: "text-multi-with-char",
      source: "manual",
      element_type: "text",
      text_layout: "multi_line",
      text_visual_measurement_target: "whole_text_bounds",
      text_role: "body",
      character_height_px: 24,
      character_height_source: "measured_rendered_character",
      normalized_bounds: { x: 0.1, y: 0.2, width: 0.8, height: 180 / 2532 },
      image_pixel_bounds: { x: 117, y: 506, width: 936, height: 180 },
      calibration_mode: "preset",
      created_at: new Date().toISOString()
    };

    const derived = recomputeElementDerivedState(el, fullContext);
    expect(derived.character_height_px).toBe(24);
    expect(derived.character_height_physical_mm).toBeGreaterThan(0);
    expect(derived.character_height_visual_angle?.arcmin).toBeGreaterThan(0);

    const presentation = buildElementPresentationModel(
      derived,
      fullContext,
      fullContext.logicalMapping,
      2532,
      [derived]
    );
    expect(presentation.characterHeightDisplay).toBe("24 px");
    expect(presentation.characterHeightPhysicalDisplay).toMatch(/约 \d+(\.\d+)? mm/);
    expect(presentation.characterHeightVisualAngleDisplay).toMatch(/\d+(\.\d+)?′/);
  });

  // 9. single_line -> multi_line switch -> existing representative character/source measurements not cleared
  it("9. switching single_line to multi_line does not clear existing representative character or source measurements", () => {
    const singleEl: DesignElement = {
      element_id: "text-elem-switch",
      source: "manual",
      element_type: "text",
      text_layout: "single_line",
      text_role: "body",
      character_height_px: 24,
      character_height_source: "measured_rendered_character",
      normalized_bounds: { x: 0.1, y: 0.2, width: 0.8, height: 50 / 2532 },
      image_pixel_bounds: { x: 117, y: 506, width: 936, height: 50 },
      calibration_mode: "preset",
      created_at: new Date().toISOString()
    };

    const derivedSingle = recomputeElementDerivedState(singleEl, fullContext);
    expect(derivedSingle.character_height_px).toBe(24);
    expect(derivedSingle.character_height_physical_mm).toBeDefined();
    expect(derivedSingle.character_height_visual_angle).toBeDefined();

    // Switch to multi_line
    const switchedToMulti: DesignElement = {
      ...derivedSingle,
      text_layout: "multi_line"
    };

    const derivedMulti = recomputeElementDerivedState(switchedToMulti, fullContext);
    expect(derivedMulti.character_height_px).toBe(24);
    expect(derivedMulti.character_height_source).toBe("measured_rendered_character");
    expect(derivedMulti.character_height_physical_mm).toBe(derivedSingle.character_height_physical_mm);
    expect(derivedMulti.character_height_visual_angle?.arcmin).toBe(derivedSingle.character_height_visual_angle?.arcmin);
    expect(derivedMulti.image_pixel_bounds.height).toBe(50);
  });

  it("10. when source font size is unconfirmed, screenshot estimate evaluates as fallback with estimated basis and do NOT misjudge as confirmed PASS", () => {
    const el: DesignElement = {
      element_id: "text-multi-single-unconfirmed",
      source: "manual",
      element_type: "text",
      text_layout: "multi_line",
      text_visual_measurement_target: "single_rendered_line",
      text_role: "body",
      normalized_bounds: { x: 0.1, y: 0.2, width: 0.8, height: 30 / 2532 },
      image_pixel_bounds: { x: 117, y: 506, width: 936, height: 30 },
      calibration_mode: "preset",
      created_at: new Date().toISOString()
    };

    const derived = recomputeElementDerivedState(el, fullContext);
    const trace = buildTextSizeTrace(derived.text_size_evaluation, fullContext.logicalMapping, "ios");

    // Fallback rule evaluates against estimated 10 pt (below minimum 11 pt)
    expect(trace).not.toBeNull();
    expect(trace?.verdict).toBe("estimated_attention");
    expect(trace?.resultBasis).toBe("inferred");
    expect(trace?.comparison.explanation).toContain("基于截图估算");
  });
});
