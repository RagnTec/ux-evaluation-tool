import { describe, it, expect } from "vitest";
import {
  calculateScalarMinMargin,
  calculateScalarMaxMargin,
  calculateMultiAxisMargin,
  buildTargetSizeTrace,
  buildContrastTrace,
  buildTextSizeTrace,
  buildSpacingTrace,
  buildPhysicalGeometryTrace
} from "../../src/utils/ruleTrace";
import type {
  DesignElement,
  LogicalUnitMapping,
  TargetSizeEvaluation,
  TextSizeEvaluation,
  ContrastEvaluation
} from "../../src/types/designElement";
import type { NearestTouchTargetResult, WcagSpacingEvaluation } from "../../src/utils/interactionGeometry";

describe("Rule Comparison & Threshold Tracing Utilities", () => {
  describe("calculateScalarMinMargin", () => {
    it("computes positive margin when current exceeds threshold", () => {
      const res = calculateScalarMinMargin(5.2, 4.5, ":1");
      expect(res.meets).toBe(true);
      expect(res.margin).toBe(0.7);
      expect(res.marginFormatted).toBe("+0.7 :1");
      expect(res.marginLabel).toBe("余量 +0.7 :1");
    });

    it("computes negative margin (deficit) when current is below threshold", () => {
      const res = calculateScalarMinMargin(3.1, 4.5, ":1");
      expect(res.meets).toBe(false);
      expect(res.margin).toBe(-1.4);
      expect(res.marginFormatted).toBe("-1.4 :1");
      expect(res.marginLabel).toBe("距离参考还差 1.4 :1");
    });

    it("computes zero margin when current exactly equals threshold", () => {
      const res = calculateScalarMinMargin(4.5, 4.5, ":1");
      expect(res.meets).toBe(true);
      expect(res.margin).toBe(0);
      expect(res.marginFormatted).toBe("+0 :1");
      expect(res.marginLabel).toBe("余量 +0 :1");
    });
  });

  describe("calculateScalarMaxMargin", () => {
    it("computes positive margin when current is within maximum ceiling", () => {
      const res = calculateScalarMaxMargin(150, 200, "ms");
      expect(res.meets).toBe(true);
      expect(res.margin).toBe(50);
      expect(res.marginFormatted).toBe("+50 ms");
      expect(res.marginLabel).toBe("余量 +50 ms");
    });

    it("computes negative margin when current exceeds maximum ceiling", () => {
      const res = calculateScalarMaxMargin(250, 200, "ms");
      expect(res.meets).toBe(false);
      expect(res.margin).toBe(-50);
      expect(res.marginFormatted).toBe("-50 ms");
      expect(res.marginLabel).toBe("超出参考上限 50 ms");
    });
  });

  const iosMapping: LogicalUnitMapping = {
    platform: "ios",
    unit: "pt",
    image_reference_width: 1000,
    logical_reference_width: 500,
    scale_x: 0.5,
    scale_y: 0.5,
    quality: "user_specified"
  };

  describe("calculateMultiAxisMargin", () => {
    it("evaluates 2D multi-axis margins independently and flags the limiting axis", () => {
      // Width is 40 (deficit -8), Height is 50 (margin +2) against 48x48
      const res = calculateMultiAxisMargin(40, 50, 48, 48, "dp");

      expect(res.meets).toBe(false);
      expect(res.limitingAxis).toBe("宽度");
      expect(res.axes[0].meets).toBe(false);
      expect(res.axes[0].margin).toBe(-8);
      expect(res.axes[0].marginFormatted).toBe("-8 dp");
      expect(res.axes[1].meets).toBe(true);
      expect(res.axes[1].margin).toBe(2);
      expect(res.axes[1].marginFormatted).toBe("+2 dp");
    });

    it("evaluates meets = true when both axes satisfy threshold and identifies tighter axis", () => {
      // Width is 48 (margin +4), Height is 44 (margin +0) against 44x44
      const res = calculateMultiAxisMargin(48, 44, 44, 44, "pt");

      expect(res.meets).toBe(true);
      expect(res.limitingAxis).toBe("高度");
      expect(res.axes[0].meets).toBe(true);
      expect(res.axes[1].meets).toBe(true);
    });
  });

  describe("buildTargetSizeTrace", () => {

    it("returns estimated trace when element is interactive but touch bounds missing", () => {
      const el: DesignElement = {
        element_id: "el-1",
        source: "manual",
        element_type: "button",
        normalized_bounds: { x: 0, y: 0, width: 0.1, height: 0.1 },
        image_pixel_bounds: { x: 0, y: 0, width: 100, height: 100 },
        calibration_mode: "full_screen",
        interaction_type: "tap"
      };

      const trace = buildTargetSizeTrace(el, iosMapping);
      expect(trace.verdict).toBe("estimated_attention");
      expect(trace.resultBasis).toBe("inferred");
    });

    it("labels estimated verdict when based on visual bounds proxy", () => {
      const el: DesignElement = {
        element_id: "el-2",
        source: "manual",
        element_type: "button",
        normalized_bounds: { x: 0, y: 0, width: 0.1, height: 0.1 },
        image_pixel_bounds: { x: 0, y: 0, width: 100, height: 100 },
        calibration_mode: "full_screen",
        interaction_type: "tap",
        touch_bounds: { x: 0, y: 0, width: 0.1, height: 0.1 },
        touch_bounds_source: "visual_copy",
        target_size_evaluation: {
          unit: "pt",
          measured_width: 50,
          measured_height: 50,
          min_side: 50,
          threshold_width: 44,
          threshold_height: 44,
          status: "meets_default",
          summary_text: "满足 44pt",
          detail_text: "",
          rule_id: "apple_hig_target_size",
          rule_layer: "L2_PLATFORM_GUIDANCE",
          reasoning_type: "platform_spec",
          reference: "Apple HIG",
          reference_status: "verified_reference",
          claim_strength: "formal_guidance"
        }
      };

      const trace = buildTargetSizeTrace(el, iosMapping);
      expect(trace.verdict).toBe("estimated_meets");
      expect(trace.verdictLabel).toBe("估算达到推荐范围");
      expect(trace.resultBasis).toBe("inferred");
      expect(trace.comparison.kind).toBe("multi_axis");
    });

    it("evaluates Android 48dp target size with multi-axis trace", () => {
      const androidMapping: LogicalUnitMapping = {
        platform: "android",
        unit: "dp",
        image_reference_width: 1080,
        logical_reference_width: 360,
        scale_x: 0.3333,
        scale_y: 0.3333,
        quality: "user_specified"
      };

      const el: DesignElement = {
        element_id: "el-android",
        source: "manual",
        element_type: "button",
        normalized_bounds: { x: 0, y: 0, width: 0.1, height: 0.1 },
        image_pixel_bounds: { x: 0, y: 0, width: 120, height: 120 },
        calibration_mode: "full_screen",
        interaction_type: "tap",
        touch_bounds: { x: 0, y: 0, width: 0.1, height: 0.1 },
        touch_bounds_source: "user_defined",
        target_size_evaluation: {
          unit: "dp",
          measured_width: 40,
          measured_height: 48,
          min_side: 40,
          threshold_width: 48,
          threshold_height: 48,
          status: "below_minimum",
          summary_text: "低于 48dp",
          detail_text: "",
          rule_id: "android_material_target_size",
          rule_layer: "L2_PLATFORM_GUIDANCE",
          reasoning_type: "platform_spec",
          reference: "Material Design 3",
          reference_status: "verified_reference",
          claim_strength: "formal_guidance"
        }
      };

      const trace = buildTargetSizeTrace(el, androidMapping);
      expect(trace.verdict).toBe("attention");
      expect(trace.comparison.kind).toBe("multi_axis");
      if (trace.comparison.kind === "multi_axis") {
        expect(trace.comparison.limitingAxis).toBe("宽度");
        expect(trace.comparison.axes[0].margin).toBe(-8);
        expect(trace.comparison.axes[1].margin).toBe(0);
      }
    });

    it("evaluates Web WCAG 2.5.8 conditional evaluation with spacing circle", () => {
      const webMapping: LogicalUnitMapping = {
        platform: "web",
        unit: "css_px",
        image_reference_width: 1000,
        logical_reference_width: 1000,
        scale_x: 1,
        scale_y: 1,
        quality: "user_specified"
      };

      const el: DesignElement = {
        element_id: "el-web",
        source: "manual",
        element_type: "icon",
        normalized_bounds: { x: 0, y: 0, width: 0.02, height: 0.02 },
        image_pixel_bounds: { x: 0, y: 0, width: 20, height: 20 },
        calibration_mode: "full_screen",
        interaction_type: "tap",
        touch_bounds: { x: 0, y: 0, width: 0.02, height: 0.02 },
        touch_bounds_source: "user_defined",
        target_size_evaluation: {
          unit: "css_px",
          measured_width: 20,
          measured_height: 20,
          min_side: 20,
          threshold_width: 24,
          threshold_height: 24,
          status: "needs_review",
          summary_text: "低于 24px",
          detail_text: "",
          rule_id: "wcag_2_5_8_target_size",
          rule_layer: "L1_HARD_CONSTRAINT",
          reasoning_type: "wcag_standard",
          reference: "WCAG 2.2 SC 2.5.8",
          reference_status: "verified_reference",
          claim_strength: "formal_constraint"
        }
      };

      const wcagSpacingClear: WcagSpacingEvaluation = {
        target_size_condition_met: false,
        spacing_circle_condition_met: true,
        circle_diameter_logical: 24,
        logical_unit: "css_px",
        conflicting_targets: [],
        status: "spacing_circle_clear",
        explanation: "满足 24px 间距圆例外条件"
      };

      const trace = buildTargetSizeTrace(el, webMapping, wcagSpacingClear);
      expect(trace.verdict).toBe("meets");
      expect(trace.comparison.kind).toBe("conditional");
      if (trace.comparison.kind === "conditional") {
        expect(trace.comparison.conditions[0].isMet).toBe(false); // size < 24
        expect(trace.comparison.conditions[1].isMet).toBe(true);  // spacing circle clear
      }
    });

    it("evaluates custom platform as measurement-only trace without fake pass/fail", () => {
      const customMapping: LogicalUnitMapping = {
        platform: "custom",
        unit: "pt",
        image_reference_width: 1000,
        logical_reference_width: 1000,
        scale_x: 1,
        scale_y: 1,
        quality: "user_specified"
      };

      const el: DesignElement = {
        element_id: "el-custom",
        source: "manual",
        element_type: "button",
        normalized_bounds: { x: 0, y: 0, width: 0.1, height: 0.1 },
        image_pixel_bounds: { x: 0, y: 0, width: 100, height: 100 },
        calibration_mode: "full_screen",
        interaction_type: "tap",
        touch_bounds: { x: 0, y: 0, width: 0.1, height: 0.1 },
        touch_bounds_source: "user_defined"
      };

      const trace = buildTargetSizeTrace(el, customMapping);
      expect(trace.verdict).toBe("measurement_only");
      expect(trace.verdictLabel).toBe("仅测量");
      expect(trace.comparison.kind).toBe("measurement_only");
    });
  });

  describe("buildContrastTrace", () => {
    it("returns needs_info trace when colors are missing", () => {
      const trace = buildContrastTrace(null);
      expect(trace.verdict).toBe("needs_info");
      expect(trace.comparison.kind).toBe("needs_info");
    });

    it("builds scalar min trace for text contrast with positive margin", () => {
      const evalRes: ContrastEvaluation = {
        evaluation_type: "text",
        foreground_hex: "#000000",
        foreground_rgb: [0, 0, 0],
        background_hex: "#FFFFFF",
        background_rgb: [255, 255, 255],
        foreground_luminance: 0,
        background_luminance: 1,
        contrast_ratio: 21,
        threshold: 4.5,
        passed: true,
        rule_id: "wcag_1_4_3",
        rule_layer: "L1_HARD_CONSTRAINT",
        reasoning_type: "wcag_standard",
        reference: "WCAG 2.2 SC 1.4.3",
        reference_status: "verified_reference",
        claim_strength: "formal_constraint",
        status: "confirmed"
      };

      const trace = buildContrastTrace(evalRes);
      expect(trace.verdict).toBe("meets");
      expect(trace.currentValueDisplay).toBe("21:1");
      expect(trace.comparison.kind).toBe("scalar_min");
      if (trace.comparison.kind === "scalar_min") {
        expect(trace.comparison.margin).toBe(16.5);
        expect(trace.comparison.marginFormatted).toBe("+16.5 :1");
      }
    });

    it("builds scalar min trace for failing non-text contrast with negative margin", () => {
      const evalRes: ContrastEvaluation = {
        evaluation_type: "non_text",
        foreground_hex: "#888888",
        foreground_rgb: [136, 136, 136],
        background_hex: "#CCCCCC",
        background_rgb: [204, 204, 204],
        foreground_luminance: 0.24,
        background_luminance: 0.6,
        contrast_ratio: 2.1,
        threshold: 3.0,
        passed: false,
        rule_id: "wcag_1_4_11",
        rule_layer: "L1_HARD_CONSTRAINT",
        reasoning_type: "wcag_standard",
        reference: "WCAG 2.2 SC 1.4.11",
        reference_status: "verified_reference",
        claim_strength: "formal_constraint",
        status: "confirmed"
      };

      const trace = buildContrastTrace(evalRes);
      expect(trace.verdict).toBe("attention");
      expect(trace.currentValueDisplay).toBe("2.1:1");
      expect(trace.comparison.kind).toBe("scalar_min");
      if (trace.comparison.kind === "scalar_min") {
        expect(trace.comparison.margin).toBe(-0.9);
        expect(trace.comparison.marginFormatted).toBe("-0.9 :1");
        expect(trace.comparison.marginLabel).toBe("距离参考还差 0.9 :1");
      }
    });
  });

  describe("buildSpacingTrace", () => {
    it("returns attention trace when touch targets overlap", () => {
      const nearest: NearestTouchTargetResult = {
        nearest_element_id: "el-b",
        nearest_element_label: "确认按钮",
        distance_px: 0,
        distance_logical: 0,
        logical_unit: "pt",
        overlap: {
          is_overlapping: true,
          overlap_width: 10,
          overlap_height: 10,
          overlap_area: 100
        }
      };

      const trace = buildSpacingTrace(nearest);
      expect(trace.verdict).toBe("attention");
      expect(trace.currentValueDisplay).toContain("重叠");
      expect(trace.comparison.kind).toBe("conditional");
    });

    it("returns measurement_only trace when spacing is positive and without overlap", () => {
      const nearest: NearestTouchTargetResult = {
        nearest_element_id: "el-b",
        nearest_element_label: "取消按钮",
        distance_px: 20,
        distance_logical: 10,
        logical_unit: "pt",
        overlap: {
          is_overlapping: false,
          overlap_width: 0,
          overlap_height: 0,
          overlap_area: 0
        }
      };

      const trace = buildSpacingTrace(nearest, iosMapping);
      expect(trace.verdict).toBe("measurement_only");
      expect(trace.currentValueDisplay).toBe("10 pt");
      expect(trace.comparison.kind).toBe("measurement_only");
      expect(trace.ruleLayer).toBeUndefined();
    });

    it("returns measurement_only trace for small spacing (< 8 dp) without universal heuristic failure (P0-GOV-01)", () => {
      const nearestTight: NearestTouchTargetResult = {
        nearest_element_id: "el-c",
        nearest_element_label: "紧邻图标",
        distance_px: 6,
        distance_logical: 3,
        logical_unit: "dp",
        overlap: {
          is_overlapping: false,
          overlap_width: 0,
          overlap_height: 0,
          overlap_area: 0
        }
      };

      const trace = buildSpacingTrace(nearestTight, {
        platform: "android",
        unit: "dp",
        image_reference_width: 1080,
        logical_reference_width: 360,
        scale_x: 1 / 3,
        scale_y: 1 / 3,
        quality: "user_specified"
      }, null, "移动中");

      expect(trace.verdict).toBe("measurement_only");
      expect(trace.currentValueDisplay).toBe("3 dp");
      expect(trace.comparison.kind).toBe("measurement_only");
      expect(trace.ruleLayer).toBeUndefined();
    });
  });

  describe("buildPhysicalGeometryTrace", () => {
    it("returns explainable unavailable trace when full screen aspect ratio mismatches", () => {
      const el: DesignElement = {
        element_id: "el-diag",
        source: "manual",
        element_type: "button",
        normalized_bounds: { x: 0, y: 0, width: 0.1, height: 0.1 },
        image_pixel_bounds: { x: 0, y: 0, width: 100, height: 100 },
        calibration_mode: "full_screen",
        physical_geometry: {
          width_px: 100,
          height_px: 100,
          calibration_quality: "relative_only",
          is_calibrated: false,
          calibration_message: "当前截图比例与所填屏幕分辨率不一致"
        }
      };

      const trace = buildPhysicalGeometryTrace(el, "full_screen");
      expect(trace).not.toBeNull();
      expect(trace?.verdict).toBe("not_applicable");
      expect(trace?.currentValueDisplay).toContain("不可换算");
      expect(trace?.comparison.kind).toBe("measurement_only");
    });

    it("returns calibrated measurement trace when valid physical mm are available", () => {
      const el: DesignElement = {
        element_id: "el-diag",
        source: "manual",
        element_type: "button",
        normalized_bounds: { x: 0, y: 0, width: 0.1, height: 0.1 },
        image_pixel_bounds: { x: 0, y: 0, width: 100, height: 100 },
        calibration_mode: "full_screen",
        physical_geometry: {
          width_px: 100,
          height_px: 100,
          width_mm: 9.5,
          height_mm: 9.5,
          calibration_quality: "exact",
          is_calibrated: true,
          calibration_message: "截图分辨率与屏幕物理分辨率 1:1 对应。"
        }
      };

      const trace = buildPhysicalGeometryTrace(el, "full_screen");
      expect(trace).not.toBeNull();
      expect(trace?.verdict).toBe("measurement_only");
      expect(trace?.currentValueDisplay).toBe("约 9.5 × 9.5 mm");
      expect(trace?.comparison.kind).toBe("measurement_only");
    });
  });
});
