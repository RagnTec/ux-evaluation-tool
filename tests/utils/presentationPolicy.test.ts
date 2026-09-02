import { describe, it, expect } from "vitest";
import {
  getEvaluationPresentationPolicy,
  getPrecisionCapabilityStatus,
  formatAreaShare
} from "../../src/utils/presentationPolicy";
import type { LogicalUnitMapping } from "../../src/types/designElement";

describe("getEvaluationPresentationPolicy", () => {
  it("returns quick mode policy prioritizing observable facts with progressive disclosure", () => {
    const policy = getEvaluationPresentationPolicy("quick");
    expect(policy.showParametersDirectly).toBe(false);
    expect(policy.showPhysicalParametersDirectly).toBe(false);
    expect(policy.leadWithObservableFacts).toBe(true);
    expect(policy.showPhysicalMeasurements).toBe(false);
    expect(policy.showEvidenceDetails).toBe(false);
    expect(policy.defaultExpandedSections.measurements).toBe(false);
  });

  it("returns guided mode policy exposing design basis and design units", () => {
    const policy = getEvaluationPresentationPolicy("guided");
    expect(policy.showParametersDirectly).toBe(true);
    expect(policy.showPhysicalParametersDirectly).toBe(false);
    expect(policy.leadWithObservableFacts).toBe(false);
    expect(policy.showPhysicalMeasurements).toBe(false);
    expect(policy.showEvidenceDetails).toBe(true);
    expect(policy.defaultExpandedSections.measurements).toBe(true);
  });

  it("returns precise mode policy exposing full technical engineering layer", () => {
    const policy = getEvaluationPresentationPolicy("precise");
    expect(policy.showParametersDirectly).toBe(true);
    expect(policy.showPhysicalParametersDirectly).toBe(true);
    expect(policy.leadWithObservableFacts).toBe(false);
    expect(policy.showPhysicalMeasurements).toBe(true);
    expect(policy.showEvidenceDetails).toBe(true);
    expect(policy.defaultExpandedSections.measurements).toBe(true);
  });
});

describe("getPrecisionCapabilityStatus", () => {
  it("returns relative level when no mapping and no physical calibration is present", () => {
    const status = getPrecisionCapabilityStatus(null, undefined);
    expect(status.level).toBe("relative");
    expect(status.canRelativeEvaluate).toBe(true);
    expect(status.canDesignUnitEvaluate).toBe(false);
    expect(status.canPhysicalEvaluate).toBe(false);
    expect(status.badgeText).toContain("截图评估可用");
  });

  it("returns design_unit level when logical mapping is configured", () => {
    const mapping: LogicalUnitMapping = {
      platform: "ios",
      unit: "pt",
      image_reference_width: 1170,
      logical_reference_width: 390,
      scale_x: 390 / 1170,
      scale_y: 390 / 1170,
      scale_ratio: 3.0,
      quality: "user_specified"
    };

    const status = getPrecisionCapabilityStatus(mapping, {
      width_mm: 20,
      height_mm: 10,
      calibration_quality: "relative_only"
    });

    expect(status.level).toBe("design_unit");
    expect(status.canDesignUnitEvaluate).toBe(true);
    expect(status.canPhysicalEvaluate).toBe(false);
    expect(status.badgeText).toContain("设计单位换算已启用");
  });

  it("returns physical level when physical calibration has exact or estimated quality", () => {
    const mapping: LogicalUnitMapping = {
      platform: "ios",
      unit: "pt",
      image_reference_width: 1170,
      logical_reference_width: 390,
      scale_x: 390 / 1170,
      scale_y: 390 / 1170,
      scale_ratio: 3.0,
      quality: "user_specified"
    };

    const status = getPrecisionCapabilityStatus(mapping, {
      width_mm: 20,
      height_mm: 10,
      calibration_quality: "exact"
    });

    expect(status.level).toBe("physical");
    expect(status.canDesignUnitEvaluate).toBe(true);
    expect(status.canPhysicalEvaluate).toBe(true);
    expect(status.badgeText).toContain("物理尺寸换算已启用");
  });
});

describe("formatAreaShare", () => {
  it("formats full screen area share as 屏幕占比", () => {
    const bounds = { x: 0, y: 0, width: 200, height: 100 }; // 20000 px^2
    const res = formatAreaShare(bounds, 1000, 1000, "full_screen"); // 1000000 px^2 -> 2.0%
    expect(res.label).toBe("屏幕占比");
    expect(res.percentage).toBe(2.0);
    expect(res.percentageText).toBe("2%");
  });

  it("formats cropped area share as 当前截图占比", () => {
    const bounds = { x: 0, y: 0, width: 200, height: 100 };
    const res = formatAreaShare(bounds, 800, 600, "cropped"); // 20000 / 480000 ≈ 4.2%
    expect(res.label).toBe("当前截图占比");
    expect(res.percentage).toBe(4.2);
    expect(res.percentageText).toBe("4.2%");
  });

  it("handles zero or invalid canvas dimensions safely", () => {
    const bounds = { x: 0, y: 0, width: 100, height: 50 };
    const res = formatAreaShare(bounds, 0, 0, "full_screen");
    expect(res.percentage).toBe(0);
    expect(res.percentageText).toBe("0%");
  });
});
