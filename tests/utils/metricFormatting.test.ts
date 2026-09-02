import { describe, it, expect } from "vitest";
import {
  formatSingleDimension,
  formatDimensionPair,
  formatAreaMetric
} from "../../src/utils/metricFormatting";
import type { LogicalUnitMapping } from "../../src/types/designElement";

describe("metricFormatting", () => {
  const iosMapping: LogicalUnitMapping = {
    platform: "ios",
    unit: "pt",
    image_reference_width: 1170,
    logical_reference_width: 390,
    scale_x: 390 / 1170,
    scale_y: 390 / 1170,
    source: "user_specified"
  };

  const androidMapping: LogicalUnitMapping = {
    platform: "android",
    unit: "dp",
    image_reference_width: 1080,
    logical_reference_width: 360,
    scale_x: 360 / 1080,
    scale_y: 360 / 1080,
    source: "user_specified"
  };

  describe("formatDimensionPair", () => {
    it("formats logical dimensions first when mapping is present", () => {
      const res = formatDimensionPair(120, 90, iosMapping, 8.5, 6.4, "exact");
      expect(res.primary).toBe("40 × 30 pt");
      expect(res.secondary).toBe("120 × 90 px");
      expect(res.tertiary).toBe("8.5 × 6.4 mm");
    });

    it("formats estimated mm correctly", () => {
      const res = formatDimensionPair(120, 90, iosMapping, 8.5, 6.4, "estimated");
      expect(res.primary).toBe("40 × 30 pt");
      expect(res.tertiary).toBe("约 8.5 × 6.4 mm 估算");
    });

    it("falls back to pixels as primary when mapping is absent", () => {
      const res = formatDimensionPair(120, 90, undefined, 8.5, 6.4, "exact");
      expect(res.primary).toBe("120 × 90 px");
      expect(res.secondary).toBe("8.5 × 6.4 mm");
      expect(res.tertiary).toBeUndefined();
    });
  });

  describe("formatSingleDimension", () => {
    it("formats single dimension with designer unit first", () => {
      const res = formatSingleDimension(150, androidMapping, 10.5, "exact");
      expect(res.primary).toBe("50 dp");
      expect(res.secondary).toBe("150 px");
      expect(res.tertiary).toBe("10.5 mm");
    });
  });

  describe("formatAreaMetric", () => {
    it("formats area metric with logical area first", () => {
      const res = formatAreaMetric(10800, iosMapping, 54.4, "exact");
      expect(res.primary).toBe("1200 pt²");
      expect(res.secondary).toBe("10800 px²");
      expect(res.tertiary).toBe("54.4 mm²");
    });
  });
});
