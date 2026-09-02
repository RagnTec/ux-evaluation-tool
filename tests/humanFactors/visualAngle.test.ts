import { describe, it, expect } from "vitest";
import {
  calculateExactVisualAngle,
  calculateVisualAngleFromDimensions
} from "../../src/humanFactors/visualAngle";
import type {
  PhysicalVisualMeasurement,
  ViewingDistanceEvidence
} from "../../src/humanFactors/types";

describe("Human Factors Core: visualAngle", () => {
  // Test 1: Exact Trigonometric Formula Calculation
  describe("Exact Trigonometric Formula", () => {
    it("calculates exact visual angle in degrees and arcminutes for known dimensions and distance", () => {
      // 10 mm target at 500 mm viewing distance:
      // theta_rad = 2 * atan(10 / (2 * 500)) = 2 * atan(0.01) = 2 * 0.009999666... = 0.01999933 rad
      // theta_deg = 0.01999933 * (180 / PI) = 1.1459155... deg
      // theta_arcmin = theta_deg * 60 = 68.7549... arcmin
      const result = calculateExactVisualAngle(10, 500);
      expect(result).not.toBeNull();
      expect(result!.deg).toBeCloseTo(1.1459, 3);
      expect(result!.arcmin).toBeCloseTo(68.75, 1);
    });

    it("matches small-angle approximation within expected second-order margin for small angles", () => {
      const size = 5; // 5 mm
      const dist = 600; // 600 mm
      const exact = calculateExactVisualAngle(size, dist);
      expect(exact).not.toBeNull();

      // Small angle approx: theta_approx_rad = size / dist = 5 / 600 = 0.008333 rad
      const approxDeg = (size / dist) * (180 / Math.PI);
      expect(exact!.deg).toBeCloseTo(approxDeg, 3);
    });
  });

  // Test 2: Invalid Inputs & Bounds Safety
  describe("Invalid Inputs Handling", () => {
    it("returns null for non-positive or non-finite size", () => {
      expect(calculateExactVisualAngle(0, 500)).toBeNull();
      expect(calculateExactVisualAngle(-10, 500)).toBeNull();
      expect(calculateExactVisualAngle(NaN, 500)).toBeNull();
      expect(calculateExactVisualAngle(Infinity, 500)).toBeNull();
      expect(calculateExactVisualAngle(-Infinity, 500)).toBeNull();
    });

    it("returns null for non-positive or non-finite viewing distance", () => {
      expect(calculateExactVisualAngle(10, 0)).toBeNull();
      expect(calculateExactVisualAngle(10, -500)).toBeNull();
      expect(calculateExactVisualAngle(10, NaN)).toBeNull();
      expect(calculateExactVisualAngle(10, Infinity)).toBeNull();
    });
  });

  // Test 3: Partial Dimensions
  describe("Independent Horizontal and Vertical Dimensions", () => {
    const validDistance: ViewingDistanceEvidence = {
      distance_mm: 500,
      source: "user_confirmed"
    };

    it("computes both horizontal and vertical angles when both dimensions are provided", () => {
      const physical: PhysicalVisualMeasurement = {
        width_mm: 20,
        height_mm: 10
      };

      const result = calculateVisualAngleFromDimensions(physical, validDistance);
      expect(result).not.toBeNull();
      expect(result!.horizontal_deg).toBeCloseTo(2.2917, 3);
      expect(result!.vertical_deg).toBeCloseTo(1.1459, 3);
      expect(result!.horizontal_arcmin).toBeCloseTo(137.5, 1);
      expect(result!.vertical_arcmin).toBeCloseTo(68.75, 1);
      expect(result!.physical_width_mm).toBe(20);
      expect(result!.physical_height_mm).toBe(10);
      expect(result!.viewing_distance_mm).toBe(500);
    });

    it("computes only horizontal angle when only width is available", () => {
      const physical: PhysicalVisualMeasurement = {
        width_mm: 20
      };

      const result = calculateVisualAngleFromDimensions(physical, validDistance);
      expect(result).not.toBeNull();
      expect(result!.horizontal_deg).toBeDefined();
      expect(result!.vertical_deg).toBeUndefined();
      expect(result!.horizontal_arcmin).toBeDefined();
      expect(result!.vertical_arcmin).toBeUndefined();
    });

    it("computes only vertical angle when only height is available", () => {
      const physical: PhysicalVisualMeasurement = {
        height_mm: 12
      };

      const result = calculateVisualAngleFromDimensions(physical, validDistance);
      expect(result).not.toBeNull();
      expect(result!.horizontal_deg).toBeUndefined();
      expect(result!.vertical_deg).toBeDefined();
      expect(result!.horizontal_arcmin).toBeUndefined();
      expect(result!.vertical_arcmin).toBeDefined();
    });

    it("returns null when neither width nor height is positive/valid", () => {
      const physical: PhysicalVisualMeasurement = {
        width_mm: 0,
        height_mm: -5
      };

      const result = calculateVisualAngleFromDimensions(physical, validDistance);
      expect(result).toBeNull();
    });
  });

  // Test 4: Provenance & Assumptions Preservation
  describe("Provenance and Assumptions Propagation", () => {
    it("preserves upstream physical and viewing distance provenance chains", () => {
      const physical: PhysicalVisualMeasurement = {
        width_mm: 15,
        height_mm: 15,
        provenance: "等比贴合估算",
        assumptions: ["截图按等比贴合置于屏幕中央"]
      };

      const distance: ViewingDistanceEvidence = {
        distance_mm: 650,
        source: "scenario_assumed",
        provenance: "驾驶员坐姿视距",
        assumptions: ["假设坐姿标准眼椭圆中心"]
      };

      const result = calculateVisualAngleFromDimensions(physical, distance);
      expect(result).not.toBeNull();
      expect(result!.provenance).toContain("物理尺寸: 等比贴合估算");
      expect(result!.provenance).toContain("视距: 驾驶员坐姿视距");
      expect(result!.assumptions).toHaveLength(2);
      expect(result!.assumptions).toContain("截图按等比贴合置于屏幕中央");
      expect(result!.assumptions).toContain("假设坐姿标准眼椭圆中心");
    });
  });

  // Test 5: Measurement Only / No Verdict Assertion
  describe("Measurement Only Boundary", () => {
    it("contains no compliance verdict or pass/fail properties", () => {
      const physical: PhysicalVisualMeasurement = { width_mm: 10, height_mm: 10 };
      const distance: ViewingDistanceEvidence = { distance_mm: 500, source: "user_confirmed" };

      const result = calculateVisualAngleFromDimensions(physical, distance);
      expect(result).not.toBeNull();

      const resObj = result as unknown as Record<string, unknown>;
      expect(resObj.status).toBeUndefined();
      expect(resObj.verdict).toBeUndefined();
      expect(resObj.passed).toBeUndefined();
      expect(resObj.meets).toBeUndefined();
      expect(resObj.compliant).toBeUndefined();
    });
  });
});
