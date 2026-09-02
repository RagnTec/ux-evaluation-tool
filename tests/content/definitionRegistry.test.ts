import { describe, it, expect } from "vitest";
import { definitionRegistry, getDefinition } from "../../src/content/definitionRegistry";

describe("Definition Registry", () => {
  const requiredTerms = [
    // Area / Size
    "visual_area",
    "touch_area",
    "minimum_side",
    "screen_share",
    "image_share",
    "nearest_touch_spacing",
    "touch_overlap",
    // Interaction
    "interaction_type",
    "tap",
    "swipe",
    "tap_swipe",
    "swipe_direction",
    // Calibration / Mapping
    "design_size_basis",
    "css_px",
    "dp",
    "pt",
    "exact_measurement",
    "estimated_measurement",
    "relative_only",
    "user_specified_mapping",
    // Evaluation
    "text_contrast",
    "non_text_contrast",
    "touch_reasonableness",
    "platform_reference_area",
    // Evidence
    "wcag",
    "sc_1_4_3",
    "sc_1_4_11",
    "sc_2_5_8",
    "platform_guideline",
    "verified_reference",
    "simulated_result"
  ];

  it("contains all required definition terms", () => {
    for (const term of requiredTerms) {
      expect(definitionRegistry[term]).toBeDefined();
      expect(definitionRegistry[term].id).toBe(term);
    }
  });

  it("every definition has non-empty label, english_label, plain_definition, and why_it_matters", () => {
    for (const [key, def] of Object.entries(definitionRegistry)) {
      expect(def.label.length).toBeGreaterThan(0);
      expect(def.english_label.length).toBeGreaterThan(0);
      expect(def.plain_definition.length).toBeGreaterThan(0);
      expect(def.why_it_matters.length).toBeGreaterThan(0);
      expect(def.caution.length).toBeGreaterThan(0);
    }
  });

  it("getDefinition returns definition for existing term and undefined for unknown", () => {
    expect(getDefinition("visual_area")?.label).toBe("可视面积");
    expect(getDefinition("unknown_term_xyz")).toBeUndefined();
  });

  it("definitions with reference_id have valid standard identifier references", () => {
    const sc258 = getDefinition("sc_2_5_8");
    expect(sc258?.reference_id).toBe("L1-WCAG-SC-2.5.8");
    expect(sc258?.reference_label).toBe("WCAG 2.2 SC 2.5.8");

    const sc143 = getDefinition("sc_1_4_3");
    expect(sc143?.reference_id).toBe("L1-WCAG-SC-1.4.3");

    const sc1411 = getDefinition("sc_1_4_11");
    expect(sc1411?.reference_id).toBe("L1-WCAG-SC-1.4.11");
  });
});
