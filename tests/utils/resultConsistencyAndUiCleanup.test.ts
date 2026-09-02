import { describe, it, expect } from "vitest";
import { recomputeElementDerivedState, type DerivedEvaluationContext } from "../../src/utils/interactionGeometry";
import { createLogicalUnitMapping } from "../../src/utils/logicalMapping";
import { buildElementPresentationModel } from "../../src/utils/elementPresentation";
import { getUnifiedResultExplanation } from "../../src/utils/impactRecommendation";
import { generateSelfContainedHtmlReport } from "../../src/utils/reportGenerator";
import type { DesignElement, LogicalUnitMapping } from "../../src/types/designElement";
import type { ReportSummaryData, ReportElementItem } from "../../src/types/report";

describe("Result Consistency & Evaluation UI Cleanup (Phase 3J.4.2)", () => {
  const iosMapping: LogicalUnitMapping = createLogicalUnitMapping("ios", "pt", 1170, 390)!;

  const baseContext: DerivedEvaluationContext = {
    imageNaturalWidth: 1170,
    imageNaturalHeight: 2532,
    calibrationMode: "full_screen",
    allowEstimation: false,
    displaySize: "6.1 inch",
    resolution: "1170x2532",
    viewingDistance: "400mm",
    logicalMapping: iosMapping,
    contextEnvironment: "移动端",
    contextOperationState: "静止",
    userGroups: ["普通用户"]
  };

  describe("1. Duplicate Screenshot Color Action Cleanup", () => {
    it("preserves authoritative bitmap screenshot color sampling metadata while eliminating duplicate controls", () => {
      const el: DesignElement = {
        element_id: "elem-color-sample",
        source: "manual",
        element_type: "text",
        normalized_bounds: { x: 0.1, y: 0.1, width: 0.2, height: 0.05 },
        image_pixel_bounds: { x: 100, y: 100, width: 200, height: 50 },
        foreground_color: "#111827",
        foreground_color_state: "confirmed",
        foreground_color_provenance: "screenshot_sample",
        background_color: "#ffffff",
        background_color_state: "confirmed",
        background_color_provenance: "screenshot_sample",
        contrast_evaluation: {
          contrast_ratio: 15.3,
          passed: true,
          threshold: 4.5,
          evaluation_type: "text",
          status: "confirmed"
        },
        created_at: new Date().toISOString()
      };

      const derived = recomputeElementDerivedState(el, baseContext);
      const presentation = buildElementPresentationModel(derived, baseContext, null, "ios");

      expect(presentation.hasContrast).toBe(true);
      expect(presentation.contrastPassed).toBe(true);
      expect(presentation.contrastRatioDisplay).toBe("17.74:1");
      expect(presentation.contrastState).toBe("confirmed");
    });
  });

  describe("2. Multiline Text with User-Confirmed Font Size", () => {
    it("evaluates user-confirmed 11pt on iOS body as below_recommended and NEVER meets_reference", () => {
      const multilineTextEl: DesignElement = {
        element_id: "txt-multiline-11pt",
        source: "manual",
        element_type: "text",
        interaction_type: "none",
        text_layout: "multi_line",
        text_role: "body",
        text_size_value: 11,
        text_size_unit: "pt",
        text_size_source: "user_confirmed",
        normalized_bounds: { x: 0.1, y: 0.1, width: 0.3, height: 0.1 },
        image_pixel_bounds: { x: 100, y: 100, width: 351, height: 120 },
        created_at: new Date().toISOString()
      };

      const derived = recomputeElementDerivedState(multilineTextEl, baseContext);
      expect(derived.text_size_evaluation).toBeDefined();
      expect(derived.text_size_evaluation?.status).toBe("meets_minimum"); // Meets 11pt auxiliary, below 17pt body

      const presentation = buildElementPresentationModel(derived, baseContext, null, "ios");
      expect(presentation.conclusionState).toBe("below_recommended");
      expect(presentation.conclusionStateLabel).toBe("满足基本要求，但未达推荐范围");
      expect(presentation.conclusion).not.toContain("达到推荐范围");
      expect(presentation.actionableFindings.length).toBeGreaterThan(0);
      expect(presentation.actionableFindings[0].severity).toBe("below_recommended");
      expect(presentation.actionableFindings[0].summaryText).toContain("当前字号11 pt，已达到基本要求（≥ 11 pt），但仍低于推荐值（≥ 17 pt）6 pt。");
    });

    it("evaluates user-confirmed 9pt on iOS body as below_threshold (不满足基本要求)", () => {
      const multilineSmallEl: DesignElement = {
        element_id: "txt-multiline-9pt",
        source: "manual",
        element_type: "text",
        interaction_type: "none",
        text_layout: "multi_line",
        text_role: "body",
        text_size_value: 9,
        text_size_unit: "pt",
        text_size_source: "user_confirmed",
        normalized_bounds: { x: 0.1, y: 0.1, width: 0.3, height: 0.1 },
        image_pixel_bounds: { x: 100, y: 100, width: 351, height: 120 },
        created_at: new Date().toISOString()
      };

      const derived = recomputeElementDerivedState(multilineSmallEl, baseContext);
      expect(derived.text_size_evaluation?.status).toBe("below_minimum");

      const presentation = buildElementPresentationModel(derived, baseContext, null, "ios");
      expect(presentation.conclusionState).toBe("below_threshold");
      expect(presentation.conclusionStateLabel).toBe("不满足基本要求");
      expect(presentation.actionableFindings[0].severity).toBe("below_threshold");
    });
  });

  describe("3. Immediate Recomputation on Manual Font-Size Update", () => {
    it("updates unified presentation state from needs_info to below_recommended or meets_reference immediately upon input", () => {
      // Step 1: Multiline text with unconfirmed font size -> needs_info
      const initialEl: DesignElement = {
        element_id: "txt-dynamic-update",
        source: "manual",
        element_type: "text",
        interaction_type: "none",
        text_layout: "multi_line",
        text_role: "body",
        text_size_source: "estimated_from_visual_bounds",
        normalized_bounds: { x: 0.1, y: 0.1, width: 0.3, height: 0.1 },
        image_pixel_bounds: { x: 100, y: 100, width: 351, height: 120 },
        created_at: new Date().toISOString()
      };

      const derived1 = recomputeElementDerivedState(initialEl, baseContext);
      const pres1 = buildElementPresentationModel(derived1, baseContext, null, "ios");
      expect(pres1.conclusionState).toBe("measurement_only");
      expect(pres1.conclusion).toBe("源设计字号未确认");

      // Step 2: User enters 11pt -> below_recommended
      const updated11ptEl: DesignElement = {
        ...initialEl,
        text_size_value: 11,
        text_size_source: "user_confirmed"
      };
      const derived2 = recomputeElementDerivedState(updated11ptEl, baseContext);
      const pres2 = buildElementPresentationModel(derived2, baseContext, null, "ios");
      expect(pres2.conclusionState).toBe("below_recommended");

      // Step 3: User enters 18pt -> meets_reference
      const updated18ptEl: DesignElement = {
        ...initialEl,
        text_size_value: 18,
        text_size_source: "user_confirmed"
      };
      const derived3 = recomputeElementDerivedState(updated18ptEl, baseContext);
      const pres3 = buildElementPresentationModel(derived3, baseContext, null, "ios");
      expect(pres3.conclusionState).toBe("meets_reference");
    });
  });

  describe("4. HTML Overview Displays All Actionable Failures & Warnings", () => {
    it("collects touch, contrast, and text-size problems together into the element overview", () => {
      // Element with:
      // 1. Touch height 20pt (< 28pt minimum) -> below_threshold
      // 2. Contrast 3.54:1 (< 4.5:1 minimum) -> below_threshold
      // 3. Text size 11pt (< 17pt recommendation) -> below_recommended
      const multiProblemEl: DesignElement = {
        element_id: "elem-multi-problem",
        source: "manual",
        element_type: "text",
        interaction_type: "touch",
        text_role: "body",
        text_size_value: 11,
        text_size_unit: "pt",
        text_size_source: "user_confirmed",
        foreground_color: "#888888",
        foreground_color_state: "confirmed",
        background_color: "#ffffff",
        background_color_state: "confirmed",
        normalized_bounds: { x: 0.1, y: 0.1, width: 0.1, height: 0.02 },
        image_pixel_bounds: { x: 100, y: 100, width: 132, height: 60 }, // 44 x 20 pt
        created_at: new Date().toISOString()
      };

      const derived = recomputeElementDerivedState(multiProblemEl, baseContext);
      const presentation = buildElementPresentationModel(derived, baseContext, null, "ios");

      expect(presentation.conclusionState).toBe("below_threshold");
      expect(presentation.actionableFindings.length).toBe(3);

      const findings = presentation.actionableFindings;
      const contrastFinding = findings.find((f) => f.id === "contrast");
      const touchFinding = findings.find((f) => f.id === "touch_target_size");
      const textFinding = findings.find((f) => f.id === "text_size");

      expect(contrastFinding?.severity).toBe("below_threshold");
      expect(touchFinding?.severity).toBe("below_threshold");
      expect(textFinding?.severity).toBe("below_recommended");

      // Verify HTML report output contains all 3 findings
      const reportItem: ReportElementItem = {
        index: 1,
        elementId: multiProblemEl.element_id,
        label: "测试多问题按钮",
        elementType: multiProblemEl.element_type,
        elementTypeLabel: "可点击文本",
        interactionType: "touch",
        isInteractive: true,
        needsAttention: true,
        attentionReasons: ["触控高度不足", "对比度未达标", "字号偏小"],
        highestTier: "L2_PLATFORM_COMPLIANCE",
        highestTierLabel: "平台规范层",
        conclusion: presentation.conclusion,
        conclusionState: presentation.conclusionState,
        conclusionStateLabel: presentation.conclusionStateLabel,
        actionableFindings: presentation.actionableFindings,
        visualDimensionsDisplay: presentation.visualPxDisplay
      };

      const reportData: ReportSummaryData = {
        title: "UX 视觉证据报告",
        generatedAt: "2026-08-26 10:00:00",
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
        elements: [reportItem]
      };

      const html = generateSelfContainedHtmlReport(reportData);
      expect(html).toContain("需关注的问题清单");
      expect(html).toContain("触控高度 20 pt &lt; 基本要求 28 pt");
      expect(html).toContain("对比度 3.54:1 &lt; 基本要求 4.5:1");
      expect(html).toContain("当前字号11 pt，已达到基本要求（≥ 11 pt），但仍低于推荐值（≥ 17 pt）6 pt。");
    });
  });

  describe("5. Passing Metrics Omitted from Problem Overview but Kept in Detail Model", () => {
    it("omits meets_reference checks from actionableFindings while retaining them in presentation properties and rule traces", () => {
      const passingTouchFailingContrast: DesignElement = {
        element_id: "elem-pass-touch-fail-contrast",
        source: "manual",
        element_type: "button",
        interaction_type: "touch",
        foreground_color: "#aaaaaa",
        foreground_color_state: "confirmed",
        background_color: "#ffffff",
        background_color_state: "confirmed",
        normalized_bounds: { x: 0.1, y: 0.1, width: 0.15, height: 0.08 },
        image_pixel_bounds: { x: 100, y: 100, width: 150, height: 150 }, // 50 x 50 pt (exceeds 44pt)
        created_at: new Date().toISOString()
      };

      const derived = recomputeElementDerivedState(passingTouchFailingContrast, baseContext);
      const presentation = buildElementPresentationModel(derived, baseContext, null, "ios");

      // Overall state is below_threshold due to non-text contrast failure (2.32:1 < 3:1)
      expect(presentation.conclusionState).toBe("below_threshold");

      // Actionable findings only contains the contrast failure, NOT the passing touch size
      expect(presentation.actionableFindings.length).toBe(1);
      expect(presentation.actionableFindings[0].id).toBe("contrast");

      // But touch metrics remain fully populated in detail model
      expect(presentation.isInteractive).toBe(true);
      expect(presentation.touchDimensionsDisplay).toBeDefined();
      expect(presentation.touchVerdictLabel).toContain("达到推荐范围");
    });
  });



  describe("6. Overall Element State Priority Hierarchy", () => {
    it("strictly follows priority: below_threshold > below_recommended > needs_info > meets_reference / measurement_only", () => {
      // Priority test 1: below_threshold + below_recommended -> below_threshold
      const explanation1 = getUnifiedResultExplanation({
        element: { element_id: "e1", source: "manual", element_type: "button", normalized_bounds: { x: 0, y: 0, width: 0.1, height: 0.1 }, image_pixel_bounds: { x: 0, y: 0, width: 100, height: 100 }, created_at: "" },
        contrastEval: { contrast_ratio: 2.5, passed: false, threshold: 4.5, evaluation_type: "text", status: "confirmed" }, // below_threshold
        targetSizeEval: { status: "meets_minimum", measured_width: 32, measured_height: 32, min_side: 32, threshold_width: 44, threshold_height: 44, unit: "pt", summary_text: "32pt", detail_text: "", rule_id: "", rule_layer: "", reasoning_type: "", reference: "", reference_status: "", claim_strength: "" } // below_recommended
      });
      expect(explanation1.conclusionState).toBe("below_threshold");

      // Priority test 2: below_recommended + needs_info -> below_recommended
      const explanation2 = getUnifiedResultExplanation({
        element: { element_id: "e2", source: "manual", element_type: "text", text_layout: "multi_line", normalized_bounds: { x: 0, y: 0, width: 0.1, height: 0.1 }, image_pixel_bounds: { x: 0, y: 0, width: 100, height: 100 }, created_at: "" },
        textSizeEval: { status: "meets_minimum", measured_value: 11, unit: "pt", source: "user_confirmed", summary_text: "11pt" }, // below_recommended
        contrastEval: null // needs_info
      });
      expect(explanation2.conclusionState).toBe("below_recommended");
    });
  });

  describe("7. Direct Current vs Minimum / Recommended Values in Summary", () => {
    it("preserves exact numeric values, thresholds, and margins without vague wording", () => {
      const explanation = getUnifiedResultExplanation({
        element: { element_id: "e-num", source: "manual", element_type: "button", normalized_bounds: { x: 0, y: 0, width: 0.1, height: 0.1 }, image_pixel_bounds: { x: 0, y: 0, width: 100, height: 100 }, created_at: "" },
        contrastEval: { contrast_ratio: 2.62, passed: false, threshold: 4.5, evaluation_type: "text", status: "confirmed" },
        logicalMapping: iosMapping,
        targetSizeEval: { status: "below_minimum", measured_width: 321.5, measured_height: 20, min_side: 20, threshold_width: 44, threshold_height: 44, unit: "pt", summary_text: "触控高度不足", detail_text: "", rule_id: "", rule_layer: "", reasoning_type: "", reference: "", reference_status: "", claim_strength: "" }
      });


      const touchFinding = explanation.actionableFindings.find((f) => f.id === "touch_target_size");
      expect(touchFinding).toBeDefined();
      expect(touchFinding?.currentValueDisplay).toBe("321.5 × 20 pt");
      expect(touchFinding?.minimumDisplay).toBe("28 × 28 pt");
      expect(touchFinding?.recommendedDisplay).toBe("44 × 44 pt");
      expect(touchFinding?.summaryText).toContain("触控高度 20 pt < 基本要求 28 pt");

      const contrastFinding = explanation.actionableFindings.find((f) => f.id === "contrast");
      expect(contrastFinding).toBeDefined();
      expect(contrastFinding?.currentValueDisplay).toBe("2.62:1");
      expect(contrastFinding?.minimumDisplay).toBe("4.5:1");
      expect(contrastFinding?.marginDisplay).toBe("-1.88:1");
      expect(contrastFinding?.summaryText).toBe("对比度 2.62:1 < 基本要求 4.5:1 (差值 -1.88:1)");
    });
  });

  describe("8. Cross-Surface Finding Synchronization", () => {
    it("provides identical actionable findings and conclusion states across Card, Inspector, and Report models", () => {
      const el: DesignElement = {
        element_id: "elem-sync-test",
        source: "manual",
        element_type: "text",
        interaction_type: "none",
        text_layout: "single_line",
        text_role: "body",

        text_size_value: 10,
        text_size_unit: "pt",
        text_size_source: "user_confirmed",
        normalized_bounds: { x: 0.1, y: 0.1, width: 0.2, height: 0.05 },
        image_pixel_bounds: { x: 100, y: 100, width: 200, height: 50 },
        created_at: new Date().toISOString()
      };

      const derived = recomputeElementDerivedState(el, baseContext);
      const presentation = buildElementPresentationModel(derived, baseContext, null, "ios");

      // Inspector and Card model consume presentation
      expect(presentation.conclusionState).toBe("below_threshold");
      expect(presentation.actionableFindings.length).toBe(1);
      expect(presentation.actionableFindings[0].summaryText).toBe(presentation.conclusion);

      // Report model consumes identical fields
      expect(presentation.unifiedExplanation.actionableFindings).toEqual(presentation.actionableFindings);
      expect(presentation.unifiedExplanation.conclusionState).toBe(presentation.conclusionState);
    });
  });
});
