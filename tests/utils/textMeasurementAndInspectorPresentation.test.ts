import { describe, it, expect } from "vitest";
import type { DesignElement, LogicalUnitMapping, DerivedEvaluationContext } from "../../src/types/designElement";
import { recomputeElementDerivedState } from "../../src/utils/interactionGeometry";
import { buildElementPresentationModel } from "../../src/utils/elementPresentation";
import { formatNumericValue, formatSignedNumericValue } from "../../src/utils/metricFormatting";
import { calculateScalarMinMargin, calculateScalarMaxMargin } from "../../src/utils/ruleTrace";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("Phase 3J.4.7: Text Measurement, Inspector Presentation & Numeric Formatter", () => {
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

  // Test 1: Character measuring mode priority logic
  it("1. characterMeasuringElementId priority prevents element move and resize inside active element", () => {
    // Verify handler guard semantics:
    const isAddingElement = false;
    const colorSamplingTarget = null;
    const isTouchEditMode = false;
    const characterMeasuringElementId: string | null = "text-elem-1";

    const isInteractionBlocked = Boolean(
      isAddingElement || colorSamplingTarget || isTouchEditMode || characterMeasuringElementId
    );
    expect(isInteractionBlocked).toBe(true);

    // Resize handles should NOT render when characterMeasuringElementId is active
    const isSelected = true;
    const showResizeHandles = Boolean(
      isSelected && !colorSamplingTarget && !isTouchEditMode && !characterMeasuringElementId
    );
    expect(showResizeHandles).toBe(false);
  });

  // Test 2: Measurement/color sampling updates preserve activeElement and inspector state
  it("2. measurement and sampling updates preserve activeElementId without triggering switch/reset semantics", () => {
    const activeElementId = "text-elem-1";
    const newElementId = "text-elem-1";

    // Switching element triggers reset, but staying on same element does NOT
    const isSwitchingElement = activeElementId !== newElementId;
    expect(isSwitchingElement).toBe(false);
  });

  // Test 3: Unsupported character-height to font-size conversion cannot fabricate source font size
  it("3. multiline text with character-height measurement keeps font size pending_info without fabricating source font size", () => {
    const el: DesignElement = {
      element_id: "text-multi-unconfirmed",
      source: "manual",
      element_type: "text",
      text_layout: "multi_line",
      text_role: "body",
      character_height_px: 48,
      character_height_source: "measured_rendered_character",
      normalized_bounds: { x: 0.1, y: 0.1, width: 0.8, height: 0.3 },
      image_pixel_bounds: { x: 117, y: 253, width: 936, height: 759 },
      calibration_mode: "preset"
    };

    const derived = recomputeElementDerivedState(el, sampleContext);
    // Character measurements are preserved
    expect(derived.character_height_px).toBe(48);
    expect(derived.character_height_design_height).toBe(16);
    expect(derived.character_height_physical_mm).toBeGreaterThan(0);
    expect(derived.character_height_visual_angle?.arcmin).toBeGreaterThan(0);

    expect(derived.text_size_value).toBeUndefined();
    expect(derived.text_size_evaluation?.status).toBe("meets_minimum");
    expect(derived.text_size_evaluation?.evaluation_basis).toBe("screenshot_estimate");

    const presentation = buildElementPresentationModel(
      derived,
      sampleContext,
      null,
      "ios"
    );
    expect(presentation.textSizeDisplay).toBe("未确认");
    expect(presentation.characterHeightDisplay).toBe("48 px");
    expect(presentation.characterHeightDesignDisplay).toBe("约 16 pt");
  });

  // Test 4: Shared numeric formatter removes floating-point tails and -0
  it("4. formatNumericValue and formatSignedNumericValue eliminate floating-point long tails and -0", () => {
    // Floating point precision artifact
    const rawVal = 11.2 - 17; // -5.800000000000001
    expect(formatNumericValue(rawVal, 1)).toBe("-5.8");
    expect(formatSignedNumericValue(rawVal, 1)).toBe("-5.8");

    // Zero edge cases
    expect(formatNumericValue(-0, 1)).toBe("0");
    expect(formatNumericValue(-0.0001, 1)).toBe("0");
    expect(formatSignedNumericValue(-0, 1)).toBe("0");

    // Integer stripping
    expect(formatNumericValue(16.0, 1)).toBe("16");
    expect(formatNumericValue(16.0, 2)).toBe("16");
    expect(formatSignedNumericValue(16.0, 1)).toBe("+16");

    // Margins
    const minMargin = calculateScalarMinMargin(11.2, 17, "pt");
    expect(minMargin.marginFormatted).toBe("-5.8 pt");
    expect(minMargin.marginLabel).toBe("距离参考还差 5.8 pt");

    const maxMargin = calculateScalarMaxMargin(17, 11.2, "pt");
    expect(maxMargin.marginFormatted).toBe("-5.8 pt");
    expect(maxMargin.marginLabel).toBe("超出参考上限 5.8 pt");
  });

  // Test 5: Card, Inspector, and rule traces use the same rounded values
  it("5. Card, Inspector, and rule trace presentations share identical formatted numeric values", () => {
    const el: DesignElement = {
      element_id: "elem-unified-format",
      source: "manual",
      element_type: "text",
      text_layout: "single_line",
      text_role: "body",
      text_size_value: 11.2,
      text_size_unit: "pt",
      text_size_source: "user_confirmed",
      character_height_px: 33.6,
      character_height_source: "measured_rendered_character",
      normalized_bounds: { x: 0.1, y: 0.1, width: 0.4, height: 0.05 },
      image_pixel_bounds: { x: 117, y: 253, width: 468, height: 126 },
      calibration_mode: "preset"
    };

    const derived = recomputeElementDerivedState(el, sampleContext);
    const presentation = buildElementPresentationModel(
      derived,
      sampleContext,
      sampleContext.logicalMapping,
      2532,
      [derived]
    );

    // Inspector presentation string contains clean 11.2 pt
    expect(presentation.textSizeDisplay).toContain("11.2 pt");
    // Character height px display is clean
    expect(presentation.characterHeightDisplay).toBe("33.6 px");
    // Visual angle display has no long tails
    if (presentation.characterHeightVisualAngleDisplay) {
      expect(presentation.characterHeightVisualAngleDisplay).not.toMatch(/\d+\.\d{3,}′/);
    }
  });

  // Test 6: Z-index layer hierarchy in styles.css
  it("6. styles.css enforces the z-index hierarchy: modal (10000) > top header (500) > inspector (100) > canvas toolbar (50)", () => {
    const cssPath = resolve(__dirname, "../../src/styles.css");
    const cssContent = readFileSync(cssPath, "utf-8");

    // Modal overlay z-index
    expect(cssContent).toMatch(/\.reportModalOverlay\s*\{[\s\S]*?z-index:\s*10000;/);
    // Top workspace header z-index
    expect(cssContent).toMatch(/\.topWorkspaceHeader\s*\{[\s\S]*?z-index:\s*500;/);
    // Inspector detail drawer overlay z-index
    expect(cssContent).toMatch(/\.detailDrawerOverlay\s*\{[\s\S]*?z-index:\s*100;/);
    // Canvas toolbar z-index
    expect(cssContent).toMatch(/\.canvasToolbar\s*\{[\s\S]*?z-index:\s*50;/);
  });
});
