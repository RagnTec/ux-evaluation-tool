import { describe, it, expect } from "vitest";
import type { CandidateHumanFactorsReference, ScenarioScope } from "../../src/humanFactors/types";
import { resolveReferenceEnvelope } from "../../src/humanFactors/referenceResolver";
import { calculateExactVisualAngle, derivePhysicalSizeForVisualAngle } from "../../src/humanFactors/visualAngle";
import { buildCharacterVisualAngleTrace } from "../../src/utils/ruleTrace";
import { getUnifiedResultExplanation } from "../../src/utils/impactRecommendation";
import type { DesignElement } from "../../src/types/designElement";

describe("Visual Angle Equivalent Reference Adaptation", () => {
  // Test Fixture: A qualified candidate reference explicitly configured with visual_angle_equivalent
  const qualifiedAdaptedCandidate: CandidateHumanFactorsReference = {
    reference_id: "REF-TEST-ADAPTED-TEXT-16",
    source: "ISO Human Factors Research",
    title: "高可读性字符视角基准",
    mechanism: "visual_legibility",
    measurement_target: "character_height",
    target_domain: "generic_display",
    value: 16,
    unit: "arcmin",
    rule_transferability: "visual_angle_equivalent",
    default_role: "recommended_minimum",
    evidence_strength: "verified",
    applicability_origin: "direct_human_factors",
    provenance: "ISO 9241-303 Ergonomics of human-system interaction",
    applicable_scopes: {}
  };

  const directAutomotiveCandidate: CandidateHumanFactorsReference = {
    reference_id: "REF-NHTSA-TEXT-CRITICAL",
    source: "NHTSA DOT HS 812 360",
    title: "NHTSA 文本字符高度时间敏感建议最小值",
    mechanism: "visual_legibility",
    measurement_target: "character_height",
    target_domain: "automotive",
    value: 16,
    unit: "arcmin",
    rule_transferability: "direct_only",
    default_role: "recommended_minimum",
    evidence_strength: "verified",
    applicability_origin: "external_reference",
    applicable_scopes: {
      observer_roles: ["driver"],
      operation_states: ["driving"],
      time_criticalities: ["time_critical"]
    }
  };

  const sampleTextElement: DesignElement = {
    element_id: "text-adapted-el-1",
    source: "manual",
    element_type: "text",
    text_layout: "single_line",
    text_role: "body",
    normalized_bounds: { x: 0.1, y: 0.1, width: 0.8, height: 0.05 },
    image_pixel_bounds: { x: 100, y: 200, width: 800, height: 100 },
    character_height_px: 26,
    character_height_physical_mm: 2.6, // 2.6 mm
    character_height_visual_angle: {
      arcmin: 12.8,
      deg: 0.213
    },
    character_height_source: "measured_rendered_character",
    calibration_mode: "preset"
  };

  // 1. qualified visual_angle_equivalent + same MeasurementTarget + viewing distance -> derives adapted physical size using exact inverse math
  it("1. derives adapted physical size using exact inverse visual angle math for visual_angle_equivalent reference", () => {
    const distanceMm = 700;
    const targetMm = derivePhysicalSizeForVisualAngle({ arcmin: 16 }, distanceMm);
    expect(targetMm).not.toBeNull();
    // 2 * 700 * tan(16 / 60 * pi / 360) ≈ 3.258 mm
    expect(targetMm).toBeCloseTo(3.258, 2);

    const scenario: ScenarioScope = { domain: "mobile" };
    const envelope = resolveReferenceEnvelope({
      metric: "character_visual_angle",
      current_measurement: {
        value: 12.8,
        unit: "arcmin",
        target: "character_height"
      },
      scenario,
      candidates: [qualifiedAdaptedCandidate]
    });

    expect(envelope.adapted_references).toHaveLength(1);
    expect(envelope.adapted_references[0].assigned_role).toBe("adapted_reference");
    expect(envelope.adapted_references[0].is_applicable).toBe(true);
  });

  // 2. adapted result preserves source reference / source domain / evidence provenance
  it("2. adapted result preserves source reference, source domain, and evidence provenance", () => {
    const scenario: ScenarioScope = { domain: "mobile" };
    const trace = buildCharacterVisualAngleTrace(
      sampleTextElement,
      scenario,
      [qualifiedAdaptedCandidate],
      700
    );

    expect(trace).not.toBeNull();
    expect(trace?.verdict).toBe("attention");
    expect(trace?.verdictLabel).toBe("未达到换算推荐值");
    expect(trace?.evidenceStatus).toBe("verified_reference");
    expect(trace?.ruleId).toBe(qualifiedAdaptedCandidate.reference_id);
    expect(trace?.ruleTitle).toContain("等视角换算参考");
    expect(trace?.ruleTitle).toContain(qualifiedAdaptedCandidate.title);
    expect(trace?.assumptions?.[0]).toContain("16′ 视觉角参考");
    expect(trace?.assumptions?.[0]).toContain("70 cm");
    expect(trace?.assumptions?.[0]).toContain("跨场景换算参考，不代表当前平台正式规范");
  });

  // 3. direct target-domain reference exists -> direct reference wins -> adapted reference does not override
  it("3. direct target-domain reference wins when applicable and is not overridden by adapted reference", () => {
    const automotiveScenario: ScenarioScope = {
      domain: "automotive",
      observer_role: "driver",
      operation_state: "driving",
      time_criticality: "time_critical"
    };

    const envelope = resolveReferenceEnvelope({
      metric: "character_visual_angle",
      current_measurement: {
        value: 12.8,
        unit: "arcmin",
        target: "character_height"
      },
      scenario: automotiveScenario,
      candidates: [directAutomotiveCandidate, qualifiedAdaptedCandidate]
    });

    // Direct automotive reference takes precedence in recommended_references
    expect(envelope.recommended_references).toHaveLength(1);
    expect(envelope.recommended_references[0].reference.reference_id).toBe("REF-NHTSA-TEXT-CRITICAL");

    // Trace uses direct NHTSA reference comparison, NOT adapted
    const trace = buildCharacterVisualAngleTrace(
      sampleTextElement,
      automotiveScenario,
      [directAutomotiveCandidate, qualifiedAdaptedCandidate],
      700
    );

    expect(trace?.ruleId).toBe("REF-NHTSA-TEXT-CRITICAL");
    expect(trace?.ruleTitle).toContain("NHTSA");
    expect(trace?.ruleTitle).not.toContain("等视角换算参考");
  });

  // 4. RuleTransferability: direct_only / non_transferable / unknown -> never adapts
  it("4. references marked direct_only, non_transferable, or unknown never adapt across domains", () => {
    const directOnlyCandidate: CandidateHumanFactorsReference = {
      ...qualifiedAdaptedCandidate,
      reference_id: "REF-DIRECT-ONLY",
      rule_transferability: "direct_only"
    };
    const nonTransferableCandidate: CandidateHumanFactorsReference = {
      ...qualifiedAdaptedCandidate,
      reference_id: "REF-NON-TRANSFERABLE",
      rule_transferability: "non_transferable"
    };
    const unknownCandidate: CandidateHumanFactorsReference = {
      ...qualifiedAdaptedCandidate,
      reference_id: "REF-UNKNOWN",
      rule_transferability: "unknown"
    };

    const scenario: ScenarioScope = { domain: "mobile" };
    const envelope = resolveReferenceEnvelope({
      metric: "character_visual_angle",
      current_measurement: { value: 12.8, unit: "arcmin", target: "character_height" },
      scenario,
      candidates: [directOnlyCandidate, nonTransferableCandidate, unknownCandidate]
    });

    expect(envelope.adapted_references).toHaveLength(0);
    expect(envelope.secondary_references.length).toBeGreaterThan(0);
  });

  // 5. MeasurementTarget mismatch -> never adapts
  it("5. MeasurementTarget mismatch prevents visual angle adaptation", () => {
    const mismatchedTargetCandidate: CandidateHumanFactorsReference = {
      ...qualifiedAdaptedCandidate,
      measurement_target: "primary_graphical_element"
    };

    const scenario: ScenarioScope = { domain: "mobile" };
    const envelope = resolveReferenceEnvelope({
      metric: "character_visual_angle",
      current_measurement: { value: 12.8, unit: "arcmin", target: "character_height" },
      scenario,
      candidates: [mismatchedTargetCandidate]
    });

    expect(envelope.adapted_references).toHaveLength(0);
    expect(envelope.unmatched_references).toHaveLength(1);
  });

  // 6. touch_bounds / touch size -> no visual-angle adaptation without explicit qualified transferability
  it("6. touch_bounds and motor targets do not adapt into visual angle thresholds", () => {
    const touchCandidate: CandidateHumanFactorsReference = {
      reference_id: "REF-TOUCH-44",
      source: "Apple HIG",
      title: "Touch Target Size",
      mechanism: "motor_target_acquisition",
      measurement_target: "touch_bounds",
      value: 44,
      unit: "pt",
      target_domain: "mobile",
      rule_transferability: "direct_only",
      default_role: "governing_minimum",
      evidence_strength: "verified",
      applicability_origin: "direct_domain"
    };

    const scenario: ScenarioScope = { domain: "automotive" };
    const envelope = resolveReferenceEnvelope({
      metric: "touch_target_size",
      current_measurement: { value: 30, unit: "mm", target: "touch_bounds" },
      scenario,
      candidates: [touchCandidate]
    });

    expect(envelope.adapted_references).toHaveLength(0);
    expect(envelope.conservative_references).toHaveLength(1);
  });

  // 7. no viewing distance -> no adapted threshold -> measurement_only
  it("7. missing viewing distance suppresses adapted threshold calculation and retains measurement_only", () => {
    const scenario: ScenarioScope = { domain: "mobile" };
    const elementNoPhysical: DesignElement = {
      ...sampleTextElement,
      character_height_physical_mm: undefined
    };

    const trace = buildCharacterVisualAngleTrace(
      elementNoPhysical,
      scenario,
      [qualifiedAdaptedCandidate],
      undefined // No viewing distance
    );

    expect(trace?.verdict).toBe("measurement_only");
    expect(trace?.ruleTitle).toBeUndefined();
  });

  // 8. adapted comparison failure -> must not become below_threshold / 不满足基本要求
  it("8. failing an adapted reference produces below_recommended or attention, never below_threshold", () => {
    const scenario: ScenarioScope = { domain: "mobile" };
    const trace = buildCharacterVisualAngleTrace(
      sampleTextElement,
      scenario,
      [qualifiedAdaptedCandidate],
      700
    );

    // 2.6 mm < 3.26 mm threshold -> attention / 未达到换算推荐值
    expect(trace?.verdict).toBe("attention");
    expect(trace?.verdictLabel).toBe("未达到换算推荐值");
    expect(trace?.verdict).not.toBe("below_threshold");

    const explanation = getUnifiedResultExplanation({
      element: sampleTextElement,
      scenarioScope: scenario,
      viewingDistance: 700,
      candidateReferences: [qualifiedAdaptedCandidate]
    });

    expect(explanation.conclusionState).not.toBe("below_threshold");
    expect(explanation.conclusionState).toBe("below_recommended");
    const finding = explanation.actionableFindings.find((f) => f.id === "character_visual_angle_adapted");
    expect(finding?.severity).toBe("below_recommended");
  });

  // 9. user-facing adapted result includes required disclaimer and context fields
  it("9. user-facing adapted result contains required disclaimer and context fields", () => {
    const scenario: ScenarioScope = { domain: "mobile" };
    const explanation = getUnifiedResultExplanation({
      element: sampleTextElement,
      scenarioScope: scenario,
      viewingDistance: "70cm",
      candidateReferences: [qualifiedAdaptedCandidate]
    });

    const finding = explanation.actionableFindings.find((f) => f.id === "character_visual_angle_adapted");
    expect(finding).toBeDefined();
    expect(finding?.metricLabel).toBe("等视角换算参考");
    expect(finding?.summaryText).toContain("等视角换算推荐值");
    expect(finding?.summaryText).toContain("跨场景换算参考，不代表当前平台正式规范");
    expect(finding?.whyItMatters).toContain("跨场景换算参考，不代表当前平台正式规范");
  });

  // 10. exact inverse consistency: reference angle -> adapted mm -> calculateExactVisualAngle returns original reference angle within tolerance
  it("10. exact inverse consistency: reference angle -> adapted mm -> calculateExactVisualAngle returns original angle", () => {
    const originalArcmin = 16.0;
    const distanceMm = 700;

    const derivedSizeMm = derivePhysicalSizeForVisualAngle({ arcmin: originalArcmin }, distanceMm);
    expect(derivedSizeMm).not.toBeNull();

    const roundTripAngle = calculateExactVisualAngle(derivedSizeMm!, distanceMm);
    expect(roundTripAngle).not.toBeNull();
    expect(roundTripAngle!.arcmin).toBeCloseTo(originalArcmin, 1);
  });
});
