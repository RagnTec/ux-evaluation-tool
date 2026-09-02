import { describe, it, expect } from "vitest";
import {
  DesignElement,
  DerivedEvaluationContext,
  ReportElementItem,
  ReportSummaryData
} from "../../src/types";
import { recomputeElementDerivedState } from "../../src/utils/interactionGeometry";
import { buildElementPresentationModel } from "../../src/utils/elementPresentation";
import {
  getConclusionPresentationState,
  getFindingPresentationState
} from "../../src/utils/impactRecommendation";
import { generateSelfContainedHtmlReport } from "../../src/utils/reportGenerator";

describe("Text Role Result Synchronization & Severity Color Consistency", () => {
  const iosContext: DerivedEvaluationContext = {
    calibrationMode: "preset",
    imageNaturalDimensions: { width: 1170, height: 2532 },
    mappingPlatform: "ios",
    logicalMapping: {
      platform: "ios",
      scale_x: 1 / 3,
      scale_y: 1 / 3,
      image_reference_width: 1170,
      logical_reference_width: 390,
      unit: "pt",
      quality: "exact_profile"
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

  // Test 1: user_confirmed = 12.1 pt (min 11, rec 17) evaluates to below_recommended and maps to amber warning tone
  it("1. user_confirmed = 12.1 pt (min 11, rec 17) evaluates to below_recommended and maps to amber warning tone", () => {
    const el: DesignElement = {
      element_id: "elem-1",
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

    const derived = recomputeElementDerivedState(el, iosContext);
    const presentation = buildElementPresentationModel(derived, iosContext, null, "ios");

    expect(presentation.conclusionState).toBe("below_recommended");
    expect(presentation.conclusionPresentation.tone).toBe("warning");
    expect(presentation.conclusionPresentation.bgHex).toBe("#fffbeb");
    expect(presentation.conclusionPresentation.tone).not.toBe("danger");
    expect(presentation.conclusionPresentation.tone).not.toBe("positive");
  });

  // Test 2: HTML summary includes 12.1 pt, >= 11 pt, >= 17 pt, 4.9 pt for confirmed font size
  it("2. HTML report summary contains confirmed font size, basic threshold, recommended threshold, and deficit", () => {
    const el: DesignElement = {
      element_id: "elem-2",
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

    const derived = recomputeElementDerivedState(el, iosContext);
    const presentation = buildElementPresentationModel(derived, iosContext, null, "ios");

    const reportItem: ReportElementItem = {
      index: 1,
      elementId: el.element_id,
      label: "Element 1",
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
    expect(html).toContain("当前字号12.1 pt");
    expect(html).toContain("基本要求（≥ 11 pt）");
    expect(html).toContain("推荐值（≥ 17 pt）");
    expect(html).toContain("4.9 pt");
  });

  // Test 3: Prohibition against contradictory text "12.1 pt 已达到推荐值（≥ 17 pt）"
  it("3. prohibits generating contradictory text claiming 12.1 pt reached recommended threshold >= 17 pt", () => {
    const el: DesignElement = {
      element_id: "elem-3",
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

    const derived = recomputeElementDerivedState(el, iosContext);
    const presentation = buildElementPresentationModel(derived, iosContext, null, "ios");

    expect(presentation.conclusion).not.toContain("已达到推荐值（≥ 17 pt）");
    expect(presentation.actionableFindings[0]?.summaryText).not.toContain("已达到推荐值（≥ 17 pt）");
  });

  // Test 4: Body -> Caption switches from body rules (17pt rec) to caption measurement_only without stale body threshold
  it("4. Body -> Caption switches from body rules (17pt rec) to caption measurement_only without stale body threshold", () => {
    const bodyEl: DesignElement = {
      element_id: "elem-4",
      source: "manual",
      element_type: "text",
      text_role: "body",
      text_layout: "single_line",
      text_size_value: 12.1,
      text_size_unit: "pt",
      text_size_source: "user_confirmed",
      normalized_bounds: { x: 0.1, y: 0.1, width: 0.4, height: 0.08 },
      image_pixel_bounds: { x: 117, y: 253, width: 468, height: 36.3 },
      created_at: new Date().toISOString()
    };

    // 1. In Body role
    const bodyDerived = recomputeElementDerivedState(bodyEl, iosContext);
    const bodyPres = buildElementPresentationModel(bodyDerived, iosContext, null, "ios");
    expect(bodyPres.conclusionState).toBe("below_recommended");
    expect(bodyPres.actionableFindings.length).toBe(1);
    expect(bodyPres.actionableFindings[0].recommendedLabel).toBe("≥ 17 pt");

    // 2. Switch to Caption role
    const captionEl: DesignElement = {
      ...bodyEl,
      text_role: "caption"
    };
    const captionDerived = recomputeElementDerivedState(captionEl, iosContext);
    const captionPres = buildElementPresentationModel(captionDerived, iosContext, null, "ios");

    // Caption borrows body threshold as fallback with explicit note
    expect(captionPres.actionableFindings.length).toBe(1);
    expect(captionPres.conclusionState).toBe("below_recommended");
    expect(captionPres.conclusion).toContain("≥ 17 pt");
    expect(captionPres.conclusion).toContain("12.1 pt");
    expect(captionPres.conclusion).toContain("暂借用正文文字阈值");
  });

  // Test 5: Caption -> Body restores Body thresholds and conclusions seamlessly
  it("5. Caption -> Body restores Body thresholds and conclusions seamlessly", () => {
    const captionEl: DesignElement = {
      element_id: "elem-5",
      source: "manual",
      element_type: "text",
      text_role: "caption",
      text_layout: "single_line",
      text_size_value: 12.1,
      text_size_unit: "pt",
      text_size_source: "user_confirmed",
      normalized_bounds: { x: 0.1, y: 0.1, width: 0.4, height: 0.08 },
      image_pixel_bounds: { x: 117, y: 253, width: 468, height: 36.3 },
      created_at: new Date().toISOString()
    };

    // Caption state (fallback evaluation with borrowed body threshold)
    const captionDerived = recomputeElementDerivedState(captionEl, iosContext);
    const captionPres = buildElementPresentationModel(captionDerived, iosContext, null, "ios");
    expect(captionPres.conclusionState).toBe("below_recommended");
    expect(captionPres.actionableFindings[0].summaryText).toContain("暂借用正文文字阈值");

    // Switch back to Body
    const bodyEl: DesignElement = {
      ...captionEl,
      text_role: "body"
    };
    const bodyDerived = recomputeElementDerivedState(bodyEl, iosContext);
    const bodyPres = buildElementPresentationModel(bodyDerived, iosContext, null, "ios");

    expect(bodyPres.conclusionState).toBe("below_recommended");
    expect(bodyPres.actionableFindings.length).toBe(1);
    expect(bodyPres.actionableFindings[0].summaryText).toBe("当前字号12.1 pt，已达到基本要求（≥ 11 pt），但仍低于推荐值（≥ 17 pt）4.9 pt。");
    expect(bodyPres.actionableFindings[0].summaryText).not.toContain("暂借用正文文字阈值");
  });

  // Test 6: Inspector conclusionState === Report Preview conclusionState === HTML conclusionState
  it("6. Inspector, Report Preview, and HTML Report share identical conclusionState and values", () => {
    const el: DesignElement = {
      element_id: "elem-6",
      source: "manual",
      element_type: "text",
      text_role: "body",
      text_layout: "single_line",
      text_size_value: 12.1,
      text_size_unit: "pt",
      text_size_source: "user_confirmed",
      normalized_bounds: { x: 0.1, y: 0.1, width: 0.4, height: 0.08 },
      image_pixel_bounds: { x: 117, y: 253, width: 468, height: 36.3 },
      created_at: new Date().toISOString()
    };

    const derived = recomputeElementDerivedState(el, iosContext);
    const presentation = buildElementPresentationModel(derived, iosContext, null, "ios");

    const inspectorState = presentation.conclusionState;

    const reportItem: ReportElementItem = {
      index: 1,
      elementId: el.element_id,
      label: "Element 6",
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

    const previewState = reportItem.conclusionState;
    expect(inspectorState).toBe(previewState);

    const reportData: ReportSummaryData = {
      title: "UX 报告",
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
    expect(html).toContain('<div class="findingGroup groupBelowRecommended">');
    expect(html).toContain("满足基本要求，但未达推荐范围");
    expect(html).not.toContain('<div class="findingGroup groupBelowThreshold">');
  });

  // Test 7: Inspector threshold === HTML threshold
  it("7. Inspector thresholds match HTML report thresholds exactly", () => {
    const el: DesignElement = {
      element_id: "elem-7",
      source: "manual",
      element_type: "text",
      text_role: "body",
      text_layout: "single_line",
      text_size_value: 12.1,
      text_size_unit: "pt",
      text_size_source: "user_confirmed",
      normalized_bounds: { x: 0.1, y: 0.1, width: 0.4, height: 0.08 },
      image_pixel_bounds: { x: 117, y: 253, width: 468, height: 36.3 },
      created_at: new Date().toISOString()
    };

    const derived = recomputeElementDerivedState(el, iosContext);
    const pres = buildElementPresentationModel(derived, iosContext, null, "ios");
    const finding = pres.actionableFindings[0];

    expect(finding.minimumLabel).toBe("≥ 11 pt");
    expect(finding.recommendedLabel).toBe("≥ 17 pt");

    const reportItem: ReportElementItem = {
      index: 1,
      elementId: el.element_id,
      label: "Element 7",
      elementType: "text",
      elementTypeLabel: "正文文本",
      interactionType: "none",
      isInteractive: false,
      needsAttention: true,
      highestTier: "L2_PLATFORM_COMPLIANCE",
      highestTierLabel: "平台规范层",
      conclusion: pres.conclusion,
      conclusionState: pres.conclusionState,
      conclusionStateLabel: pres.conclusionStateLabel,
      actionableFindings: pres.actionableFindings,
      visualDimensionsDisplay: pres.visualPxDisplay
    };

    const reportData: ReportSummaryData = {
      title: "UX 报告",
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
    expect(html).toContain("≥ 11 pt");
    expect(html).toContain("≥ 17 pt");
  });

  // Test 8: Character height measurement alone does NOT forge text_size_value, but outputs design-space height
  it("8. Character height alone leaves text_size_value undefined, outputs representative character design-space height and platform rule needs_info", () => {
    const el: DesignElement = {
      element_id: "elem-8",
      source: "manual",
      element_type: "text",
      text_role: "body",
      text_layout: "multi_line",
      character_height_px: 36.3, // 36.3 px / 3 = 12.1 pt
      character_height_source: "measured_rendered_character",
      normalized_bounds: { x: 0.1, y: 0.1, width: 0.4, height: 0.08 },
      image_pixel_bounds: { x: 117, y: 253, width: 468, height: 200 },
      created_at: new Date().toISOString()
    };

    const derived = recomputeElementDerivedState(el, iosContext);
    expect(derived.text_size_value).toBeUndefined();
    expect(derived.character_height_design_height).toBe(12.1);

    const pres = buildElementPresentationModel(derived, iosContext, null, "ios");
    expect(pres.textSizeDisplay).toBe("未确认");
    expect(pres.characterHeightDisplay).toBe("36.3 px");
    expect(pres.characterHeightDesignDisplay).toBe("约 12.1 pt");
    expect(pres.conclusionState).toBe("below_recommended");
    expect(pres.conclusion).toContain("当前截图估算字号约 12.1 pt");
  });

  // Test 9: Confirmed source font size >= 17 pt evaluates to meets_reference and green tone
  it("9. Confirmed source font size >= 17 pt evaluates to meets_reference and green tone", () => {
    const el: DesignElement = {
      element_id: "elem-9",
      source: "manual",
      element_type: "text",
      text_role: "body",
      text_layout: "multi_line",
      text_size_value: 18,
      text_size_unit: "pt",
      text_size_source: "user_confirmed",
      character_height_px: 54,
      character_height_source: "measured_rendered_character",
      normalized_bounds: { x: 0.1, y: 0.1, width: 0.4, height: 0.08 },
      image_pixel_bounds: { x: 117, y: 253, width: 468, height: 200 },
      created_at: new Date().toISOString()
    };

    const derived = recomputeElementDerivedState(el, iosContext);
    const pres = buildElementPresentationModel(derived, iosContext, null, "ios");

    expect(pres.conclusionState).toBe("meets_reference");
    expect(pres.conclusionPresentation.tone).toBe("positive");
    expect(pres.conclusionPresentation.bgHex).toBe("#f0fdf4");
    expect(pres.conclusion).toBe("当前字号18 pt，已达到推荐值（≥ 17 pt）。");
  });

  // Test 10: Color and state mapping relies purely on typed state rather than parsing Chinese strings
  it("10. Presentation state mapping derives from typed conclusionState and finding severity", () => {
    const belowThreshPres = getConclusionPresentationState("below_threshold");
    expect(belowThreshPres.tone).toBe("danger");
    expect(belowThreshPres.badgeClass).toBe("badge-below_threshold");

    const belowRecPres = getConclusionPresentationState("below_recommended");
    expect(belowRecPres.tone).toBe("warning");
    expect(belowRecPres.badgeClass).toBe("badge-below_recommended");

    const meetsPres = getConclusionPresentationState("meets_reference");
    expect(meetsPres.tone).toBe("positive");
    expect(meetsPres.badgeClass).toBe("badge-meets_reference");

    const measPres = getConclusionPresentationState("measurement_only");
    expect(measPres.tone).toBe("neutral");
    expect(measPres.badgeClass).toBe("badge-measurement_only");

    const findingThresh = getFindingPresentationState("below_threshold");
    expect(findingThresh.tone).toBe("danger");
    expect(findingThresh.groupClass).toBe("groupBelowThreshold");

    const findingRec = getFindingPresentationState("below_recommended");
    expect(findingRec.tone).toBe("warning");
    expect(findingRec.groupClass).toBe("groupBelowRecommended");
  });
});
