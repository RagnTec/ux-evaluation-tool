import { describe, it, expect } from "vitest";
import {
  recomputeElementDerivedState,
  type DerivedEvaluationContext
} from "../../src/utils/interactionGeometry";
import {
  buildElementPresentationModel
} from "../../src/utils/elementPresentation";
import {
  buildTextSizeTrace
} from "../../src/utils/ruleTrace";
import {
  generateSelfContainedHtmlReport
} from "../../src/utils/reportGenerator";
import { evaluateTextSize } from "../../src/utils/textSizeEvaluation";
import type { DesignElement } from "../../src/types/designElement";
import type { ReportSummaryData } from "../../src/types/report";

describe("Phase 3J.4.4: Text Role Threshold & Verdict Consistency", () => {
  const iosContext: DerivedEvaluationContext = {
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

  const iosMapping = iosContext.logicalMapping!;

  // 1. 11 pt + Body + 17 pt reference -> not meets_reference (is below_recommended)
  it("1. 11 pt text with Body role evaluates to below_recommended and not meets_reference", () => {
    const textEl: DesignElement = {
      element_id: "txt_body_11pt",
      element_type: "text",
      interaction_type: "none",
      text_layout: "single_line",
      text_role: "body",
      text_size_value: 11,
      text_size_unit: "pt",
      text_size_source: "user_confirmed",
      normalized_bounds: { x: 0.1, y: 0.1, width: 0.5, height: 0.05 },
      image_pixel_bounds: { x: 100, y: 100, width: 300, height: 33 }
    };

    const recomputed = recomputeElementDerivedState(textEl, iosContext);
    expect(recomputed.text_size_evaluation?.status).toBe("meets_minimum");
    expect(recomputed.text_size_evaluation?.rule_id).toBe("L2-APPLE-BODY-TEXT");

    const presentation = buildElementPresentationModel(recomputed, iosContext, null, "ios");
    expect(presentation.conclusionState).toBe("below_recommended");
    expect(presentation.conclusionState).not.toBe("meets_reference");
    expect(presentation.conclusionStateBadgeClass).toBe("badge-below_recommended");

    const trace = buildTextSizeTrace(recomputed.text_size_evaluation, iosMapping);
    expect(trace.verdict).toBe("below_recommended");
    expect(trace.verdictLabel).toBe("满足基本要求，但未达推荐范围");
    expect(trace.verdict).not.toBe("meets");
    if (trace.comparison.kind === "scalar_min") {
      expect(trace.comparison.threshold).toBe(17);
      expect(trace.comparison.margin).toBe(-6);
      expect(trace.comparison.marginFormatted).toBe("-6 pt");
    }
  });

  // 2. switching Body -> Caption/Footnote -> threshold/source/verdict/margin all recompute together
  it("2. switching Body to Caption recomputes threshold, verdict, margin and explanation together", () => {
    const bodyEl: DesignElement = {
      element_id: "txt_switch_role",
      element_type: "text",
      interaction_type: "none",
      text_layout: "single_line",
      text_role: "body",
      text_size_value: 11,
      text_size_unit: "pt",
      text_size_source: "user_confirmed",
      normalized_bounds: { x: 0.1, y: 0.1, width: 0.5, height: 0.05 },
      image_pixel_bounds: { x: 100, y: 100, width: 300, height: 33 }
    };

    // Evaluated as Body
    const bodyState = recomputeElementDerivedState(bodyEl, iosContext);
    const bodyPres = buildElementPresentationModel(bodyState, iosContext, null, "ios");
    const bodyTrace = buildTextSizeTrace(bodyState.text_size_evaluation, iosMapping);

    expect(bodyState.text_size_evaluation?.status).toBe("meets_minimum");
    expect(bodyPres.conclusionState).toBe("below_recommended");
    expect(bodyTrace.verdict).toBe("below_recommended");
    expect(bodyTrace.comparison.kind).toBe("scalar_min");

    // Switched to Caption
    const captionEl: DesignElement = {
      ...bodyEl,
      text_role: "caption"
    };
    const captionState = recomputeElementDerivedState(captionEl, iosContext);
    const captionPres = buildElementPresentationModel(captionState, iosContext, null, "ios");
    const captionTrace = buildTextSizeTrace(captionState.text_size_evaluation, iosMapping);

    expect(captionState.text_size_evaluation?.status).toBe("meets_minimum");
    expect(captionState.text_size_evaluation?.rule_id).toBe("L2-APPLE-TEXT-FALLBACK");
    expect(captionState.text_size_evaluation?.summary_text).toContain("暂借用正文文字阈值");

    expect(captionPres.conclusionState).toBe("below_recommended");
    expect(captionPres.conclusionStateBadgeClass).toBe("badge-below_recommended");
    expect(captionPres.actionableFindings.length).toBe(1);
    expect(captionPres.actionableFindings[0].summaryText).toContain("暂借用正文文字阈值");

    expect(captionTrace.verdict).toBe("below_recommended");
    expect(captionTrace.verdictLabel).toBe("满足基本要求，但未达推荐范围");
    expect(captionTrace.comparison.kind).toBe("scalar_min");
    expect(captionTrace.ruleId).toBe("L2-APPLE-TEXT-FALLBACK");
  });

  // 3. no verified Caption/Footnote threshold -> borrows body reference and does not produce false meets_reference
  it("3. text role without verified threshold borrows body reference and does not produce false meets_reference", () => {
    const roles: Array<DesignElement["text_role"]> = ["caption", "label", "heading", "other"];

    for (const r of roles) {
      const el: DesignElement = {
        element_id: `txt_${r}`,
        element_type: "text",
        interaction_type: "none",
        text_layout: "single_line",
        text_role: r,
        text_size_value: 11,
        text_size_unit: "pt",
        text_size_source: "user_confirmed",
        normalized_bounds: { x: 0.1, y: 0.1, width: 0.5, height: 0.05 },
        image_pixel_bounds: { x: 100, y: 100, width: 300, height: 33 }
      };

      const evalRes = evaluateTextSize(el, "ios", iosMapping);
      expect(evalRes?.status).toBe("meets_minimum");
      expect(evalRes?.rule_id).toBe("L2-APPLE-TEXT-FALLBACK");

      const pres = buildElementPresentationModel(el, iosContext, null, "ios");
      expect(pres.conclusionState).toBe("below_recommended");
      expect(pres.conclusionState).not.toBe("meets_reference");

      const trace = buildTextSizeTrace(evalRes, iosMapping);
      expect(trace.verdict).toBe("below_recommended");
      expect(trace.comparison.kind).toBe("scalar_min");
    }
  });

  // 4. if a verified minimum + recommended pair exists: current meets minimum but misses recommended -> below_recommended
  it("4. distinguishes verified minimum (11pt) vs recommended (17pt) with below_recommended", () => {
    const el13pt: DesignElement = {
      element_id: "txt_13pt",
      element_type: "text",
      interaction_type: "none",
      text_layout: "single_line",
      text_role: "body",
      text_size_value: 13,
      text_size_unit: "pt",
      text_size_source: "user_confirmed",
      normalized_bounds: { x: 0.1, y: 0.1, width: 0.5, height: 0.05 },
      image_pixel_bounds: { x: 100, y: 100, width: 300, height: 39 }
    };

    const state = recomputeElementDerivedState(el13pt, iosContext);
    expect(state.text_size_evaluation?.status).toBe("meets_minimum");

    const pres = buildElementPresentationModel(state, iosContext, null, "ios");
    expect(pres.conclusionState).toBe("below_recommended");
    expect(pres.actionableFindings.length).toBe(1);
    expect(pres.actionableFindings[0].severity).toBe("below_recommended");
    expect(pres.actionableFindings[0].minimumDisplay).toBe("11 pt");
    expect(pres.actionableFindings[0].recommendedDisplay).toBe("17 pt");
    expect(pres.actionableFindings[0].marginDisplay).toBe("-4 pt");
    expect(pres.actionableFindings[0].summaryText).toContain("当前字号13 pt，已达到基本要求（≥ 11 pt），但仍低于推荐值（≥ 17 pt）4 pt。");
  });

  // 5. negative margin can never coexist with meets_reference
  it("5. negative margin never coexists with meets_reference across all surfaces", () => {
    const el9pt: DesignElement = {
      element_id: "txt_9pt",
      element_type: "text",
      interaction_type: "none",
      text_layout: "single_line",
      text_role: "body",
      text_size_value: 9,
      text_size_unit: "pt",
      text_size_source: "user_confirmed",
      normalized_bounds: { x: 0.1, y: 0.1, width: 0.5, height: 0.05 },
      image_pixel_bounds: { x: 100, y: 100, width: 300, height: 27 }
    };

    const state = recomputeElementDerivedState(el9pt, iosContext);
    const pres = buildElementPresentationModel(state, iosContext, null, "ios");
    const trace = buildTextSizeTrace(state.text_size_evaluation, iosMapping);

    expect(pres.conclusionState).toBe("below_threshold");
    expect(pres.conclusionState).not.toBe("meets_reference");
    expect(trace.verdict).toBe("attention");
    expect(trace.verdict).not.toBe("meets");

    if (trace.comparison.kind === "scalar_min") {
      expect(trace.comparison.margin).toBeLessThan(0);
      expect(trace.verdict).not.toBe("meets");
    }
  });

  // 6. existing restored element and newly created equivalent element -> same text-size result
  it("6. restored legacy element and newly created element yield identical text-size results", () => {
    // Restored element from persisted storage with potential legacy/stale fields
    const restoredElement: DesignElement = {
      element_id: "restored_1",
      element_type: "text",
      interaction_type: "none",
      text_layout: "single_line",
      text_role: "caption",
      text_size_value: 11,
      text_size_unit: "pt",
      text_size_source: "user_confirmed",
      normalized_bounds: { x: 0.1, y: 0.1, width: 0.5, height: 0.05 },
      image_pixel_bounds: { x: 100, y: 100, width: 300, height: 33 },
      text_size_evaluation: {
        status: "meets_default", // Old stale value!
        measured_value: 11,
        unit: "pt",
        source: "user_confirmed",
        summary_text: "Old summary",
        detail_text: ""
      }
    };

    // Newly created element with same source facts
    const newElement: DesignElement = {
      element_id: "new_1",
      element_type: "text",
      interaction_type: "none",
      text_layout: "single_line",
      text_role: "caption",
      text_size_value: 11,
      text_size_unit: "pt",
      text_size_source: "user_confirmed",
      normalized_bounds: { x: 0.1, y: 0.1, width: 0.5, height: 0.05 },
      image_pixel_bounds: { x: 100, y: 100, width: 300, height: 33 }
    };

    const recomputedRestored = recomputeElementDerivedState(restoredElement, iosContext);
    const recomputedNew = recomputeElementDerivedState(newElement, iosContext);

    expect(recomputedRestored.text_size_evaluation?.status).toBe(recomputedNew.text_size_evaluation?.status);
    expect(recomputedRestored.text_size_evaluation?.status).toBe("meets_minimum");

    const presRestored = buildElementPresentationModel(restoredElement, iosContext, null, "ios");
    const presNew = buildElementPresentationModel(newElement, iosContext, null, "ios");

    expect(presRestored.conclusionState).toBe(presNew.conclusionState);
    expect(presRestored.conclusionState).toBe("below_recommended");
    expect(presRestored.actionableFindings).toEqual(presNew.actionableFindings);
  });

  // 7. card / Inspector / report model use identical text-size verdict/reference
  it("7. card, Inspector and exported report HTML consume identical verdict and reference", () => {
    const textEl: DesignElement = {
      element_id: "txt_consistency_check",
      element_type: "text",
      interaction_type: "none",
      text_layout: "single_line",
      text_role: "caption",
      text_size_value: 11,
      text_size_unit: "pt",
      text_size_source: "user_confirmed",
      normalized_bounds: { x: 0.1, y: 0.1, width: 0.5, height: 0.05 },
      image_pixel_bounds: { x: 100, y: 100, width: 300, height: 33 }
    };

    // 1. Recomputed element state
    const state = recomputeElementDerivedState(textEl, iosContext);

    // 2. Presentation Model (feeds Card & Inspector)
    const presentation = buildElementPresentationModel(state, iosContext, null, "ios");

    // 3. Rule trace (feeds Inspector trace section & HTML report traces)
    const trace = buildTextSizeTrace(state.text_size_evaluation, iosMapping);

    // 4. HTML report generation
    const reportData: ReportSummaryData = {
      imageNaturalDimensions: { width: 1170, height: 2532 },
      screenshotScopeLabel: "全屏截图",
      designInfoStatus: "configured",
      platformLabel: "iOS",
      evaluationMode: "mixed",
      totalElementsCount: 1,
      attentionCount: 0,
      elements: [
        {
          index: 1,
          id: state.element_id,
          label: state.label || "说明文字",
          elementType: state.element_type,
          elementTypeLabel: "文本",
          visualDimensionsDisplay: presentation.visualPxDisplay,
          touchDimensionsDisplay: presentation.touchDimensionsDisplay,
          touchProvenance: presentation.touchProvenanceLabel,
          nearestSpacingDisplay: presentation.nearestSpacingDisplay,
          physicalDimensionsDisplay: presentation.physicalDisplay,
          visualAngleDisplay: presentation.visualAngleDisplay,
          visualAngleViewingDistanceDisplay: presentation.visualAngleViewingDistanceDisplay,
          visualAngleTextSemanticNote: presentation.visualAngleTextSemanticNote,
          conclusionState: presentation.conclusionState,
          conclusionStateLabel: presentation.conclusionStateLabel,
          conclusion: presentation.conclusion,
          whyItMatters: presentation.whyItMatters,
          actionableFindings: presentation.actionableFindings,
          ruleTraces: [
            {
              metricLabel: trace.metricLabel,
              currentValueDisplay: trace.currentValueDisplay,
              verdictLabel: trace.verdictLabel,
              verdict: trace.verdict,
              ruleTitle: trace.ruleTitle,
              ruleLayer: trace.ruleLayer,
              evidenceStatus: trace.evidenceStatus,
              marginLabel:
                trace.comparison.kind === "scalar_min" || trace.comparison.kind === "scalar_max"
                  ? trace.comparison.marginLabel
                  : undefined,
              explanation:
                trace.comparison.kind === "measurement_only"
                  ? trace.comparison.explanation
                  : undefined
            }
          ]
        }
      ]
    };

    const html = generateSelfContainedHtmlReport(reportData);

    // Consistency assertions
    expect(presentation.conclusionState).toBe("below_recommended");
    expect(trace.verdict).toBe("below_recommended");
    expect(html).toContain('class="ruleTraceVerdict badge-below_recommended"');
    expect(html).not.toContain('class="ruleTraceVerdict badge-meets"');
    expect(html).not.toContain("达到 Apple HIG 默认正文参考字号");
  });
});
