import { describe, it, expect } from "vitest";
import { resolveReferenceEnvelope } from "../../src/humanFactors/referenceResolver";
import type { CandidateHumanFactorsReference, ScenarioScope } from "../../src/humanFactors/types";

describe("Human Factors Core: Reference Resolver & Envelope Policy", () => {
  // Official NHTSA DOT HS 812 360 (Dec 2016) Text Candidates
  const nhtsaTextCriticalRef: CandidateHumanFactorsReference = {
    reference_id: "REF-NHTSA-TEXT-CRITICAL",
    source: "NHTSA DOT HS 812 360",
    title: "驾驶员时间敏感文本推荐最小视角",
    mechanism: "visual_legibility",
    measurement_target: "character_height",
    value: 16,
    unit: "arcmin",
    target_domain: "automotive",
    applicable_scopes: {
      observer_roles: ["driver"],
      operation_states: ["driving"],
      criticalities: ["safety_critical", "task_critical"],
      time_criticalities: ["time_critical"]
    },
    default_role: "recommended_minimum",
    evidence_strength: "verified",
    applicability_origin: "direct_domain"
  };

  const nhtsaTextOptimalRef: CandidateHumanFactorsReference = {
    reference_id: "REF-NHTSA-TEXT-OPTIMAL",
    source: "NHTSA DOT HS 812 360",
    title: "驾驶员文本最优视角",
    mechanism: "visual_legibility",
    measurement_target: "character_height",
    value: 20,
    unit: "arcmin",
    target_domain: "automotive",
    applicable_scopes: {
      observer_roles: ["driver"],
      operation_states: ["driving"]
    },
    default_role: "optimal_reference",
    evidence_strength: "verified",
    applicability_origin: "direct_domain"
  };

  const nhtsaTextNormalRef: CandidateHumanFactorsReference = {
    reference_id: "REF-NHTSA-TEXT-NORMAL",
    source: "NHTSA DOT HS 812 360",
    title: "驾驶员非时间敏感文本推荐最小视角",
    mechanism: "visual_legibility",
    measurement_target: "character_height",
    value: 12,
    unit: "arcmin",
    target_domain: "automotive",
    applicable_scopes: {
      observer_roles: ["driver"],
      operation_states: ["driving"],
      time_criticalities: ["non_time_critical"]
    },
    default_role: "recommended_minimum",
    evidence_strength: "verified",
    applicability_origin: "direct_domain"
  };

  // Official NHTSA DOT HS 812 360 (Dec 2016) Primary Graphical Element Candidates
  const nhtsaIconOptimalRef: CandidateHumanFactorsReference = {
    reference_id: "REF-NHTSA-ICON-OPTIMAL",
    source: "NHTSA DOT HS 812 360",
    title: "主要图形元素最优视角",
    mechanism: "visual_recognition",
    measurement_target: "primary_graphical_element",
    value: 86,
    unit: "arcmin",
    target_domain: "automotive",
    applicable_scopes: {
      observer_roles: ["driver"],
      operation_states: ["driving"]
    },
    default_role: "optimal_reference",
    evidence_strength: "verified",
    applicability_origin: "direct_domain"
  };

  const nhtsaIconCriticalRef: CandidateHumanFactorsReference = {
    reference_id: "REF-NHTSA-ICON-CRITICAL",
    source: "NHTSA DOT HS 812 360",
    title: "时间敏感主要图形元素推荐最小视角",
    mechanism: "visual_recognition",
    measurement_target: "primary_graphical_element",
    value: 41,
    unit: "arcmin",
    target_domain: "automotive",
    applicable_scopes: {
      observer_roles: ["driver"],
      operation_states: ["driving"],
      time_criticalities: ["time_critical"]
    },
    default_role: "recommended_minimum",
    evidence_strength: "verified",
    applicability_origin: "direct_domain"
  };

  const nhtsaIconNormalRef: CandidateHumanFactorsReference = {
    reference_id: "REF-NHTSA-ICON-NORMAL",
    source: "NHTSA DOT HS 812 360",
    title: "非时间敏感主要图形元素推荐最小视角",
    mechanism: "visual_recognition",
    measurement_target: "primary_graphical_element",
    value: 34,
    unit: "arcmin",
    target_domain: "automotive",
    applicable_scopes: {
      observer_roles: ["driver"],
      operation_states: ["driving"],
      time_criticalities: ["non_time_critical"]
    },
    default_role: "recommended_minimum",
    evidence_strength: "verified",
    applicability_origin: "direct_domain"
  };

  // External Platform Secondary Reference
  const appleSecondaryRef: CandidateHumanFactorsReference = {
    reference_id: "REF-APPLE-BODY-TEXT",
    source: "Apple HIG",
    title: "通用平台正文字高参考",
    mechanism: "visual_legibility",
    measurement_target: "character_height",
    value: 17,
    unit: "pt",
    target_domain: "mobile",
    default_role: "secondary_reference",
    evidence_strength: "verified",
    applicability_origin: "external_reference"
  };

  describe("Precedence & Scenario Scope Matching", () => {
    it("Case A: direct recommended rule applies and coexists with secondary reference", () => {
      const scenario: ScenarioScope = {
        domain: "automotive",
        observer_role: "driver",
        operation_state: "driving",
        criticality: "task_critical",
        time_criticality: "time_critical"
      };

      const envelope = resolveReferenceEnvelope({
        metric: "character_visual_angle",
        current_measurement: {
          value: 18,
          unit: "arcmin",
          target: "character_height"
        },
        scenario,
        candidates: [nhtsaTextCriticalRef, appleSecondaryRef]
      });

      expect(envelope.recommended_references).toHaveLength(1);
      expect(envelope.recommended_references[0].reference.reference_id).toBe("REF-NHTSA-TEXT-CRITICAL");
      expect(envelope.recommended_references[0].assigned_role).toBe("recommended_minimum");
      expect(envelope.recommended_references[0].is_applicable).toBe(true);

      expect(envelope.secondary_references).toHaveLength(1);
      expect(envelope.secondary_references[0].reference.reference_id).toBe("REF-APPLE-BODY-TEXT");
    });

    it("Case B: out-of-scope automotive rule demotes to secondary/conservative reference without governing", () => {
      // Rear passenger entertainment while driving
      const scenario: ScenarioScope = {
        domain: "automotive",
        observer_role: "rear_passenger",
        operation_state: "driving",
        criticality: "non_critical"
      };

      const envelope = resolveReferenceEnvelope({
        metric: "character_visual_angle",
        current_measurement: {
          value: 14,
          unit: "arcmin",
          target: "character_height"
        },
        scenario,
        candidates: [nhtsaTextCriticalRef, appleSecondaryRef]
      });

      expect(envelope.governing_references).toHaveLength(0);
      expect(envelope.secondary_references.length + envelope.conservative_references.length).toBeGreaterThanOrEqual(1);
      const nhtsaEvaluated = envelope.secondary_references.find(r => r.reference.reference_id === "REF-NHTSA-TEXT-CRITICAL");
      expect(nhtsaEvaluated).toBeDefined();
      expect(nhtsaEvaluated!.is_applicable).toBe(false);
      expect(nhtsaEvaluated!.applicability_reason).toContain("观察者角色不匹配");
    });

    it("Case C: recommended minimum and optimal reference coexist without synthetic averaging", () => {
      const scenario: ScenarioScope = {
        domain: "automotive",
        observer_role: "driver",
        operation_state: "driving",
        time_criticality: "time_critical"
      };

      const envelope = resolveReferenceEnvelope({
        metric: "character_visual_angle",
        current_measurement: {
          value: 18,
          unit: "arcmin",
          target: "character_height"
        },
        scenario,
        candidates: [nhtsaTextCriticalRef, nhtsaTextOptimalRef]
      });

      expect(envelope.recommended_references).toHaveLength(1);
      expect(envelope.recommended_references[0].assigned_role).toBe("recommended_minimum");
      expect(envelope.recommended_references[0].reference.value).toBe(16);

      expect(envelope.optimal_references).toHaveLength(1);
      expect(envelope.optimal_references[0].assigned_role).toBe("optimal_reference");
      expect(envelope.optimal_references[0].reference.value).toBe(20);
    });

    it("Case D: no applicable rules leaves governing empty for measurement-only evaluation", () => {
      const envelope = resolveReferenceEnvelope({
        metric: "character_visual_angle",
        current_measurement: {
          value: 15,
          unit: "arcmin",
          target: "character_height"
        },
        scenario: { domain: "generic_display" },
        candidates: []
      });

      expect(envelope.governing_references).toHaveLength(0);
      expect(envelope.recommended_references).toHaveLength(0);
      expect(envelope.secondary_references).toHaveLength(0);
    });

    it("Case E: secondary reference cannot override or replace direct reference requirements", () => {
      const directGoverningCandidate: CandidateHumanFactorsReference = {
        reference_id: "REF-TEST-GOVERNING",
        source: "Test Standard",
        title: "测试法定最小",
        mechanism: "visual_legibility",
        measurement_target: "character_height",
        value: 18,
        unit: "arcmin",
        target_domain: "automotive",
        applicable_scopes: {
          observer_roles: ["driver"],
          operation_states: ["driving"]
        },
        default_role: "governing_minimum",
        evidence_strength: "verified",
        applicability_origin: "direct_domain"
      };

      const scenario: ScenarioScope = {
        domain: "automotive",
        observer_role: "driver",
        operation_state: "driving"
      };

      const envelope = resolveReferenceEnvelope({
        metric: "character_visual_angle",
        current_measurement: {
          value: 15, // Below governing (18), but above secondary (12)
          unit: "arcmin",
          target: "character_height"
        },
        scenario,
        candidates: [directGoverningCandidate, appleSecondaryRef]
      });

      // Governing minimum remains governing
      expect(envelope.governing_references).toHaveLength(1);
      expect(envelope.governing_references[0].reference.value).toBe(18);

      // Secondary reference remains secondary and cannot override governing slot
      expect(envelope.secondary_references).toHaveLength(1);
    });
  });

  describe("Measurement Target Gating", () => {
    it("fails measurement match when character_height ref receives element_visual_bounds", () => {
      const scenario: ScenarioScope = {
        domain: "automotive",
        observer_role: "driver",
        operation_state: "driving"
      };

      const envelope = resolveReferenceEnvelope({
        metric: "character_visual_angle",
        current_measurement: {
          value: 40,
          unit: "arcmin",
          target: "element_visual_bounds" // Outer bounding box with whitespace padding
        },
        scenario,
        candidates: [nhtsaTextCriticalRef]
      });

      // Target mismatch prevents it from entering recommended references
      expect(envelope.recommended_references).toHaveLength(0);
      expect(envelope.unmatched_references).toHaveLength(1);
      expect(envelope.unmatched_references[0].measurement_matched).toBe(false);
      expect(envelope.unmatched_references[0].assigned_role).toBe("descriptive_only");
      expect(envelope.unmatched_references[0].applicability_reason).toContain("测量目标类型不匹配");
    });

    it("fails measurement match when primary_graphical_element ref receives element_visual_bounds", () => {
      const scenario: ScenarioScope = {
        domain: "automotive",
        observer_role: "driver",
        operation_state: "driving"
      };

      const envelope = resolveReferenceEnvelope({
        metric: "icon_visual_angle",
        current_measurement: {
          value: 90,
          unit: "arcmin",
          target: "element_visual_bounds" // Whole icon container box
        },
        scenario,
        candidates: [nhtsaIconOptimalRef]
      });

      expect(envelope.optimal_references).toHaveLength(0);
      expect(envelope.unmatched_references).toHaveLength(1);
      expect(envelope.unmatched_references[0].measurement_matched).toBe(false);
    });

    it("passes measurement match when primary_graphical_element ref receives primary_graphical_element", () => {
      const scenario: ScenarioScope = {
        domain: "automotive",
        observer_role: "driver",
        operation_state: "driving"
      };

      const envelope = resolveReferenceEnvelope({
        metric: "icon_visual_angle",
        current_measurement: {
          value: 88,
          unit: "arcmin",
          target: "primary_graphical_element"
        },
        scenario,
        candidates: [nhtsaIconOptimalRef]
      });

      expect(envelope.optimal_references).toHaveLength(1);
      expect(envelope.unmatched_references).toHaveLength(0);
      expect(envelope.optimal_references[0].measurement_matched).toBe(true);
    });
  });

  describe("P0-EVIDENCE-01: Exact NHTSA DOT HS 812 360 Value Governance", () => {
    it("verifies NHTSA text guidance values: optimal 20', time-critical 16', non-time-critical 12'", () => {
      expect(nhtsaTextOptimalRef.value).toBe(20);
      expect(nhtsaTextOptimalRef.default_role).toBe("optimal_reference");
      expect(nhtsaTextOptimalRef.measurement_target).toBe("character_height");

      expect(nhtsaTextCriticalRef.value).toBe(16);
      expect(nhtsaTextCriticalRef.default_role).toBe("recommended_minimum");
      expect(nhtsaTextCriticalRef.measurement_target).toBe("character_height");

      expect(nhtsaTextNormalRef.value).toBe(12);
      expect(nhtsaTextNormalRef.default_role).toBe("recommended_minimum");
      expect(nhtsaTextNormalRef.measurement_target).toBe("character_height");
    });

    it("verifies NHTSA primary graphical element values: optimal 86', time-critical 41', non-time-critical 34'", () => {
      expect(nhtsaIconOptimalRef.value).toBe(86);
      expect(nhtsaIconOptimalRef.default_role).toBe("optimal_reference");
      expect(nhtsaIconOptimalRef.measurement_target).toBe("primary_graphical_element");

      expect(nhtsaIconCriticalRef.value).toBe(41);
      expect(nhtsaIconCriticalRef.default_role).toBe("recommended_minimum");
      expect(nhtsaIconCriticalRef.measurement_target).toBe("primary_graphical_element");

      expect(nhtsaIconNormalRef.value).toBe(34);
      expect(nhtsaIconNormalRef.default_role).toBe("recommended_minimum");
      expect(nhtsaIconNormalRef.measurement_target).toBe("primary_graphical_element");
    });

    it("ensures unadapted platform references are classified as secondary_reference, not adapted_reference", () => {
      expect(appleSecondaryRef.default_role).toBe("secondary_reference");
      expect(appleSecondaryRef.default_role).not.toBe("adapted_reference");
      expect(appleSecondaryRef.applicability_origin).toBe("external_reference");
      expect(appleSecondaryRef.applicability_origin).not.toBe("context_adapted");
    });
  });

  describe("Candidate Reference Schema & Metadata Integrity", () => {
    const allCandidates = [
      nhtsaTextCriticalRef,
      nhtsaTextOptimalRef,
      nhtsaTextNormalRef,
      nhtsaIconOptimalRef,
      nhtsaIconCriticalRef,
      nhtsaIconNormalRef,
      appleSecondaryRef
    ];

    allCandidates.forEach((candidate) => {
      it(`validates metadata integrity for reference '${candidate.reference_id}'`, () => {
        expect(candidate.reference_id).toBeTruthy();
        expect(candidate.source).toBeTruthy();
        expect(candidate.title).toBeTruthy();
        expect(candidate.mechanism).toBeTruthy();
        expect(candidate.measurement_target).toBeTruthy();
        expect(candidate.value).toBeDefined();
        expect(candidate.unit).toBeTruthy();
        expect(candidate.default_role).toBeTruthy();
        expect(candidate.evidence_strength).toBeTruthy();
        expect(candidate.applicability_origin).toBeTruthy();
      });
    });
  });
});
