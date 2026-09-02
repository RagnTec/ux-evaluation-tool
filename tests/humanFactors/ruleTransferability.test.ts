import { describe, it, expect } from "vitest";
import {
  getRuleTransferability,
  RULE_TRANSFERABILITY_AUDIT_INVENTORY
} from "../../src/humanFactors/ruleTransferability";

describe("Human Factors Core: ruleTransferability", () => {
  it("defaults unclassified rules safely to 'unknown'", () => {
    expect(getRuleTransferability("CUSTOM-NEW-RULE")).toBe("unknown");
    expect(getRuleTransferability(undefined)).toBe("unknown");
    expect(getRuleTransferability("")).toBe("unknown");
  });

  it("marks all production standard rules as 'direct_only'", () => {
    // Touch target rules
    expect(getRuleTransferability("L1-WCAG-SC-2.5.8")).toBe("direct_only");
    expect(getRuleTransferability("L2-ANDROID-TARGET-SIZE-48DP")).toBe("direct_only");
    expect(getRuleTransferability("L2-APPLE-MIN-TARGET-44PT")).toBe("direct_only");
    expect(getRuleTransferability("L2-APPLE-HIG-TARGET-SIZE")).toBe("direct_only");
    expect(getRuleTransferability("touch_overlap_conflict")).toBe("direct_only");

    // Contrast rules
    expect(getRuleTransferability("L1-WCAG-SC-1.4.3")).toBe("direct_only");
    expect(getRuleTransferability("L1-WCAG-SC-1.4.11")).toBe("direct_only");
    expect(getRuleTransferability("wcag_1_4_3")).toBe("direct_only");
    expect(getRuleTransferability("wcag_1_4_11")).toBe("direct_only");

    // Typography rules
    expect(getRuleTransferability("L2-APPLE-BODY-TEXT")).toBe("direct_only");
    expect(getRuleTransferability("L2-ANDROID-BODY-TEXT")).toBe("direct_only");
    expect(getRuleTransferability("typography_legibility")).toBe("direct_only");
  });

  it("ensures zero production rules are assigned to 'visual_angle_equivalent'", () => {
    const rulesToTest = [
      "L1-WCAG-SC-2.5.8",
      "L2-ANDROID-TARGET-SIZE-48DP",
      "L2-APPLE-MIN-TARGET-44PT",
      "L2-APPLE-HIG-TARGET-SIZE",
      "L1-WCAG-SC-1.4.3",
      "L1-WCAG-SC-1.4.11",
      "L2-APPLE-BODY-TEXT",
      "L2-ANDROID-BODY-TEXT",
      "touch_overlap_conflict",
      "typography_legibility"
    ];

    rulesToTest.forEach((ruleId) => {
      expect(getRuleTransferability(ruleId)).not.toBe("visual_angle_equivalent");
    });
  });

  describe("Rule Transferability Audit Inventory", () => {
    it("contains structured records with valid mechanisms and audit statuses", () => {
      expect(RULE_TRANSFERABILITY_AUDIT_INVENTORY.length).toBeGreaterThan(0);

      const validMechanisms = [
        "visual_legibility",
        "visual_recognition",
        "visual_discrimination",
        "motor_target_acquisition",
        "motor_error_prevention",
        "layout_density",
        "platform_convention",
        "accessibility_requirement",
        "unknown"
      ];

      const validStatuses = [
        "direct_only",
        "non_transferable",
        "candidate_for_visual_angle_review",
        "insufficient_evidence",
        "unknown"
      ];

      RULE_TRANSFERABILITY_AUDIT_INVENTORY.forEach((record) => {
        expect(record.rule_id).toBeTruthy();
        expect(validMechanisms).toContain(record.mechanism);
        expect(validStatuses).toContain(record.audit_status);
        expect(record.confounding_variables.length).toBeGreaterThan(0);
        expect(record.transferability_assessment).toBeTruthy();
      });
    });

    it("verifies that touch target rules are classified under motor interaction and direct_only", () => {
      const touchRecord = RULE_TRANSFERABILITY_AUDIT_INVENTORY.find(
        (r) => r.rule_id === "L1-WCAG-SC-2.5.8"
      );
      expect(touchRecord).toBeDefined();
      expect(touchRecord!.mechanism).toBe("motor_target_acquisition");
      expect(touchRecord!.audit_status).toBe("direct_only");
    });

    it("verifies that contrast rules are classified under visual discrimination and direct_only", () => {
      const contrastRecord = RULE_TRANSFERABILITY_AUDIT_INVENTORY.find(
        (r) => r.rule_id === "L1-WCAG-SC-1.4.3"
      );
      expect(contrastRecord).toBeDefined();
      expect(contrastRecord!.mechanism).toBe("visual_discrimination");
      expect(contrastRecord!.audit_status).toBe("direct_only");
    });
  });
});
