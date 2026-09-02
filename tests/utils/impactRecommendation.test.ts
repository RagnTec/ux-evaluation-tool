import { describe, it, expect } from "vitest";
import { getUnifiedResultExplanation } from "../../src/utils/impactRecommendation";
import type { DesignElement } from "../../src/types/designElement";

describe("getUnifiedResultExplanation", () => {
  const baseElement: DesignElement = {
    element_id: "el-1",
    label: "立即购买",
    element_type: "button",
    image_pixel_bounds: { x: 50, y: 100, width: 200, height: 60 },
    normalized_bounds: { top: 0.1, left: 0.05, width: 0.2, height: 0.06 },
    interaction_type: "tap",
    calibration_mode: "full_screen"
  };

  it("generates structured explanation for interactive button with good target size", () => {
    const res = getUnifiedResultExplanation({
      element: baseElement,
      logicalMapping: {
        platform: "ios",
        unit: "pt",
        image_reference_width: 1170,
        logical_reference_width: 390,
        scale_x: 390 / 1170,
        scale_y: 390 / 1170,
        scale_ratio: 3.0,
        quality: "user_specified"
      },
      calibrationMode: "full_screen",
      touchStatus: "good",
      targetSizeEval: {
        target_size_px: { width: 200, height: 60 },
        target_size_logical: { width: 66.7, height: 20 },
        logical_unit: "pt",
        required_size_logical: { width: 44, height: 44 },
        status: "meets_default",
        rule_id: "L2-APPLE-HIG-TARGET-SIZE",
        rule_layer: "L2_PLATFORM_GUIDELINE",
        reference: "Apple HIG Target Size",
        summary_text: "满足推荐触控尺寸要求",
        detail_text: "宽度与高度均达到 44x44 pt 推荐范围",
        confidence: "high",
        reasoning_type: "platform_guidance",
        reference_status: "verified_reference",
        claim_strength: "strong"
      }
    });

    expect(res.conclusion).toBeDefined();
    expect(res.whyItMatters).toBeDefined();
    expect(res.perspectives.length).toBeGreaterThanOrEqual(2);

    const designP = res.perspectives.find((p) => p.type === "design");
    const productP = res.perspectives.find((p) => p.type === "product");

    expect(designP).toBeDefined();
    expect(productP).toBeDefined();

    // Verify conservative phrasing (non-prescriptive)
    expect(res.whyItMatters).not.toMatch(/必须|强制|绝对/);
  });

  it("highlights priority and risk guidance when touch targets overlap", () => {
    const res = getUnifiedResultExplanation({
      element: baseElement,
      logicalMapping: null,
      calibrationMode: "full_screen",
      touchStatus: "attention",
      isOverlapping: true
    });

    const priorityP = res.perspectives.find((p) => p.type === "priority");
    expect(priorityP).toBeDefined();
    expect(priorityP?.content).toContain("重叠");
  });

  it("handles non-interactive text elements with contrast checks", () => {
    const textElement: DesignElement = {
      ...baseElement,
      element_type: "text",
      label: "说明文案",
      interaction_type: "none"
    };

    const res = getUnifiedResultExplanation({
      element: textElement,
      logicalMapping: null,
      calibrationMode: "full_screen",
      contrastEval: {
        foreground_hex: "#777777",
        foreground_rgb: [119, 119, 119],
        background_hex: "#FFFFFF",
        background_rgb: [255, 255, 255],
        foreground_luminance: 0.18,
        background_luminance: 1.0,
        contrast_ratio: 4.48,
        threshold: 4.5,
        passed: false,
        status: "confirmed",
        rule_id: "L1-WCAG-SC-1.4.3",
        rule_layer: "L1_HARD_CONSTRAINT",
        reasoning_type: "standard_match",
        reference: "WCAG 2.2 SC 1.4.3",
        reference_status: "verified_reference",
        claim_strength: "strong"
      }
    });

    expect(res.conclusion).toContain("4.48");
    const designP = res.perspectives.find((p) => p.type === "design");
    expect(designP?.content).toContain("4.5");
  });
});
