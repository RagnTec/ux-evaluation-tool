import { describe, it, expect } from "vitest";
import {
  recomputeElementDerivedState,
  type DerivedEvaluationContext
} from "../../src/utils/interactionGeometry";
import {
  buildElementPresentationModel
} from "../../src/utils/elementPresentation";
import {
  groupActionableFindings,
  getUnifiedResultExplanation
} from "../../src/utils/impactRecommendation";
import {
  generateSelfContainedHtmlReport
} from "../../src/utils/reportGenerator";
import type { DesignElement } from "../../src/types/designElement";
import type { ReportSummaryData } from "../../src/types/report";

describe("Phase 3J.4.3: Existing-Element Recompute & Evaluation UX Consistency", () => {
  const baseContext: DerivedEvaluationContext = {
    imageNaturalWidth: 1170,
    imageNaturalHeight: 2532,
    displaySize: '6.1"',
    resolution: "2532x1170",
    viewingDistance: "40cm",
    calibrationMode: "full_screen",
    croppedScaleMode: "unknown_or_resized",
    allowEstimation: true,
    logicalMapping: {
      platform: "ios",
      unit: "pt",
      image_reference_width: 1170,
      logical_reference_width: 390,
      scale_x: 1 / 3,
      scale_y: 1 / 3
    }
  };

  it("1. Recomputes legacy element with stale derived states into fresh, consistent evaluation", () => {
    const legacyElement: DesignElement = {
      element_id: "legacy_btn_1",
      element_type: "button",
      interaction_type: "primary_action",
      label: "Legacy Button",
      normalized_bounds: { x: 0.1, y: 0.1, width: 0.2, height: 0.05 },
      image_pixel_bounds: { x: 117, y: 126, width: 90, height: 90 }, // 90px / 3 = 30pt
      target_size_evaluation: {
        measured_width: 30,
        measured_height: 30,
        threshold_width: 44,
        threshold_height: 44,
        unit: "pt",
        status: "meets_default" as any, // Stale wrong value!
        result_basis: "inferred"
      }
    };

    const recomputed = recomputeElementDerivedState(legacyElement, baseContext);
    expect(recomputed.target_size_evaluation?.status).toBe("meets_minimum");
    expect(recomputed.target_size_evaluation?.measured_width).toBe(30);

    const presentation = buildElementPresentationModel(legacyElement, baseContext, null, "ios");
    expect(presentation.conclusionState).toBe("below_recommended");
    expect(presentation.actionableFindings.length).toBeGreaterThan(0);
    expect(presentation.actionableFindings[0].summaryText).toContain("但仍低于推荐值");
  });

  it("2. Multiline text with user-confirmed font size recomputes against platform recommendation", () => {
    const multiLineElement: DesignElement = {
      element_id: "ml_text_1",
      element_type: "text",
      interaction_type: "none",
      text_layout: "multi_line",
      text_role: "body",
      text_size_value: 11,
      text_size_unit: "pt",
      text_size_source: "user_confirmed",
      normalized_bounds: { x: 0.1, y: 0.2, width: 0.8, height: 0.2 },
      image_pixel_bounds: { x: 117, y: 506, width: 936, height: 506 }
    };

    const recomputed = recomputeElementDerivedState(multiLineElement, baseContext);
    expect(recomputed.text_size_evaluation?.status).toBe("meets_minimum");
    expect(recomputed.text_size_evaluation?.measured_value).toBe(11);

    const presentation = buildElementPresentationModel(multiLineElement, baseContext, null, "ios");
    expect(presentation.conclusionState).toBe("below_recommended");
    expect(presentation.actionableFindings.some((f) => f.summaryText.includes("低于推荐值（≥ 17 pt）6 pt"))).toBe(true);
  });

  it("3. Multiline text without user-confirmed font size does not run synthetic bounding box estimation", () => {
    const multiLineUnconfirmed: DesignElement = {
      element_id: "ml_text_2",
      element_type: "text",
      interaction_type: "none",
      text_layout: "multi_line",
      text_role: "body",
      text_size_value: undefined,
      normalized_bounds: { x: 0.1, y: 0.2, width: 0.8, height: 0.2 },
      image_pixel_bounds: { x: 117, y: 506, width: 936, height: 506 }
    };

    const recomputed = recomputeElementDerivedState(multiLineUnconfirmed, baseContext);
    expect(recomputed.text_size_evaluation?.status).toBe("needs_info");

    const presentation = buildElementPresentationModel(multiLineUnconfirmed, baseContext, null, "ios");
    expect(presentation.textSizeStatus).toBe("needs_confirmation");
    expect(presentation.textSizeDisplay).toBe("未确认");
  });

  it("4. Result card and Inspector share identical conclusionState and actionableFindings", () => {
    const btnElement: DesignElement = {
      element_id: "btn_test_4",
      element_type: "button",
      interaction_type: "primary_action",
      label: "Test Button",
      normalized_bounds: { x: 0.1, y: 0.1, width: 0.2, height: 0.05 },
      image_pixel_bounds: { x: 117, y: 126, width: 120, height: 120 },
      foreground_color: "#777777",
      background_color: "#FFFFFF",
      foreground_color_state: "confirmed"
    };

    const recomputed = recomputeElementDerivedState(btnElement, baseContext);
    const presentation = buildElementPresentationModel(recomputed, baseContext, null, "ios");
    const explanation = getUnifiedResultExplanation({
      element: recomputed,
      isInteractive: true,
      contextOperationState: "静止",
      targetSizeEval: recomputed.target_size_evaluation,
      contrastEval: recomputed.contrast_evaluation
    });

    expect(presentation.conclusionState).toBe(explanation.conclusionState);
    expect(presentation.actionableFindings.length).toBe(explanation.actionableFindings.length);
    expect(presentation.actionableFindings.map((f) => f.id)).toEqual(explanation.actionableFindings.map((f) => f.id));
  });

  it("5. Axis-aware touch target summary reports only failing axis when one axis passes", () => {
    const asymmetricBtn: DesignElement = {
      element_id: "asym_btn",
      element_type: "button",
      interaction_type: "primary_action",
      label: "Asymmetric Button",
      normalized_bounds: { x: 0.1, y: 0.1, width: 0.2, height: 0.05 },
      image_pixel_bounds: { x: 117, y: 126, width: 132, height: 100 }
    };

    const presentation = buildElementPresentationModel(asymmetricBtn, baseContext, null, "ios");
    expect(presentation.actionableFindings.length).toBe(1);
    const finding = presentation.actionableFindings[0];
    expect(finding.summaryText).toContain("基本要求");
    expect(finding.summaryText).toContain("推荐");
    expect(finding.summaryText).toContain("高度已达到基本要求，但仍低于推荐值");
  });

  it("6. groupActionableFindings accurately groups findings by severity", () => {
    const findings = [
      { id: "1", metricLabel: "对比度", summaryText: "对比度 2.1:1 < 3.0:1", severity: "below_threshold" as const, severityLabel: "不满足基本要求" },
      { id: "2", metricLabel: "触控尺寸", summaryText: "触控高度 38 pt < 推荐 44 pt", severity: "below_recommended" as const, severityLabel: "满足基本要求，但未达推荐范围" },
      { id: "3", metricLabel: "段落字号", summaryText: "多行段落需确认设计源字号", severity: "needs_info" as const, severityLabel: "待补充" }
    ];

    const grouped = groupActionableFindings(findings);
    expect(grouped.belowThreshold.length).toBe(1);
    expect(grouped.belowRecommended.length).toBe(1);
    expect(grouped.needsInfo.length).toBe(1);
    expect(grouped.belowThreshold[0].id).toBe("1");
    expect(grouped.belowRecommended[0].id).toBe("2");
    expect(grouped.needsInfo[0].id).toBe("3");
  });

  it("7. Self-contained HTML report renders grouped problem sections", () => {
    const reportData: ReportSummaryData = {
      title: "UX Evaluation Tool — 视觉证据报告",
      generatedAt: "2026/8/26 10:00:00",
      imageName: "test.png",
      imageNaturalDimensions: { width: 1170, height: 2532 },
      screenshotScope: "full_screen",
      screenshotScopeLabel: "完整屏幕截图",
      totalElementsCount: 1,
      attentionCount: 1,
      filter: "all",
      filterCount: 1,
      designInfoStatus: "source_available",
      targetPlatform: "ios",
      targetPlatformLabel: "iOS",
      logicalUnit: "pt",
      displaySize: '6.1"',
      resolution: "2532x1170",
      viewingDistance: "40cm",
      scenario: "手机普通操作",
      assumptions: [],
      elements: [
        {
          index: 1,
          elementId: "el-1",
          label: "提交按钮",
          elementType: "button",
          elementTypeLabel: "按钮",
          interactionType: "primary_action",
          isInteractive: true,
          needsAttention: true,
          attentionReasons: ["触控热区偏小"],
          highestTier: "platform_standard",
          highestTierLabel: "平台硬约束 / 标准",
          conclusion: "对比度 2.1:1 低于 WCAG 3:1 阈值",
          conclusionState: "below_threshold",
          conclusionStateLabel: "不满足基本要求",
          visualDimensionsDisplay: "100 × 100 px",
          actionableFindings: [
            {
              id: "contrast_fail",
              metricLabel: "对比度",
              severity: "below_threshold",
              severityLabel: "不满足基本要求",
              currentValueDisplay: "2.1:1",
              summaryText: "对比度 2.1:1 < 3.0:1",
              whyItMatters: "辨识困难"
            }
          ]
        }
      ]
    };

    const html = generateSelfContainedHtmlReport(reportData);
    expect(html).toContain("groupedFindingsContainer");
    expect(html).toContain("❌ 不满足基本要求");
    expect(html).toContain("对比度 2.1:1 &lt; 3.0:1");
  });
});
