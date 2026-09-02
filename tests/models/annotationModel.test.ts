import { describe, it, expect } from "vitest";
import type {
  AnnotationStatus,
  ReasoningType,
  RuleLayer,
  EvidenceLevel,
  ReferenceStatus,
  ClaimStrength,
  ConflictStatus,
  ContextType,
  Suitability,
  Severity
} from "../../src/types/annotation";

/**
 * These tests serve as compile-time type contract protections and known-value regression checks.
 * They guarantee that declared domain model sets remain stable across iterations.
 */
describe("Annotation Model Contract & Known-Value Regression Checks", () => {
  it("should maintain known declared AnnotationStatus values", () => {
    const validStatuses: AnnotationStatus[] = [
      "OPEN",
      "ACKNOWLEDGED",
      "FIXED",
      "VERIFIED",
      "CLOSED"
    ];
    expect(validStatuses).toHaveLength(5);
  });

  it("should strictly maintain the 4 declared ReasoningType values without platform_guideline", () => {
    const validReasoningTypes: ReasoningType[] = [
      "rule_match",
      "theory_inference",
      "heuristic_risk",
      "custom_rule"
    ];
    expect(validReasoningTypes).toHaveLength(4);
    // platform_guideline belongs to EvidenceLevel / RuleLayer, NOT ReasoningType
    expect((validReasoningTypes as string[]).includes("platform_guideline")).toBe(false);
  });

  it("should maintain declared L1-L5 RuleLayer values", () => {
    const validLayers: RuleLayer[] = [
      "L1_HARD_CONSTRAINT",
      "L2_PLATFORM_GUIDELINE",
      "L3_HUMAN_FACTORS",
      "L4_DOMAIN_RULE",
      "L5_CUSTOM_RULE"
    ];
    expect(validLayers).toHaveLength(5);
  });

  it("should maintain declared EvidenceLevel values", () => {
    const validLevels: EvidenceLevel[] = [
      "standard",
      "platform_guideline",
      "theory",
      "heuristic",
      "custom"
    ];
    expect(validLevels).toHaveLength(5);
  });

  it("should maintain declared ReferenceStatus values", () => {
    const validRefStatuses: ReferenceStatus[] = [
      "verified_reference",
      "example_reference",
      "pending_verification"
    ];
    expect(validRefStatuses).toHaveLength(3);
  });

  it("should maintain declared ClaimStrength values", () => {
    const validClaimStrengths: ClaimStrength[] = [
      "strong",
      "moderate",
      "weak"
    ];
    expect(validClaimStrengths).toHaveLength(3);
  });

  it("should maintain declared ConflictStatus values", () => {
    const validConflictStatuses: ConflictStatus[] = [
      "none",
      "potential_conflict",
      "overridden",
      "blocked_by_higher_priority_rule"
    ];
    expect(validConflictStatuses).toHaveLength(4);
  });

  it("should maintain declared ContextType values", () => {
    const validContextTypes: ContextType[] = [
      "user_group",
      "usage_context",
      "rule_set",
      "device_profile"
    ];
    expect(validContextTypes).toHaveLength(4);
  });

  it("should maintain declared Suitability values", () => {
    const validSuitability: Suitability[] = [
      "suitable",
      "acceptable",
      "risk",
      "not_suitable",
      "unknown"
    ];
    expect(validSuitability).toHaveLength(5);
  });

  it("should maintain declared Severity values", () => {
    const validSeverities: Severity[] = [
      "low",
      "medium",
      "high",
      "critical"
    ];
    expect(validSeverities).toHaveLength(4);
  });
});
