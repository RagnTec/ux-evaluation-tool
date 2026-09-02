import { describe, it, expect } from "vitest";
import type { DesignElement } from "../../src/types/designElement";
import type { DerivedEvaluationContext } from "../../src/utils/interactionGeometry";
import { buildElementPresentationModel } from "../../src/utils/elementPresentation";
import {
  collectAvailableFacts,
  resolveMetricCapability,
  type CapabilityContext
} from "../../src/utils/capabilityResolver";
import { parseViewingDistanceMm } from "../../src/humanFactors/viewingDistance";

describe("Phase 3K.1 Visual Angle Product Integration & Presentation", () => {
  const baseElement: DesignElement = {
    element_id: "el-btn-1",
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

  const textElement: DesignElement = {
    element_id: "el-txt-1",
    label: "标题文本",
    source: "manual",
    element_type: "text",
    interaction_type: "none",
    normalized_bounds: { x: 0.1, y: 0.1, width: 0.8, height: 0.04 },
    image_pixel_bounds: { x: 108, y: 240, width: 864, height: 96 },
    calibration_mode: "full_screen",
    physical_geometry: {
      is_calibrated: true,
      width_mm: 58.5,
      height_mm: 6.5,
      calibration_quality: "exact"
    },
    created_at: new Date().toISOString()
  };

  const containElement: DesignElement = {
    ...baseElement,
    element_id: "el-contain-1",
    physical_geometry: {
      is_calibrated: true,
      width_mm: 45.0,
      height_mm: 10.0,
      calibration_quality: "inferred"
    }
  };

  const uncalibratedElement: DesignElement = {
    ...baseElement,
    element_id: "el-uncal-1",
    physical_geometry: undefined
  };

  const baseContext: DerivedEvaluationContext = {
    imageNaturalWidth: 1080,
    imageNaturalHeight: 2400,
    calibrationMode: "full_screen",
    allowEstimation: true,
    displaySize: "6.7 inch",
    resolution: "1080x2400",
    viewingDistance: "700 mm"
  };

  describe("Viewing distance input parsing", () => {
    it("normalizes mm, cm, and m representations to 700 mm", () => {
      expect(parseViewingDistanceMm("700 mm")).toBe(700);
      expect(parseViewingDistanceMm("70 cm")).toBe(700);
      expect(parseViewingDistanceMm("0.7 m")).toBe(700);
    });

    it("rejects invalid, 0, negative, and non-numeric inputs", () => {
      expect(parseViewingDistanceMm("0 mm")).toBeNull();
      expect(parseViewingDistanceMm("-700 mm")).toBeNull();
      expect(parseViewingDistanceMm("invalid")).toBeNull();
      expect(parseViewingDistanceMm("")).toBeNull();
    });
  });

  describe("Capability resolution matrix", () => {
    it("reports visual angle unavailable when viewing distance is missing (Case A)", () => {
      const capCtx: CapabilityContext = {
        imageWidth: 1080,
        imageHeight: 2400,
        calibrationMode: "full_screen",
        displaySize: "6.7 inch",
        resolution: "1080x2400",
        viewingDistance: ""
      };
      const facts = collectAvailableFacts(capCtx, baseElement);
      const cap = resolveMetricCapability("visual_angle_measurement", facts, capCtx, baseElement);

      expect(cap.available).toBe(false);
      expect(cap.missingFactLabels.some((l) => l.includes("使用视距"))).toBe(true);
    });

    it("reports visual angle unavailable when physical size is missing (Case B)", () => {
      const capCtx: CapabilityContext = {
        imageWidth: 1080,
        imageHeight: 2400,
        calibrationMode: "full_screen",
        displaySize: "",
        resolution: "",
        viewingDistance: "700 mm"
      };
      const facts = collectAvailableFacts(capCtx, uncalibratedElement);
      const cap = resolveMetricCapability("visual_angle_measurement", facts, capCtx, uncalibratedElement);

      expect(cap.available).toBe(false);
      expect(cap.missingFactLabels.some((l) => l.includes("屏幕硬件") || l.includes("物理尺寸"))).toBe(true);
    });

    it("reports visual angle available when physical size and viewing distance both exist (Case C)", () => {
      const capCtx: CapabilityContext = {
        imageWidth: 1080,
        imageHeight: 2400,
        calibrationMode: "full_screen",
        displaySize: "6.7 inch",
        resolution: "1080x2400",
        viewingDistance: "700 mm"
      };
      const facts = collectAvailableFacts(capCtx, baseElement);
      const cap = resolveMetricCapability("visual_angle_measurement", facts, capCtx, baseElement);

      expect(cap.available).toBe(true);
      expect(cap.tier).toBe("hardware_assumed");
    });
  });

  describe("Hardware without design mapping independence", () => {
    it("computes physical size and visual angle while logical dimensions remain unavailable", () => {
      const contextNoLogical: DerivedEvaluationContext = {
        ...baseContext,
        logicalMapping: null
      };
      const presentation = buildElementPresentationModel(baseElement, contextNoLogical);

      expect(presentation.isPhysicalAvailable).toBe(true);
      expect(presentation.isVisualAngleAvailable).toBe(true);
      expect(presentation.isLogicalConfigured).toBe(false);
      expect(presentation.logicalDisplay).toBeUndefined();
      expect(presentation.visualAngleDisplay).toBe("4.79° × 1.06°");
    });
  });

  describe("Contain provenance propagation & weakest-evidence principle", () => {
    it("prefixes visual angle with estimate indicator for contain/inferred physical dimensions", () => {
      const presentation = buildElementPresentationModel(containElement, baseContext);

      expect(presentation.isVisualAngleAvailable).toBe(true);
      expect(presentation.visualAngleDisplay).toContain("约 ");
      expect(presentation.physicalProvenance).toBe("等比贴合估算");
      expect(presentation.visualAngleProvenance).toContain("等比贴合估算");
    });
  });

  describe("Recompute upon viewing distance changes", () => {
    it("recomputes visual angle dynamically when viewing distance changes or is removed", () => {
      // 1. Initial 700 mm
      const p700 = buildElementPresentationModel(baseElement, { ...baseContext, viewingDistance: "700 mm" });
      expect(p700.isVisualAngleAvailable).toBe(true);
      expect(p700.visualAngleHorizontalDeg).toBeCloseTo(4.79, 2);

      // 2. Changed to 1000 mm
      const p1000 = buildElementPresentationModel(baseElement, { ...baseContext, viewingDistance: "1000 mm" });
      expect(p1000.isVisualAngleAvailable).toBe(true);
      expect(p1000.visualAngleHorizontalDeg).toBeCloseTo(3.35, 2);

      // 3. Removed
      const pEmpty = buildElementPresentationModel(baseElement, { ...baseContext, viewingDistance: "" });
      expect(pEmpty.isVisualAngleAvailable).toBe(false);
      expect(pEmpty.visualAngleDisplay).toBeUndefined();
      expect(pEmpty.visualAngleUnavailableGuidance).toContain("补充观看距离");
    });

    it("recomputes all elements when project viewing distance changes", () => {
      const elements = [baseElement, textElement, containElement];
      const presentations = elements.map((el) =>
        buildElementPresentationModel(el, { ...baseContext, viewingDistance: "600 mm" })
      );

      expect(presentations.every((p) => p.isVisualAngleAvailable)).toBe(true);
      expect(presentations[0].visualAngleViewingDistanceDisplay).toBe("基于 600 mm 观看距离");
      expect(presentations[1].visualAngleViewingDistanceDisplay).toBe("基于 600 mm 观看距离");
      expect(presentations[2].visualAngleViewingDistanceDisplay).toBe("基于 600 mm 观看距离");
    });
  });

  describe("Independent horizontal and vertical axes", () => {
    it("maintains independent horizontal and vertical calculations without averaging", () => {
      const presentation = buildElementPresentationModel(baseElement, baseContext);

      expect(presentation.visualAngleHorizontalDeg).toBeCloseTo(4.79, 2);
      expect(presentation.visualAngleVerticalDeg).toBeCloseTo(1.06, 2);
      expect(presentation.visualAngleDetailDisplay).toContain("水平 4.79° (287.1′) × 垂直 1.06° (63.8′)");
    });
  });

  describe("Measurement-only and no compliance verdicts", () => {
    it("ensures visual angle presentation contains no pass/fail/meets verdict", () => {
      const presentation = buildElementPresentationModel(baseElement, baseContext);

      expect((presentation as unknown as Record<string, unknown>).visualAngleVerdict).toBeUndefined();
      expect((presentation as unknown as Record<string, unknown>).visualAnglePassed).toBeUndefined();
      expect((presentation as unknown as Record<string, unknown>).visualAngleMeets).toBeUndefined();
    });
  });

  describe("Text semantic boundary note", () => {
    it("provides explicit notice for text elements clarifying Visual Bounds vs character height", () => {
      const textPres = buildElementPresentationModel(textElement, baseContext);
      expect(textPres.visualAngleTextSemanticNote).toBe(
        "当前视觉角基于圈选文字区域的可视边界计算，不等同于字符高度、x-height 或源字号。"
      );

      const btnPres = buildElementPresentationModel(baseElement, baseContext);
      expect(btnPres.visualAngleTextSemanticNote).toBeUndefined();
    });
  });
});
