import { describe, it, expect } from "vitest";
import type { DesignElement } from "../../src/types/designElement";
import {
  adaptElementPhysicalVisual,
  adaptViewingDistanceEvidence,
  computeElementVisualAngle
} from "../../src/adapters/humanFactorsAdapter";
import {
  collectAvailableFacts,
  resolveMetricCapability,
  type CapabilityContext
} from "../../src/utils/capabilityResolver";

describe("Application Adapter: humanFactorsAdapter", () => {
  const calibratedElement: DesignElement = {
    element_id: "el-cal-1",
    label: "主操作按钮",
    source: "manual",
    element_type: "button",
    interaction_type: "tap",
    normalized_bounds: { x: 0.1, y: 0.8, width: 0.8, height: 0.08 },
    image_pixel_bounds: { x: 108, y: 1920, width: 864, height: 192 },
    calibration_mode: "full_screen",
    physical_geometry: {
      is_calibrated: true,
      width_mm: 58.5,
      height_mm: 13.0,
      calibration_quality: "exact"
    },
    created_at: new Date().toISOString()
  };

  const containElement: DesignElement = {
    element_id: "el-contain-1",
    label: "等比贴合按钮",
    source: "manual",
    element_type: "button",
    interaction_type: "tap",
    normalized_bounds: { x: 0.1, y: 0.8, width: 0.8, height: 0.08 },
    image_pixel_bounds: { x: 108, y: 1920, width: 864, height: 192 },
    calibration_mode: "full_screen",
    physical_geometry: {
      is_calibrated: true,
      width_mm: 45.0,
      height_mm: 10.0,
      calibration_quality: "inferred"
    },
    created_at: new Date().toISOString()
  };

  const uncalibratedElement: DesignElement = {
    element_id: "el-uncal-1",
    label: "未校准元素",
    source: "manual",
    element_type: "button",
    interaction_type: "tap",
    normalized_bounds: { x: 0.1, y: 0.8, width: 0.8, height: 0.08 },
    image_pixel_bounds: { x: 108, y: 1920, width: 864, height: 192 },
    created_at: new Date().toISOString()
  };

  describe("adaptElementPhysicalVisual", () => {
    it("extracts physical measurements from exact calibrated element", () => {
      const physical = adaptElementPhysicalVisual(calibratedElement);
      expect(physical).not.toBeNull();
      expect(physical!.width_mm).toBe(58.5);
      expect(physical!.height_mm).toBe(13.0);
      expect(physical!.provenance).toBe("硬件屏幕校准");
      expect(physical!.assumptions).toBeUndefined();
    });

    it("extracts physical measurements with contain provenance for inferred calibrated element", () => {
      const physical = adaptElementPhysicalVisual(containElement);
      expect(physical).not.toBeNull();
      expect(physical!.width_mm).toBe(45.0);
      expect(physical!.height_mm).toBe(10.0);
      expect(physical!.provenance).toBe("等比贴合估算");
      expect(physical!.assumptions).toBeDefined();
    });

    it("returns null for uncalibrated element", () => {
      const physical = adaptElementPhysicalVisual(uncalibratedElement);
      expect(physical).toBeNull();
    });
  });

  describe("adaptViewingDistanceEvidence", () => {
    it("parses valid distance strings into ViewingDistanceEvidence", () => {
      const evidence = adaptViewingDistanceEvidence("50 cm");
      expect(evidence).not.toBeNull();
      expect(evidence!.distance_mm).toBe(500);
      expect(evidence!.source).toBe("user_confirmed");
    });

    it("returns null when distance is empty or unparseable", () => {
      expect(adaptViewingDistanceEvidence("")).toBeNull();
      expect(adaptViewingDistanceEvidence("未指定")).toBeNull();
      expect(adaptViewingDistanceEvidence(null)).toBeNull();
    });
  });

  describe("computeElementVisualAngle", () => {
    it("computes visual angle for calibrated element and valid viewing distance", () => {
      const result = computeElementVisualAngle(calibratedElement, "500 mm");
      expect(result).not.toBeNull();
      expect(result!.horizontal_deg).toBeCloseTo(6.697, 2);
      expect(result!.vertical_deg).toBeCloseTo(1.490, 2);
      expect(result!.viewing_distance_mm).toBe(500);
      expect(result!.provenance).toContain("物理尺寸: 硬件屏幕校准");
    });

    it("returns null if viewing distance is missing", () => {
      const result = computeElementVisualAngle(calibratedElement, "");
      expect(result).toBeNull();
    });

    it("returns null if element is uncalibrated", () => {
      const result = computeElementVisualAngle(uncalibratedElement, "500 mm");
      expect(result).toBeNull();
    });
  });

  describe("Capability Resolver: visual_angle_measurement", () => {
    it("reports visual_angle_measurement available when physical hardware and viewing distance exist", () => {
      const ctx: CapabilityContext = {
        imageWidth: 1080,
        imageHeight: 2400,
        calibrationMode: "full_screen",
        displaySize: "6.7 inch",
        resolution: "1080x2400",
        viewingDistance: "500 mm"
      };

      const facts = collectAvailableFacts(ctx, calibratedElement);
      const cap = resolveMetricCapability("visual_angle_measurement", facts, ctx, calibratedElement);

      expect(cap.available).toBe(true);
      expect(cap.tier).toBe("hardware_assumed");
    });

    it("reports visual_angle_measurement unavailable when viewing distance is unconfigured", () => {
      const ctx: CapabilityContext = {
        imageWidth: 1080,
        imageHeight: 2400,
        calibrationMode: "full_screen",
        displaySize: "6.7 inch",
        resolution: "1080x2400",
        viewingDistance: ""
      };

      const facts = collectAvailableFacts(ctx, calibratedElement);
      const cap = resolveMetricCapability("visual_angle_measurement", facts, ctx, calibratedElement);

      expect(cap.available).toBe(false);
      expect(cap.missingFactLabels.some((l) => l.includes("使用视距"))).toBe(true);
    });
  });
});
