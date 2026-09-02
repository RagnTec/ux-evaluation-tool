import { describe, it, expect } from "vitest";
import {
  SCREEN_DIAGONAL_PRESETS,
  SCREEN_RESOLUTION_PRESETS,
  HARDWARE_QUICK_PAIRS,
  CONTEXT_ENVIRONMENT_PRESETS,
  CONTEXT_OPERATION_PRESETS
} from "../../src/components/EvaluationParametersModal";
import { resolveDisplayParameters } from "../../src/utils/calibration";

describe("Guided Input Presets & Metadata (Phase 3I)", () => {
  describe("Hardware Screen Diagonal & Resolution Presets", () => {
    it("should provide common screen diagonal presets and custom fallback option", () => {
      expect(SCREEN_DIAGONAL_PRESETS.length).toBeGreaterThan(5);
      const values = SCREEN_DIAGONAL_PRESETS.map((p) => p.value);
      expect(values).toContain("6.1 inch");
      expect(values).toContain("10.9 inch");
      expect(values).toContain("15.6 inch");
      expect(values).toContain("27 inch");
      expect(values).toContain("custom");
    });

    it("should provide common resolution presets and custom fallback option", () => {
      expect(SCREEN_RESOLUTION_PRESETS.length).toBeGreaterThan(5);
      const values = SCREEN_RESOLUTION_PRESETS.map((p) => p.value);
      expect(values).toContain("1170x2532");
      expect(values).toContain("1920x1080");
      expect(values).toContain("2560x1440");
      expect(values).toContain("3840x2160");
      expect(values).toContain("custom");
    });

    it("should provide convenient hardware quick pairs without design unit assumptions", () => {
      expect(HARDWARE_QUICK_PAIRS.length).toBeGreaterThan(3);
      const mobilePair = HARDWARE_QUICK_PAIRS.find((p) => p.id === "mobile_std");
      expect(mobilePair).toBeDefined();
      expect(mobilePair?.displaySize).toBe("6.1 inch");
      expect(mobilePair?.resolution).toBe("1170x2532");

      const laptopPair = HARDWARE_QUICK_PAIRS.find((p) => p.id === "laptop_15");
      expect(laptopPair).toBeDefined();
      expect(laptopPair?.displaySize).toBe("15.6 inch");
      expect(laptopPair?.resolution).toBe("1920x1080");
    });

    it("should correctly resolve display parameters when using custom values", () => {
      const resolved = resolveDisplayParameters(
        "custom",
        "custom",
        "14.0 inch",
        "2160x1440"
      );
      expect(resolved.displaySize).toBe("14.0 inch");
      expect(resolved.resolution).toBe("2160x1440");
    });
  });

  describe("Context & Usage Presets", () => {
    it("should provide standard environment options with custom support", () => {
      const values = CONTEXT_ENVIRONMENT_PRESETS.map((p) => p.value);
      expect(values).toContain("未指定");
      expect(values).toContain("室内");
      expect(values).toContain("户外");
      expect(values).toContain("车内");
      expect(values).toContain("custom");
    });

    it("should provide standard operation state options with custom support", () => {
      const values = CONTEXT_OPERATION_PRESETS.map((p) => p.value);
      expect(values).toContain("未指定");
      expect(values).toContain("静止");
      expect(values).toContain("移动中");
      expect(values).toContain("单手操作");
      expect(values).toContain("双手操作");
      expect(values).toContain("custom");
    });
  });
});
