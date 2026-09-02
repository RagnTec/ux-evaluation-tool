import { describe, it, expect } from "vitest";
import type { DesignElement, LogicalUnitMapping, DerivedEvaluationContext } from "../../src/types/designElement";
import { recomputeElementDerivedState } from "../../src/utils/interactionGeometry";
import { buildElementPresentationModel, deriveScenarioScope } from "../../src/utils/elementPresentation";
import { buildCharacterVisualAngleTrace } from "../../src/utils/ruleTrace";
import { getUnifiedResultExplanation } from "../../src/utils/impactRecommendation";

describe("Automotive NHTSA Character References Gated Strictly by Scenario Domain", () => {
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

  const iosNonAutomotiveContext: DerivedEvaluationContext = {
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
    customViewingDistanceCm: 35,
    scenarioDomain: "mobile",
    scenario: "标准手机应用界面评估",
    contextEnvironment: "室内",
    contextOperationState: "静止"
  };

  const screenshotOnlyContext: DerivedEvaluationContext = {
    imageNaturalWidth: 1080,
    imageNaturalHeight: 1920,
    displaySize: "6.5 inch",
    resolution: "1080x1920",
    viewingDistance: "40cm",
    calibrationMode: "preset",
    croppedScaleMode: "scale_direct",
    logicalMapping: null,
    customViewingDistanceCm: 40,
    scenarioDomain: "unknown",
    scenario: "通用截图测试",
    contextEnvironment: "未指定",
    contextOperationState: "未指定"
  };

  const automotiveIosContext: DerivedEvaluationContext = {
    ...iosNonAutomotiveContext,
    scenarioDomain: "automotive",
    viewingDistance: "70cm",
    customViewingDistanceCm: 70,
    scenario: "车载中控应用驾驶交互",
    contextEnvironment: "车内",
    contextOperationState: "移动中"
  };

  const automotiveUnknownContext: DerivedEvaluationContext = {
    ...screenshotOnlyContext,
    scenarioDomain: "automotive",
    viewingDistance: "70cm",
    customViewingDistanceCm: 70,
    scenario: "车载副驾或中控屏测试",
    contextEnvironment: "车内",
    contextOperationState: "静止"
  };

  // Base text element with valid character measurement
  const textElement: DesignElement = {
    element_id: "text-gating-1",
    source: "manual",
    element_type: "text",
    text_layout: "single_line",
    text_role: "body",
    normalized_bounds: { x: 0.1, y: 0.1, width: 0.8, height: 0.04 },
    image_pixel_bounds: { x: 117, y: 253, width: 936, height: 100 },
    character_height_px: 30, // valid measurement (~1.65 mm)
    character_height_source: "measured_rendered_character",
    calibration_mode: "preset"
  };

  // 1. iOS + non-automotive + valid character angle -> measurement preserved -> no NHTSA comparison -> measurement_only
  it("1. iOS + non-automotive: preserves character visual angle measurement but does not compare against NHTSA", () => {
    const derived = recomputeElementDerivedState(textElement, iosNonAutomotiveContext);
    expect(derived.character_height_px).toBe(30);
    expect(derived.character_height_physical_mm).toBeDefined();
    expect(derived.character_height_visual_angle).toBeDefined();
    // At 35cm, visual angle is computed
    expect(derived.character_height_visual_angle!.arcmin).toBeGreaterThan(10);

    const scenarioScope = deriveScenarioScope(
      iosNonAutomotiveContext.scenario,
      iosNonAutomotiveContext.contextEnvironment,
      iosNonAutomotiveContext.contextOperationState
    );
    expect(scenarioScope.domain).not.toBe("automotive");

    const trace = buildCharacterVisualAngleTrace(derived, scenarioScope);
    expect(trace?.verdict).toBe("measurement_only");
    expect(trace?.verdictLabel).toBe("仅测量");
    expect(trace?.ruleId).toBeUndefined();
    expect(trace?.ruleTitle).toBeUndefined();
    expect(trace?.currentValueDisplay).toContain("′");

    const explanation = getUnifiedResultExplanation({
      element: derived,
      scenarioScope,
      viewingDistance: iosNonAutomotiveContext.viewingDistance
    });
    // No NHTSA findings
    const nhtsaFinding = explanation.actionableFindings.find(
      (f) => f.ruleTitle?.includes("NHTSA") || f.id === "character_visual_angle"
    );
    expect(nhtsaFinding).toBeUndefined();
  });

  // 2. unknown/screenshot-only + non-automotive + hardware + viewing distance -> mm / visual angle preserved -> no NHTSA comparison
  it("2. unknown/screenshot-only + non-automotive: preserves mm and visual angle but does not compare against NHTSA", () => {
    const derived = recomputeElementDerivedState(textElement, screenshotOnlyContext);
    expect(derived.character_height_px).toBe(30);
    expect(derived.character_height_physical_mm).toBeDefined();
    expect(derived.character_height_visual_angle).toBeDefined();

    const scenarioScope = deriveScenarioScope(
      screenshotOnlyContext.scenario,
      screenshotOnlyContext.contextEnvironment,
      screenshotOnlyContext.contextOperationState
    );
    expect(scenarioScope.domain).toBe("unknown");

    const trace = buildCharacterVisualAngleTrace(derived, scenarioScope);
    expect(trace?.verdict).toBe("measurement_only");
    expect(trace?.verdictLabel).toBe("仅测量");

    const presentation = buildElementPresentationModel(derived, screenshotOnlyContext, null, "unknown");
    expect(presentation.characterHeightVisualAngleDisplay).toBeDefined();
    expect(presentation.characterHeightPhysicalDisplay).toBeDefined();
    expect(presentation.unifiedExplanation.actionableFindings.some((f) => f.ruleTitle?.includes("NHTSA"))).toBe(false);
  });

  // 3. automotive + iOS + valid matching measurement -> NHTSA reference may apply
  it("3. automotive + iOS: applies NHTSA reference and formal comparison based on scenario domain", () => {
    const derived = recomputeElementDerivedState(textElement, automotiveIosContext);
    // At 70cm, 30px (~1.65 mm) yields ~8.1 arcmin (< 12' and < 16' threshold)
    const scenarioScope = deriveScenarioScope(
      automotiveIosContext.scenario,
      automotiveIosContext.contextEnvironment,
      automotiveIosContext.contextOperationState,
      automotiveIosContext.scenarioDomain
    );
    expect(scenarioScope.domain).toBe("automotive");

    const trace = buildCharacterVisualAngleTrace(derived, scenarioScope);
    expect(trace?.verdict).toBe("attention");
    expect(trace?.ruleId).toBe("REF-NHTSA-TEXT-CRITICAL");
    expect(trace?.ruleTitle).toContain("NHTSA");

    const explanation = getUnifiedResultExplanation({
      element: derived,
      scenarioScope,
      viewingDistance: automotiveIosContext.viewingDistance
    });
    const finding = explanation.actionableFindings.find((f) => f.id === "character_visual_angle");
    expect(finding).toBeDefined();
    expect(finding?.ruleTitle).toContain("NHTSA");
  });

  // 4. automotive + unknown platform + valid matching measurement -> NHTSA reference may apply
  it("4. automotive + unknown platform: applies NHTSA reference and does not require iOS/Android platform", () => {
    const derived = recomputeElementDerivedState(textElement, automotiveUnknownContext);
    const scenarioScope = deriveScenarioScope(
      automotiveUnknownContext.scenario,
      automotiveUnknownContext.contextEnvironment,
      automotiveUnknownContext.contextOperationState,
      automotiveUnknownContext.scenarioDomain
    );
    expect(scenarioScope.domain).toBe("automotive");

    const trace = buildCharacterVisualAngleTrace(derived, scenarioScope);
    expect(trace?.verdict).toBe("attention");
    expect(trace?.ruleTitle).toContain("NHTSA");
  });

  // 5. automotive -> non-automotive switch -> existing element keeps character measurement, NHTSA finding/trace disappears immediately
  it("5. automotive -> non-automotive switch: existing element retains character measurements while NHTSA traces disappear", () => {
    // Start with automotive context
    const derivedAuto = recomputeElementDerivedState(textElement, automotiveIosContext);
    const scopeAuto = deriveScenarioScope(
      automotiveIosContext.scenario,
      automotiveIosContext.contextEnvironment,
      automotiveIosContext.contextOperationState,
      automotiveIosContext.scenarioDomain
    );
    const traceAuto = buildCharacterVisualAngleTrace(derivedAuto, scopeAuto);
    expect(traceAuto?.ruleTitle).toContain("NHTSA");

    // Switch to non-automotive context without modifying element character_height_px
    const derivedNonAuto = recomputeElementDerivedState(derivedAuto, iosNonAutomotiveContext);
    expect(derivedNonAuto.character_height_px).toBe(30);
    expect(derivedNonAuto.character_height_physical_mm).toBeDefined();
    expect(derivedNonAuto.character_height_visual_angle).toBeDefined();

    const scopeNonAuto = deriveScenarioScope(
      iosNonAutomotiveContext.scenario,
      iosNonAutomotiveContext.contextEnvironment,
      iosNonAutomotiveContext.contextOperationState,
      iosNonAutomotiveContext.scenarioDomain
    );
    const traceNonAuto = buildCharacterVisualAngleTrace(derivedNonAuto, scopeNonAuto);
    expect(traceNonAuto?.verdict).toBe("measurement_only");
    expect(traceNonAuto?.ruleTitle).toBeUndefined();

    const explanationNonAuto = getUnifiedResultExplanation({
      element: derivedNonAuto,
      scenarioScope: scopeNonAuto,
      viewingDistance: iosNonAutomotiveContext.viewingDistance
    });
    expect(explanationNonAuto.actionableFindings.some((f) => f.ruleTitle?.includes("NHTSA"))).toBe(false);
  });

  // 6. non-automotive -> automotive switch -> existing measurement reused, applicable NHTSA trace appears without remeasurement
  it("6. non-automotive -> automotive switch: reuses existing character measurements and enables NHTSA comparison immediately", () => {
    // Start with non-automotive
    const derivedNonAuto = recomputeElementDerivedState(textElement, iosNonAutomotiveContext);
    const scopeNonAuto = deriveScenarioScope(
      iosNonAutomotiveContext.scenario,
      iosNonAutomotiveContext.contextEnvironment,
      iosNonAutomotiveContext.contextOperationState
    );
    const traceNonAuto = buildCharacterVisualAngleTrace(derivedNonAuto, scopeNonAuto);
    expect(traceNonAuto?.verdict).toBe("measurement_only");

    // Switch context to automotive
    const derivedAuto = recomputeElementDerivedState(derivedNonAuto, automotiveIosContext);
    expect(derivedAuto.character_height_px).toBe(30);

    const scopeAuto = deriveScenarioScope(
      automotiveIosContext.scenario,
      automotiveIosContext.contextEnvironment,
      automotiveIosContext.contextOperationState,
      automotiveIosContext.scenarioDomain
    );
    const traceAuto = buildCharacterVisualAngleTrace(derivedAuto, scopeAuto);
    expect(traceAuto?.verdict).toBe("attention");
    expect(traceAuto?.ruleTitle).toContain("NHTSA");
  });
});
