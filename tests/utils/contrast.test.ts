import { describe, it, expect } from "vitest";
import {
  parseColorToRgb,
  rgbToHex,
  calculateRelativeLuminance,
  calculateContrastRatio,
  evaluateWcagContrast,
  evaluateWcagNonTextContrast
} from "../../src/utils/contrast";
import type { DesignElement } from "../../src/types/designElement";

describe("Contrast and Color Calculation Utilities", () => {
  describe("parseColorToRgb", () => {
    it("should parse 3-digit and 6-digit hex values correctly", () => {
      expect(parseColorToRgb("#fff")).toEqual([255, 255, 255]);
      expect(parseColorToRgb("#000")).toEqual([0, 0, 0]);
      expect(parseColorToRgb("#123456")).toEqual([18, 52, 86]);
      expect(parseColorToRgb("ffffff")).toEqual([255, 255, 255]);
    });

    it("should parse rgb and rgba strings correctly", () => {
      expect(parseColorToRgb("rgb(255, 128, 0)")).toEqual([255, 128, 0]);
      expect(parseColorToRgb("rgba(0, 50, 200, 0.5)")).toEqual([0, 50, 200]);
    });

    it("should return null for invalid color formats", () => {
      expect(parseColorToRgb("")).toBeNull();
      expect(parseColorToRgb("not-a-color")).toBeNull();
      expect(parseColorToRgb("#12")).toBeNull();
    });
  });

  describe("calculateRelativeLuminance", () => {
    it("should calculate correct relative luminance for black and white", () => {
      expect(calculateRelativeLuminance([0, 0, 0])).toBe(0);
      expect(calculateRelativeLuminance([255, 255, 255])).toBe(1);
    });
  });

  describe("calculateContrastRatio", () => {
    it("should calculate exact 21:1 for black and white", () => {
      const { ratio } = calculateContrastRatio([255, 255, 255], [0, 0, 0]);
      expect(ratio).toBe(21);
    });

    it("should calculate exact 1:1 for identical colors", () => {
      const { ratio } = calculateContrastRatio([120, 120, 120], [120, 120, 120]);
      expect(ratio).toBe(1);
    });

    it("should be order-independent (foreground vs background)", () => {
      const r1 = calculateContrastRatio([255, 0, 0], [255, 255, 255]).ratio;
      const r2 = calculateContrastRatio([255, 255, 255], [255, 0, 0]).ratio;
      expect(r1).toBe(r2);
    });
  });

  describe("evaluateWcagContrast - SC 1.4.3 Text Contrast", () => {
    it("should return null when either or both colors are missing or invalid", () => {
      expect(evaluateWcagContrast("", "")).toBeNull();
      expect(evaluateWcagContrast("#000000", "")).toBeNull();
      expect(evaluateWcagContrast("", "#FFFFFF")).toBeNull();
      expect(evaluateWcagContrast("invalid", "#FFFFFF")).toBeNull();
    });

    it("should evaluate WCAG SC 1.4.3 for normal text with 4.5:1 threshold", () => {
      // Black on White: 21:1 -> passes
      const res1 = evaluateWcagContrast("#000000", "#FFFFFF", "normal");
      expect(res1).not.toBeNull();
      expect(res1?.passed).toBe(true);
      expect(res1?.threshold).toBe(4.5);
      expect(res1?.contrast_ratio).toBe(21);
      expect(res1?.evaluation_type).toBe("text");
      expect(res1?.reference).toBe("WCAG 2.2 Success Criterion 1.4.3 Contrast (Minimum)");
      expect(res1?.reference_status).toBe("verified_reference");
      expect(res1?.claim_strength).toBe("strong");

      // Light gray (#AAAAAA) on White (#FFFFFF) ~ 2.32:1 -> fails normal text
      const res2 = evaluateWcagContrast("#AAAAAA", "#FFFFFF", "normal");
      expect(res2?.passed).toBe(false);
      expect(res2?.contrast_ratio).toBeLessThan(4.5);
    });

    it("should evaluate WCAG SC 1.4.3 for large text with 3.0:1 threshold", () => {
      // A color pair with ~ 3.5:1 contrast
      const res = evaluateWcagContrast("#767676", "#FFFFFF", "large");
      expect(res).not.toBeNull();
      expect(res?.threshold).toBe(3.0);
      expect(res?.passed).toBe(true);
    });
  });

  describe("evaluateWcagNonTextContrast - SC 1.4.11 Non-text Contrast", () => {
    it("should return null when either color is missing or invalid", () => {
      expect(evaluateWcagNonTextContrast("", "")).toBeNull();
      expect(evaluateWcagNonTextContrast("#000000", "")).toBeNull();
      expect(evaluateWcagNonTextContrast("", "#FFFFFF")).toBeNull();
      expect(evaluateWcagNonTextContrast("invalid", "#FFFFFF")).toBeNull();
    });

    it("should evaluate SC 1.4.11 with 3.0:1 threshold for UI components", () => {
      // Black (#000000) on White (#FFFFFF): 21:1 -> passes 3.0:1 threshold
      const res = evaluateWcagNonTextContrast("#000000", "#FFFFFF");
      expect(res).not.toBeNull();
      expect(res?.passed).toBe(true);
      expect(res?.threshold).toBe(3.0);
      expect(res?.contrast_ratio).toBe(21);
      expect(res?.evaluation_type).toBe("non_text");
      expect(res?.rule_id).toBe("L1-WCAG-SC-1.4.11");
      expect(res?.reference).toBe("WCAG 2.2 Success Criterion 1.4.11 Non-text Contrast");
      expect(res?.reference_status).toBe("verified_reference");
      expect(res?.claim_strength).toBe("strong");
    });

    it("should fail when contrast is below 3.0:1 threshold", () => {
      // Light gray (#999999) on White (#FFFFFF) ~ 2.84:1 -> fails 3.0:1
      const res = evaluateWcagNonTextContrast("#999999", "#FFFFFF");
      expect(res).not.toBeNull();
      expect(res?.passed).toBe(false);
      expect(res?.contrast_ratio).toBeLessThan(3.0);
      expect(res?.threshold).toBe(3.0);
    });

    it("should pass when contrast meets or exceeds 3.0:1 threshold", () => {
      // Medium gray (#767676) on White (#FFFFFF) ~ 4.54:1 -> passes 3.0:1
      const res = evaluateWcagNonTextContrast("#767676", "#FFFFFF");
      expect(res).not.toBeNull();
      expect(res?.passed).toBe(true);
      expect(res?.contrast_ratio).toBeGreaterThanOrEqual(3.0);
    });
  });

  describe("DesignElement Contrast Lifecycle & Measurement Integrity", () => {
    it("should not have contrast evaluation when created with unset colors", () => {
      const newEl: DesignElement = {
        element_id: "el-new",
        source: "manual",
        element_type: "text",
        normalized_bounds: { x: 0.1, y: 0.1, width: 0.2, height: 0.1 },
        image_pixel_bounds: { x: 100, y: 100, width: 200, height: 100 },
        calibration_mode: "full_screen",
        created_at: new Date().toISOString()
      };

      expect(newEl.foreground_color).toBeUndefined();
      expect(newEl.background_color).toBeUndefined();
      expect(newEl.contrast_evaluation).toBeUndefined();
    });

    it("should not evaluate contrast when only foreground color is provided", () => {
      const fg = "#112233";
      const bg = undefined;
      const evaluation = fg && bg ? evaluateWcagContrast(fg, bg, "normal") : undefined;
      expect(evaluation).toBeUndefined();
    });

    it("should not evaluate contrast when only background color is provided", () => {
      const fg = undefined;
      const bg = "#FFFFFF";
      const evaluation = fg && bg ? evaluateWcagContrast(fg, bg, "normal") : undefined;
      expect(evaluation).toBeUndefined();
    });

    it("should produce deterministic contrast evaluation once both valid colors are provided", () => {
      const fg = "#000000";
      const bg = "#FFFFFF";
      const evaluation = fg && bg ? evaluateWcagContrast(fg, bg, "normal") : undefined;
      expect(evaluation).toBeDefined();
      expect(evaluation?.contrast_ratio).toBe(21);
      expect(evaluation?.passed).toBe(true);
      expect(evaluation?.status).toBe("confirmed");
    });

    it("should produce provisional contrast evaluation when one color is provisional", () => {
      const fg = "#000000";
      const bg = "#FFFFFF";
      const evalProvisional = evaluateWcagContrast(fg, bg, "normal", "provisional", "confirmed");
      expect(evalProvisional).toBeDefined();
      expect(evalProvisional?.status).toBe("provisional");
      expect(evalProvisional?.contrast_ratio).toBe(21);
      expect(evalProvisional?.provisional_message).toContain("当前前景色为临时预设");
      expect(evalProvisional?.claim_strength).toBe("medium");
    });

    it("should produce provisional non-text contrast evaluation when background is provisional", () => {
      const comp = "#0066CC";
      const bg = "#FFFFFF";
      const evalProvisional = evaluateWcagNonTextContrast(comp, bg, "confirmed", "provisional");
      expect(evalProvisional).toBeDefined();
      expect(evalProvisional?.status).toBe("provisional");
      expect(evalProvisional?.provisional_message).toContain("当前背景色为临时预设");
      expect(evalProvisional?.claim_strength).toBe("medium");
    });
  });
});
