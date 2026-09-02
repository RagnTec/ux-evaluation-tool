import { describe, it, expect } from "vitest";
import type { DesignElement, LogicalUnitMapping } from "../../src/types/designElement";
import type { DerivedEvaluationContext } from "../../src/utils/interactionGeometry";
import { buildElementPresentationModel } from "../../src/utils/elementPresentation";
import { deriveTouchReviewStatus } from "../../src/utils/interactionGeometry";
import { estimateTextSizeFromVisualBounds } from "../../src/utils/textSizeEvaluation";

describe("Phase 3I Hotfix: Presentation Truth, Demo Controls, Color Sampling & Text Estimate Workflow", () => {
  const baseContext: DerivedEvaluationContext = {
    imageNaturalWidth: 1080,
    imageNaturalHeight: 2400,
    calibrationMode: "full_screen",
    croppedScaleMode: "scale_1x",
    allowEstimation: true,
    displaySize: "6.7",
    resolution: "1080x2400",
    logicalMapping: null
  };

  describe("P0-TEXT-02: Text Size Estimate & Source Truth", () => {
    it("returns missing_logical_basis and undefined estimate when logical mapping is not configured", () => {
      const textElement: DesignElement = {
        element_id: "el-text-1",
        label: "标题文本",
        element_type: "text",
        normalized_bounds: { x: 0.1, y: 0.1, width: 0.8, height: 0.02 },
        image_pixel_bounds: { x: 108, y: 240, width: 864, height: 48 },
        text_layout: "single_line",
        text_role: "body",
        text_weight_category: "regular",
        text_size_source: "estimated_from_visual_bounds",
        interaction_type: "none"
      };

      const estimate = estimateTextSizeFromVisualBounds(textElement.image_pixel_bounds, null);
      expect(estimate).toBeNull();

      const presentation = buildElementPresentationModel(textElement, baseContext, null, "ios");
      expect(presentation.isText).toBe(true);
      expect(presentation.textSizeStatus).toBe("missing_logical_basis");
      expect(presentation.textSizeDisplay).toBe("暂不可换算");
      expect(presentation.textVisualHeightDisplay).toBe("48 px");
    });

    it("returns valid_estimate when logical mapping is configured (e.g. 1pt = 3px)", () => {
      const logicalMapping: LogicalUnitMapping = {
        platform: "ios",
        unit: "pt",
        scale_x: 1 / 3,
        scale_y: 1 / 3,
        quality: "configured"
      };

      const textElement: DesignElement = {
        element_id: "el-text-2",
        label: "正文文本",
        element_type: "text",
        normalized_bounds: { x: 0.1, y: 0.1, width: 0.8, height: 0.02 },
        image_pixel_bounds: { x: 108, y: 240, width: 864, height: 48 },
        text_layout: "single_line",
        text_role: "body",
        text_weight_category: "regular",
        text_size_value: 16,
        text_size_unit: "pt",
        text_size_source: "estimated_from_visual_bounds",
        interaction_type: "none"
      };

      const contextWithLogical: DerivedEvaluationContext = {
        ...baseContext,
        logicalMapping
      };

      const estimate = estimateTextSizeFromVisualBounds(textElement.image_pixel_bounds, logicalMapping);
      expect(estimate).toEqual({ value: 16, unit: "pt" });

      const presentation = buildElementPresentationModel(textElement, contextWithLogical, null, "ios");
      expect(presentation.textSizeStatus).toBe("needs_confirmation");
      expect(presentation.textSizeDisplay).toBe("未确认");
      expect(presentation.textVisualHeightDisplay).toBe("48 px (16 pt)");
    });

    it("prioritizes user_confirmed source when designer confirms actual font size", () => {
      const textElement: DesignElement = {
        element_id: "el-text-3",
        label: "确认字号文本",
        element_type: "text",
        normalized_bounds: { x: 0.1, y: 0.1, width: 0.8, height: 0.02 },
        image_pixel_bounds: { x: 108, y: 240, width: 864, height: 48 },
        text_layout: "single_line",
        text_role: "body",
        text_weight_category: "regular",
        text_size_value: 14,
        text_size_unit: "pt",
        text_size_source: "user_confirmed",
        interaction_type: "none"
      };

      const presentation = buildElementPresentationModel(textElement, baseContext, null, "ios");
      expect(presentation.textSizeStatus).toBe("user_confirmed");
      expect(presentation.textSizeDisplay).toBe("14 pt (人工确认)");
    });

    it("returns unconfirmed for multiline text without confirmed size", () => {
      const multiLineText: DesignElement = {
        element_id: "el-text-4",
        label: "段落文本",
        element_type: "text",
        normalized_bounds: { x: 0.1, y: 0.1, width: 0.8, height: 0.08 },
        image_pixel_bounds: { x: 108, y: 240, width: 864, height: 192 },
        text_layout: "multi_line",
        text_role: "body",
        text_weight_category: "regular",
        text_size_source: "estimated_from_visual_bounds",
        interaction_type: "none"
      };

      const presentation = buildElementPresentationModel(multiLineText, baseContext, null, "ios");
      expect(presentation.textSizeStatus).toBe("missing_logical_basis");
      expect(presentation.textSizeDisplay).toBe("暂不可换算");
    });
  });

  describe("P0-PRESENT-01: Independent Physical, Logical, and Visual Metric Presentation", () => {
    it("formats visual dimensions cleanly without fallback pollution", () => {
      const buttonElement: DesignElement = {
        element_id: "el-btn-1",
        label: "测试按钮",
        element_type: "button",
        normalized_bounds: { x: 0.1, y: 0.8, width: 0.8, height: 0.05 },
        image_pixel_bounds: { x: 108, y: 1920, width: 864, height: 120 },
        interaction_type: "tap"
      };

      const presentation = buildElementPresentationModel(buttonElement, baseContext, null, "ios");
      expect(presentation.visualPxDisplay).toBe("864 × 120 px");
      expect(presentation.isLogicalConfigured).toBe(false);
      expect(presentation.logicalDisplay).toBeUndefined();
      expect(presentation.visualPxDisplay).not.toContain("未配置");
    });

    it("exposes physical dimensions with explicit contain/letterbox provenance when calibrated", () => {
      const calibratedElement: DesignElement = {
        element_id: "el-btn-2",
        label: "校准按钮",
        element_type: "button",
        normalized_bounds: { x: 0.1, y: 0.8, width: 0.8, height: 0.05 },
        image_pixel_bounds: { x: 108, y: 1920, width: 864, height: 120 },
        physical_geometry: {
          is_calibrated: true,
          width_mm: 56.4,
          height_mm: 7.8,
          calibration_quality: "estimated",
          calibration_message: "等比贴合估算"
        },
        interaction_type: "tap"
      };

      const presentation = buildElementPresentationModel(calibratedElement, baseContext, null, "ios");
      expect(presentation.isPhysicalAvailable).toBe(true);
      expect(presentation.physicalDisplay).toBe("约 56.4 × 7.8 mm");
      expect(presentation.physicalProvenance).toBe("等比贴合估算");
    });

    it("provides physicalUnavailableReason when physical calibration cannot be computed", () => {
      const uncalibratedElement: DesignElement = {
        element_id: "el-btn-3",
        label: "未校准按钮",
        element_type: "button",
        normalized_bounds: { x: 0.1, y: 0.8, width: 0.8, height: 0.05 },
        image_pixel_bounds: { x: 108, y: 1920, width: 864, height: 120 },
        physical_geometry: {
          is_calibrated: false,
          calibration_quality: "relative_only",
          calibration_message: "截图比例与屏幕分辨率不一致"
        },
        interaction_type: "tap"
      };

      const presentation = buildElementPresentationModel(uncalibratedElement, baseContext, null, "ios");
      expect(presentation.isPhysicalAvailable).toBe(false);
      expect(presentation.physicalUnavailableReason).toBe("截图比例与屏幕分辨率不一致");
    });
  });

  describe("P0-TOUCH-02: Touch Review Status and Verdict Resolution", () => {
    it("returns measurement_only when platform has no rule or custom mapping", () => {
      const customElement: DesignElement = {
        element_id: "el-touch-1",
        label: "自定义元素",
        element_type: "interactive_control",
        normalized_bounds: { x: 0.1, y: 0.1, width: 0.2, height: 0.1 },
        image_pixel_bounds: { x: 100, y: 100, width: 200, height: 100 },
        interaction_type: "tap"
      };

      const review = deriveTouchReviewStatus(customElement, null, "custom", undefined);
      expect(review.status).toBe("measurement_only");
      expect(review.reasons.some((r) => r.includes("自定义单位模式"))).toBe(true);
    });

    it("returns needs_info when logical mapping is unconfigured", () => {
      const buttonWithoutLogical: DesignElement = {
        element_id: "el-touch-2",
        label: "未映射按钮",
        element_type: "button",
        normalized_bounds: { x: 0.1, y: 0.1, width: 0.2, height: 0.1 },
        image_pixel_bounds: { x: 100, y: 100, width: 200, height: 100 },
        interaction_type: "tap"
      };

      const review = deriveTouchReviewStatus(buttonWithoutLogical, null, "ios", undefined);
      expect(review.status).toBe("needs_info");
      expect(review.reasons.some((r) => r.includes("尚未建立设计尺寸基准"))).toBe(true);
    });

    it("evaluates proxy visual bounds against logical platform rule and outputs estimated_meets only when actually meeting rule", () => {
      const logicalMapping: LogicalUnitMapping = {
        platform: "ios",
        unit: "pt",
        scale_x: 0.5,
        scale_y: 0.5,
        quality: "configured"
      };

      // 100x100 px * 0.5 = 50x50 pt (iOS min target is 44x44 pt) -> meets
      const largeButton: DesignElement = {
        element_id: "el-touch-3",
        label: "大按钮",
        element_type: "button",
        normalized_bounds: { x: 0.1, y: 0.1, width: 0.1, height: 0.05 },
        image_pixel_bounds: { x: 100, y: 100, width: 100, height: 100 },
        interaction_type: "tap"
      };

      const reviewPass = deriveTouchReviewStatus(largeButton, null, "ios", logicalMapping);
      expect(reviewPass.status).toBe("estimated_meets");

      // 40x40 px * 0.5 = 20x20 pt (iOS min target is 44x44 pt) -> attention
      const smallButton: DesignElement = {
        element_id: "el-touch-4",
        label: "小按钮",
        element_type: "button",
        normalized_bounds: { x: 0.1, y: 0.1, width: 0.04, height: 0.02 },
        image_pixel_bounds: { x: 100, y: 100, width: 40, height: 40 },
        interaction_type: "tap"
      };

      const reviewFail = deriveTouchReviewStatus(smallButton, null, "ios", logicalMapping);
      expect(reviewFail.status).toBe("estimated_attention");
    });
  });
});
