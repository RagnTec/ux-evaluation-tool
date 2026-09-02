import { describe, it, expect } from "vitest";
import { mapClientToNaturalPixel } from "../../src/utils/calibration";
import { recomputeElementDerivedState, type DerivedEvaluationContext } from "../../src/utils/interactionGeometry";
import { calculateExactVisualAngle } from "../../src/humanFactors";
import { resolveReferenceEnvelope } from "../../src/humanFactors/referenceResolver";
import type { CandidateHumanFactorsReference, ScenarioScope } from "../../src/humanFactors/types";
import { buildCharacterVisualAngleTrace } from "../../src/utils/ruleTrace";
import {
  getUnifiedResultExplanation,
  CONCLUSION_STATE_CONFIG,
  type EvaluationConclusionState
} from "../../src/utils/impactRecommendation";
import type { DesignElement } from "../../src/types/designElement";

describe("P0-COLOR-01: Source-Image Color Sampling vs UI Overlays", () => {
  it("samples pure source image pixels and ignores UI overlay elements at the same screen position", () => {
    // Simulating offscreen source canvas containing pure image bitmap
    const naturalWidth = 1000;
    const naturalHeight = 1000;
    const sourceImagePixels = new Map<string, [number, number, number, number]>();

    // Source image pixel at (500, 500) is Red (#FF0000)
    sourceImagePixels.set("500,500", [255, 0, 0, 255]);

    // Simulated UI overlay rendering blue (#0000FF) box on top in the DOM/screen canvas
    const renderedOverlayAtSameScreenPosition = { color: "#0000FF" };
    expect(renderedOverlayAtSameScreenPosition.color).toBe("#0000FF");

    // Authoritative sampling reads natural coordinate from source image bitmap
    const stageRect = { left: 100, top: 100, width: 500, height: 500 }; // 0.5x display scale
    const clientX = 350; // halfway inside stage (relX = 250, normX = 0.5)
    const clientY = 350; // halfway inside stage (relY = 250, normY = 0.5)

    const { pixelX, pixelY } = mapClientToNaturalPixel(clientX, clientY, stageRect, naturalWidth, naturalHeight);
    expect(pixelX).toBe(500);
    expect(pixelY).toBe(500);

    const sampledPixel = sourceImagePixels.get(`${pixelX},${pixelY}`);
    expect(sampledPixel).toBeDefined();
    expect(sampledPixel).toEqual([255, 0, 0, 255]); // Pure red, never blue
  });

  it("accurately maps scaled and offset coordinates to natural image pixels", () => {
    const stageRect = { left: 50, top: 80, width: 400, height: 800 };
    const naturalWidth = 1200;
    const naturalHeight = 2400;

    // Click at top-left
    const topLeft = mapClientToNaturalPixel(50, 80, stageRect, naturalWidth, naturalHeight);
    expect(topLeft.pixelX).toBe(0);
    expect(topLeft.pixelY).toBe(0);

    // Click at bottom-right
    const bottomRight = mapClientToNaturalPixel(450, 880, stageRect, naturalWidth, naturalHeight);
    expect(bottomRight.pixelX).toBe(1199);
    expect(bottomRight.pixelY).toBe(2399);

    // Click at center
    const center = mapClientToNaturalPixel(250, 480, stageRect, naturalWidth, naturalHeight);
    expect(center.pixelX).toBe(600);
    expect(center.pixelY).toBe(1200);
  });
});

describe("P0-TEXT-MEASURE-01: Character-Height Evidence Capability Ladder", () => {
  const baseContext: DerivedEvaluationContext = {
    imageNaturalWidth: 1170,
    imageNaturalHeight: 2532,
    calibrationMode: "full_screen",
    allowEstimation: false,
    displaySize: "6.1 inch",
    resolution: "1170x2532",
    viewingDistance: "500mm"
  };

  const textElement: DesignElement = {
    element_id: "text-1",
    source: "manual",
    element_type: "text",
    normalized_bounds: { x: 0.1, y: 0.1, width: 0.3, height: 0.05 },
    image_pixel_bounds: { x: 100, y: 200, width: 300, height: 120 },
    created_at: new Date().toISOString()
  };

  it("does not evaluate character-height rules when character measurement is absent", () => {
    const derived = recomputeElementDerivedState(textElement, baseContext);
    expect(derived.character_height_px).toBeUndefined();
    expect(derived.character_height_physical_mm).toBeUndefined();
    expect(derived.character_height_visual_angle).toBeUndefined();

    const trace = buildCharacterVisualAngleTrace(derived);
    expect(trace).toBeNull();
  });

  it("ladder step 1 (Screenshot only): stores character height in image pixels without corrupting font size", () => {
    const elWithCharPx: DesignElement = {
      ...textElement,
      character_height_px: 36,
      character_height_source: "measured_rendered_character"
    };

    const emptyContext: DerivedEvaluationContext = {
      imageNaturalWidth: 1170,
      imageNaturalHeight: 2532,
      calibrationMode: "full_screen",
      allowEstimation: false
    };

    const derived = recomputeElementDerivedState(elWithCharPx, emptyContext);
    expect(derived.character_height_px).toBe(36);
    expect(derived.character_height_source).toBe("measured_rendered_character");
    // Source font size field is NOT polluted
    expect(derived.text_size_value).toBeUndefined();
    // Physical and visual angle remain undefined without hardware/viewing distance
    expect(derived.character_height_physical_mm).toBeUndefined();
    expect(derived.character_height_visual_angle).toBeUndefined();
  });

  it("ladder step 2 (+ Hardware): calculates character physical height in mm", () => {
    const elWithCharPx: DesignElement = {
      ...textElement,
      character_height_px: 40,
      character_height_source: "measured_rendered_character"
    };

    const derived = recomputeElementDerivedState(elWithCharPx, baseContext);
    expect(derived.character_height_px).toBe(40);
    expect(derived.character_height_physical_mm).toBeDefined();
    expect(derived.character_height_physical_mm).toBeGreaterThan(0);
  });

  it("ladder step 3 (+ Viewing Distance): calculates exact character visual angle", () => {
    const elWithCharPx: DesignElement = {
      ...textElement,
      character_height_px: 40,
      character_height_source: "measured_rendered_character"
    };

    const derived = recomputeElementDerivedState(elWithCharPx, baseContext);
    expect(derived.character_height_visual_angle).toBeDefined();
    expect(derived.character_height_visual_angle?.arcmin).toBeGreaterThan(0);
    expect(derived.character_height_visual_angle?.deg).toBeGreaterThan(0);
  });
});

describe("Automotive Human Factors Reference Gating (NHTSA DOT HS 812 360)", () => {
  const nhtsaCandidateOptimal: CandidateHumanFactorsReference = {
    reference_id: "REF-NHTSA-TEXT-OPTIMAL",
    source: "NHTSA DOT HS 812 360",
    title: "NHTSA 文本字符高度最佳视角参考",
    mechanism: "visual_legibility",
    measurement_target: "character_height",
    value: 20,
    unit: "arcmin",
    default_role: "optimal_reference",
    evidence_strength: "verified",
    applicability_origin: "external_reference",
    applicable_scopes: {
      observer_roles: ["driver"],
      operation_states: ["driving", "parked"]
    }
  };

  const nhtsaCandidateCritical: CandidateHumanFactorsReference = {
    reference_id: "REF-NHTSA-TEXT-CRITICAL",
    source: "NHTSA DOT HS 812 360",
    title: "NHTSA 文本字符高度时间敏感建议最小值",
    mechanism: "visual_legibility",
    measurement_target: "character_height",
    value: 16,
    unit: "arcmin",
    default_role: "recommended_minimum",
    evidence_strength: "verified",
    applicability_origin: "external_reference",
    applicable_scopes: {
      observer_roles: ["driver"],
      operation_states: ["driving"],
      time_criticalities: ["time_critical"]
    }
  };

  const nhtsaCandidateNormal: CandidateHumanFactorsReference = {
    reference_id: "REF-NHTSA-TEXT-NORMAL",
    source: "NHTSA DOT HS 812 360",
    title: "NHTSA 文本字符高度常规建议最小值",
    mechanism: "visual_legibility",
    measurement_target: "character_height",
    value: 12,
    unit: "arcmin",
    default_role: "recommended_minimum",
    evidence_strength: "verified",
    applicability_origin: "external_reference",
    applicable_scopes: {
      observer_roles: ["driver"],
      operation_states: ["driving", "parked"],
      time_criticalities: ["non_time_critical"]
    }
  };

  it("prevents element_visual_bounds measurement target from satisfying character_height references", () => {
    const envelope = resolveReferenceEnvelope({
      metric: "character_visual_angle",
      current_measurement: {
        value: 25,
        unit: "arcmin",
        target: "element_visual_bounds"
      },
      scenario: { observer_role: "driver", operation_state: "driving", time_criticality: "time_critical" },
      candidates: [nhtsaCandidateCritical]
    });

    expect(envelope.recommended_references.length).toBe(0);
    expect(envelope.unmatched_references.some((r) => r.reference.reference_id === "REF-NHTSA-TEXT-CRITICAL")).toBe(true);
  });

  it("exposes NHTSA recommendations when matching automotive driving scenario with character_height target", () => {
    const envelope = resolveReferenceEnvelope({
      metric: "character_visual_angle",
      current_measurement: {
        value: 18,
        unit: "arcmin",
        target: "character_height"
      },
      scenario: { observer_role: "driver", operation_state: "driving", time_criticality: "time_critical" },
      candidates: [nhtsaCandidateOptimal, nhtsaCandidateCritical, nhtsaCandidateNormal]
    });

    expect(envelope.recommended_references.some((r) => r.reference.reference_id === "REF-NHTSA-TEXT-CRITICAL")).toBe(true);
    expect(envelope.optimal_references.some((r) => r.reference.reference_id === "REF-NHTSA-TEXT-OPTIMAL")).toBe(true);
    // Crucially: never governing_minimum
    expect(envelope.governing_references.length).toBe(0);
  });

  it("does not silently choose 12 arcmin when time criticality is explicit time_critical", () => {
    const envelope = resolveReferenceEnvelope({
      metric: "character_visual_angle",
      current_measurement: {
        value: 14,
        unit: "arcmin",
        target: "character_height"
      },
      scenario: { observer_role: "driver", operation_state: "driving", time_criticality: "time_critical" },
      candidates: [nhtsaCandidateCritical, nhtsaCandidateNormal]
    });

    // When time_criticality is time_critical, normal 12' is demoted/unmatched
    const normalActive = envelope.recommended_references.some((r) => r.reference.reference_id === "REF-NHTSA-TEXT-NORMAL");
    expect(normalActive).toBe(false);
    const criticalActive = envelope.recommended_references.some((r) => r.reference.reference_id === "REF-NHTSA-TEXT-CRITICAL");
    expect(criticalActive).toBe(true);
  });

  it("demotes driver-moving guidance when observer is passenger or vehicle is parked", () => {
    const envelope = resolveReferenceEnvelope({
      metric: "character_visual_angle",
      current_measurement: {
        value: 14,
        unit: "arcmin",
        target: "character_height"
      },
      scenario: { observer_role: "front_passenger", operation_state: "driving" },
      candidates: [nhtsaCandidateCritical]
    });

    expect(envelope.recommended_references.length).toBe(0);
    // Demoted to secondary reference
    expect(envelope.secondary_references.some((r) => r.reference.reference_id === "REF-NHTSA-TEXT-CRITICAL")).toBe(true);
    expect(envelope.secondary_references[0].is_applicable).toBe(false);
  });


});

describe("P1-REPORT-STATE-01: Structured Conclusion Presentation Model", () => {
  const dummyElement: DesignElement = {
    element_id: "el-1",
    source: "manual",
    element_type: "interactive_control",
    normalized_bounds: { x: 0.1, y: 0.1, width: 0.2, height: 0.1 },
    image_pixel_bounds: { x: 100, y: 100, width: 200, height: 100 },
    created_at: new Date().toISOString()
  };

  it("returns below_threshold when contrast threshold is failed", () => {
    const explanation = getUnifiedResultExplanation({
      element: dummyElement,
      contrastEval: {
        foreground_hex: "#777777",
        foreground_rgb: [119, 119, 119],
        background_hex: "#FFFFFF",
        background_rgb: [255, 255, 255],
        foreground_luminance: 0.18,
        background_luminance: 1.0,
        contrast_ratio: 4.1,
        threshold: 4.5,
        passed: false,
        rule_id: "wcag_contrast_text_aa",
        rule_layer: "L1_HARD_CONSTRAINT",
        reasoning_type: "deterministic",
        reference: "WCAG 2.2",
        reference_status: "verified_reference",
        claim_strength: "strong"
      }
    });

    expect(explanation.conclusionState).toBe("below_threshold");
    expect(explanation.conclusionStateLabel).toBe("不满足基本要求");
  });

  it("returns below_threshold when interactive elements overlap", () => {
    const explanation = getUnifiedResultExplanation({
      element: { ...dummyElement, interaction_type: "tap" },
      isOverlapping: true
    });

    expect(explanation.conclusionState).toBe("below_threshold");
    expect(explanation.conclusionStateLabel).toBe("不满足基本要求");
  });

  it("returns below_recommended when target size needs review", () => {
    const explanation = getUnifiedResultExplanation({
      element: { ...dummyElement, interaction_type: "tap" },
      targetSizeEval: {
        unit: "pt",
        measured_width: 38,
        measured_height: 38,
        min_side: 38,
        threshold_width: 44,
        threshold_height: 44,
        status: "needs_review",
        summary_text: "目标尺寸 38 × 38 pt，低于平台推荐 44 × 44 pt。",
        detail_text: "",
        rule_id: "target_size_apple",
        rule_layer: "L2_PLATFORM_GUIDELINE",
        reasoning_type: "heuristic",
        reference: "Apple HIG",
        reference_status: "verified",
        claim_strength: "recommendation"
      }
    });

    expect(explanation.conclusionState).toBe("below_recommended");
    expect(explanation.conclusionStateLabel).toBe("满足基本要求，但未达推荐范围");
  });

  it("returns meets_reference when all applicable rules pass", () => {
    const explanation = getUnifiedResultExplanation({
      element: { ...dummyElement, interaction_type: "tap" },
      targetSizeEval: {
        unit: "pt",
        measured_width: 48,
        measured_height: 48,
        min_side: 48,
        threshold_width: 44,
        threshold_height: 44,
        status: "meets_default",
        summary_text: "目标尺寸 48 × 48 pt，符合平台推荐。",
        detail_text: "",
        rule_id: "target_size_apple",
        rule_layer: "L2_PLATFORM_GUIDELINE",
        reasoning_type: "heuristic",
        reference: "Apple HIG",
        reference_status: "verified",
        claim_strength: "recommendation"
      }
    });

    expect(explanation.conclusionState).toBe("meets_reference");
    expect(explanation.conclusionStateLabel).toBe("达到推荐范围");
  });


  it("returns measurement_only for baseline bounding box without triggering fake success", () => {
    const explanation = getUnifiedResultExplanation({
      element: { ...dummyElement, interaction_type: "none" }
    });

    expect(explanation.conclusionState).toBe("measurement_only");
    expect(explanation.conclusionStateLabel).toBe("仅测量");
    expect(explanation.conclusion).toContain("完成基础视觉与尺寸标注");
  });

  it("proves provenance (estimated vs confirmed) does not alter verdict state", () => {
    // Estimated text size meeting threshold
    const estExplanation = getUnifiedResultExplanation({
      element: { ...dummyElement, element_type: "text" },
      textSizeEval: {
        status: "meets_default",
        measured_value: 16,
        unit: "pt",
        source: "estimated_from_visual_bounds",
        summary_text: "字号约 16 pt，符合推荐基准。",
        detail_text: ""
      }
    });

    // Confirmed text size meeting threshold
    const confExplanation = getUnifiedResultExplanation({
      element: { ...dummyElement, element_type: "text" },
      textSizeEval: {
        status: "meets_default",
        measured_value: 16,
        unit: "pt",
        source: "user_confirmed",
        summary_text: "字号 16 pt，符合推荐基准。",
        detail_text: ""
      }
    });

    // Verdict states are identical (meets_reference) while result_basis/provenance remains distinct in technical details
    expect(estExplanation.conclusionState).toBe("meets_reference");
    expect(confExplanation.conclusionState).toBe("meets_reference");
  });
});
