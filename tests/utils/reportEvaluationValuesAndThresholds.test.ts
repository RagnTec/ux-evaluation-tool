import { describe, it, expect } from "vitest";
import {
  DesignElement,
  DerivedEvaluationContext,
  ReportElementItem,
  ReportSummaryData
} from "../../src/types";
import { recomputeElementDerivedState } from "../../src/utils/interactionGeometry";
import { buildElementPresentationModel } from "../../src/utils/elementPresentation";
import { getUnifiedResultExplanation } from "../../src/utils/impactRecommendation";
import {
  evaluateTieredLowerBound,
  evaluateTieredUpperBound,
  evaluateTieredRange,
  buildTextSizeTrace
} from "../../src/utils/ruleTrace";
import { generateSelfContainedHtmlReport } from "../../src/utils/reportGenerator";

describe("Report Evaluation Values & Concrete Threshold Unification (Iteration 003)", () => {
  const iosContext: DerivedEvaluationContext = {
    calibrationMode: "preset",
    imageNaturalDimensions: { width: 1170, height: 2532 },
    mappingPlatform: "ios",
    logicalMapping: {
      platform: "ios",
      scale_factor: 3,
      unit: "pt",
      origin: "preset",
      device_name: "iPhone 13 / 14 (3x)"
    },
    hardwareDisplay: {
      diagonalInches: 6.1,
      resolutionWidth: 1170,
      resolutionHeight: 2532,
      viewingDistanceMm: 400
    },
    scenarioScope: {
      domain: "general_mobile",
      environment: "indoor_handheld",
      operation_state: "stationary",
      time_criticality: "non_time_critical"
    }
  };

  // Test 1: Inspector and HTML Report produce identical font sizes, thresholds, gaps for same element (e.g. #11)
  it("1. Inspector and HTML Report present identical font size, threshold, and gap values for the same element", () => {
    const el: DesignElement = {
      element_id: "elem-11",
      source: "manual",
      element_type: "text",
      text_role: "body",
      text_layout: "multi_line",
      text_size_value: 12.1,
      text_size_unit: "pt",
      text_size_source: "user_confirmed",
      character_height_px: 36.3,
      character_height_source: "measured_rendered_character",
      normalized_bounds: { x: 0.1, y: 0.1, width: 0.4, height: 0.08 },
      image_pixel_bounds: { x: 117, y: 253, width: 468, height: 200 },
      created_at: new Date().toISOString()
    };

    const recomputed = recomputeElementDerivedState(el, iosContext);
    const presentation = buildElementPresentationModel(recomputed, iosContext, null, "ios");
    const explanation = presentation.unifiedExplanation;

    expect(presentation.textSizeDisplay).toBe("12.1 pt (人工确认)");
    expect(presentation.conclusionState).toBe("below_recommended");
    expect(presentation.actionableFindings.length).toBe(1);

    const finding = presentation.actionableFindings[0];
    expect(finding.currentValue).toBe(12.1);
    expect(finding.minimumValue).toBe(11);
    expect(finding.minimumLabel).toBe("≥ 11 pt");
    expect(finding.recommendedValue).toBe(17);
    expect(finding.recommendedLabel).toBe("≥ 17 pt");
    expect(finding.gapToRecommended).toBe(4.9);
    expect(finding.summaryText).toBe("当前字号12.1 pt，已达到基本要求（≥ 11 pt），但仍低于推荐值（≥ 17 pt）4.9 pt。");

    // Build report item from presentation
    const reportItem: ReportElementItem = {
      index: 11,
      elementId: el.element_id,
      label: "Element 11",
      elementType: "text",
      elementTypeLabel: "正文文本",
      interactionType: "none",
      isInteractive: false,
      needsAttention: true,
      highestTier: "L2_PLATFORM_COMPLIANCE",
      highestTierLabel: "平台规范层",
      conclusion: presentation.conclusion,
      conclusionState: presentation.conclusionState,
      conclusionStateLabel: presentation.conclusionStateLabel,
      actionableFindings: presentation.actionableFindings,
      visualDimensionsDisplay: presentation.visualPxDisplay
    };

    const reportData: ReportSummaryData = {
      title: "UX 报告",
      generatedAt: "2026-08-27 12:00:00",
      imageName: "screen.png",
      imageNaturalDimensions: { width: 1170, height: 2532 },
      screenshotScope: "full_screen",
      screenshotScopeLabel: "全屏截图",
      totalElementsCount: 1,
      attentionCount: 1,
      filter: "all",
      filterCount: 1,
      designInfoStatus: "source_available",
      targetPlatform: "ios",
      targetPlatformLabel: "iOS",
      assumptions: [],
      elements: [reportItem]
    };

    const html = generateSelfContainedHtmlReport(reportData);
    expect(html).toContain("当前字号12.1 pt，已达到基本要求（≥ 11 pt），但仍低于推荐值（≥ 17 pt）4.9 pt。");
    expect(explanation.conclusion).toBe(finding.summaryText);
  });

  // Test 2: below_recommended self-contained wording with minimum and recommended thresholds
  it("2. below_recommended provides self-contained phrasing with both >= 11 pt and >= 17 pt thresholds", () => {
    const el: DesignElement = {
      element_id: "elem-below-rec",
      source: "manual",
      element_type: "text",
      text_role: "body",
      text_layout: "single_line",
      text_size_value: 12.1,
      text_size_unit: "pt",
      text_size_source: "user_confirmed",
      normalized_bounds: { x: 0.1, y: 0.1, width: 0.2, height: 0.05 },
      image_pixel_bounds: { x: 100, y: 100, width: 200, height: 36.3 },
      created_at: new Date().toISOString()
    };

    const recomputed = recomputeElementDerivedState(el, iosContext);
    const presentation = buildElementPresentationModel(recomputed, iosContext, null, "ios");
    expect(presentation.actionableFindings[0].summaryText).toBe("当前字号12.1 pt，已达到基本要求（≥ 11 pt），但仍低于推荐值（≥ 17 pt）4.9 pt。");
  });

  // Test 3: below_threshold outputs "低于基本要求（≥ 11 pt）1.4 pt"
  it("3. below_threshold outputs self-contained deficit against basic threshold", () => {
    const el: DesignElement = {
      element_id: "elem-below-thresh",
      source: "manual",
      element_type: "text",
      text_role: "body",
      text_layout: "single_line",
      text_size_value: 9.6,
      text_size_unit: "pt",
      text_size_source: "user_confirmed",
      normalized_bounds: { x: 0.1, y: 0.1, width: 0.2, height: 0.05 },
      image_pixel_bounds: { x: 100, y: 100, width: 200, height: 28.8 },
      created_at: new Date().toISOString()
    };

    const recomputed = recomputeElementDerivedState(el, iosContext);
    const presentation = buildElementPresentationModel(recomputed, iosContext, null, "ios");
    expect(presentation.actionableFindings[0].summaryText).toBe("当前字号9.6 pt，低于基本要求（≥ 11 pt）1.4 pt。");
  });

  // Test 4: meets_reference outputs "已达到推荐值（≥ 17 pt）"
  it("4. meets_reference outputs reaching recommended threshold without negative gaps", () => {
    const el: DesignElement = {
      element_id: "elem-meets-rec",
      source: "manual",
      element_type: "text",
      text_role: "body",
      text_layout: "single_line",
      text_size_value: 18,
      text_size_unit: "pt",
      text_size_source: "user_confirmed",
      normalized_bounds: { x: 0.1, y: 0.1, width: 0.2, height: 0.05 },
      image_pixel_bounds: { x: 100, y: 100, width: 200, height: 54 },
      created_at: new Date().toISOString()
    };

    const recomputed = recomputeElementDerivedState(el, iosContext);
    const presentation = buildElementPresentationModel(recomputed, iosContext, null, "ios");
    expect(presentation.conclusionState).toBe("meets_reference");
    expect(presentation.conclusion).toBe("当前字号18 pt，已达到推荐值（≥ 17 pt）。");
  });

  // Test 5: Confirmed vs Unconfirmed font size
  it("5. confirmed sources evaluate platform rules while unconfirmed font sizes produce needs_info", () => {
    const unconfirmedEl: DesignElement = {
      element_id: "elem-unconf",
      source: "manual",
      element_type: "text",
      text_role: "body",
      text_layout: "multi_line",
      character_height_px: 36.3,
      character_height_source: "measured_rendered_character",
      normalized_bounds: { x: 0.1, y: 0.1, width: 0.4, height: 0.08 },
      image_pixel_bounds: { x: 117, y: 253, width: 468, height: 200 },
      created_at: new Date().toISOString()
    };

    const confirmedEl: DesignElement = {
      element_id: "elem-conf",
      source: "manual",
      element_type: "text",
      text_role: "body",
      text_layout: "single_line",
      text_size_value: 12.1,
      text_size_unit: "pt",
      text_size_source: "user_confirmed",
      normalized_bounds: { x: 0.1, y: 0.1, width: 0.2, height: 0.05 },
      image_pixel_bounds: { x: 100, y: 100, width: 200, height: 36.3 },
      created_at: new Date().toISOString()
    };

    const presUnconf = buildElementPresentationModel(recomputeElementDerivedState(unconfirmedEl, iosContext), iosContext, null, "ios");
    const presConf = buildElementPresentationModel(recomputeElementDerivedState(confirmedEl, iosContext), iosContext, null, "ios");

    expect(presUnconf.textSizeDisplay).toBe("未确认");
    expect(presUnconf.characterHeightDesignDisplay).toBe("约 12.1 pt");
    expect(presUnconf.actionableFindings[0].summaryText).toContain("当前截图估算字号约 12.1 pt");
    expect(presUnconf.actionableFindings[0].severityLabel).toContain("估算");
    expect(presConf.actionableFindings[0].summaryText).toContain("当前字号12.1 pt");
  });

  // Test 6: Multiline text with representative character height presents design space height in key metrics
  it("6. multiline text character height produces design space height across Inspector and HTML report", () => {
    const mlEl: DesignElement = {
      element_id: "ml-elem-char",
      source: "manual",
      element_type: "text",
      text_role: "body",
      text_layout: "multi_line",
      character_height_px: 33, // 33 / 3 = 11 pt
      character_height_source: "measured_rendered_character",
      normalized_bounds: { x: 0.1, y: 0.1, width: 0.5, height: 0.2 },
      image_pixel_bounds: { x: 100, y: 100, width: 500, height: 200 },
      created_at: new Date().toISOString()
    };

    const derived = recomputeElementDerivedState(mlEl, iosContext);
    expect(derived.text_size_value).toBeUndefined();
    expect(derived.character_height_design_height).toBe(11);

    const presentation = buildElementPresentationModel(derived, iosContext, null, "ios");
    expect(presentation.textSizeDisplay).toBe("未确认");
    expect(presentation.characterHeightDisplay).toBe("33 px");
    expect(presentation.characterHeightDesignDisplay).toBe("约 11 pt");
  });

  // Test 7: Parameter changes synchronously recompute elements without stale snapshot
  it("7. changing evaluation context immediately recomputes derived state without stale snapshot", () => {
    const el: DesignElement = {
      element_id: "elem-dyn-switch",
      source: "manual",
      element_type: "text",
      text_role: "body",
      text_layout: "single_line",
      text_size_value: 12,
      text_size_unit: "pt",
      text_size_source: "user_confirmed",
      normalized_bounds: { x: 0.1, y: 0.1, width: 0.2, height: 0.05 },
      image_pixel_bounds: { x: 100, y: 100, width: 200, height: 36 },
      created_at: new Date().toISOString()
    };

    // Under iOS: 12pt is below 17pt recommendation -> below_recommended
    const derivedIos = recomputeElementDerivedState(el, iosContext);
    const presIos = buildElementPresentationModel(derivedIos, iosContext, null, "ios");
    expect(presIos.conclusionState).toBe("below_recommended");
    expect(presIos.actionableFindings.length).toBe(1);

    // Under Android: 12sp meets Material body threshold -> meets_reference
    const androidContext: DerivedEvaluationContext = {
      ...iosContext,
      mappingPlatform: "android",
      logicalMapping: {
        platform: "android",
        scale_factor: 3,
        unit: "sp",
        origin: "preset",
        device_name: "Android xxhdpi (3x)"
      }
    };
    const derivedAndroid = recomputeElementDerivedState(el, androidContext);
    const presAndroid = buildElementPresentationModel(derivedAndroid, androidContext, null, "android");
    expect(presAndroid.conclusionState).toBe("meets_reference");
    expect(presAndroid.actionableFindings.length).toBe(0);
  });

  // Test 8: Directional tiered evaluators output concrete thresholds and differences
  it("8. directional tiered helpers format concrete thresholds and differences", () => {
    // Lower bound:
    const lowerBelow = evaluateTieredLowerBound(9.5, 11, 17, "pt", "字号", true);
    expect(lowerBelow.verdict).toBe("below_threshold");
    expect(lowerBelow.explanation).toBe("当前字号约 9.5 pt，低于基本要求（≥ 11 pt）1.5 pt。");

    const lowerRec = evaluateTieredLowerBound(12.5, 11, 17, "pt", "字号", false);
    expect(lowerRec.verdict).toBe("below_recommended");
    expect(lowerRec.explanation).toBe("当前字号12.5 pt，已达到基本要求（≥ 11 pt），但仍低于推荐值（≥ 17 pt）4.5 pt。");

    const lowerMeets = evaluateTieredLowerBound(18, 11, 17, "pt", "字号", false);
    expect(lowerMeets.verdict).toBe("meets_reference");
    expect(lowerMeets.explanation).toBe("当前字号18 pt，已达到推荐值（≥ 17 pt）。");

    // Upper bound:
    const upperBelow = evaluateTieredUpperBound(3.5, 3.0, 2.0, "s", "响应时长", false);
    expect(upperBelow.verdict).toBe("below_threshold");
    expect(upperBelow.explanation).toBe("当前响应时长3.5 s，高于基本上限（≤ 3 s）0.5 s。");

    const upperRec = evaluateTieredUpperBound(2.5, 3.0, 2.0, "s", "响应时长", false);
    expect(upperRec.verdict).toBe("below_recommended");
    expect(upperRec.explanation).toBe("当前响应时长2.5 s，已达到基本要求（≤ 3 s），但仍高于推荐值（≤ 2 s）0.5 s。");

    const upperMeets = evaluateTieredUpperBound(1.8, 3.0, 2.0, "s", "响应时长", false);
    expect(upperMeets.verdict).toBe("meets_reference");
    expect(upperMeets.explanation).toBe("当前响应时长1.8 s，已达到推荐值（≤ 2 s）。");

    // Range:
    const rangeLow = evaluateTieredRange(10, [12, 40], [16, 30], "pt", "字号", false);
    expect(rangeLow.verdict).toBe("below_threshold");
    expect(rangeLow.explanation).toBe("当前字号10 pt，低于基本范围（12–40 pt）2 pt。");

    const rangeHigh = evaluateTieredRange(42, [12, 40], [16, 30], "pt", "字号", false);
    expect(rangeHigh.verdict).toBe("below_threshold");
    expect(rangeHigh.explanation).toBe("当前字号42 pt，高于基本范围（12–40 pt）2 pt。");

    const rangeRecLow = evaluateTieredRange(14, [12, 40], [16, 30], "pt", "字号", false);
    expect(rangeRecLow.verdict).toBe("below_recommended");
    expect(rangeRecLow.explanation).toBe("当前字号14 pt，已达到基本范围（12–40 pt），但仍低于推荐范围（16–30 pt）2 pt。");

    const rangeRecHigh = evaluateTieredRange(34, [12, 40], [16, 30], "pt", "字号", false);
    expect(rangeRecHigh.verdict).toBe("below_recommended");
    expect(rangeRecHigh.explanation).toBe("当前字号34 pt，已达到基本范围（12–40 pt），但仍高于推荐范围（16–30 pt）4 pt。");

    const rangeMeets = evaluateTieredRange(20, [12, 40], [16, 30], "pt", "字号", false);
    expect(rangeMeets.verdict).toBe("meets_reference");
    expect(rangeMeets.explanation).toBe("当前字号20 pt，已达到推荐范围（16–30 pt）。");
  });

  // Test 9: Finding objects contain rich structured numerical fields without string reparsing
  it("9. Actionable findings expose structured numerical fields and labels", () => {
    const el: DesignElement = {
      element_id: "elem-struct-fields",
      source: "manual",
      element_type: "text",
      text_role: "body",
      text_layout: "single_line",
      text_size_value: 12.1,
      text_size_unit: "pt",
      text_size_source: "user_confirmed",
      normalized_bounds: { x: 0.1, y: 0.1, width: 0.2, height: 0.05 },
      image_pixel_bounds: { x: 100, y: 100, width: 200, height: 36.3 },
      created_at: new Date().toISOString()
    };

    const derived = recomputeElementDerivedState(el, iosContext);
    const presentation = buildElementPresentationModel(derived, iosContext, null, "ios");
    const finding = presentation.actionableFindings[0];

    expect(finding.currentValue).toBe(12.1);
    expect(finding.currentUnit).toBe("pt");
    expect(finding.minimumValue).toBe(11);
    expect(finding.minimumLabel).toBe("≥ 11 pt");
    expect(finding.recommendedValue).toBe(17);
    expect(finding.recommendedLabel).toBe("≥ 17 pt");
    expect(finding.gapToMinimum).toBe(0);
    expect(finding.gapToRecommended).toBe(4.9);
  });

  // Test 10: Without design basis, no fake font sizes are generated and missing info is clear
  it("10. when design basis is missing, no synthetic font size is forged and clear guidance is given", () => {
    const noBasisContext: DerivedEvaluationContext = {
      calibrationMode: "preset",
      imageNaturalDimensions: { width: 1170, height: 2532 },
      mappingPlatform: "ios",
      logicalMapping: null,
      hardwareDisplay: {
        diagonalInches: 6.1,
        resolutionWidth: 1170,
        resolutionHeight: 2532,
        viewingDistanceMm: 400
      }
    };

    const textElement: DesignElement = {
      element_id: "txt-no-basis",
      source: "manual",
      element_type: "text",
      normalized_bounds: { x: 0.1, y: 0.1, width: 0.2, height: 0.04 },
      image_pixel_bounds: { x: 100, y: 100, width: 200, height: 40 },
      created_at: new Date().toISOString()
    };

    const derived = recomputeElementDerivedState(textElement, noBasisContext);
    const presentation = buildElementPresentationModel(derived, noBasisContext, null, "ios");

    expect(presentation.textSizeDisplay).toBe("暂不可换算");
    expect(presentation.textSizeStatus).toBe("missing_logical_basis");

    const trace = buildTextSizeTrace(derived.text_size_evaluation, null, "ios");
    expect(trace.verdict).toBe("needs_info");
    expect(trace.comparison.kind).toBe("needs_info");
    if (trace.comparison.kind === "needs_info") {
      expect(trace.comparison.missingFields).toContain("设计尺寸换算依据 (Design Basis)");
    }
  });
});
