import { describe, it, expect } from "vitest";
import {
  getApplicableEvaluationModules,
  calculateMinimumSide
} from "../../src/utils/evaluationRouting";
import type { PixelBounds, PhysicalGeometry } from "../../src/types/designElement";

describe("Element-Specific Evaluation Routing Utilities", () => {
  describe("getApplicableEvaluationModules", () => {
    it("should return size_position and text_contrast for text elements", () => {
      const modules = getApplicableEvaluationModules("text");
      expect(modules).toEqual(["size_position", "text_contrast"]);
      expect(modules).toContain("text_contrast");
      expect(modules).not.toContain("non_text_contrast");
      expect(modules).not.toContain("touch_area_size");
    });

    it("should return size_position, touch_area_size, minimum_side, non_text_contrast for button elements", () => {
      const modules = getApplicableEvaluationModules("button");
      expect(modules).toEqual(["size_position", "touch_area_size", "minimum_side", "non_text_contrast"]);
      expect(modules).toContain("non_text_contrast");
      expect(modules).toContain("minimum_side");
      expect(modules).toContain("touch_area_size");
      expect(modules).not.toContain("text_contrast");
    });

    it("should return size_position, minimum_side, non_text_contrast for icon elements", () => {
      const modules = getApplicableEvaluationModules("icon");
      expect(modules).toEqual(["size_position", "minimum_side", "non_text_contrast"]);
      expect(modules).toContain("non_text_contrast");
      expect(modules).toContain("minimum_side");
      expect(modules).not.toContain("touch_area_size");
      expect(modules).not.toContain("text_contrast");
    });

    it("should return size_position, touch_area_size, minimum_side, non_text_contrast for input elements", () => {
      const modules = getApplicableEvaluationModules("input");
      expect(modules).toEqual(["size_position", "touch_area_size", "minimum_side", "non_text_contrast"]);
      expect(modules).toContain("non_text_contrast");
      expect(modules).toContain("touch_area_size");
      expect(modules).not.toContain("text_contrast");
    });

    it("should return only size_position for image elements", () => {
      const modules = getApplicableEvaluationModules("image");
      expect(modules).toEqual(["size_position"]);
      expect(modules).not.toContain("text_contrast");
      expect(modules).not.toContain("non_text_contrast");
      expect(modules).not.toContain("minimum_side");
    });

    it("should return only size_position for other elements", () => {
      const modules = getApplicableEvaluationModules("other");
      expect(modules).toEqual(["size_position"]);
    });
  });

  describe("calculateMinimumSide", () => {
    const pixelBounds: PixelBounds = { x: 10, y: 20, width: 80, height: 40 };

    it("should calculate min_px correctly", () => {
      const result = calculateMinimumSide(pixelBounds);
      expect(result.min_px).toBe(40);
      expect(result.calibration_quality).toBe("relative_only");
      expect(result.min_mm).toBeUndefined();
    });

    it("should calculate min_mm for exact calibration", () => {
      const physical: PhysicalGeometry = {
        width_px: 80,
        height_px: 40,
        width_mm: 16.5,
        height_mm: 8.25,
        calibration_quality: "exact",
        is_calibrated: true
      };

      const result = calculateMinimumSide(pixelBounds, physical);
      expect(result.min_px).toBe(40);
      expect(result.min_mm).toBe(8.25);
      expect(result.calibration_quality).toBe("exact");
    });

    it("should calculate min_mm for estimated calibration", () => {
      const physical: PhysicalGeometry = {
        width_px: 80,
        height_px: 40,
        width_mm: 20.0,
        height_mm: 10.0,
        calibration_quality: "estimated",
        is_calibrated: true
      };

      const result = calculateMinimumSide(pixelBounds, physical);
      expect(result.min_px).toBe(40);
      expect(result.min_mm).toBe(10.0);
      expect(result.calibration_quality).toBe("estimated");
    });

    it("should leave min_mm undefined for relative_only calibration", () => {
      const physical: PhysicalGeometry = {
        width_px: 80,
        height_px: 40,
        calibration_quality: "relative_only",
        is_calibrated: false
      };

      const result = calculateMinimumSide(pixelBounds, physical);
      expect(result.min_px).toBe(40);
      expect(result.min_mm).toBeUndefined();
      expect(result.calibration_quality).toBe("relative_only");
    });
  });
});
