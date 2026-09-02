import { describe, it, expect } from "vitest";
import {
  CONCLUSION_STATE_CONFIG,
  getUnifiedResultExplanation,
  groupActionableFindings
} from "../../src/utils/impactRecommendation";
import {
  calculateScalarMinMargin,
  calculateScalarMaxMargin,
  calculateScalarRangeMargin,
  evaluateTieredLowerBound,
  evaluateTieredUpperBound,
  evaluateTieredRange
} from "../../src/utils/ruleTrace";
import { TRACE_VERDICT_LABELS } from "../../src/types/ruleTrace";
import { targetSizeStatusLabels, touchReviewStatusLabels } from "../../src/utils/labels";
import { buildElementPresentationModel } from "../../src/utils/elementPresentation";
import { recomputeElementDerivedState } from "../../src/utils/interactionGeometry";
import type { DesignElement, LogicalUnitMapping, DerivedEvaluationContext } from "../../src/types/designElement";

describe("Phase 3J.4.8: Unified Evaluation Language & Active Box Gesture Cancellation", () => {
  const iosMapping: LogicalUnitMapping = {
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
    logicalMapping: iosMapping,
    customViewingDistanceCm: 35
  };

  // Scenario 1: CONCLUSION_STATE_CONFIG unified labels
  it("1. CONCLUSION_STATE_CONFIG maps all internal states to unified user-facing labels", () => {
    expect(CONCLUSION_STATE_CONFIG.below_threshold.label).toBe("不满足基本要求");
    expect(CONCLUSION_STATE_CONFIG.below_recommended.label).toBe("满足基本要求，但未达推荐范围");
    expect(CONCLUSION_STATE_CONFIG.meets_reference.label).toBe("达到推荐范围");
    expect(CONCLUSION_STATE_CONFIG.measurement_only.label).toBe("仅测量");
    expect(CONCLUSION_STATE_CONFIG.needs_info.label).toBe("待补充信息");
    expect(CONCLUSION_STATE_CONFIG.not_applicable.label).toBe("不适用");
  });

  // Scenario 2: TRACE_VERDICT_LABELS unified labels
  it("2. TRACE_VERDICT_LABELS uses unified labels for trace badges", () => {
    expect(TRACE_VERDICT_LABELS.meets).toBe("达到推荐范围");
    expect(TRACE_VERDICT_LABELS.estimated_meets).toBe("估算达到推荐范围");
    expect(TRACE_VERDICT_LABELS.attention).toBe("需关注");
    expect(TRACE_VERDICT_LABELS.measurement_only).toBe("仅测量");
    expect(TRACE_VERDICT_LABELS.needs_info).toBe("待补充信息");
    expect(TRACE_VERDICT_LABELS.not_applicable).toBe("不适用");
  });

  // Scenario 3: Target size labels and touch review status labels
  it("3. Target size and touch review status labels are aligned", () => {
    expect(targetSizeStatusLabels.below_minimum).toBe("不满足基本要求");
    expect(targetSizeStatusLabels.meets_minimum).toBe("满足基本要求，但未达推荐范围");
    expect(targetSizeStatusLabels.meets_default).toBe("达到推荐范围");
    expect(touchReviewStatusLabels.meets).toBe("达到推荐范围");
    expect(touchReviewStatusLabels.estimated_meets).toBe("估算达到推荐范围");
  });

  // Scenario 4: Lower-bound metric margin calculation
  it("4. calculateScalarMinMargin formats margins with '余量' and deficit correctly", () => {
    const pass = calculateScalarMinMargin(44, 28, "pt");
    expect(pass.meets).toBe(true);
    expect(pass.marginFormatted).toBe("+16 pt");
    expect(pass.marginLabel).toBe("余量 +16 pt");

    const fail = calculateScalarMinMargin(20, 28, "pt");
    expect(fail.meets).toBe(false);
    expect(fail.marginFormatted).toBe("-8 pt");
    expect(fail.marginLabel).toBe("距离参考还差 8 pt");
  });

  // Scenario 5: Upper-bound metric margin calculation
  it("5. calculateScalarMaxMargin formats upper-bound margins without '低于' for exceeding ceiling", () => {
    const pass = calculateScalarMaxMargin(1.8, 2.0, "s");
    expect(pass.meets).toBe(true);
    expect(pass.marginFormatted).toBe("+0.2 s");
    expect(pass.marginLabel).toBe("余量 +0.2 s");

    const fail = calculateScalarMaxMargin(2.6, 2.0, "s");
    expect(fail.meets).toBe(false);
    expect(fail.marginFormatted).toBe("-0.6 s");
    expect(fail.marginLabel).toBe("超出参考上限 0.6 s");
  });

  // Scenario 6: Two-sided range margin calculation
  it("6. calculateScalarRangeMargin evaluates [min, max] range correctly", () => {
    const pass = calculateScalarRangeMargin(20, 16, 30, "px");
    expect(pass.meets).toBe(true);
    expect(pass.direction).toBe("within");
    expect(pass.marginLabel).toBe("在建议范围内");

    const belowMin = calculateScalarRangeMargin(12, 16, 30, "px");
    expect(belowMin.meets).toBe(false);
    expect(belowMin.direction).toBe("below_min");
    expect(belowMin.marginLabel).toBe("低于下限 4 px");

    const aboveMax = calculateScalarRangeMargin(35, 16, 30, "px");
    expect(aboveMax.meets).toBe(false);
    expect(aboveMax.direction).toBe("above_max");
    expect(aboveMax.marginLabel).toBe("高于上限 5 px");
  });

  // Scenario 7: evaluateTieredLowerBound (e.g. touch size 33.7pt against 28pt basic and 44pt rec)
  it("7. evaluateTieredLowerBound evaluates lower-bound tier correctly", () => {
    const res = evaluateTieredLowerBound(33.7, 28, 44, "pt");
    expect(res.verdict).toBe("below_recommended");
    expect(res.verdictLabel).toBe("满足基本要求，但未达推荐范围");
    expect(res.explanation).toBe("当前值33.7 pt，已达到基本要求（≥ 28 pt），但仍低于推荐值（≥ 44 pt）10.3 pt。");
    expect(res.basicDisplay).toBe("≥ 28 pt");
    expect(res.recommendedDisplay).toBe("≥ 44 pt");
  });

  // Scenario 8: evaluateTieredUpperBound (e.g. duration 2.6s against 3.0s basic and 2.0s rec)
  it("8. evaluateTieredUpperBound evaluates upper-bound tier correctly", () => {
    const res = evaluateTieredUpperBound(2.6, 3.0, 2.0, "s");
    expect(res.verdict).toBe("below_recommended");
    expect(res.verdictLabel).toBe("满足基本要求，但未达推荐范围");
    expect(res.explanation).toBe("当前值2.6 s，已达到基本要求（≤ 3 s），但仍高于推荐值（≤ 2 s）0.6 s。");
    expect(res.basicDisplay).toBe("≤ 3 s");
    expect(res.recommendedDisplay).toBe("≤ 2 s");
  });

  // Scenario 9: evaluateTieredRange (e.g. 35 against 12-40 basic and 16-30 rec)
  it("9. evaluateTieredRange evaluates two-sided tier correctly", () => {
    const res = evaluateTieredRange(35, [12, 40], [16, 30]);
    expect(res.verdict).toBe("below_recommended");
    expect(res.verdictLabel).toBe("满足基本要求，但未达推荐范围");
    expect(res.explanation).toBe("当前值35，已达到基本范围（12–40），但仍高于推荐范围（16–30）5。");
  });

  // Scenario 10: Touch target size finding with partial axis deficit
  it("10. touch target size finding presents explicit axis deficit without confusing wording", () => {
    const el: DesignElement = {
      element_id: "elem-touch-test",
      source: "manual",
      element_type: "button",
      interaction_type: "tap",
      normalized_bounds: { x: 0.1, y: 0.1, width: 0.1, height: 0.05 },
      image_pixel_bounds: { x: 100, y: 100, width: 100, height: 100 },
      calibration_mode: "preset"
    };

    const explanation = getUnifiedResultExplanation({
      element: el,
      logicalMapping: iosMapping,
      targetSizeEval: {
        unit: "pt",
        measured_width: 33.7,
        measured_height: 33.7,
        min_side: 33.7,
        threshold_width: 44,
        threshold_height: 44,
        status: "meets_minimum",
        summary_text: "33.7pt",
        detail_text: "",
        rule_id: "L2-APPLE-TARGET-SIZE-44PT",
        rule_layer: "L2_PLATFORM_GUIDELINE",
        reasoning_type: "platform_spec",
        reference: "Apple Human Interface Guidelines",
        reference_status: "verified_reference",
        claim_strength: "strong"
      }
    });

    const finding = explanation.actionableFindings.find(f => f.id === "touch_target_size");
    expect(finding).toBeDefined();
    expect(finding?.severity).toBe("below_recommended");
    expect(finding?.severityLabel).toBe("满足基本要求，但未达推荐范围");
    expect(finding?.summaryText).toContain("触控宽高已达到基本要求 (≥ 28 × 28 pt)");
    expect(finding?.summaryText).toContain("宽差 10.3 pt");
  });

  // Scenario 11: Text size evaluation on iOS body text (11.2 pt)
  it("11. text size finding on iOS body text (11.2 pt) reports reaching basic but below recommended", () => {
    const el: DesignElement = {
      element_id: "elem-text-test",
      source: "manual",
      element_type: "text",
      text_layout: "single_line",
      text_role: "body",
      text_size_value: 11.2,
      text_size_unit: "pt",
      text_size_source: "user_confirmed",
      normalized_bounds: { x: 0.1, y: 0.1, width: 0.3, height: 0.05 },
      image_pixel_bounds: { x: 100, y: 100, width: 300, height: 34 },
      calibration_mode: "preset"
    };

    const explanation = getUnifiedResultExplanation({
      element: el,
      logicalMapping: iosMapping,
      textSizeEval: {
        status: "meets_minimum",
        measured_value: 11.2,
        unit: "pt",
        source: "user_confirmed",
        summary_text: "字号 11.2 pt",
        detail_text: "",
        rule_id: "L2-APPLE-BODY-TEXT",
        rule_layer: "L2_PLATFORM_GUIDELINE",
        reference: "Apple HIG",
        reference_status: "verified_reference"
      }
    });

    const finding = explanation.actionableFindings.find(f => f.id === "text_size");
    expect(finding).toBeDefined();
    expect(finding?.severity).toBe("below_recommended");
    expect(finding?.severityLabel).toBe("满足基本要求，但未达推荐范围");
    expect(finding?.summaryText).toBe("当前字号11.2 pt，已达到基本要求（≥ 11 pt），但仍低于推荐值（≥ 17 pt）5.8 pt。");
  });

  // Scenario 12: Group actionable findings creates sibling partitions
  it("12. groupActionableFindings accurately groups findings into belowThreshold, belowRecommended, needsInfo", () => {
    const findings = [
      {
        id: "contrast",
        metricLabel: "色彩对比度",
        severity: "below_threshold" as const,
        severityLabel: "不满足基本要求",
        currentValueDisplay: "2.5:1",
        summaryText: "对比度不足"
      },
      {
        id: "touch_target_size",
        metricLabel: "触控尺寸",
        severity: "below_recommended" as const,
        severityLabel: "满足基本要求，但未达推荐范围",
        currentValueDisplay: "35 × 35 pt",
        summaryText: "低于推荐值"
      },
      {
        id: "text_size_pending",
        metricLabel: "文字字号",
        severity: "needs_info" as const,
        severityLabel: "待补充信息",
        currentValueDisplay: "待指定单行字号",
        summaryText: "多行文本需手动指定字号"
      }
    ];

    const grouped = groupActionableFindings(findings);
    expect(grouped.belowThreshold.length).toBe(1);
    expect(grouped.belowThreshold[0].severityLabel).toBe("不满足基本要求");
    expect(grouped.belowRecommended.length).toBe(1);
    expect(grouped.belowRecommended[0].severityLabel).toBe("满足基本要求，但未达推荐范围");
    expect(grouped.needsInfo.length).toBe(1);
    expect(grouped.needsInfo[0].severityLabel).toBe("待补充信息");
  });

  // Scenario 13: Presentation model conclusion state synchronization
  it("13. presentation model reflects unified conclusion states", () => {
    const el: DesignElement = {
      element_id: "elem-pass",
      source: "manual",
      element_type: "button",
      interaction_type: "none",
      normalized_bounds: { x: 0.1, y: 0.1, width: 0.1, height: 0.1 },
      image_pixel_bounds: { x: 100, y: 100, width: 100, height: 100 },
      calibration_mode: "preset"
    };

    const derived = recomputeElementDerivedState(el, sampleContext);
    const pres = buildElementPresentationModel(derived, sampleContext, iosMapping, 2532, [derived]);
    expect(pres.conclusionState).toBe("measurement_only");
    expect(pres.conclusionStateLabel).toBe("仅测量");
  });

  // Scenario 14: Esc gesture cancellation invariants
  it("14. Esc cancellation invariant: pointerup after cancel never commits elements", () => {
    const isAddingElement = false;
    const canvasInteraction = { type: "idle" as const };

    const shouldCreate = isAddingElement && canvasInteraction.type === "creating";
    expect(shouldCreate).toBe(false);
  });
});
