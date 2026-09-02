import { describe, it, expect } from "vitest";
import type { DesignElement, LogicalUnitMapping, DerivedEvaluationContext } from "../../src/types/designElement";
import { recomputeElementDerivedState } from "../../src/utils/interactionGeometry";
import { buildElementPresentationModel } from "../../src/utils/elementPresentation";
import { groupActionableFindings, getUnifiedResultExplanation } from "../../src/utils/impactRecommendation";
import { generateSelfContainedHtmlReport } from "../../src/utils/reportGenerator";

describe("Phase 3J.4.6: Continuous Inspector Workflow & Report Clarity", () => {
  const iosLogicalMapping: LogicalUnitMapping = {
    platform: "ios",
    unit: "pt",
    design_width_source: "preset",
    design_width: 390,
    screenshot_width: 1170,
    screenshot_height: 2532,
    scale_x: 390 / 1170, // 1/3
    scale_y: 390 / 1170, // 1/3
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

  // 1. Multiline text without character-height measurement keeps pending info (no fabrication)
  it("Scenario 1: multiline text without character-height measurement produces needs_info without fabricating font size", () => {
    const el: DesignElement = {
      element_id: "text-multi-1",
      source: "manual",
      element_type: "text",
      text_layout: "multi_line",
      text_role: "body",
      text_size_source: "estimated_from_visual_bounds",
      normalized_bounds: { x: 0.1, y: 0.1, width: 0.8, height: 0.2 },
      image_pixel_bounds: { x: 117, y: 253, width: 936, height: 506 },
      calibration_mode: "preset"
    };

    const derived = recomputeElementDerivedState(el, sampleContext);
    expect(derived.text_size_value).toBeUndefined();
    expect(derived.text_size_evaluation?.status).toBe("needs_info");
    expect(derived.text_size_evaluation?.summary_text).toContain("源设计字号未确认");
  });

  // 2. Multiline text with measured character height preserves character height metrics and derives design-space height
  it("Scenario 2: multiline text with measured character height preserves character measurements and derives design-space height", () => {
    const el: DesignElement = {
      element_id: "text-multi-2",
      source: "manual",
      element_type: "text",
      text_layout: "multi_line",
      text_role: "body",
      character_height_px: 48,
      character_height_source: "measured_rendered_character",
      normalized_bounds: { x: 0.1, y: 0.1, width: 0.8, height: 0.2 },
      image_pixel_bounds: { x: 117, y: 253, width: 936, height: 506 },
      calibration_mode: "preset"
    };

    const derived = recomputeElementDerivedState(el, sampleContext);
    expect(derived.character_height_px).toBe(48);
    expect(derived.character_height_design_height).toBe(16);
    expect(derived.character_height_physical_mm).toBeGreaterThan(0);
    expect(derived.character_height_visual_angle?.arcmin).toBeGreaterThan(0);
    expect(derived.text_size_value).toBeUndefined();
    expect(derived.text_size_evaluation?.status).toBe("meets_minimum");
    expect(derived.text_size_evaluation?.evaluation_basis).toBe("screenshot_estimate");
  });

  // 3. Multiline text with user-confirmed font size preserves user_confirmed
  it("Scenario 3: multiline text with user-confirmed font size preserves user_confirmed provenance", () => {
    const el: DesignElement = {
      element_id: "text-multi-3",
      source: "manual",
      element_type: "text",
      text_layout: "multi_line",
      text_role: "body",
      character_height_px: 48,
      character_height_source: "measured_rendered_character",
      text_size_value: 18,
      text_size_unit: "pt",
      text_size_source: "user_confirmed",
      normalized_bounds: { x: 0.1, y: 0.1, width: 0.8, height: 0.2 },
      image_pixel_bounds: { x: 117, y: 253, width: 936, height: 506 },
      calibration_mode: "preset"
    };

    const derived = recomputeElementDerivedState(el, sampleContext);
    expect(derived.text_size_value).toBe(18);
    expect(derived.text_size_source).toBe("user_confirmed");
    expect(derived.text_size_evaluation?.status).toBe("meets_default");
  });

  // 4. Element presentation displays character height and design space height for multiline text
  it("Scenario 4: element presentation model displays character height facts and derives design space height when logical mapping is available", () => {
    const el: DesignElement = {
      element_id: "text-multi-4",
      source: "manual",
      element_type: "text",
      text_layout: "multi_line",
      text_role: "body",
      character_height_px: 51,
      character_height_source: "measured_rendered_character",
      normalized_bounds: { x: 0.1, y: 0.1, width: 0.8, height: 0.2 },
      image_pixel_bounds: { x: 117, y: 253, width: 936, height: 506 },
      calibration_mode: "preset"
    };

    const derived = recomputeElementDerivedState(el, sampleContext);
    const presentation = buildElementPresentationModel(derived, sampleContext, null, "ios");
    expect(presentation.characterHeightDisplay).toBe("51 px");
    expect(presentation.characterHeightDesignDisplay).toBe("约 17 pt");
    expect(presentation.textSizeDisplay).toBe("未确认");
  });

  // 5. Touch size finding exposes both minimum and recommended values
  it("Scenario 5: touch-size finding summary exposes both minimum (28 pt) and recommended (44 pt) values", () => {
    const el: DesignElement = {
      element_id: "btn-touch-1",
      source: "manual",
      element_type: "button",
      interaction_type: "touch",
      normalized_bounds: { x: 0.1, y: 0.1, width: 0.1, height: 0.1 },
      image_pixel_bounds: { x: 100, y: 100, width: 105, height: 105 }, // 35x35 pt
      calibration_mode: "preset"
    };

    const derived = recomputeElementDerivedState(el, sampleContext);
    const explanation = getUnifiedResultExplanation({
      element: derived,
      logicalMapping: iosLogicalMapping,
      calibrationMode: "preset",
      touchStatus: derived.target_size_evaluation?.status,
      targetSizeEval: derived.target_size_evaluation
    });

    const touchFinding = explanation.actionableFindings.find(f => f.id === "touch_target_size");
    expect(touchFinding).toBeDefined();
    expect(touchFinding?.severity).toBe("below_recommended");
    expect(touchFinding?.minimumDisplay).toBe("28 × 28 pt");
    expect(touchFinding?.recommendedDisplay).toBe("44 × 44 pt");
    expect(touchFinding?.summaryText).toContain("基本要求 (≥ 28 × 28 pt)");
    expect(touchFinding?.summaryText).toContain("但仍低于推荐值");
  });

  // 6. Height-only touch below recommendation specifies height in summaryText
  it("Scenario 6: touch element with width >= 44 pt but height < 44 pt emphasizes height deficiency", () => {
    const el: DesignElement = {
      element_id: "btn-touch-wide",
      source: "manual",
      element_type: "button",
      interaction_type: "touch",
      normalized_bounds: { x: 0.1, y: 0.1, width: 0.2, height: 0.05 },
      image_pixel_bounds: { x: 100, y: 100, width: 150, height: 96 }, // 50x32 pt
      calibration_mode: "preset"
    };

    const derived = recomputeElementDerivedState(el, sampleContext);
    const explanation = getUnifiedResultExplanation({
      element: derived,
      logicalMapping: iosLogicalMapping,
      calibrationMode: "preset",
      touchStatus: derived.target_size_evaluation?.status,
      targetSizeEval: derived.target_size_evaluation
    });

    const touchFinding = explanation.actionableFindings.find(f => f.id === "touch_target_size");
    expect(touchFinding?.summaryText).toContain("高度已达到基本要求，但仍低于推荐值 12 pt");
  });

  // 7. Grouping actionable findings partitions into sibling groups
  it("Scenario 7: groupActionableFindings creates clean sibling partitions for below_threshold and below_recommended", () => {
    const findings = [
      {
        id: "contrast",
        metricLabel: "对比度",
        severity: "below_threshold" as const,
        severityLabel: "不满足基本要求",
        summaryText: "对比度 2.1:1 < 4.5:1",
        whyItMatters: "文字难以辨识"
      },
      {
        id: "touch_size",
        metricLabel: "触控尺寸",
        severity: "below_recommended" as const,
        severityLabel: "满足基本要求，但未达推荐范围",
        summaryText: "触控尺寸 35 × 35 pt（基本要求 28 × 28 pt，推荐 44 × 44 pt）：已达到基本要求，但仍低于推荐值",
        whyItMatters: "操作容错率低"
      }
    ];

    const grouped = groupActionableFindings(findings);
    expect(grouped.belowThreshold.length).toBe(1);
    expect(grouped.belowThreshold[0].metricLabel).toBe("对比度");
    expect(grouped.belowRecommended.length).toBe(1);
    expect(grouped.belowRecommended[0].metricLabel).toBe("触控尺寸");
    expect(grouped.needsInfo.length).toBe(0);
  });

  // 8. Element with only below_threshold findings has empty belowRecommended list
  it("Scenario 8: element with only below_threshold findings contains only belowThreshold group", () => {
    const findings = [
      {
        id: "contrast",
        metricLabel: "对比度",
        severity: "below_threshold" as const,
        severityLabel: "不满足基本要求",
        summaryText: "对比度 2.1:1 < 4.5:1",
        whyItMatters: "文字难以辨识"
      }
    ];

    const grouped = groupActionableFindings(findings);
    expect(grouped.belowThreshold.length).toBe(1);
    expect(grouped.belowRecommended.length).toBe(0);
    expect(grouped.needsInfo.length).toBe(0);
  });

  // 9. HTML report generator renders problem overview without outer single-severity container
  it("Scenario 9: generateSelfContainedHtmlReport renders problemOverviewBlock with sibling groups", () => {
    const el: DesignElement = {
      element_id: "el-mixed",
      source: "manual",
      element_type: "button",
      interaction_type: "touch",
      normalized_bounds: { x: 0.1, y: 0.1, width: 0.1, height: 0.1 },
      image_pixel_bounds: { x: 100, y: 100, width: 105, height: 105 }, // 35x35 pt -> below_recommended
      foreground_color: "#777777",
      background_color: "#FFFFFF",
      foreground_color_state: "confirmed",
      background_color_state: "confirmed",
      calibration_mode: "preset"
    };

    const derived = recomputeElementDerivedState(el, sampleContext);
    const presentation = buildElementPresentationModel(derived, sampleContext, null, "ios");

    const html = generateSelfContainedHtmlReport({
      title: "Test Report",
      generatedAt: "2026-08-26 15:00",
      imageName: "test.png",
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
      elements: [presentation]
    });

    expect(html).toContain("problemOverviewBlock");
    expect(html).toContain("groupBelowRecommended");
    expect(html).toContain("⚠️ 满足基本要求，但未达推荐范围");
    expect(html).toContain("基本要求");
    expect(html).toContain("推荐");
  });

  // 10. Non-text elements do not derive typography estimates on character measurement
  it("Scenario 10: non-text elements do not derive text size or typography evaluations", () => {
    const el: DesignElement = {
      element_id: "icon-1",
      source: "manual",
      element_type: "icon",
      interaction_type: "touch",
      normalized_bounds: { x: 0.1, y: 0.1, width: 0.05, height: 0.05 },
      image_pixel_bounds: { x: 100, y: 100, width: 72, height: 72 },
      calibration_mode: "preset"
    };

    const derived = recomputeElementDerivedState(el, sampleContext);
    expect(derived.text_size_value).toBeUndefined();
    expect(derived.text_size_evaluation).toBeUndefined();
    expect(derived.character_height_px).toBeUndefined();
  });
});
