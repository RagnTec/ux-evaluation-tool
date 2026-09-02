import { describe, it, expect } from "vitest";
import {
  recomputeElementDerivedState,
  type DerivedEvaluationContext
} from "../../src/utils/interactionGeometry";
import {
  buildElementPresentationModel
} from "../../src/utils/elementPresentation";
import {
  buildTextSizeTrace,
  buildTargetSizeTrace
} from "../../src/utils/ruleTrace";
import {
  getUnifiedResultExplanation
} from "../../src/utils/impactRecommendation";
import {
  generateSelfContainedHtmlReport
} from "../../src/utils/reportGenerator";
import type { DesignElement } from "../../src/types/designElement";
import type { ReportSummaryData } from "../../src/types/report";

describe("Cross-Type Measurement Consistency & Domain-Neutral Terminology Alignment", () => {
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

  const sharedBounds = {
    normalized_bounds: { x: 0.1, y: 0.2, width: 0.3, height: 0.05 },
    image_pixel_bounds: { x: 117, y: 506, width: 351, height: 126.6 }
  };

  // 1. Same bounds/context as Text vs Icon -> identical px/mm/screen-share/element visual-angle measurements
  it("1. produces identical px, mm, screen-share, and visual angle for Text vs Icon with identical bounds and context", () => {
    const textEl: DesignElement = {
      element_id: "el_text",
      element_type: "text",
      interaction_type: "none",
      ...sharedBounds
    };

    const iconEl: DesignElement = {
      element_id: "el_icon",
      element_type: "icon",
      interaction_type: "none",
      ...sharedBounds
    };

    const textPres = buildElementPresentationModel(textEl, baseContext, null, "ios");
    const iconPres = buildElementPresentationModel(iconEl, baseContext, null, "ios");

    // Pixel dimensions & area
    expect(textPres.visualPxDisplay).toBe(iconPres.visualPxDisplay);
    expect(textPres.visualAreaDisplay).toBe(iconPres.visualAreaDisplay);

    // Screen share & min side
    expect(textPres.screenShareDisplay).toBe(iconPres.screenShareDisplay);
    expect(textPres.minSideDisplay).toBe(iconPres.minSideDisplay);

    // Physical dimensions
    expect(textPres.physicalDisplay).toBe(iconPres.physicalDisplay);
    expect(textPres.physicalWidthMm).toBe(iconPres.physicalWidthMm);
    expect(textPres.physicalHeightMm).toBe(iconPres.physicalHeightMm);

    // Visual angle
    expect(textPres.visualAngleDisplay).toBe(iconPres.visualAngleDisplay);
    expect(textPres.visualAngleHorizontalDeg).toBe(iconPres.visualAngleHorizontalDeg);
    expect(textPres.visualAngleVerticalDeg).toBe(iconPres.visualAngleVerticalDeg);
    expect(textPres.visualAngleViewingDistanceDisplay).toBe(iconPres.visualAngleViewingDistanceDisplay);
  });

  // 2. Same bounds/context: Button vs Input -> identical shared measurements
  it("2. produces identical shared measurements for Button vs Input with identical bounds and context", () => {
    const btnEl: DesignElement = {
      element_id: "el_btn",
      element_type: "button",
      interaction_type: "none",
      ...sharedBounds
    };

    const inputEl: DesignElement = {
      element_id: "el_input",
      element_type: "input",
      interaction_type: "none",
      ...sharedBounds
    };

    const btnPres = buildElementPresentationModel(btnEl, baseContext, null, "ios");
    const inputPres = buildElementPresentationModel(inputEl, baseContext, null, "ios");

    expect(btnPres.visualPxDisplay).toBe(inputPres.visualPxDisplay);
    expect(btnPres.visualAreaDisplay).toBe(inputPres.visualAreaDisplay);
    expect(btnPres.physicalDisplay).toBe(inputPres.physicalDisplay);
    expect(btnPres.screenShareDisplay).toBe(inputPres.screenShareDisplay);
    expect(btnPres.visualAngleDisplay).toBe(inputPres.visualAngleDisplay);
  });

  // 3. Text -> Icon -> text-specific derived results removed
  it("3. switching Text to Icon clears all text-specific derived evaluations and typography properties", () => {
    const textEl: DesignElement = {
      element_id: "el_switch_to_icon",
      element_type: "text",
      interaction_type: "none",
      text_layout: "single_line",
      text_role: "body",
      text_size_value: 16,
      text_size_unit: "pt",
      text_size_source: "user_confirmed",
      character_height_px: 24,
      character_height_source: "measured_rendered_character",
      ...sharedBounds
    };

    const textState = recomputeElementDerivedState(textEl, baseContext);
    expect(textState.text_size_evaluation).toBeDefined();
    expect(textState.character_height_visual_angle).toBeDefined();

    // Switch element_type to icon
    const iconEl: DesignElement = {
      ...textState,
      element_type: "icon"
    };

    const iconState = recomputeElementDerivedState(iconEl, baseContext);
    expect(iconState.text_size_evaluation).toBeUndefined();
    expect(iconState.text_size_value).toBeUndefined();
    expect(iconState.text_size_unit).toBeUndefined();
    expect(iconState.text_size_source).toBeUndefined();
    expect(iconState.text_role).toBeUndefined();
    expect(iconState.text_layout).toBeUndefined();
    expect(iconState.character_height_px).toBeUndefined();
    expect(iconState.character_height_source).toBeUndefined();
    expect(iconState.character_height_physical_mm).toBeUndefined();
    expect(iconState.character_height_visual_angle).toBeUndefined();

    const iconPres = buildElementPresentationModel(iconState, baseContext, null, "ios");
    expect(iconPres.characterHeightDisplay).toBeUndefined();
    expect(iconPres.characterHeightVisualAngleDisplay).toBeUndefined();
    expect(iconPres.textVisualHeightDisplay).toBeUndefined();
  });

  // 4. Icon -> Text -> icon-specific derived results removed
  it("4. switching Icon to Text recomputes typography evaluation and does not misinterpret icon bounds as character height", () => {
    const iconEl: DesignElement = {
      element_id: "el_switch_to_text",
      element_type: "icon",
      interaction_type: "none",
      ...sharedBounds
    };

    const iconState = recomputeElementDerivedState(iconEl, baseContext);
    expect(iconState.text_size_evaluation).toBeUndefined();

    // Switch element_type to text
    const textEl: DesignElement = {
      ...iconState,
      element_type: "text",
      text_layout: "single_line",
      text_role: "body"
    };

    const textState = recomputeElementDerivedState(textEl, baseContext);
    expect(textState.text_size_evaluation).toBeDefined();
    expect(textState.character_height_px).toBeUndefined();
    expect(textState.character_height_visual_angle).toBeUndefined();
  });

  // 5. Outer bounds never automatically become character_height, primary_graphical_element, or touch_bounds
  it("5. outer bounds never automatically become character_height, primary_graphical_element, or touch_bounds", () => {
    const textEl: DesignElement = {
      element_id: "el_text_nobounds",
      element_type: "text",
      interaction_type: "none",
      text_layout: "single_line",
      text_role: "body",
      ...sharedBounds
    };

    const recomputed = recomputeElementDerivedState(textEl, baseContext);
    expect(recomputed.character_height_px).toBeUndefined();
    expect(recomputed.character_height_source).toBeUndefined();
    expect(recomputed.character_height_physical_mm).toBeUndefined();
    expect(recomputed.character_height_visual_angle).toBeUndefined();
    expect(recomputed.touch_bounds).toBeUndefined();
    expect(recomputed.target_size_evaluation).toBeUndefined();
  });

  // 6. Same tappable Button vs Icon with same interaction/touch facts -> same touch measurement/result
  it("6. shared touch measurement is identical between Button and Icon with same interaction facts", () => {
    const buttonEl: DesignElement = {
      element_id: "btn_tappable",
      element_type: "button",
      interaction_type: "primary_action",
      touch_bounds: { x: 0.1, y: 0.2, width: 0.3, height: 0.05 },
      ...sharedBounds
    };

    const iconEl: DesignElement = {
      element_id: "icon_tappable",
      element_type: "icon",
      interaction_type: "primary_action",
      touch_bounds: { x: 0.1, y: 0.2, width: 0.3, height: 0.05 },
      ...sharedBounds
    };

    const btnPres = buildElementPresentationModel(buttonEl, baseContext, null, "ios");
    const iconPres = buildElementPresentationModel(iconEl, baseContext, null, "ios");

    expect(btnPres.touchDimensionsDisplay).toBe(iconPres.touchDimensionsDisplay);
    expect(btnPres.touchProvenance).toBe(iconPres.touchProvenance);
    expect(btnPres.touchReview.status).toBe(iconPres.touchReview.status);
    expect(btnPres.actionableFindings).toEqual(iconPres.actionableFindings);
  });

  // 7. Type changes rule applicability but not shared measurements
  it("7. element type alters applicable rule modules without changing underlying physical geometry", () => {
    const baseEl: DesignElement = {
      element_id: "rule_applicability_test",
      element_type: "button",
      interaction_type: "primary_action",
      foreground_color: "#007AFF",
      background_color: "#FFFFFF",
      ...sharedBounds
    };

    const btnState = recomputeElementDerivedState(baseEl, baseContext);
    const textState = recomputeElementDerivedState({ ...baseEl, element_type: "text", interaction_type: "none", text_role: "body", text_size_value: 17, text_size_unit: "pt", text_size_source: "user_confirmed" }, baseContext);

    // Shared geometry invariants hold
    expect(btnState.physical_geometry?.width_mm).toBe(textState.physical_geometry?.width_mm);
    expect(btnState.physical_geometry?.height_mm).toBe(textState.physical_geometry?.height_mm);

    // Rule traces differ according to semantic applicability
    const btnTouchTrace = buildTargetSizeTrace(btnState.target_size_evaluation, baseContext.logicalMapping!);
    expect(btnTouchTrace).toBeDefined();

    const textTrace = buildTextSizeTrace(textState.text_size_evaluation, baseContext.logicalMapping!);
    expect(textTrace.verdict).toBe("meets");
  });

  // 8. Restored legacy element switched type -> same result as newly created equivalent element
  it("8. restored element switched from Text to Icon matches a freshly created Icon element", () => {
    const restoredTextEl: DesignElement = {
      element_id: "restored_switch",
      element_type: "text",
      interaction_type: "none",
      text_role: "body",
      text_size_value: 14,
      text_size_unit: "pt",
      text_size_source: "user_confirmed",
      text_size_evaluation: {
        status: "meets_minimum",
        measured_value: 14,
        unit: "pt",
        summary_text: "14 pt",
        detail_text: ""
      },
      ...sharedBounds
    };

    // Switched to Icon
    const switchedToIcon: DesignElement = {
      ...restoredTextEl,
      element_type: "icon"
    };
    const recomputedSwitched = recomputeElementDerivedState(switchedToIcon, baseContext);

    // Newly created clean Icon with identical source bounds
    const freshIconEl: DesignElement = {
      element_id: "fresh_icon",
      element_type: "icon",
      interaction_type: "none",
      ...sharedBounds
    };
    const recomputedFresh = recomputeElementDerivedState(freshIconEl, baseContext);

    expect(recomputedSwitched.text_size_evaluation).toBeUndefined();
    expect(recomputedSwitched.character_height_px).toBeUndefined();
    expect(recomputedSwitched.target_size_evaluation).toBeUndefined();

    const presSwitched = buildElementPresentationModel(recomputedSwitched, baseContext, null, "ios");
    const presFresh = buildElementPresentationModel(recomputedFresh, baseContext, null, "ios");

    expect(presSwitched.conclusionState).toBe(presFresh.conclusionState);
    expect(presSwitched.conclusionState).toBe("measurement_only");
    expect(presSwitched.visualPxDisplay).toBe(presFresh.visualPxDisplay);
    expect(presSwitched.physicalDisplay).toBe(presFresh.physicalDisplay);
    expect(presSwitched.visualAngleDisplay).toBe(presFresh.visualAngleDisplay);
  });

  // 9. Card / Inspector / report models use identical post-switch result
  it("9. Card presentation, Inspector, and exported HTML report all reflect post-switch derived state", () => {
    const textEl: DesignElement = {
      element_id: "sync_el",
      element_type: "text",
      interaction_type: "none",
      text_role: "body",
      text_size_value: 11,
      text_size_unit: "pt",
      text_size_source: "user_confirmed",
      ...sharedBounds
    };

    // Switched to Icon (non-interactive)
    const iconEl: DesignElement = {
      ...textEl,
      element_type: "icon"
    };

    const state = recomputeElementDerivedState(iconEl, baseContext);
    const presentation = buildElementPresentationModel(state, baseContext, null, "ios");

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
          label: state.label || "图标",
          elementType: state.element_type,
          elementTypeLabel: "图标",
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
          ruleTraces: []
        }
      ]
    };

    const html = generateSelfContainedHtmlReport(reportData);

    expect(presentation.conclusionState).toBe("measurement_only");
    expect(presentation.elementType).toBe("icon");
    expect(presentation.actionableFindings.length).toBe(0);
    expect(html).toContain('class="conclusionStateBadge badge-measurement_only"');
    expect(html).not.toContain("正文字号");
    expect(html).not.toContain("低于推荐正文");
  });

  // 10. Touched user-visible presentation does not expose generic “几何” wording where plain-language term exists
  it("10. touched user-visible presentation uses domain-neutral plain-language terms without generic '几何' or raw technical names", () => {
    const el: DesignElement = {
      element_id: "term_check",
      element_type: "button",
      interaction_type: "primary_action",
      touch_bounds: { x: 0.1, y: 0.2, width: 0.05, height: 0.02 }, // < 28pt on iOS
      ...sharedBounds
    };

    const state = recomputeElementDerivedState(el, baseContext);
    const presentation = buildElementPresentationModel(state, baseContext, null, "ios");
    const explanation = getUnifiedResultExplanation({
      element: state,
      logicalMapping: baseContext.logicalMapping,
      targetSizeEval: state.target_size_evaluation
    });

    const combinedUserStrings = [
      presentation.conclusion,
      presentation.whyItMatters,
      ...presentation.actionableFindings.map((f) => `${f.metricLabel} ${f.summaryText} ${f.whyItMatters}`),
      ...explanation.perspectives.map((p) => `${p.label} ${p.content}`)
    ].join(" ");

    // Guard against vague or generic terms in user-facing feedback
    expect(combinedUserStrings).not.toContain("几何尺寸");
    expect(combinedUserStrings).not.toContain("物理几何");
    expect(combinedUserStrings).not.toContain("交互几何");
    expect(combinedUserStrings).not.toContain("Touch Bounds");
    expect(combinedUserStrings).not.toContain("Visual Bounds");
    expect(combinedUserStrings).not.toContain("参考包络");

    // Ensure plain-language terms are present
    expect(combinedUserStrings).toContain("触控尺寸");
  });
});
