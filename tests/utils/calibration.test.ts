import { describe, it, expect } from "vitest";
import {
  parseDisplaySize,
  parseResolution,
  calculateNormalizedBounds,
  calculatePhysicalGeometry,
  resolveDisplayParameters,
  getPhysicalCalibrationDiagnostics,
  moveBounds,
  resizeBounds,
  mapClientToNaturalPixel
} from "../../src/utils/calibration";

describe("Physical Geometry & Calibration Utilities", () => {
  describe("resolveDisplayParameters", () => {
    it("returns form parameters when not custom", () => {
      const res = resolveDisplayParameters("6.1 inch", "1170x2532", "", "");
      expect(res.displaySize).toBe("6.1 inch");
      expect(res.resolution).toBe("1170x2532");
      expect(res.isCustomDisplay).toBe(false);
      expect(res.isCustomResolution).toBe(false);
    });

    it("resolves custom display size and resolution inputs", () => {
      const res = resolveDisplayParameters("自定义", "自定义", "6.7 inch", "1290x2796");
      expect(res.displaySize).toBe("6.7 inch");
      expect(res.resolution).toBe("1290x2796");
      expect(res.isCustomDisplay).toBe(true);
      expect(res.isCustomResolution).toBe(true);
    });

    it("falls back to empty string if custom input is blank", () => {
      const res = resolveDisplayParameters("自定义", "自定义", "", "");
      expect(res.displaySize).toBe("");
      expect(res.resolution).toBe("");
    });
  });

  describe("getPhysicalCalibrationDiagnostics", () => {
    it("diagnoses exact physical calibration for matching full-screen screenshot", () => {
      const diag = getPhysicalCalibrationDiagnostics(
        1170,
        2532,
        "6.1 inch",
        "1170x2532",
        "full_screen",
        false,
        false,
        false
      );
      expect(diag.status).toBe("exact_ready");
      expect(diag.quality).toBe("exact");
      expect(diag.title).toBe("已建立精确物理映射");
      expect(diag.suggested_actions).toEqual([]);
    });

    it("diagnoses aspect ratio mismatch in full-screen mode", () => {
      const diag = getPhysicalCalibrationDiagnostics(
        1920,
        1080,
        "6.1 inch",
        "1170x2532",
        "full_screen",
        false,
        false,
        false
      );
      expect(diag.status).toBe("aspect_ratio_mismatch");
      expect(diag.quality).toBe("relative_only");
      expect(diag.title).toBe("暂无法精确换算物理毫米");
      expect(diag.suggested_actions).toContain("switch_to_cropped");
      expect(diag.suggested_actions).toContain("allow_estimation");
    });

    it("diagnoses cropped mode without estimation", () => {
      const diag = getPhysicalCalibrationDiagnostics(
        600,
        400,
        "6.1 inch",
        "1170x2532",
        "cropped",
        false,
        false,
        false
      );
      expect(diag.status).toBe("cropped_relative_only");
      expect(diag.quality).toBe("relative_only");
      expect(diag.suggested_actions).toContain("allow_estimation");
    });

    it("diagnoses missing parameters", () => {
      const diag = getPhysicalCalibrationDiagnostics(
        1000,
        1000,
        "",
        "",
        "full_screen",
        false,
        true,
        true
      );
      expect(diag.status).toBe("custom_display_size_missing");
      expect(diag.quality).toBe("relative_only");
    });
  });
  describe("parseDisplaySize", () => {
    it("should parse standard display size strings", () => {
      expect(parseDisplaySize("6.1 inch")).toBe(6.1);
      expect(parseDisplaySize("12.3 inch")).toBe(12.3);
      expect(parseDisplaySize("15.6")).toBe(15.6);
    });

    it("should return null for invalid inputs", () => {
      expect(parseDisplaySize("")).toBeNull();
      expect(parseDisplaySize("custom")).toBeNull();
      expect(parseDisplaySize("-5 inch")).toBeNull();
    });
  });

  describe("parseResolution", () => {
    it("should parse resolution strings with various separators", () => {
      expect(parseResolution("1170x2532")).toEqual({ width: 1170, height: 2532 });
      expect(parseResolution("1920 x 720")).toEqual({ width: 1920, height: 720 });
      expect(parseResolution("390*844")).toEqual({ width: 390, height: 844 });
    });

    it("should return null for invalid resolution strings", () => {
      expect(parseResolution("")).toBeNull();
      expect(parseResolution("custom")).toBeNull();
      expect(parseResolution("1080")).toBeNull();
    });
  });

  describe("calculateNormalizedBounds", () => {
    it("should convert mouse drag coordinates to normalized [0, 1] bounds", () => {
      const bounds = calculateNormalizedBounds(100, 100, 300, 200, 1000, 1000);
      expect(bounds).toEqual({ x: 0.1, y: 0.1, width: 0.2, height: 0.1 });
    });

    it("should produce identical normalized bounds regardless of drag direction", () => {
      const forward = calculateNormalizedBounds(100, 100, 300, 200, 1000, 1000);
      const backward = calculateNormalizedBounds(300, 200, 100, 100, 1000, 1000);
      expect(forward).toEqual(backward);
    });

    it("should clamp coordinates strictly within [0, 1]", () => {
      const overflow = calculateNormalizedBounds(-50, -20, 1200, 1100, 1000, 1000);
      expect(overflow.x).toBeGreaterThanOrEqual(0);
      expect(overflow.y).toBeGreaterThanOrEqual(0);
      expect(overflow.x + overflow.width).toBeLessThanOrEqual(1.0);
      expect(overflow.y + overflow.height).toBeLessThanOrEqual(1.0);
    });
  });

  describe("calculatePhysicalGeometry - 3-Tier Quality & Cropped Estimation", () => {
    const sampleBounds = { x: 0.1, y: 0.1, width: 0.5, height: 0.2 };

    it("should produce exact calibration when full-screen aspect ratios match", () => {
      // 6.1 inch phone, 1170x2532 display, 1170x2532 screenshot
      const result = calculatePhysicalGeometry(
        sampleBounds,
        1170,
        2532,
        "6.1 inch",
        "1170x2532",
        "full_screen",
        false
      );

      expect(result.calibration_quality).toBe("exact");
      expect(result.is_calibrated).toBe(true);
      expect(result.width_px).toBe(585);
      expect(result.height_px).toBe(506);
      expect(result.width_mm).toBeDefined();
      expect(result.height_mm).toBeDefined();
      expect(result.screen_width_mm).toBeDefined();
      expect(result.screen_height_mm).toBeDefined();
      expect(result.ppi).toBeDefined();
    });

    it("should return relative_only when full-screen aspect ratios do not match and allowEstimation is false", () => {
      // 1920x1080 (16:9) image on 1170x2532 (19.5:9) phone
      const result = calculatePhysicalGeometry(
        sampleBounds,
        1920,
        1080,
        "6.1 inch",
        "1170x2532",
        "full_screen",
        false
      );

      expect(result.calibration_quality).toBe("relative_only");
      expect(result.is_calibrated).toBe(false);
      expect(result.width_mm).toBeUndefined();
      expect(result.height_mm).toBeUndefined();
      expect(result.calibration_message).toContain("不一致");
      expect(result.width_px).toBe(960);
      expect(result.height_px).toBe(216);
    });

    it("should produce estimated calibration when full-screen aspect ratios do not match but user explicitly opts in", () => {
      // 1920x1080 image on 1170x2532 phone with allowEstimation = true
      const result = calculatePhysicalGeometry(
        sampleBounds,
        1920,
        1080,
        "6.1 inch",
        "1170x2532",
        "full_screen",
        true
      );

      expect(result.calibration_quality).toBe("estimated");
      expect(result.is_calibrated).toBe(true);
      expect(result.width_mm).toBeDefined();
      expect(result.height_mm).toBeDefined();
      expect(result.calibration_message).toContain("Letterbox/Contain");
      expect(result.width_px).toBe(960);
      expect(result.height_px).toBe(216);
    });

    it("should compute contain/letterbox physical dimensions when full-screen aspect ratios mismatch and allowEstimation is true", () => {
      // 2560x1536 (ratio 1.667) image on 1920x720 (ratio 2.667) 12.3 inch screen
      // Screen is 292.4 mm x 109.6 mm. Screenshot is taller than ultrawide screen, constrained by height:
      // Content height = 109.6 mm, Content width = 109.6 * (2560/1536) = 182.7 mm
      const result = calculatePhysicalGeometry(
        { x: 0, y: 0, width: 1, height: 1 }, // full screenshot
        2560,
        1536,
        "12.3 inch",
        "1920x720",
        "full_screen",
        true
      );

      expect(result.calibration_quality).toBe("estimated");
      expect(result.is_calibrated).toBe(true);
      expect(result.width_mm).toBe(182.83);
      expect(result.height_mm).toBe(109.7);
      expect(result.calibration_message).toContain("Letterbox/Contain");

      const diag = getPhysicalCalibrationDiagnostics(
        2560,
        1536,
        "12.3 inch",
        "1920x720",
        "full_screen",
        true
      );
      expect(diag.status).toBe("aspect_ratio_contain_estimated");
      expect(diag.quality).toBe("estimated");
    });

    it("should strictly return relative_only and undefined mm when full-screen aspect ratios mismatch and allowEstimation is false", () => {
      // 2560x1536 image on 1920x720 automotive screen (major aspect ratio mismatch)
      const result = calculatePhysicalGeometry(
        sampleBounds,
        2560,
        1536,
        "12.3 inch",
        "1920x720",
        "full_screen",
        false
      );

      expect(result.calibration_quality).toBe("relative_only");
      expect(result.is_calibrated).toBe(false);
      expect(result.width_mm).toBeUndefined();
      expect(result.height_mm).toBeUndefined();
      expect(result.calibration_message).toContain("当前截图比例与所填屏幕分辨率不一致");
    });

    it("should return relative_only for cropped / partial images by default (allowEstimation = false)", () => {
      const result = calculatePhysicalGeometry(
        sampleBounds,
        600,
        400,
        "6.1 inch",
        "1170x2532",
        "cropped",
        false
      );

      expect(result.calibration_quality).toBe("relative_only");
      expect(result.is_calibrated).toBe(false);
      expect(result.width_mm).toBeUndefined();
      expect(result.calibration_message).toContain("局部截图");
      expect(result.width_px).toBe(300);
      expect(result.height_px).toBe(80);
    });

    it("should compute estimated dimensions for cropped images when user explicitly opts in", () => {
      // 6.1 inch, 1170x2532 -> screen mm ~ 64.9 x 140.5 mm
      // element px: 300 x 80 on a 600x400 cropped screenshot
      const result = calculatePhysicalGeometry(
        sampleBounds,
        600,
        400,
        "6.1 inch",
        "1170x2532",
        "cropped",
        true
      );

      expect(result.calibration_quality).toBe("estimated");
      expect(result.is_calibrated).toBe(true);
      expect(result.width_mm).toBeDefined();
      expect(result.height_mm).toBeDefined();
      // Verify mm per pixel formula: 300 px * (screen_w / 1170)
      expect(result.width_mm).toBeGreaterThan(0);
      expect(result.height_mm).toBeGreaterThan(0);
      expect(result.calibration_message).toContain("保留原屏像素比例估算");
      expect(result.allow_estimation).toBe(true);
    });

    it("should return relative_only for cropped images if screen resolution or display size is invalid", () => {
      const result = calculatePhysicalGeometry(
        sampleBounds,
        600,
        400,
        "invalid",
        "invalid",
        "cropped",
        true
      );

      expect(result.calibration_quality).toBe("relative_only");
      expect(result.is_calibrated).toBe(false);
      expect(result.width_mm).toBeUndefined();
    });

    it("should never mark cropped images as exact even with opt-in", () => {
      const result = calculatePhysicalGeometry(
        sampleBounds,
        1170,
        2532,
        "6.1 inch",
        "1170x2532",
        "cropped",
        true
      );

      expect(result.calibration_quality).not.toBe("exact");
      expect(result.calibration_quality).toBe("estimated");
    });
  });

  describe("moveBounds", () => {
    it("should move bounds within valid range", () => {
      const initial = { x: 0.1, y: 0.1, width: 0.3, height: 0.2 };
      const moved = moveBounds(initial, 0.05, 0.1);
      expect(moved).toEqual({ x: 0.15, y: 0.2, width: 0.3, height: 0.2 });
    });

    it("should clamp moved bounds so it never exceeds [0, 1]", () => {
      const initial = { x: 0.8, y: 0.8, width: 0.3, height: 0.3 };
      const moved = moveBounds(initial, 0.2, 0.2);
      expect(moved.x).toBe(0.7); // 1 - width
      expect(moved.y).toBe(0.7); // 1 - height
      expect(moved.x + moved.width).toBe(1.0);
      expect(moved.y + moved.height).toBe(1.0);
    });

    it("should clamp moved bounds so it never becomes negative", () => {
      const initial = { x: 0.1, y: 0.1, width: 0.2, height: 0.2 };
      const moved = moveBounds(initial, -0.3, -0.3);
      expect(moved.x).toBe(0);
      expect(moved.y).toBe(0);
    });
  });

  describe("resizeBounds", () => {
    const initial = { x: 0.2, y: 0.2, width: 0.4, height: 0.4 };

    it("should resize via bottom-right handle (se)", () => {
      const resized = resizeBounds(initial, "se", 0.1, 0.1);
      expect(resized).toEqual({ x: 0.2, y: 0.2, width: 0.5, height: 0.5 });
    });

    it("should resize via top-left handle (nw)", () => {
      const resized = resizeBounds(initial, "nw", -0.05, -0.05);
      expect(resized.x).toBe(0.15);
      expect(resized.y).toBe(0.15);
      expect(resized.width).toBe(0.45);
      expect(resized.height).toBe(0.45);
    });

    it("should enforce minimum box size during inward resize", () => {
      const resized = resizeBounds(initial, "se", -0.5, -0.5, 0.05);
      expect(resized.width).toBe(0.05);
      expect(resized.height).toBe(0.05);
    });
  });

  describe("mapClientToNaturalPixel", () => {
    const stageRect = { left: 100, top: 50, width: 500, height: 1000 };

    it("should map center click to natural image center", () => {
      const naturalW = 1000;
      const naturalH = 2000;
      // Click at center: clientX = 100 + 250 = 350, clientY = 50 + 500 = 550
      const result = mapClientToNaturalPixel(350, 550, stageRect, naturalW, naturalH);
      expect(result.normX).toBe(0.5);
      expect(result.normY).toBe(0.5);
      expect(result.pixelX).toBe(500);
      expect(result.pixelY).toBe(1000);
    });

    it("should map top-left click to pixel (0, 0)", () => {
      const result = mapClientToNaturalPixel(100, 50, stageRect, 1000, 2000);
      expect(result.normX).toBe(0);
      expect(result.normY).toBe(0);
      expect(result.pixelX).toBe(0);
      expect(result.pixelY).toBe(0);
    });

    it("should map bottom-right click to max pixel (W-1, H-1)", () => {
      const result = mapClientToNaturalPixel(600, 1050, stageRect, 1000, 2000);
      expect(result.normX).toBe(1);
      expect(result.normY).toBe(1);
      expect(result.pixelX).toBe(999);
      expect(result.pixelY).toBe(1999);
    });

    it("should clamp out of bounds clicks safely", () => {
      const result = mapClientToNaturalPixel(-200, -200, stageRect, 800, 600);
      expect(result.normX).toBe(0);
      expect(result.normY).toBe(0);
      expect(result.pixelX).toBe(0);
      expect(result.pixelY).toBe(0);
    });
  });
});
