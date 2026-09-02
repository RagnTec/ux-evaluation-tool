import { describe, it, expect } from "vitest";
import { recomputeElementDerivedState, type DerivedEvaluationContext } from "../../src/utils/interactionGeometry";
import { evaluateTargetSize, createLogicalUnitMapping } from "../../src/utils/logicalMapping";
import { buildElementPresentationModel } from "../../src/utils/elementPresentation";
import {
  getUnifiedResultExplanation,
  assessTextLayoutCapacity,
  CONCLUSION_STATE_CONFIG,
  type EvaluationConclusionState
} from "../../src/utils/impactRecommendation";
import type { DesignElement, LogicalUnitMapping } from "../../src/types/designElement";

describe("Decouple Physical Evaluation from Platform / Design Mapping (Phase 3J.4.1)", () => {
  const iosMapping: LogicalUnitMapping = createLogicalUnitMapping("ios", "pt", 1170, 390)!;

  // 1. Screenshot + Hardware Only (Platform unknown, no logical mapping, no viewing distance)
  const hardwareOnlyContext: DerivedEvaluationContext = {
    imageNaturalWidth: 1920,
    imageNaturalHeight: 1080,
    calibrationMode: "full_screen",
    allowEstimation: false,
    displaySize: "12.3 inch",
    resolution: "1920x1080",
    contextEnvironment: "车内",
    contextOperationState: "移动中",
    scenarioDomain: "automotive",
    userGroups: ["普通用户"]
  };

  // 2. Screenshot + Hardware + Viewing Distance (Platform unknown, no logical mapping)
  const hardwareAndDistanceContext: DerivedEvaluationContext = {
    ...hardwareOnlyContext,
    viewingDistance: "700mm",
    scenario: "驾驶中快速浏览"
  };

  // 3. Automotive + Logical Mapped Context (Full design basis)
  const fullAutomotiveContext: DerivedEvaluationContext = {
    ...hardwareAndDistanceContext,
    logicalMapping: iosMapping
  };

  describe("1. Capability Chains: Screenshot + Hardware (Platform Unknown)", () => {
    it("makes physical mm available while logical unit (pt/dp/CSS px) remains strictly unavailable", () => {
      const el: DesignElement = {
        element_id: "box-1",
        source: "manual",
        element_type: "button",
        interaction_type: "touch",
        normalized_bounds: { x: 0.1, y: 0.1, width: 0.1, height: 0.05 },
        image_pixel_bounds: { x: 192, y: 108, width: 192, height: 54 },
        created_at: new Date().toISOString()
      };

      const derived = recomputeElementDerivedState(el, hardwareOnlyContext);

      // Physical mm is calculated accurately
      expect(derived.physical_geometry).toBeDefined();
      expect(derived.physical_geometry?.is_calibrated).toBe(true);
      expect(derived.physical_geometry?.width_mm).toBeGreaterThan(0);
      expect(derived.physical_geometry?.height_mm).toBeGreaterThan(0);

      // Logical mapping and target size evaluation are unavailable without design basis
      expect(derived.logical_mapping).toBeUndefined();
      expect(derived.target_size_evaluation).toBeUndefined();

      const presentation = buildElementPresentationModel(derived, hardwareOnlyContext);
      expect(presentation.isPhysicalAvailable).toBe(true);
      expect(presentation.physicalDisplay).toBeDefined();
      expect(presentation.isLogicalConfigured).toBe(false);
      expect(presentation.logicalDisplay).toBeUndefined();
      expect(presentation.logicalUnavailableGuidance).toContain("逻辑尺寸暂不可换算");
    });
  });

  describe("2. Capability Chains: Screenshot + Hardware + Viewing Distance", () => {
    it("makes visual angle (deg / arcmin) available without requiring platform or design mapping", () => {
      const el: DesignElement = {
        element_id: "box-va",
        source: "manual",
        element_type: "container",
        interaction_type: "none",
        normalized_bounds: { x: 0.1, y: 0.1, width: 0.1, height: 0.05 },
        image_pixel_bounds: { x: 192, y: 108, width: 192, height: 54 },
        created_at: new Date().toISOString()
      };

      const derived = recomputeElementDerivedState(el, hardwareAndDistanceContext);
      const presentation = buildElementPresentationModel(derived, hardwareAndDistanceContext);

      expect(presentation.isVisualAngleAvailable).toBe(true);
      expect(presentation.visualAngleDisplay).toBeDefined();
      expect(presentation.visualAngleDetailDisplay).toContain("水平");
      expect(presentation.visualAngleDetailDisplay).toContain("垂直");
      expect(presentation.isLogicalConfigured).toBe(false);
    });
  });

  describe("3. Platform Selection Alone Must Not Create Logical Mapping", () => {
    it("selecting iOS without Design Size Basis does NOT create pt mapping or evaluate Apple rules", () => {
      const el: DesignElement = {
        element_id: "btn-ios-unmapped",
        source: "manual",
        element_type: "button",
        interaction_type: "touch",
        normalized_bounds: { x: 0.1, y: 0.1, width: 0.05, height: 0.05 },
        image_pixel_bounds: { x: 100, y: 100, width: 96, height: 96 },
        created_at: new Date().toISOString()
      };

      // Context has platform "ios" specified as targetPlatform but logicalMapping is undefined
      const iosWithoutBasisContext: DerivedEvaluationContext = {
        ...hardwareAndDistanceContext,
        logicalMapping: undefined // No design size basis configured
      };

      const derived = recomputeElementDerivedState(el, iosWithoutBasisContext);
      expect(derived.logical_mapping).toBeUndefined();
      expect(derived.target_size_evaluation).toBeUndefined();

      const presentation = buildElementPresentationModel(derived, iosWithoutBasisContext, null, "ios");
      expect(presentation.isLogicalConfigured).toBe(false);
      expect(presentation.logicalDisplay).toBeUndefined();
      // Without pt values, Apple 44pt rule cannot evaluate, result is measurement_only
      expect(presentation.conclusionState).toBe("measurement_only");
    });
  });

  describe("4. Adding Valid Design Size Basis Enables Platform Rules", () => {
    it("evaluates Apple 44pt rule when valid Design Size Basis (pt mapping) is provided", () => {
      const el: DesignElement = {
        element_id: "btn-44pt",
        source: "manual",
        element_type: "button",
        interaction_type: "touch",
        normalized_bounds: { x: 0.1, y: 0.1, width: 0.1, height: 0.1 },
        image_pixel_bounds: { x: 100, y: 100, width: 132, height: 132 }, // 44x44 pt at 3x
        created_at: new Date().toISOString()
      };

      const derived = recomputeElementDerivedState(el, fullAutomotiveContext);
      expect(derived.logical_mapping).toBeDefined();
      expect(derived.target_size_evaluation?.status).toBe("meets_default");

      const presentation = buildElementPresentationModel(derived, fullAutomotiveContext, null, "ios");
      expect(presentation.isLogicalConfigured).toBe(true);
      expect(presentation.logicalDisplay).toBe("44 × 44 pt");
      expect(presentation.conclusionState).toBe("meets_reference");
      expect(presentation.conclusionStateLabel).toBe("达到推荐范围");
    });

    it("evaluates 28-43 pt as below_recommended (满足基本要求，但未达推荐范围)", () => {
      const el: DesignElement = {
        element_id: "btn-32pt",
        source: "manual",
        element_type: "button",
        interaction_type: "touch",
        normalized_bounds: { x: 0.1, y: 0.1, width: 0.05, height: 0.05 },
        image_pixel_bounds: { x: 100, y: 100, width: 96, height: 96 }, // 32x32 pt at 3x
        created_at: new Date().toISOString()
      };

      const derived = recomputeElementDerivedState(el, fullAutomotiveContext);
      expect(derived.target_size_evaluation?.status).toBe("meets_minimum");

      const presentation = buildElementPresentationModel(derived, fullAutomotiveContext, null, "ios");
      expect(presentation.conclusionState).toBe("below_recommended");
      expect(presentation.conclusionStateLabel).toBe("满足基本要求，但未达推荐范围");
      expect(presentation.conclusion).toContain("但仍低于推荐值");
    });

    it("evaluates < 28 pt as below_threshold (不满足基本要求)", () => {
      const el: DesignElement = {
        element_id: "btn-20pt",
        source: "manual",
        element_type: "button",
        interaction_type: "touch",
        normalized_bounds: { x: 0.1, y: 0.1, width: 0.03, height: 0.03 },
        image_pixel_bounds: { x: 100, y: 100, width: 60, height: 60 }, // 20x20 pt at 3x
        created_at: new Date().toISOString()
      };

      const derived = recomputeElementDerivedState(el, fullAutomotiveContext);
      expect(derived.target_size_evaluation?.status).toBe("below_minimum");

      const presentation = buildElementPresentationModel(derived, fullAutomotiveContext, null, "ios");
      expect(presentation.conclusionState).toBe("below_threshold");
      expect(presentation.conclusionStateLabel).toBe("不满足基本要求");
    });
  });

  describe("5. Removing Design Size Basis Preserves Physical & Visual Measurements", () => {
    it("disappears logical pt and rule verdict while retaining mm and visual angle", () => {
      const el: DesignElement = {
        element_id: "btn-toggle",
        source: "manual",
        element_type: "button",
        interaction_type: "touch",
        normalized_bounds: { x: 0.1, y: 0.1, width: 0.1, height: 0.1 },
        image_pixel_bounds: { x: 100, y: 100, width: 132, height: 132 },
        created_at: new Date().toISOString()
      };

      // Step 1: Evaluated with mapping
      const mappedDerived = recomputeElementDerivedState(el, fullAutomotiveContext);
      const mappedPresentation = buildElementPresentationModel(mappedDerived, fullAutomotiveContext, null, "ios");
      expect(mappedPresentation.logicalDisplay).toBeDefined();
      expect(mappedPresentation.conclusionState).toBe("meets_reference");

      // Step 2: User clears/removes Design Size Basis
      const unmappedDerived = recomputeElementDerivedState(el, hardwareAndDistanceContext);
      const unmappedPresentation = buildElementPresentationModel(unmappedDerived, hardwareAndDistanceContext, null, "ios");

      expect(unmappedPresentation.isLogicalConfigured).toBe(false);
      expect(unmappedPresentation.logicalDisplay).toBeUndefined();
      expect(unmappedPresentation.isPhysicalAvailable).toBe(true);
      expect(unmappedPresentation.physicalDisplay).toBeDefined();
      expect(unmappedPresentation.isVisualAngleAvailable).toBe(true);
      expect(unmappedPresentation.visualAngleDisplay).toBeDefined();
      expect(unmappedPresentation.conclusionState).toBe("measurement_only");
    });
  });

  describe("6. Multiple Elements Global Context Refresh", () => {
    it("synchronously refreshes all elements when viewing distance or screen parameters change", () => {
      const elements: DesignElement[] = [
        {
          element_id: "txt-1",
          source: "manual",
          element_type: "text",
          character_height_px: 20,
          character_height_source: "measured_rendered_character",
          normalized_bounds: { x: 0.1, y: 0.1, width: 0.2, height: 0.05 },
          image_pixel_bounds: { x: 100, y: 100, width: 200, height: 50 },
          created_at: new Date().toISOString()
        },
        {
          element_id: "btn-1",
          source: "manual",
          element_type: "button",
          interaction_type: "touch",
          normalized_bounds: { x: 0.1, y: 0.3, width: 0.1, height: 0.08 },
          image_pixel_bounds: { x: 100, y: 300, width: 120, height: 80 },
          created_at: new Date().toISOString()
        }
      ];

      const nearContext: DerivedEvaluationContext = {
        ...hardwareAndDistanceContext,
        viewingDistance: "500mm"
      };

      const farContext: DerivedEvaluationContext = {
        ...hardwareAndDistanceContext,
        viewingDistance: "1000mm"
      };

      const derivedNear = elements.map((e) => recomputeElementDerivedState(e, nearContext));
      const derivedFar = elements.map((e) => recomputeElementDerivedState(e, farContext));

      const vaNear = derivedNear[0].character_height_visual_angle?.arcmin || 0;
      const vaFar = derivedFar[0].character_height_visual_angle?.arcmin || 0;
      expect(vaNear).toBeGreaterThan(vaFar);
      expect(Math.round(vaNear / vaFar)).toBe(2);
    });
  });

  describe("7. Text Without Source Font Size", () => {
    it("maintains physical mm and visual angle without presenting missing font size as evaluation blockage", () => {
      const textElement: DesignElement = {
        element_id: "txt-no-fontsize",
        source: "manual",
        element_type: "text",
        normalized_bounds: { x: 0.1, y: 0.1, width: 0.2, height: 0.04 },
        image_pixel_bounds: { x: 100, y: 100, width: 200, height: 40 },
        created_at: new Date().toISOString()
      };

      const derived = recomputeElementDerivedState(textElement, hardwareAndDistanceContext);
      expect(derived.text_size_value).toBeUndefined();

      const presentation = buildElementPresentationModel(derived, hardwareAndDistanceContext);
      expect(presentation.isPhysicalAvailable).toBe(true);
      expect(presentation.physicalDisplay).toBeDefined();
      expect(presentation.isVisualAngleAvailable).toBe(true);
      expect(presentation.visualAngleDisplay).toBeDefined();
      expect(presentation.textSizeStatus).toBe("missing_logical_basis");
      expect(presentation.textSizeDisplay).toBe("暂不可换算");
    });
  });

  describe("8. Representative Character Measurement Without Design Size Basis", () => {
    it("forms full ladder px -> mm -> visual angle without requiring logical mapping", () => {
      const textWithCharMeasure: DesignElement = {
        element_id: "txt-char-measured",
        source: "manual",
        element_type: "text",
        character_height_px: 24,
        character_height_source: "measured_rendered_character",
        normalized_bounds: { x: 0.1, y: 0.1, width: 0.2, height: 0.05 },
        image_pixel_bounds: { x: 100, y: 100, width: 200, height: 50 },
        created_at: new Date().toISOString()
      };

      const derived = recomputeElementDerivedState(textWithCharMeasure, hardwareAndDistanceContext);
      expect(derived.character_height_px).toBe(24);
      expect(derived.character_height_physical_mm).toBeDefined();
      expect(derived.character_height_physical_mm).toBeGreaterThan(0);
      expect(derived.character_height_visual_angle).toBeDefined();
      expect(derived.character_height_visual_angle?.arcmin).toBeGreaterThan(0);

      const presentation = buildElementPresentationModel(derived, hardwareAndDistanceContext);
      expect(presentation.characterHeightDisplay).toBe("24 px");
      expect(presentation.characterHeightPhysicalDisplay).toBeDefined();
      expect(presentation.characterHeightVisualAngleDisplay).toBeDefined();
    });

    it("applies NHTSA conservative upper-bound container inference when char unmeasured and container < threshold", () => {
      // Tiny text box: height 10px on 1920x1080 12.3" screen at 700mm distance (< 12' and < 16')
      const smallTextElement: DesignElement = {
        element_id: "tiny-txt",
        source: "manual",
        element_type: "text",
        normalized_bounds: { x: 0.1, y: 0.1, width: 0.1, height: 0.009 },
        image_pixel_bounds: { x: 100, y: 100, width: 150, height: 10 },
        created_at: new Date().toISOString()
      };

      const derived = recomputeElementDerivedState(smallTextElement, hardwareAndDistanceContext);
      const presentation = buildElementPresentationModel(derived, hardwareAndDistanceContext);

      expect(presentation.conclusionState).toBe("below_recommended");
      expect(presentation.conclusion).toContain("文字区域整体高度视角仅");
      expect(presentation.conclusion).toContain("整个文字区域已低于字符参考，实际字符只可能更小");
    });
  });

  describe("9. Non-Normative Text Layout Capacity Advisory", () => {
    it("does not impose a universal <10 chars/line formal below_recommended conclusion", () => {
      const bodyText: DesignElement = {
        element_id: "body-txt",
        source: "manual",
        element_type: "text",
        text_role: "body",
        text_layout: "multi_line",
        character_height_px: 50,
        character_height_source: "measured_rendered_character",
        normalized_bounds: { x: 0.1, y: 0.1, width: 0.1, height: 0.1 },
        image_pixel_bounds: { x: 100, y: 100, width: 200, height: 150 },
        created_at: new Date().toISOString()
      };

      const assessment = assessTextLayoutCapacity(bodyText, 1920, ["普通用户"]);
      expect(assessment).not.toBeNull();
      expect(assessment?.label).toBe("排版容量参考");
      expect(assessment?.estimatedCharsPerLine).toBeDefined();

      const derived = recomputeElementDerivedState(bodyText, hardwareAndDistanceContext);
      const presentation = buildElementPresentationModel(derived, hardwareAndDistanceContext);

      // Does not force below_recommended from layout heuristic
      expect(presentation.conclusionState).not.toBe("below_threshold");
    });

    it("treats elderly and low-vision user groups as layout trade-offs", () => {
      const elderlyBodyText: DesignElement = {
        element_id: "elderly-body",
        source: "manual",
        element_type: "text",
        text_role: "body",
        text_layout: "multi_line",
        character_height_px: 60,
        character_height_source: "measured_rendered_character",
        normalized_bounds: { x: 0.1, y: 0.1, width: 0.1, height: 0.1 },
        image_pixel_bounds: { x: 100, y: 100, width: 200, height: 150 },
        created_at: new Date().toISOString()
      };

      const assessment = assessTextLayoutCapacity(elderlyBodyText, 1920, ["老年用户", "适老模式"]);
      expect(assessment).not.toBeNull();
      expect(assessment?.finding).toBe("accessibility_tradeoff");
      expect(assessment?.label).toBe("大字版排版折衷");
      expect(assessment?.explanation).toContain("排版折衷");
    });
  });

  describe("10. Presentation Surfaces Agreement & 6 Conclusion States", () => {
    it("ensures Card, Inspector, and Report models agree on physical, logical, and visual angle capability states", () => {
      const mixedElement: DesignElement = {
        element_id: "elem-mixed",
        source: "manual",
        element_type: "button",
        interaction_type: "touch",
        normalized_bounds: { x: 0.2, y: 0.2, width: 0.08, height: 0.08 },
        image_pixel_bounds: { x: 200, y: 200, width: 100, height: 100 }, // ~33.3 pt
        created_at: new Date().toISOString()
      };

      const derived = recomputeElementDerivedState(mixedElement, fullAutomotiveContext);
      const presentation = buildElementPresentationModel(derived, fullAutomotiveContext);

      expect(presentation.conclusionState).toBe("below_recommended");
      expect(presentation.conclusionStateLabel).toBe("满足基本要求，但未达推荐范围");
      expect(presentation.conclusion).toBe(presentation.unifiedExplanation.conclusion);
      expect(presentation.whyItMatters).toBe(presentation.unifiedExplanation.whyItMatters);
      expect(presentation.conclusionStateBadgeClass).toBe("badge-below_recommended");
    });

    it("verifies CONCLUSION_STATE_CONFIG adheres to exact UX naming contract", () => {
      expect(CONCLUSION_STATE_CONFIG.meets_reference.label).toBe("达到推荐范围");
      expect(CONCLUSION_STATE_CONFIG.below_recommended.label).toBe("满足基本要求，但未达推荐范围");
      expect(CONCLUSION_STATE_CONFIG.below_threshold.label).toBe("不满足基本要求");
      expect(CONCLUSION_STATE_CONFIG.measurement_only.label).toBe("仅测量");
      expect(CONCLUSION_STATE_CONFIG.needs_info.label).toBe("待补充信息");
      expect(CONCLUSION_STATE_CONFIG.not_applicable.label).toBe("不适用");
    });
  });
});
