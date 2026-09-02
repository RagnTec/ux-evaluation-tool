import { describe, it, expect } from "vitest";
import type { DesignElement, LogicalUnitMapping } from "../../src/types/designElement";
import type { DerivedEvaluationContext } from "../../src/utils/interactionGeometry";
import { recomputeElementDerivedState } from "../../src/utils/interactionGeometry";
import { buildElementPresentationModel } from "../../src/utils/elementPresentation";
import { buildTextSizeTrace } from "../../src/utils/ruleTrace";
import { getUnifiedResultExplanation } from "../../src/utils/impactRecommendation";
import { generateSelfContainedHtmlReport } from "../../src/utils/reportGenerator";
import type { ReportElementItem, ReportSummaryData } from "../../src/types/report";

describe("Screenshot Font Size Estimation & 3-Layer Semantic Separation", () => {
  const iosLogicalMapping: LogicalUnitMapping = {
    platform: "ios",
    unit: "pt",
    image_reference_width: 1170,
    logical_reference_width: 390,
    scale_x: 1 / 3,
    scale_y: 1 / 3,
    quality: "user_specified"
  };

  const fullContext: DerivedEvaluationContext = {
    imageNaturalWidth: 1170,
    imageNaturalHeight: 2532,
    calibrationMode: "full_screen",
    allowEstimation: true,
    displaySize: "6.1 inch",
    resolution: "1170x2532",
    viewingDistance: "40 cm",
    logicalMapping: iosLogicalMapping
  };

  const unmappedContext: DerivedEvaluationContext = {
    imageNaturalWidth: 1170,
    imageNaturalHeight: 2532,
    calibrationMode: "full_screen",
    allowEstimation: true,
    displaySize: "6.1 inch",
    resolution: "1170x2532",
    viewingDistance: "40 cm",
    logicalMapping: null
  };

  // 1. no confirmed source + estimate 15.1 + min 11 + recommended 17 -> below_recommended -> estimated basis
  it("Scenario 1: no confirmed source + estimate 15.1 + min 11 + rec 17 yields below_recommended with estimated basis", () => {
    const el: DesignElement = {
      element_id: "txt-est-15",
      source: "manual",
      element_type: "text",
      text_layout: "single_line",
      text_visual_measurement_target: "single_rendered_line",
      text_role: "body",
      normalized_bounds: { x: 0.1, y: 0.1, width: 0.8, height: 45.3 / 2532 },
      image_pixel_bounds: { x: 117, y: 253, width: 936, height: 45.3 }, // 45.3 * (1/3) = 15.1 pt
      calibration_mode: "full_screen",
      created_at: new Date().toISOString()
    };

    const derived = recomputeElementDerivedState(el, fullContext);
    expect(derived.estimated_text_size_value).toBe(15.1);
    expect(derived.text_size_value).toBeUndefined();
    expect(derived.text_size_evaluation?.status).toBe("meets_minimum");
    expect(derived.text_size_evaluation?.evaluation_basis).toBe("screenshot_estimate");

    const presentation = buildElementPresentationModel(derived, fullContext, null, "ios");
    expect(presentation.textSizeDisplay).toBe("未确认");
    expect(presentation.estimatedTextSizeDisplay).toBe("约 15.1 pt");
    expect(presentation.conclusionState).toBe("below_recommended");
    expect(presentation.actionableFindings.length).toBe(1);
    expect(presentation.actionableFindings[0].severity).toBe("below_recommended");
  });

  // 2. estimate 9 + min 11 -> below_threshold -> estimated basis
  it("Scenario 2: estimate 9 + min 11 yields below_threshold with estimated basis", () => {
    const el: DesignElement = {
      element_id: "txt-est-9",
      source: "manual",
      element_type: "text",
      text_layout: "single_line",
      text_visual_measurement_target: "single_rendered_line",
      text_role: "body",
      normalized_bounds: { x: 0.1, y: 0.1, width: 0.8, height: 27 / 2532 },
      image_pixel_bounds: { x: 117, y: 253, width: 936, height: 27 }, // 27 * (1/3) = 9 pt
      calibration_mode: "full_screen",
      created_at: new Date().toISOString()
    };

    const derived = recomputeElementDerivedState(el, fullContext);
    expect(derived.estimated_text_size_value).toBe(9);
    expect(derived.text_size_value).toBeUndefined();
    expect(derived.text_size_evaluation?.status).toBe("below_minimum");
    expect(derived.text_size_evaluation?.evaluation_basis).toBe("screenshot_estimate");

    const presentation = buildElementPresentationModel(derived, fullContext, null, "ios");
    expect(presentation.conclusionState).toBe("below_threshold");
    expect(presentation.actionableFindings[0].severity).toBe("below_threshold");
    expect(presentation.actionableFindings[0].summaryText).toContain("低于基本要求（≥ 11 pt）2 pt");
  });

  // 3. estimate 18 + recommended 17 -> meets_reference -> estimated basis
  it("Scenario 3: estimate 18 + recommended 17 yields meets_reference with estimated basis", () => {
    const el: DesignElement = {
      element_id: "txt-est-18",
      source: "manual",
      element_type: "text",
      text_layout: "single_line",
      text_visual_measurement_target: "single_rendered_line",
      text_role: "body",
      normalized_bounds: { x: 0.1, y: 0.1, width: 0.8, height: 54 / 2532 },
      image_pixel_bounds: { x: 117, y: 253, width: 936, height: 54 }, // 54 * (1/3) = 18 pt
      calibration_mode: "full_screen",
      created_at: new Date().toISOString()
    };

    const derived = recomputeElementDerivedState(el, fullContext);
    expect(derived.estimated_text_size_value).toBe(18);
    expect(derived.text_size_evaluation?.status).toBe("meets_default");
    expect(derived.text_size_evaluation?.evaluation_basis).toBe("screenshot_estimate");

    const presentation = buildElementPresentationModel(derived, fullContext, null, "ios");
    expect(presentation.conclusionState).toBe("meets_reference");
    expect(presentation.conclusion).toContain("截图估算字号约 18 pt，达到推荐值（≥ 17 pt）");
  });

  // 4. estimated result user-facing 文案必须包含：当前估算值、基本要求值、推荐值、gap、估算说明
  it("Scenario 4: estimated result user-facing text includes current estimate, min, rec, gap, and estimation disclaimer", () => {
    const el: DesignElement = {
      element_id: "txt-text-copy",
      source: "manual",
      element_type: "text",
      text_layout: "single_line",
      text_role: "body",
      normalized_bounds: { x: 0.1, y: 0.1, width: 0.8, height: 45.3 / 2532 },
      image_pixel_bounds: { x: 117, y: 253, width: 936, height: 45.3 }, // 15.1 pt
      calibration_mode: "full_screen",
      created_at: new Date().toISOString()
    };

    const derived = recomputeElementDerivedState(el, fullContext);
    const presentation = buildElementPresentationModel(derived, fullContext, null, "ios");
    const finding = presentation.actionableFindings[0];

    expect(finding.currentValueDisplay).toBe("约 15.1 pt");
    expect(finding.minimumLabel).toBe("≥ 11 pt");
    expect(finding.recommendedLabel).toBe("≥ 17 pt");
    expect(finding.gapToRecommendedDisplay).toBe("1.9 pt");
    expect(finding.summaryText).toContain("当前截图估算字号约 15.1 pt，已达到基本要求（≥ 11 pt），但仍低于推荐值（≥ 17 pt）1.9 pt。");
    expect(finding.whyItMatters).toContain("基于截图估算");
  });

  // 5. estimated value 不写入 text_size_value
  it("Scenario 5: estimated value is never written into text_size_value or text_size_source", () => {
    const el: DesignElement = {
      element_id: "txt-no-overwrite",
      source: "manual",
      element_type: "text",
      text_layout: "single_line",
      normalized_bounds: { x: 0.1, y: 0.1, width: 0.8, height: 45.3 / 2532 },
      image_pixel_bounds: { x: 117, y: 253, width: 936, height: 45.3 },
      calibration_mode: "full_screen",
      created_at: new Date().toISOString()
    };

    const derived = recomputeElementDerivedState(el, fullContext);
    expect(derived.text_size_value).toBeUndefined();
    expect(derived.text_size_source).toBeUndefined();
    expect(derived.estimated_text_size_value).toBe(15.1);
  });

  // 6. confirmed source exists -> confirmed value wins -> estimate 不控制 conclusion
  it("Scenario 6: confirmed source font size wins over estimate and controls evaluation", () => {
    const el: DesignElement = {
      element_id: "txt-confirmed-wins",
      source: "manual",
      element_type: "text",
      text_role: "body",
      text_layout: "single_line",
      text_size_value: 17,
      text_size_unit: "pt",
      text_size_source: "user_confirmed",
      normalized_bounds: { x: 0.1, y: 0.1, width: 0.8, height: 27 / 2532 }, // Visual height would estimate 9 pt
      image_pixel_bounds: { x: 117, y: 253, width: 936, height: 27 },
      calibration_mode: "full_screen",
      created_at: new Date().toISOString()
    };

    const derived = recomputeElementDerivedState(el, fullContext);
    expect(derived.text_size_value).toBe(17);
    expect(derived.text_size_source).toBe("user_confirmed");
    expect(derived.text_size_evaluation?.status).toBe("meets_default");
    expect(derived.text_size_evaluation?.evaluation_basis).toBe("confirmed_source");

    const presentation = buildElementPresentationModel(derived, fullContext, null, "ios");
    expect(presentation.textSizeDisplay).toBe("17 pt (人工确认)");
    expect(presentation.conclusionState).toBe("meets_reference");
    expect(presentation.conclusion).toContain("当前字号17 pt，已达到推荐值（≥ 17 pt）");
  });

  // 7. no source + no estimate -> needs_info
  it("Scenario 7: missing logical basis yields needs_info without synthetic estimate", () => {
    const el: DesignElement = {
      element_id: "txt-no-basis",
      source: "manual",
      element_type: "text",
      text_layout: "single_line",
      normalized_bounds: { x: 0.1, y: 0.1, width: 0.8, height: 45 / 2532 },
      image_pixel_bounds: { x: 117, y: 253, width: 936, height: 45 },
      calibration_mode: "full_screen",
      created_at: new Date().toISOString()
    };

    const derived = recomputeElementDerivedState(el, unmappedContext);
    expect(derived.estimated_text_size_value).toBeUndefined();
    expect(derived.text_size_evaluation?.status).toBe("needs_info");
    expect(derived.text_size_evaluation?.evaluation_basis).toBe("missing_basis");

    const presentation = buildElementPresentationModel(derived, unmappedContext, null, "unknown");
    expect(presentation.textSizeDisplay).toBe("暂不可换算");
    expect(presentation.estimatedTextSizeDisplay).toBe("暂不可换算");
  });

  // 8. multi-line whole_text_bounds without valid estimate -> needs_info
  it("Scenario 8: multi-line whole_text_bounds without character height yields needs_info and 暂不可估算", () => {
    const el: DesignElement = {
      element_id: "txt-ml-whole",
      source: "manual",
      element_type: "text",
      text_layout: "multi_line",
      text_visual_measurement_target: "whole_text_bounds",
      normalized_bounds: { x: 0.1, y: 0.1, width: 0.8, height: 200 / 2532 },
      image_pixel_bounds: { x: 117, y: 253, width: 936, height: 200 },
      calibration_mode: "full_screen",
      created_at: new Date().toISOString()
    };

    const derived = recomputeElementDerivedState(el, fullContext);
    expect(derived.estimated_text_size_value).toBeUndefined();
    expect(derived.text_size_evaluation?.status).toBe("needs_info");

    const presentation = buildElementPresentationModel(derived, fullContext, null, "ios");
    expect(presentation.estimatedTextSizeDisplay).toBe("暂不可估算");
    expect(presentation.estimatedTextSizeGuidance).toContain("无法由整段高度估算单行字号");
  });

  // 9. Inspector / Card / Report Preview / HTML -> current / threshold / gap / conclusion / evaluation basis 完全一致
  it("Scenario 9: Inspector, Presentation Model, and HTML Report share unified metrics and conclusions", () => {
    const el: DesignElement = {
      element_id: "txt-unified-9",
      source: "manual",
      element_type: "text",
      text_layout: "single_line",
      text_role: "body",
      normalized_bounds: { x: 0.1, y: 0.1, width: 0.8, height: 45.3 / 2532 },
      image_pixel_bounds: { x: 117, y: 253, width: 936, height: 45.3 },
      calibration_mode: "full_screen",
      created_at: new Date().toISOString()
    };

    const derived = recomputeElementDerivedState(el, fullContext);
    const presentation = buildElementPresentationModel(derived, fullContext, null, "ios");

    const reportItem: ReportElementItem = {
      index: 1,
      elementId: el.element_id,
      label: presentation.label,
      elementType: el.element_type,
      elementTypeLabel: presentation.elementTypeLabel,
      interactionType: "none",
      isInteractive: false,
      needsAttention: false,
      highestTier: "L2_PLATFORM_GUIDELINE",
      highestTierLabel: "平台推荐",
      conclusion: presentation.conclusion,
      conclusionState: presentation.conclusionState,
      conclusionStateLabel: presentation.conclusionStateLabel,
      actionableFindings: presentation.actionableFindings,
      visualDimensionsDisplay: presentation.visualPxDisplay,
      estimatedTextSizeDisplay: presentation.estimatedTextSizeDisplay,
      estimatedTextSizeSourceLabel: presentation.estimatedTextSizeSourceLabel,
      technicalDetails: []
    };

    const reportData: ReportSummaryData = {
      title: "UX 视觉证据报告",
      generatedAt: "2026-08-27 10:00:00",
      imageName: "test.png",
      imageNaturalDimensions: { width: 1170, height: 2532 },
      screenshotScope: "full_screen",
      screenshotScopeLabel: "全屏截图",
      totalElementsCount: 1,
      attentionCount: 0,
      filter: "all",
      filterCount: 1,
      designInfoStatus: "source_available",
      targetPlatform: "ios",
      targetPlatformLabel: "iOS",
      assumptions: [],
      elements: [reportItem]
    };

    const html = generateSelfContainedHtmlReport(reportData);

    expect(html).toContain("约 15.1 pt");
    expect(html).toContain("满足基本要求，但未达推荐范围");
    expect(html).toContain("当前截图估算字号约 15.1 pt，已达到基本要求（≥ 11 pt），但仍低于推荐值（≥ 17 pt）1.9 pt。");
  });

  // 10. contrast pass + estimated font below_recommended -> element overall conclusion = below_recommended
  it("Scenario 10: contrast pass + estimated font below_recommended results in below_recommended overall (not overall green)", () => {
    const el: DesignElement = {
      element_id: "txt-contrast-pass-font-fail",
      source: "manual",
      element_type: "text",
      text_layout: "single_line",
      text_role: "body",
      normalized_bounds: { x: 0.1, y: 0.1, width: 0.8, height: 45.3 / 2532 },
      image_pixel_bounds: { x: 117, y: 253, width: 936, height: 45.3 }, // 15.1 pt -> below_recommended
      foreground_color: "#000000",
      background_color: "#ffffff",
      contrast_evaluation: {
        contrast_ratio: 21,
        passed: true,
        threshold: 4.5,
        rating: "AAA",
        level: "AAA"
      },
      calibration_mode: "full_screen",
      created_at: new Date().toISOString()
    };

    const derived = recomputeElementDerivedState(el, fullContext);
    const presentation = buildElementPresentationModel(derived, fullContext, null, "ios");

    expect(presentation.contrastPassed).toBe(true);
    expect(presentation.conclusionState).toBe("below_recommended");
    expect(presentation.conclusionStateLabel).toBe("满足基本要求，但未达推荐范围");
  });

  // 11. estimated meets_reference -> green finding allowed -> provenance 仍为 estimate / confidence limited
  it("Scenario 11: estimated meets_reference allows meets_reference conclusion while retaining estimated basis", () => {
    const el: DesignElement = {
      element_id: "txt-est-meets",
      source: "manual",
      element_type: "text",
      text_layout: "single_line",
      text_role: "body",
      normalized_bounds: { x: 0.1, y: 0.1, width: 0.8, height: 57 / 2532 },
      image_pixel_bounds: { x: 117, y: 253, width: 936, height: 57 }, // 19 pt -> meets_default
      calibration_mode: "full_screen",
      created_at: new Date().toISOString()
    };

    const derived = recomputeElementDerivedState(el, fullContext);
    const presentation = buildElementPresentationModel(derived, fullContext, null, "ios");

    expect(presentation.conclusionState).toBe("meets_reference");
    expect(presentation.conclusion).toContain("截图估算字号约 19 pt，达到推荐值（≥ 17 pt）");
    expect(derived.text_size_evaluation?.evaluation_basis).toBe("screenshot_estimate");
    expect(derived.text_size_evaluation?.is_estimated).toBe(true);
  });

  // 12. Body -> Caption -> Body -> estimate result 随当前角色规则重新计算 -> 不遗留旧 threshold / conclusion
  it("Scenario 12: dynamic text role switching (Body -> Caption -> Body) recomputes thresholds and conclusions cleanly", () => {
    const baseEl: DesignElement = {
      element_id: "txt-role-switch",
      source: "manual",
      element_type: "text",
      text_layout: "single_line",
      text_role: "body",
      normalized_bounds: { x: 0.1, y: 0.1, width: 0.8, height: 36 / 2532 },
      image_pixel_bounds: { x: 117, y: 253, width: 936, height: 36 }, // 12 pt
      calibration_mode: "full_screen",
      created_at: new Date().toISOString()
    };

    // 1. Body: 12 pt is below recommended (≥ 17 pt), meets min (≥ 11 pt)
    const derivedBody = recomputeElementDerivedState(baseEl, fullContext);
    const presBody = buildElementPresentationModel(derivedBody, fullContext, null, "ios");
    expect(presBody.conclusionState).toBe("below_recommended");
    expect(presBody.actionableFindings[0].recommendedValue).toBe(17);

    // 2. Caption: fallback evaluation borrowing body threshold
    const captionEl = { ...baseEl, text_role: "caption" as const };
    const derivedCaption = recomputeElementDerivedState(captionEl, fullContext);
    const presCaption = buildElementPresentationModel(derivedCaption, fullContext, null, "ios");
    expect(presCaption.conclusionState).toBe("below_recommended");
    expect(presCaption.actionableFindings[0].summaryText).toContain("暂借用正文文字阈值");

    // 3. Back to Body: cleanly recomputes to below_recommended (17 pt rec) without stale caption state
    const derivedBodyAgain = recomputeElementDerivedState({ ...captionEl, text_role: "body" as const }, fullContext);
    const presBodyAgain = buildElementPresentationModel(derivedBodyAgain, fullContext, null, "ios");
    expect(presBodyAgain.conclusionState).toBe("below_recommended");
    expect(presBodyAgain.actionableFindings[0].recommendedValue).toBe(17);
  });
});
