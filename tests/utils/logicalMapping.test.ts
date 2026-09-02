import { describe, it, expect } from "vitest";
import {
  calculateLogicalScale,
  mapPixelBoundsToLogical,
  createLogicalUnitMapping,
  formatScaleRatio,
  evaluateTargetSize
} from "../../src/utils/logicalMapping";
import type { PixelBounds } from "../../src/types/designElement";

describe("Logical Unit Mapping & Target Size Evaluation", () => {
  describe("calculateLogicalScale", () => {
    it("should calculate uniform scale correctly from width reference", () => {
      // 1170 image px = 390 pt -> scale = 390 / 1170 = 0.3333333333333333 (1/3)
      const res = calculateLogicalScale(1170, 390);
      expect(res).not.toBeNull();
      expect(res?.scale_x).toBeCloseTo(1 / 3, 4);
      expect(res?.scale_y).toBeCloseTo(1 / 3, 4);
      expect(res?.warning).toBeUndefined();
    });

    it("should map 2560 image px to 390 pt with uniform scale on both axes", () => {
      // 2560 image px width = 390 pt
      const mapping = createLogicalUnitMapping("ios", "pt", 2560, 390, undefined, undefined, "user_specified");
      expect(mapping).not.toBeNull();
      if (!mapping) return;

      expect(mapping.scale_x).toBeCloseTo(390 / 2560, 5);
      expect(mapping.scale_y).toBeCloseTo(390 / 2560, 5);

      // Height of 202 px mapped to pt: 202 * (390 / 2560) = 30.7734... -> 30.8 pt
      const mapped = mapPixelBoundsToLogical({ x: 0, y: 0, width: 200, height: 202 }, mapping);
      expect(mapped.height).toBe(30.8);
      expect(mapped.height).not.toBe(202);
    });

    it("should calculate 2x CSS pixel scale correctly", () => {
      // 750 image px = 375 CSS px -> scale = 0.5
      const res = calculateLogicalScale(750, 375);
      expect(res).not.toBeNull();
      expect(res?.scale_x).toBe(0.5);
      expect(res?.scale_y).toBe(0.5);
      expect(res?.warning).toBeUndefined();
    });

    it("should detect scale discrepancy between X and Y axes and provide warning", () => {
      // X: 1000 -> 500 (0.5), Y: 2000 -> 800 (0.4) -> discrepancy > 5%
      const res = calculateLogicalScale(1000, 500, 2000, 800);
      expect(res).not.toBeNull();
      expect(res?.scale_x).toBe(0.5);
      expect(res?.scale_y).toBe(0.4);
      expect(res?.warning).toBeDefined();
      expect(res?.warning).toContain("水平与垂直缩放比例不一致");
    });

    it("should not warn when X and Y scales match closely", () => {
      const res = calculateLogicalScale(1170, 390, 2532, 844);
      expect(res).not.toBeNull();
      expect(res?.warning).toBeUndefined();
    });

    it("should return null for non-positive or invalid inputs", () => {
      expect(calculateLogicalScale(0, 390)).toBeNull();
      expect(calculateLogicalScale(1170, -10)).toBeNull();
      expect(calculateLogicalScale(NaN, 390)).toBeNull();
    });
  });

  describe("mapPixelBoundsToLogical", () => {
    const pixelBounds: PixelBounds = { x: 100, y: 150, width: 132, height: 132 };

    it("should map pixel dimensions to pt with 3x scale", () => {
      const mapping = createLogicalUnitMapping("ios", "pt", 1170, 390, undefined, undefined, "user_specified");
      expect(mapping).not.toBeNull();
      if (!mapping) return;

      const logical = mapPixelBoundsToLogical(pixelBounds, mapping);
      expect(logical.width).toBe(44.0);
      expect(logical.height).toBe(44.0);
      expect(logical.min_side).toBe(44.0);
    });

    it("should map rectangular pixel dimensions accurately", () => {
      const mapping = createLogicalUnitMapping("web", "css_px", 750, 375, undefined, undefined, "user_specified");
      expect(mapping).not.toBeNull();
      if (!mapping) return;

      const rectBounds: PixelBounds = { x: 0, y: 0, width: 100, height: 50 };
      const logical = mapPixelBoundsToLogical(rectBounds, mapping);
      expect(logical.width).toBe(50.0);
      expect(logical.height).toBe(25.0);
      expect(logical.min_side).toBe(25.0);
    });

    it("should preserve anisotropic scaling when explicit two-axis mapping is supplied", () => {
      const mapping = createLogicalUnitMapping("custom", "pt", 1000, 500, 2000, 800, "user_specified");
      expect(mapping).not.toBeNull();
      if (!mapping) return;

      const rectBounds: PixelBounds = { x: 0, y: 0, width: 100, height: 100 };
      const logical = mapPixelBoundsToLogical(rectBounds, mapping);
      expect(logical.width).toBe(50.0);
      expect(logical.height).toBe(40.0);
    });
  });

  describe("formatScaleRatio", () => {
    it("should format user-friendly scale strings", () => {
      const mappingPt = createLogicalUnitMapping("ios", "pt", 1170, 390);
      expect(mappingPt ? formatScaleRatio(mappingPt) : "").toBe("1 图像像素 ≈ 0.333 pt (1 pt = 3 图像像素)");

      const mappingCss = createLogicalUnitMapping("web", "css_px", 800, 400);
      expect(mappingCss ? formatScaleRatio(mappingCss) : "").toBe("1 图像像素 ≈ 0.5 CSS px (1 CSS px = 2 图像像素)");
    });
  });

  describe("evaluateTargetSize - ResultBasis propagation", () => {
    it("propagates exact result_basis when mapping quality is exact_profile", () => {
      const res = evaluateTargetSize({ width: 24, height: 24 }, { unit: "css_px", platform: "web", quality: "exact_profile", image_reference_width: 100, logical_reference_width: 100, scale_x: 1, scale_y: 1 });
      expect(res?.result_basis).toBe("exact");
    });

    it("propagates inferred result_basis when mapping quality is inferred_profile", () => {
      const res = evaluateTargetSize({ width: 24, height: 24 }, { unit: "css_px", platform: "web", quality: "inferred_profile", image_reference_width: 100, logical_reference_width: 100, scale_x: 1, scale_y: 1 });
      expect(res?.result_basis).toBe("inferred");
      expect(res?.summary_text).toContain("自动估算");
    });

    it("propagates user_confirmed result_basis for user_specified mapping", () => {
      const res = evaluateTargetSize({ width: 24, height: 24 }, { unit: "css_px", platform: "web", quality: "user_specified", image_reference_width: 100, logical_reference_width: 100, scale_x: 1, scale_y: 1 });
      expect(res?.result_basis).toBe("user_confirmed");
    });
  });

  describe("evaluateTargetSize - Web / WCAG 2.2 SC 2.5.8 (24x24 CSS px)", () => {
    it("should report condition_met when dimensions are >= 24x24 CSS px", () => {
      const res = evaluateTargetSize({ width: 24, height: 24 }, { unit: "css_px", platform: "web", quality: "exact_profile", image_reference_width: 100, logical_reference_width: 100, scale_x: 1, scale_y: 1 });
      expect(res).not.toBeNull();
      expect(res?.status).toBe("condition_met");
      expect(res?.summary_text).toContain("达到 SC 2.5.8 的尺寸条件");
      expect(res?.summary_text).not.toContain("WCAG compliant");
      expect(res?.rule_id).toBe("L1-WCAG-SC-2.5.8");
      expect(res?.reference_status).toBe("verified_reference");
      expect(res?.claim_strength).toBe("strong");
    });

    it("should report needs_review when dimensions are < 24 CSS px", () => {
      const res = evaluateTargetSize({ width: 20, height: 24 }, { unit: "css_px", platform: "web", quality: "exact_profile", image_reference_width: 100, logical_reference_width: 100, scale_x: 1, scale_y: 1 });
      expect(res).not.toBeNull();
      expect(res?.status).toBe("needs_review");
      expect(res?.summary_text).toContain("低于 24 CSS px 尺寸条件，需继续检查 spacing / exception");
      expect(res?.summary_text).not.toContain("Failed WCAG");
      expect(res?.detail_text).toContain("根据 SC 2.5.8，如果具有充分间距");
    });
  });

  describe("evaluateTargetSize - Android (48x48 dp)", () => {
    it("should report condition_met when dimensions are >= 48x48 dp", () => {
      const res = evaluateTargetSize({ width: 48, height: 50 }, { unit: "dp", platform: "android", quality: "exact_profile", image_reference_width: 100, logical_reference_width: 100, scale_x: 1, scale_y: 1 });
      expect(res).not.toBeNull();
      expect(res?.status).toBe("condition_met");
      expect(res?.summary_text).toContain("达到推荐范围");
      expect(res?.rule_layer).toBe("L2_PLATFORM_GUIDELINE");
      expect(res?.reference_status).toBe("verified_reference");
    });

    it("should report below_minimum when dimensions are < 48 dp", () => {
      const res = evaluateTargetSize({ width: 40, height: 48 }, { unit: "dp", platform: "android", quality: "exact_profile", image_reference_width: 100, logical_reference_width: 100, scale_x: 1, scale_y: 1 });
      expect(res).not.toBeNull();
      expect(res?.status).toBe("below_minimum");
      expect(res?.summary_text).toContain("不满足基本要求");
    });
  });

  describe("evaluateTargetSize - Apple / iOS (44x44 pt default / 28x28 pt minimum)", () => {
    it("should report meets_default when dimensions are >= 44x44 pt", () => {
      const res = evaluateTargetSize({ width: 44, height: 44 }, { unit: "pt", platform: "ios", quality: "exact_profile", image_reference_width: 100, logical_reference_width: 100, scale_x: 1, scale_y: 1 });
      expect(res).not.toBeNull();
      expect(res?.status).toBe("meets_default");
      expect(res?.summary_text).toContain("符合默认推荐尺寸");
      expect(res?.rule_layer).toBe("L2_PLATFORM_GUIDELINE");
      expect(res?.reference_status).toBe("verified_reference");
    });

    it("should report meets_minimum when dimensions are >= 28x28 pt but < 44 pt", () => {
      const res = evaluateTargetSize({ width: 32, height: 32 }, { unit: "pt", platform: "ios", quality: "exact_profile", image_reference_width: 100, logical_reference_width: 100, scale_x: 1, scale_y: 1 });
      expect(res).not.toBeNull();
      expect(res?.status).toBe("meets_minimum");
      expect(res?.summary_text).toContain("达到最小尺寸但低于默认推荐");
    });

    it("should report below_minimum when dimensions are < 28 pt", () => {
      const res = evaluateTargetSize({ width: 24, height: 30 }, { unit: "pt", platform: "ios", quality: "exact_profile", image_reference_width: 100, logical_reference_width: 100, scale_x: 1, scale_y: 1 });
      expect(res).not.toBeNull();
      expect(res?.status).toBe("below_minimum");
      expect(res?.summary_text).toContain("低于最小控件尺寸");
    });
  });

  describe("createCroppedPreservedScaleMapping", () => {
    it("maps cropped elements using original full screenshot reference", () => {
      // Original screenshot: 2560 px, full design width: 390 pt
      // An element of 208 px inside the cropped screenshot
      const mapping = createLogicalUnitMapping("ios", "pt", 2560, 390, undefined, undefined, "user_specified");
      expect(mapping).not.toBeNull();
      if (!mapping) return;

      const mapped = mapPixelBoundsToLogical({ x: 10, y: 20, width: 208, height: 100 }, mapping);
      // 208 * (390 / 2560) = 31.6875 -> 31.7 pt
      expect(mapped.width).toBe(31.7);
    });

    it("formats scale ratio clearly in both directions", () => {
      const mapping = createLogicalUnitMapping("ios", "pt", 2560, 390, undefined, undefined, "user_specified");
      expect(mapping).not.toBeNull();
      if (!mapping) return;

      const formatted = formatScaleRatio(mapping);
      expect(formatted).toContain("1 图像像素 ≈ 0.152 pt");
      expect(formatted).toContain("1 pt = 6.56 图像像素");
    });
  });
});
