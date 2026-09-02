import { describe, it, expect } from "vitest";
import {
  issueTypeLabels,
  severityLabels,
  reasoningTypeLabels,
  ruleLayerLabels,
  evidenceLevelLabels,
  statusLabels,
  conflictStatusMessages,
  referenceStatusLabels,
  referenceStatusMessages,
  claimStrengthLabels,
  suitabilityLabels,
  elementTypeLabels,
  calibrationQualityLabels,
  logicalMappingQualityLabels,
  logicalUnitLabels,
  targetSizeStatusLabels,
  interactionTypeLabels,
  swipeDirectionLabels,
  touchBoundsSourceLabels,
  touchReviewStatusLabels
} from "../../src/utils/labels";
import type {
  AnnotationStatus,
  ClaimStrength,
  ConflictStatus,
  EvidenceLevel,
  IssueType,
  ReasoningType,
  ReferenceStatus,
  RuleLayer,
  Severity,
  Suitability
} from "../../src/types/annotation";
import type {
  LogicalMappingQuality,
  LogicalUnit,
  TargetSizeStatus
} from "../../src/types/designElement";

describe("Label Mappings Contract", () => {
  it("should have complete and valid mappings for all AnnotationStatus values", () => {
    const statuses: AnnotationStatus[] = ["OPEN", "ACKNOWLEDGED", "FIXED", "VERIFIED", "CLOSED"];
    for (const status of statuses) {
      expect(statusLabels[status]).toBeDefined();
      expect(typeof statusLabels[status]).toBe("string");
      expect(statusLabels[status].length).toBeGreaterThan(0);
    }
  });

  it("should have complete and valid mappings for all ReasoningType values", () => {
    const reasoningTypes: ReasoningType[] = ["rule_match", "theory_inference", "heuristic_risk", "custom_rule"];
    for (const rt of reasoningTypes) {
      expect(reasoningTypeLabels[rt]).toBeDefined();
      expect(typeof reasoningTypeLabels[rt]).toBe("string");
      expect(reasoningTypeLabels[rt].length).toBeGreaterThan(0);
    }
  });

  it("should have complete and valid mappings for all RuleLayer values", () => {
    const layers: RuleLayer[] = [
      "L1_HARD_CONSTRAINT",
      "L2_PLATFORM_GUIDELINE",
      "L3_HUMAN_FACTORS",
      "L4_DOMAIN_RULE",
      "L5_CUSTOM_RULE"
    ];
    for (const layer of layers) {
      expect(ruleLayerLabels[layer]).toBeDefined();
      expect(typeof ruleLayerLabels[layer]).toBe("string");
      expect(ruleLayerLabels[layer].length).toBeGreaterThan(0);
    }
  });

  it("should have complete and valid mappings for all EvidenceLevel values", () => {
    const levels: EvidenceLevel[] = ["standard", "platform_guideline", "theory", "heuristic", "custom"];
    for (const level of levels) {
      expect(evidenceLevelLabels[level]).toBeDefined();
      expect(typeof evidenceLevelLabels[level]).toBe("string");
      expect(evidenceLevelLabels[level].length).toBeGreaterThan(0);
    }
  });

  it("should have complete and valid mappings for all Severity values", () => {
    const severities: Severity[] = ["low", "medium", "high", "critical"];
    for (const sev of severities) {
      expect(severityLabels[sev]).toBeDefined();
      expect(typeof severityLabels[sev]).toBe("string");
      expect(severityLabels[sev].length).toBeGreaterThan(0);
    }
  });

  it("should have complete and valid mappings for all IssueType values", () => {
    const issueTypes: IssueType[] = [
      "touch_target",
      "spacing",
      "contrast",
      "readability",
      "information_hierarchy",
      "cognitive_load",
      "recognition",
      "custom_rule"
    ];
    for (const it of issueTypes) {
      expect(issueTypeLabels[it]).toBeDefined();
      expect(typeof issueTypeLabels[it]).toBe("string");
      expect(issueTypeLabels[it].length).toBeGreaterThan(0);
    }
  });

  it("should have complete and valid mappings for all ReferenceStatus labels and messages", () => {
    const refStatuses: ReferenceStatus[] = ["verified_reference", "example_reference", "pending_verification"];
    for (const rs of refStatuses) {
      expect(referenceStatusLabels[rs]).toBeDefined();
      expect(referenceStatusMessages[rs]).toBeDefined();
      expect(typeof referenceStatusLabels[rs]).toBe("string");
      expect(typeof referenceStatusMessages[rs]).toBe("string");
    }
  });

  it("should have complete and valid mappings for all ClaimStrength values", () => {
    const claimStrengths: ClaimStrength[] = ["strong", "moderate", "weak"];
    for (const cs of claimStrengths) {
      expect(claimStrengthLabels[cs]).toBeDefined();
      expect(typeof claimStrengthLabels[cs]).toBe("string");
      expect(claimStrengthLabels[cs].length).toBeGreaterThan(0);
    }
  });

  it("should have complete and valid mappings for all Suitability values", () => {
    const suitabilities: Suitability[] = ["suitable", "acceptable", "risk", "not_suitable", "unknown"];
    for (const s of suitabilities) {
      expect(suitabilityLabels[s]).toBeDefined();
      expect(typeof suitabilityLabels[s]).toBe("string");
      expect(suitabilityLabels[s].length).toBeGreaterThan(0);
    }
  });

  it("should have defined message entries for all ConflictStatus values", () => {
    const conflictStatuses: ConflictStatus[] = [
      "none",
      "potential_conflict",
      "overridden",
      "blocked_by_higher_priority_rule"
    ];
    for (const cs of conflictStatuses) {
      expect(conflictStatusMessages[cs]).toBeDefined();
      expect(typeof conflictStatusMessages[cs]).toBe("string");
    }
  });

  it("should have complete and valid mappings for all ElementTypeKey values", () => {
    const elementTypes: ("text" | "button" | "icon" | "image" | "input" | "other")[] = [
      "text",
      "button",
      "icon",
      "image",
      "input",
      "other"
    ];
    for (const et of elementTypes) {
      expect(elementTypeLabels[et]).toBeDefined();
      expect(typeof elementTypeLabels[et]).toBe("string");
      expect(elementTypeLabels[et].length).toBeGreaterThan(0);
    }
  });

  it("should have complete and valid mappings for all CalibrationQualityKey values", () => {
    const qualities: ("exact" | "estimated" | "relative_only")[] = [
      "exact",
      "estimated",
      "relative_only"
    ];
    for (const q of qualities) {
      expect(calibrationQualityLabels[q]).toBeDefined();
      expect(typeof calibrationQualityLabels[q]).toBe("string");
      expect(calibrationQualityLabels[q].length).toBeGreaterThan(0);
    }
  });

  it("should have complete and valid mappings for all LogicalMappingQuality values", () => {
    const qualities: LogicalMappingQuality[] = ["exact_profile", "user_specified", "unavailable"];
    for (const q of qualities) {
      expect(logicalMappingQualityLabels[q]).toBeDefined();
      expect(typeof logicalMappingQualityLabels[q]).toBe("string");
      expect(logicalMappingQualityLabels[q].length).toBeGreaterThan(0);
    }
  });

  it("should have complete and valid mappings for all LogicalUnit values", () => {
    const units: LogicalUnit[] = ["css_px", "pt", "dp"];
    for (const u of units) {
      expect(logicalUnitLabels[u]).toBeDefined();
      expect(typeof logicalUnitLabels[u]).toBe("string");
      expect(logicalUnitLabels[u].length).toBeGreaterThan(0);
    }
  });

  it("should have complete and valid mappings for all TargetSizeStatus values", () => {
    const statuses: TargetSizeStatus[] = [
      "condition_met",
      "needs_review",
      "meets_default",
      "meets_minimum",
      "below_minimum"
    ];
    for (const s of statuses) {
      expect(targetSizeStatusLabels[s]).toBeDefined();
      expect(typeof targetSizeStatusLabels[s]).toBe("string");
      expect(targetSizeStatusLabels[s].length).toBeGreaterThan(0);
    }
  });

  it("should have complete and valid mappings for all InteractionType values", () => {
    const types: ("none" | "tap" | "swipe" | "tap_swipe")[] = ["none", "tap", "swipe", "tap_swipe"];
    for (const t of types) {
      expect(interactionTypeLabels[t]).toBeDefined();
      expect(typeof interactionTypeLabels[t]).toBe("string");
      expect(interactionTypeLabels[t].length).toBeGreaterThan(0);
    }
  });

  it("should have complete and valid mappings for all SwipeDirection values", () => {
    const dirs: ("horizontal" | "vertical" | "both")[] = ["horizontal", "vertical", "both"];
    for (const d of dirs) {
      expect(swipeDirectionLabels[d]).toBeDefined();
      expect(typeof swipeDirectionLabels[d]).toBe("string");
      expect(swipeDirectionLabels[d].length).toBeGreaterThan(0);
    }
  });

  it("should have complete and valid mappings for all TouchBoundsSource values", () => {
    const sources: ("platform_reference" | "visual_copy" | "copied_from_element" | "user_defined")[] = [
      "platform_reference",
      "visual_copy",
      "copied_from_element",
      "user_defined"
    ];
    for (const s of sources) {
      expect(touchBoundsSourceLabels[s]).toBeDefined();
      expect(typeof touchBoundsSourceLabels[s]).toBe("string");
      expect(touchBoundsSourceLabels[s].length).toBeGreaterThan(0);
    }
  });

  it("should have complete and valid mappings for all TouchReviewStatus values", () => {
    const statuses: ("not_applicable" | "good" | "attention" | "needs_info")[] = [
      "not_applicable",
      "good",
      "attention",
      "needs_info"
    ];
    for (const s of statuses) {
      expect(touchReviewStatusLabels[s]).toBeDefined();
      expect(typeof touchReviewStatusLabels[s]).toBe("string");
      expect(touchReviewStatusLabels[s].length).toBeGreaterThan(0);
    }
  });
});
