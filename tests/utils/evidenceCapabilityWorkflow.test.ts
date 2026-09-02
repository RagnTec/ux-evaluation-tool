import { describe, it, expect } from "vitest";
import type {
  DesignElement,
  LogicalUnitMapping,
  TargetPlatform
} from "../../src/types/designElement";
import {
  collectAvailableFacts,
  resolveEvaluationCapability,
  resolveAllCapabilities,
  resolveMetricCapability,
  resolveAllMetricCapabilities,
  type CapabilityContext
} from "../../src/utils/capabilityResolver";
import {
  deriveTouchReviewStatus,
  calculateNearestTouchTarget,
  recomputeElementDerivedState,
  type DerivedEvaluationContext
} from "../../src/utils/interactionGeometry";
import { buildSpacingTrace } from "../../src/utils/ruleTrace";
import {
  buildElementPresentationModel
} from "../../src/utils/elementPresentation";
import {
  computeRelativeTypographyMetrics,
  evaluateTextSize
} from "../../src/utils/textSizeEvaluation";

describe("Phase 3J: Evidence-Driven Input & Capability Model", () => {
  // Test 1: Screenshot-Only Capabilities
  describe("Screenshot-Only Context", () => {
    const screenshotContext: CapabilityContext = {
      imageWidth: 1080,
      imageHeight: 2400,
      calibrationMode: "full_screen",
      displaySize: "",
      resolution: "",
      logicalMapping: null
    };

    const buttonElement: DesignElement = {
      element_id: "el-btn-1",
      label: "提交按钮",
      source: "manual",
      element_type: "button",
      interaction_type: "tap",
      normalized_bounds: { x: 0.1, y: 0.8, width: 0.8, height: 0.08 },
      image_pixel_bounds: { x: 108, y: 1920, width: 864, height: 192 },
      calibration_mode: "full_screen",
      created_at: new Date().toISOString()
    };

    const textElement: DesignElement = {
      element_id: "el-txt-1",
      label: "主标题",
      source: "manual",
      element_type: "text",
      interaction_type: "none",
      normalized_bounds: { x: 0.1, y: 0.2, width: 0.8, height: 0.04 },
      image_pixel_bounds: { x: 108, y: 480, width: 864, height: 96 },
      calibration_mode: "full_screen",
      text_layout: "single_line",
      created_at: new Date().toISOString()
    };

    it("resolves basic visual metrics while keeping physical/logical unavailable without global error", () => {
      const metricCaps = resolveAllMetricCapabilities(screenshotContext, buttonElement);

      expect(metricCaps.visual_pixel_size.available).toBe(true);
      expect(metricCaps.visual_pixel_size.tier).toBe("screenshot_fact");

      expect(metricCaps.screen_share.available).toBe(true);
      expect(metricCaps.screen_share.tier).toBe("screenshot_fact");

      expect(metricCaps.visual_area.available).toBe(true);
      expect(metricCaps.visual_area.tier).toBe("screenshot_fact");

      expect(metricCaps.touch_spacing_measurement.available).toBe(true);
      expect(metricCaps.touch_visual_proxy.available).toBe(true);

      // Physical & Logical are unavailable with clean missing facts
      expect(metricCaps.physical_visual_size.available).toBe(false);
      expect(metricCaps.physical_visual_size.missingFactLabels.length).toBeGreaterThan(0);

      expect(metricCaps.logical_visual_size.available).toBe(false);
      expect(metricCaps.logical_visual_size.missingFactLabels).toContain("设计尺寸信息（设计稿宽度与单位）");

      expect(metricCaps.platform_touch_rule.available).toBe(false);
    });

    it("presents clean screenshot facts for text element without fabricating font size in pt/dp", () => {
      const derivedContext: DerivedEvaluationContext = {
        imageNaturalWidth: 1080,
        imageNaturalHeight: 2400,
        calibrationMode: "full_screen",
        allowEstimation: false,
        logicalMapping: null
      };

      const presentation = buildElementPresentationModel(textElement, derivedContext, null, "unknown");

      expect(presentation.visualPxDisplay).toBe("864 × 96 px");
      expect(presentation.textVisualHeightDisplay).toBe("96 px");
      expect(presentation.textSizeStatus).toBe("missing_logical_basis");
      expect(presentation.textSizeDisplay).toBe("暂不可换算");
      expect(presentation.isLogicalConfigured).toBe(false);
      expect(presentation.logicalDisplay).toBeUndefined();
    });
  });

  // Test 2: Screenshot + Hardware Capabilities
  describe("Screenshot + Hardware Known", () => {
    const hardwareContext: CapabilityContext = {
      imageWidth: 1080,
      imageHeight: 2400,
      calibrationMode: "full_screen",
      displaySize: "6.7 inch",
      resolution: "1080x2400",
      allowEstimation: false,
      logicalMapping: null
    };

    const derivedContext: DerivedEvaluationContext = {
      imageNaturalWidth: 1080,
      imageNaturalHeight: 2400,
      calibrationMode: "full_screen",
      displaySize: "6.7 inch",
      resolution: "1080x2400",
      allowEstimation: false,
      logicalMapping: null
    };

    it("enables hardware physical size while logical remains cleanly unavailable", () => {
      const el: DesignElement = {
        element_id: "el-hw-1",
        label: "硬件卡片",
        source: "manual",
        element_type: "button",
        interaction_type: "tap",
        normalized_bounds: { x: 0.1, y: 0.1, width: 0.5, height: 0.2 },
        image_pixel_bounds: { x: 108, y: 240, width: 540, height: 480 },
        calibration_mode: "full_screen",
        created_at: new Date().toISOString()
      };

      const recomputed = recomputeElementDerivedState(el, derivedContext);
      expect(recomputed.physical_geometry?.is_calibrated).toBe(true);
      expect(recomputed.physical_geometry?.width_mm).toBeGreaterThan(0);

      const metricCaps = resolveAllMetricCapabilities(hardwareContext, el);
      expect(metricCaps.physical_visual_size.available).toBe(true);
      expect(metricCaps.physical_visual_size.tier).toBe("hardware_assumed");

      // Logical remains unavailable
      expect(metricCaps.logical_visual_size.available).toBe(false);
      expect(metricCaps.estimated_font_size.available).toBe(false);
    });
  });

  // Test 3: Screenshot + Contain Assumption
  describe("Screenshot + Contain Assumption", () => {
    const containContext: CapabilityContext = {
      imageWidth: 1920,
      imageHeight: 1080, // 16:9 on 19.5:9 phone
      calibrationMode: "full_screen",
      displaySize: "6.7 inch",
      resolution: "1290x2796",
      allowEstimation: true,
      logicalMapping: null
    };

    const derivedContext: DerivedEvaluationContext = {
      imageNaturalWidth: 1920,
      imageNaturalHeight: 1080,
      calibrationMode: "full_screen",
      displaySize: "6.7 inch",
      resolution: "1290x2796",
      allowEstimation: true,
      logicalMapping: null
    };

    it("enables physical estimation with explicit contain provenance", () => {
      const el: DesignElement = {
        element_id: "el-contain-1",
        label: "贴合按钮",
        source: "manual",
        element_type: "button",
        interaction_type: "tap",
        normalized_bounds: { x: 0.1, y: 0.1, width: 0.5, height: 0.2 },
        image_pixel_bounds: { x: 192, y: 108, width: 960, height: 216 },
        calibration_mode: "full_screen",
        created_at: new Date().toISOString()
      };

      const recomputed = recomputeElementDerivedState(el, derivedContext);
      const presentation = buildElementPresentationModel(recomputed, derivedContext, null, "unknown");

      expect(presentation.isPhysicalAvailable).toBe(true);
      expect(presentation.physicalProvenance).toBe("等比贴合估算");
      expect(presentation.physicalDisplay).toContain("约");
      expect(presentation.isLogicalConfigured).toBe(false);
    });
  });

  // Test 4: Design Mapping Dynamically Added / Removed
  describe("Dynamic Design Mapping Lifecycle", () => {
    const unmappedContext: DerivedEvaluationContext = {
      imageNaturalWidth: 1080,
      imageNaturalHeight: 2400,
      calibrationMode: "full_screen",
      allowEstimation: false,
      logicalMapping: null
    };

    const mappedContext: DerivedEvaluationContext = {
      imageNaturalWidth: 1080,
      imageNaturalHeight: 2400,
      calibrationMode: "full_screen",
      allowEstimation: false,
      logicalMapping: {
        platform: "ios",
        unit: "pt",
        image_reference_width: 1080,
        logical_reference_width: 360,
        scale_x: 1 / 3,
        scale_y: 1 / 3,
        quality: "user_specified"
      }
    };

    const textEl: DesignElement = {
      element_id: "el-dyn-txt",
      label: "动态文本",
      source: "manual",
      element_type: "text",
      interaction_type: "none",
      normalized_bounds: { x: 0.1, y: 0.1, width: 0.5, height: 0.05 },
      image_pixel_bounds: { x: 108, y: 240, width: 540, height: 48 }, // 48px -> 16pt
      calibration_mode: "full_screen",
      text_layout: "single_line",
      created_at: new Date().toISOString()
    };

    it("dynamically unlocks logical values when design mapping is added and clears when removed", () => {
      // 1. Initial unmapped
      const pres1 = buildElementPresentationModel(textEl, unmappedContext, null, "ios");
      expect(pres1.isLogicalConfigured).toBe(false);
      expect(pres1.textSizeStatus).toBe("missing_logical_basis");
      expect(pres1.textSizeDisplay).toBe("暂不可换算");

      // 2. Added mapping
      const elWithMapping = recomputeElementDerivedState(textEl, mappedContext);
      const pres2 = buildElementPresentationModel(elWithMapping, mappedContext, null, "ios");
      expect(pres2.isLogicalConfigured).toBe(true);
      expect(pres2.logicalDisplay).toBe("180 × 16 pt");
      expect(pres2.textSizeStatus).toBe("needs_confirmation");
      expect(pres2.textSizeDisplay).toBe("未确认");

      // 3. Removed mapping
      const elUnmappedAgain = recomputeElementDerivedState(elWithMapping, unmappedContext);
      const pres3 = buildElementPresentationModel(elUnmappedAgain, unmappedContext, null, "ios");
      expect(pres3.isLogicalConfigured).toBe(false);
      expect(pres3.logicalDisplay).toBeUndefined();
      expect(pres3.textSizeStatus).toBe("missing_logical_basis");
    });
  });

  // Test 5: Manual Font Input Without Design Mapping
  describe("Manual Font Input Without Design Mapping", () => {
    const unmappedContext: DerivedEvaluationContext = {
      imageNaturalWidth: 1080,
      imageNaturalHeight: 2400,
      calibrationMode: "full_screen",
      allowEstimation: false,
      logicalMapping: null
    };

    it("preserves source_confirmed manual font size without requiring automatic design mapping", () => {
      const userConfirmedText: DesignElement = {
        element_id: "el-manual-font",
        label: "手动字号文本",
        source: "manual",
        element_type: "text",
        interaction_type: "none",
        normalized_bounds: { x: 0.1, y: 0.1, width: 0.5, height: 0.05 },
        image_pixel_bounds: { x: 108, y: 240, width: 540, height: 50 },
        calibration_mode: "full_screen",
        text_layout: "single_line",
        text_size_value: 17,
        text_size_unit: "pt",
        text_size_source: "user_confirmed",
        created_at: new Date().toISOString()
      };

      const presentation = buildElementPresentationModel(userConfirmedText, unmappedContext, null, "unknown");
      expect(presentation.textSizeStatus).toBe("user_confirmed");
      expect(presentation.textSizeDisplay).toBe("17 pt (人工确认)");
      expect(presentation.textVisualHeightDisplay).toBe("50 px");
    });
  });

  // Test 6: Unknown Platform Semantics
  describe("Unknown Platform Semantics", () => {
    const unknownPlatformContext: DerivedEvaluationContext = {
      imageNaturalWidth: 1080,
      imageNaturalHeight: 2400,
      calibrationMode: "full_screen",
      allowEstimation: false,
      logicalMapping: {
        platform: "unknown",
        unit: "pt",
        image_reference_width: 1080,
        logical_reference_width: 360,
        scale_x: 1 / 3,
        scale_y: 1 / 3,
        quality: "user_specified"
      }
    };

    const button: DesignElement = {
      element_id: "el-btn-unknown",
      label: "未知平台按钮",
      source: "manual",
      element_type: "button",
      interaction_type: "tap",
      normalized_bounds: { x: 0.1, y: 0.1, width: 0.1, height: 0.05 },
      image_pixel_bounds: { x: 108, y: 240, width: 60, height: 60 },
      calibration_mode: "full_screen",
      created_at: new Date().toISOString()
    };

    it("does not run Apple / Android / Web target size rules when platform is unknown", () => {
      const review = deriveTouchReviewStatus(button, null, "unknown", unknownPlatformContext.logicalMapping || undefined);
      expect(review.status).toBe("measurement_only");
      expect(review.reasons.some((r) => r.includes("未知/通用平台"))).toBe(true);

      const textEl: DesignElement = {
        element_id: "el-txt-unknown",
        source: "manual",
        element_type: "text",
        normalized_bounds: { x: 0.1, y: 0.1, width: 0.5, height: 0.05 },
        image_pixel_bounds: { x: 108, y: 240, width: 300, height: 48 },
        calibration_mode: "full_screen",
        text_size_value: 12,
        text_size_unit: "pt",
        text_size_source: "user_confirmed",
        created_at: new Date().toISOString()
      };

      const textEval = evaluateTextSize(textEl, "unknown", unknownPlatformContext.logicalMapping || undefined);
      expect(textEval?.status).toBe("custom_unit");
      expect(textEval?.detail_text).toContain("未知/通用平台");
    });
  });

  // Test 7: P0-GOV-01 Spacing Heuristic Removal
  describe("P0-GOV-01: No Universal Spacing Heuristic", () => {
    it("reports measurement_only for 7 dp, 12 dp, 7 pt, and 7 px without failing rules", () => {
      const testCases = [
        { dist: 7, unit: "dp" as const, platform: "android" as TargetPlatform },
        { dist: 12, unit: "dp" as const, platform: "android" as TargetPlatform },
        { dist: 7, unit: "pt" as const, platform: "ios" as TargetPlatform },
        { dist: 7, unit: "css_px" as const, platform: "web" as TargetPlatform }
      ];

      for (const tc of testCases) {
        const nearest = {
          nearest_element_id: "el-neighbor",
          nearest_element_label: "相邻元素",
          distance_px: 21,
          distance_logical: tc.dist,
          logical_unit: tc.unit,
          overlap: { is_overlapping: false, overlap_width: 0, overlap_height: 0, overlap_area: 0 }
        };

        const trace = buildSpacingTrace(nearest, {
          platform: tc.platform,
          unit: tc.unit === "css_px" ? "css_px" : tc.unit,
          image_reference_width: 1080,
          logical_reference_width: 360,
          scale_x: 1 / 3,
          scale_y: 1 / 3,
          quality: "user_specified"
        });

        expect(trace.verdict).toBe("measurement_only");
        expect(trace.comparison.kind).toBe("measurement_only");
        expect(trace.ruleLayer).toBeUndefined();
      }
    });
  });

  // Test 8: Relative Typography
  describe("Relative Typography Capability", () => {
    const text1: DesignElement = {
      element_id: "t1",
      source: "manual",
      element_type: "text",
      normalized_bounds: { x: 0, y: 0, width: 0.5, height: 0.05 },
      image_pixel_bounds: { x: 0, y: 0, width: 500, height: 24 },
      calibration_mode: "full_screen",
      created_at: new Date().toISOString()
    };

    const text2: DesignElement = {
      element_id: "t2",
      source: "manual",
      element_type: "text",
      normalized_bounds: { x: 0, y: 0.1, width: 0.5, height: 0.1 },
      image_pixel_bounds: { x: 0, y: 100, width: 500, height: 48 },
      calibration_mode: "full_screen",
      created_at: new Date().toISOString()
    };

    it("computes descriptive relative ratios across multiple text elements without inferring roles", () => {
      const relMetrics = computeRelativeTypographyMetrics(text2, 2400, [text1, text2]);
      expect(relMetrics).not.toBeNull();
      expect(relMetrics?.visualHeightPx).toBe(48);
      expect(relMetrics?.relativeShareFormatted).toBe("占截图高度 2.0%");
      expect(relMetrics?.ratioToSmallestText).toBe(2);
      expect(relMetrics?.relativeRatioDisplay).toContain("2×");
    });
  });
});
