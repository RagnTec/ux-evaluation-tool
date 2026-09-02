import { describe, it, expect } from "vitest";
import { analyzeDesign } from "../../src/services/analysisService";
import type { AnalysisInput } from "../../src/types/annotation";

const sampleInput: AnalysisInput = {
  deviceProfile: "mobile-standard",
  deviceType: "手机",
  displaySize: "6.1 英寸",
  resolution: "1170x2532",
  distance: "35 cm",
  userGroups: ["通用用户", "低视力用户"],
  scenario: "移动端 App - 日常",
  ruleSets: ["WCAG 2.2", "Apple HIG"],
  dimensions: ["触控目标", "颜色对比", "文字可读性"]
};

describe("Analysis Service Output Contract", () => {
  it("should return a structured AnalysisResult with non-empty annotations", async () => {
    const result = await analyzeDesign(sampleInput);
    expect(result).toBeDefined();
    expect(Array.isArray(result.annotations)).toBe(true);
    expect(result.annotations.length).toBeGreaterThan(0);
  });

  it("should assign unique annotation_ids to all findings", async () => {
    const result = await analyzeDesign(sampleInput);
    const ids = result.annotations.map(a => a.annotation_id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("should enforce strict [0.0, 1.0] normalized image coordinates on all annotations without tolerance overflow", async () => {
    const result = await analyzeDesign(sampleInput);
    for (const ann of result.annotations) {
      expect(ann.x).toBeGreaterThanOrEqual(0);
      expect(ann.x).toBeLessThanOrEqual(1);

      expect(ann.y).toBeGreaterThanOrEqual(0);
      expect(ann.y).toBeLessThanOrEqual(1);

      expect(ann.width).toBeGreaterThan(0);
      expect(ann.width).toBeLessThanOrEqual(1);

      expect(ann.height).toBeGreaterThan(0);
      expect(ann.height).toBeLessThanOrEqual(1);

      // Strict boundary check: bounding boxes must completely fit inside the 0.0 to 1.0 normalized image plane
      expect(ann.x + ann.width).toBeLessThanOrEqual(1.0);
      expect(ann.y + ann.height).toBeLessThanOrEqual(1.0);
    }
  });

  it("should enforce evidence integrity and claim strength boundaries", async () => {
    const result = await analyzeDesign(sampleInput);
    const validReasoningTypes = ["rule_match", "theory_inference", "heuristic_risk", "custom_rule"];
    const validRuleLayers = [
      "L1_HARD_CONSTRAINT",
      "L2_PLATFORM_GUIDELINE",
      "L3_HUMAN_FACTORS",
      "L4_DOMAIN_RULE",
      "L5_CUSTOM_RULE"
    ];

    for (const ann of result.annotations) {
      expect(validRuleLayers).toContain(ann.rule_layer);
      expect(validReasoningTypes).toContain(ann.reasoning_type);

      expect(Array.isArray(ann.evidence)).toBe(true);
      for (const ev of ann.evidence) {
        expect(ev.evidence_id).toBeDefined();
        expect(ev.source_name).toBeDefined();
        expect(ev.guideline_ref).toBeDefined();
        expect(ev.summary).toBeDefined();
        expect(validReasoningTypes).toContain(ev.reasoning_type);

        // Core integrity rule: non-verified reference MUST NOT claim strong strength
        if (ev.reference_status !== "verified_reference") {
          expect(ev.claim_strength).not.toBe("strong");
        }
      }
    }
  });

  it("should provide valid measurement structure when present", async () => {
    const result = await analyzeDesign(sampleInput);
    for (const ann of result.annotations) {
      if (ann.measurement) {
        expect(ann.measurement.metric_name).toBeDefined();
        expect(ann.measurement.current_value).toBeDefined();
        expect(ann.measurement.threshold_value).toBeDefined();
        expect(typeof ann.measurement.interpretation).toBe("string");
        expect(ann.measurement.interpretation.length).toBeGreaterThan(0);
      }
    }
  });

  it("should provide valid contextual_findings structure when present", async () => {
    const result = await analyzeDesign(sampleInput);
    const validContextTypes = ["user_group", "usage_context", "rule_set", "device_profile"];
    const validSuitabilities = ["suitable", "acceptable", "risk", "not_suitable", "unknown"];

    for (const ann of result.annotations) {
      if (ann.contextual_findings && ann.contextual_findings.length > 0) {
        for (const cf of ann.contextual_findings) {
          expect(cf.finding_id).toBeDefined();
          expect(validContextTypes).toContain(cf.context_type);
          expect(cf.context_label).toBeDefined();
          expect(validSuitabilities).toContain(cf.suitability);
          expect(typeof cf.reason).toBe("string");
          expect(cf.reason.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("should preserve structured and presentation-level simulated markers on mock analysis outputs", async () => {
    const result = await analyzeDesign(sampleInput);
    for (const ann of result.annotations) {
      // 1. Structured evidence note check (language-neutral)
      for (const ev of ann.evidence) {
        expect(ev.note).toBe("Mock evidence only.");
      }
      // 2. Presentation-level safeguard: ensures the generated impact summary does not omit simulation notices
      expect(ann.applied_context).toBeDefined();
      expect(ann.applied_context.impact_summary).toContain("模拟");
    }
  });
});
