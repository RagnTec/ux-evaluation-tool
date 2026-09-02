import { describe, it, expect } from "vitest";
import {
  estimateTextSizeFromVisualBounds,
  deriveAutomaticContrastSizeCategory,
  evaluateTextSize,
  recalculateElementTextSize
} from "../../src/utils/textSizeEvaluation";
import type { DesignElement, LogicalUnitMapping } from "../../src/types/designElement";

describe("textSizeEvaluation", () => {
  const iosMapping: LogicalUnitMapping = {
    platform: "ios",
    unit: "pt",
    image_reference_width: 1170,
    logical_reference_width: 390,
    scale_x: 390 / 1170, // 1/3
    scale_y: 390 / 1170,
    quality: "user_specified"
  };

  const iosExactMapping: LogicalUnitMapping = {
    platform: "ios",
    unit: "pt",
    image_reference_width: 1170,
    logical_reference_width: 390,
    scale_x: 390 / 1170,
    scale_y: 390 / 1170,
    quality: "exact_profile"
  };

  const androidMapping: LogicalUnitMapping = {
    platform: "android",
    unit: "dp",
    image_reference_width: 1080,
    logical_reference_width: 360,
    scale_x: 360 / 1080, // 1/3
    scale_y: 360 / 1080,
    quality: "user_specified"
  };

  const webMapping: LogicalUnitMapping = {
    platform: "web",
    unit: "css_px",
    image_reference_width: 1920,
    logical_reference_width: 1920,
    scale_x: 1,
    scale_y: 1,
    quality: "user_specified"
  };

  describe("estimateTextSizeFromVisualBounds", () => {
    it("derives estimated size from visual height using scale_y", () => {
      const bounds = { x: 100, y: 100, width: 300, height: 60 };
      const est = estimateTextSizeFromVisualBounds(bounds, iosMapping);
      expect(est).toBeDefined();
      expect(est?.value).toBe(20); // 60 * (1/3) = 20 pt
      expect(est?.unit).toBe("pt");
    });

    it("returns null if mapping is absent", () => {
      const bounds = { x: 0, y: 0, width: 100, height: 40 };
      const est = estimateTextSizeFromVisualBounds(bounds, undefined);
      expect(est).toBeNull();
    });
  });

  describe("deriveAutomaticContrastSizeCategory", () => {
    it("derives large text for confirmed regular text >= 24 CSS px or >= 18pt", () => {
      expect(deriveAutomaticContrastSizeCategory(24, "regular", "css_px", "user_confirmed")).toBe("large");
      expect(deriveAutomaticContrastSizeCategory(23.5, "regular", "css_px", "user_confirmed")).toBe("normal");
      expect(deriveAutomaticContrastSizeCategory(18, "regular", "pt", "user_confirmed")).toBe("large");
      expect(deriveAutomaticContrastSizeCategory(17.5, "regular", "pt", "user_confirmed")).toBe("normal");
    });

    it("derives large text for confirmed bold text >= 18.5 CSS px or >= 14pt", () => {
      expect(deriveAutomaticContrastSizeCategory(18.5, "bold", "css_px", "user_confirmed")).toBe("large");
      expect(deriveAutomaticContrastSizeCategory(18.0, "bold", "css_px", "user_confirmed")).toBe("normal");
      expect(deriveAutomaticContrastSizeCategory(14, "bold", "pt", "user_confirmed")).toBe("large");
      expect(deriveAutomaticContrastSizeCategory(13.5, "bold", "pt", "user_confirmed")).toBe("normal");
    });

    it("keeps screenshot-estimated text conservatively as normal for formal checking", () => {
      expect(deriveAutomaticContrastSizeCategory(30, "regular", "css_px", "estimated_from_visual_bounds")).toBe("normal");
      expect(deriveAutomaticContrastSizeCategory(24, "bold", "pt", "estimated_from_visual_bounds")).toBe("normal");
    });

    it("does NOT automatically classify Android sp as WCAG large text", () => {
      expect(deriveAutomaticContrastSizeCategory(18, "regular", "sp", "user_confirmed")).toBe("normal");
      expect(deriveAutomaticContrastSizeCategory(14, "bold", "sp", "user_confirmed")).toBe("normal");
      expect(deriveAutomaticContrastSizeCategory(24, "regular", "sp", "user_confirmed")).toBe("normal");
    });
  });

  describe("evaluateTextSize - ResultBasis semantics", () => {
    it("keeps estimated_from_visual_bounds as inferred even when mapping quality is exact_profile", () => {
      const elEstimated: DesignElement = {
        element_id: "el-est",
        element_type: "text",
        normalized_bounds: { x: 0, y: 0, width: 0.1, height: 0.05 },
        image_pixel_bounds: { x: 0, y: 0, width: 100, height: 51 },
        text_layout: "single_line",
        text_role: "body",
        text_weight_category: "regular",
        text_size_value: 17,
        text_size_unit: "pt",
        text_size_source: "estimated_from_visual_bounds"
      };

      const res = evaluateTextSize(elEstimated, "ios", iosExactMapping);
      expect(res).toBeDefined();
      expect(res?.result_basis).toBe("inferred");
      expect(res?.result_basis).not.toBe("exact");
    });

    it("assigns user_confirmed basis when source is user_confirmed", () => {
      const elConfirmed: DesignElement = {
        element_id: "el-conf",
        element_type: "text",
        normalized_bounds: { x: 0, y: 0, width: 0.1, height: 0.05 },
        image_pixel_bounds: { x: 0, y: 0, width: 100, height: 51 },
        text_layout: "single_line",
        text_role: "body",
        text_weight_category: "regular",
        text_size_value: 17,
        text_size_unit: "pt",
        text_size_source: "user_confirmed"
      };

      const res = evaluateTextSize(elConfirmed, "ios", iosMapping);
      expect(res?.result_basis).toBe("user_confirmed");
    });

    it("assigns exact basis for design_source only when mapping quality is exact_profile", () => {
      const elDesign: DesignElement = {
        element_id: "el-des",
        element_type: "text",
        normalized_bounds: { x: 0, y: 0, width: 0.1, height: 0.05 },
        image_pixel_bounds: { x: 0, y: 0, width: 100, height: 51 },
        text_layout: "single_line",
        text_role: "body",
        text_weight_category: "regular",
        text_size_value: 17,
        text_size_unit: "pt",
        text_size_source: "design_source"
      };

      const resExact = evaluateTextSize(elDesign, "ios", iosExactMapping);
      expect(resExact?.result_basis).toBe("exact");

      const resUser = evaluateTextSize(elDesign, "ios", iosMapping);
      expect(resUser?.result_basis).toBe("user_confirmed");
    });
  });

  describe("evaluateTextSize", () => {
    it("evaluates Apple HIG text size references (17pt default, 11pt minimum)", () => {
      const elConfirmed: DesignElement = {
        element_id: "el-1",
        element_type: "text",
        normalized_bounds: { x: 0, y: 0, width: 0.1, height: 0.05 },
        image_pixel_bounds: { x: 0, y: 0, width: 100, height: 51 },
        text_layout: "single_line",
        text_role: "body",
        text_weight_category: "regular",
        text_size_value: 17,
        text_size_unit: "pt",
        text_size_source: "user_confirmed"
      };

      const evalDefault = evaluateTextSize(elConfirmed, "ios", iosMapping);
      expect(evalDefault?.status).toBe("meets_default");
      expect(evalDefault?.summary_text).toContain("达到 Apple HIG 推荐正文字号 (17pt)");
      expect(evalDefault?.reference_status).toBe("pending_verification");

      const elMin: DesignElement = {
        ...elConfirmed,
        text_size_value: 13
      };
      const evalMin = evaluateTextSize(elMin, "ios", iosMapping);
      expect(evalMin?.status).toBe("meets_minimum");
      expect(evalMin?.summary_text).toContain("满足基本要求 (≥ 11pt)，但未达推荐正文 (≥ 17pt)");

      const elLow: DesignElement = {
        ...elConfirmed,
        text_size_value: 9
      };
      const evalLow = evaluateTextSize(elLow, "ios", iosMapping);
      expect(evalLow?.status).toBe("below_minimum");
      expect(evalLow?.summary_text).toContain("低于 11pt 基本要求");
    });

    it("evaluates Android text size with fallback borrowed body reference for label role", () => {
      const elBody: DesignElement = {
        element_id: "el-2",
        element_type: "text",
        normalized_bounds: { x: 0, y: 0, width: 0.1, height: 0.05 },
        image_pixel_bounds: { x: 0, y: 0, width: 100, height: 30 },
        text_layout: "single_line",
        text_role: "body",
        text_weight_category: "regular",
        text_size_value: 10,
        text_size_unit: "sp",
        text_size_source: "user_confirmed"
      };

      const evalBody = evaluateTextSize(elBody, "android", androidMapping);
      expect(evalBody?.status).toBe("below_minimum");
      expect(evalBody?.rule_id).toBe("L2-ANDROID-BODY-TEXT");

      const elLabel: DesignElement = {
        ...elBody,
        text_role: "label"
      };
      const evalLabel = evaluateTextSize(elLabel, "android", androidMapping);
      expect(evalLabel?.status).toBe("below_minimum");
      expect(evalLabel?.rule_id).toBe("L2-ANDROID-TEXT-FALLBACK");
      expect(evalLabel?.summary_text).toContain("暂借用正文文字阈值");
    });

    it("evaluates Web WCAG text size for SC 1.4.3 classification", () => {
      const elWeb: DesignElement = {
        element_id: "el-3",
        element_type: "text",
        normalized_bounds: { x: 0, y: 0, width: 0.1, height: 0.05 },
        image_pixel_bounds: { x: 0, y: 0, width: 100, height: 30 },
        text_layout: "single_line",
        text_role: "body",
        text_weight_category: "regular",
        text_size_value: 16,
        text_size_unit: "css_px",
        text_size_source: "user_confirmed"
      };

      const evalWeb = evaluateTextSize(elWeb, "web", webMapping);
      expect(evalWeb?.contrast_category_auto).toBe("normal");
      expect(evalWeb?.status).toBe("measurement_only");
    });

    it("returns pending status for multi-line text without confirmed size", () => {
      const elMulti: DesignElement = {
        element_id: "el-4",
        element_type: "text",
        normalized_bounds: { x: 0, y: 0, width: 0.1, height: 0.15 },
        image_pixel_bounds: { x: 0, y: 0, width: 100, height: 150 },
        text_layout: "multi_line",
        text_role: "body",
        text_weight_category: "regular",
        text_size_source: "estimated_from_visual_bounds"
      };

      const evalMulti = evaluateTextSize(elMulti, "ios", iosMapping);
      expect(evalMulti?.status).toBe("needs_info");
      expect(evalMulti?.summary_text).toContain("源设计字号未确认");
      expect(evalMulti?.result_basis).toBe("inferred");
    });
  });

  describe("recalculateElementTextSize", () => {
    it("keeps source font size undefined and needs_info when unconfirmed", () => {
      const el: DesignElement = {
        element_id: "el-5",
        element_type: "text",
        normalized_bounds: { x: 0, y: 0, width: 0.1, height: 0.05 },
        image_pixel_bounds: { x: 0, y: 0, width: 100, height: 60 },
        text_layout: "single_line",
        text_size_source: "estimated_from_visual_bounds"
      };

      const partial = recalculateElementTextSize(el, iosMapping);
      expect(partial.text_size_value).toBeUndefined();
      expect(partial.text_size_evaluation?.status).toBe("meets_default");
      expect(partial.text_size_evaluation?.evaluation_basis).toBe("screenshot_estimate");
    });

    it("preserves user_confirmed text size value during recalculation", () => {
      const el: DesignElement = {
        element_id: "el-6",
        element_type: "text",
        normalized_bounds: { x: 0, y: 0, width: 0.1, height: 0.05 },
        image_pixel_bounds: { x: 0, y: 0, width: 100, height: 60 },
        text_layout: "single_line",
        text_size_value: 15,
        text_size_unit: "pt",
        text_size_source: "user_confirmed"
      };

      const partial = recalculateElementTextSize(el, iosMapping);
      expect(partial.text_size_value).toBe(15);
      expect(partial.text_size_source).toBe("user_confirmed");
    });
  });
});
