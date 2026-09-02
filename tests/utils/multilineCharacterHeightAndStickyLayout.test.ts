import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import type {
  DesignElement,
  DerivedEvaluationContext
} from "../../src/types/designElement";
import { recomputeElementDerivedState } from "../../src/utils/interactionGeometry";
import { buildElementPresentationModel } from "../../src/utils/elementPresentation";
import { createLogicalUnitMapping } from "../../src/utils/logicalMapping";
import { generateSelfContainedHtmlReport } from "../../src/utils/reportGenerator";

describe("Multiline Text Character Height Font Size Derivation & Sticky Header Layout", () => {
  const iosLogicalMapping = createLogicalUnitMapping(
    "ios",
    "pt",
    1170,
    390,
    undefined,
    undefined,
    "exact_profile"
  );

  const fullContext: DerivedEvaluationContext = {
    imageNaturalWidth: 1170,
    imageNaturalHeight: 2532,
    displaySize: "6.1 inch",
    resolution: "1170x2532",
    viewingDistance: "35cm",
    calibrationMode: "preset",
    croppedScaleMode: "scale_direct",
    logicalMapping: iosLogicalMapping,
    scenarioDomain: "mobile"
  };

  const contextWithoutMapping: DerivedEvaluationContext = {
    ...fullContext,
    logicalMapping: null
  };

  it("1. multiline text with character_height_px and logicalMapping derives representative character design space height and displays '约 X pt'", () => {
    const el: DesignElement = {
      element_id: "text-multi-char",
      source: "manual",
      element_type: "text",
      text_layout: "multi_line",
      text_visual_measurement_target: "whole_text_bounds",
      text_role: "body",
      character_height_px: 51,
      character_height_source: "measured_rendered_character",
      normalized_bounds: { x: 0.1, y: 0.2, width: 0.8, height: 180 / 2532 },
      image_pixel_bounds: { x: 117, y: 506, width: 936, height: 180 },
      calibration_mode: "preset",
      created_at: new Date().toISOString()
    };

    const derived = recomputeElementDerivedState(el, fullContext);
    // 51 px * (390 / 1170) = 17 pt
    expect(derived.character_height_design_height).toBe(17);
    expect(derived.text_size_value).toBeUndefined();
    expect(derived.text_size_evaluation?.status).toBe("meets_default");
    expect(derived.text_size_evaluation?.evaluation_basis).toBe("screenshot_estimate");

    const presentation = buildElementPresentationModel(
      derived,
      fullContext,
      null,
      "ios"
    );

    expect(presentation.textSizeDisplay).toBe("未确认");
    expect(presentation.characterHeightDisplay).toBe("51 px");
    expect(presentation.characterHeightDesignDisplay).toBe("约 17 pt");
  });

  it("2. multiline text with character_height_px WITHOUT logicalMapping keeps character px/mm/angle and displays '暂不可换算'", () => {
    const el: DesignElement = {
      element_id: "text-multi-char-no-mapping",
      source: "manual",
      element_type: "text",
      text_layout: "multi_line",
      text_visual_measurement_target: "whole_text_bounds",
      text_role: "body",
      character_height_px: 51,
      character_height_source: "measured_rendered_character",
      normalized_bounds: { x: 0.1, y: 0.2, width: 0.8, height: 180 / 2532 },
      image_pixel_bounds: { x: 117, y: 506, width: 936, height: 180 },
      calibration_mode: "preset",
      created_at: new Date().toISOString()
    };

    const derived = recomputeElementDerivedState(el, contextWithoutMapping);
    expect(derived.character_height_px).toBe(51);
    expect(derived.character_height_physical_mm).toBeGreaterThan(0);
    expect(derived.character_height_visual_angle?.arcmin).toBeGreaterThan(0);
    expect(derived.text_size_value).toBeUndefined();

    const presentation = buildElementPresentationModel(
      derived,
      contextWithoutMapping,
      null,
      "ios"
    );

    expect(presentation.textSizeDisplay).toBe("暂不可换算");
    expect(presentation.characterHeightDisplay).toBe("51 px");
    expect(presentation.characterHeightPhysicalDisplay).toMatch(/约 \d+(\.\d+)? mm/);
    expect(presentation.characterHeightVisualAngleDisplay).toMatch(/\d+(\.\d+)?′/);
  });

  it("3. multiline whole container without character_height_px does not treat container height as font size", () => {
    const el: DesignElement = {
      element_id: "text-multi-whole-only",
      source: "manual",
      element_type: "text",
      text_layout: "multi_line",
      text_visual_measurement_target: "whole_text_bounds",
      text_role: "body",
      normalized_bounds: { x: 0.1, y: 0.2, width: 0.8, height: 180 / 2532 },
      image_pixel_bounds: { x: 117, y: 506, width: 936, height: 180 },
      calibration_mode: "preset",
      created_at: new Date().toISOString()
    };

    const derived = recomputeElementDerivedState(el, fullContext);
    expect(derived.text_size_value).toBeUndefined();
    expect(derived.character_height_px).toBeUndefined();

    const presentation = buildElementPresentationModel(
      derived,
      fullContext,
      null,
      "ios"
    );

    expect(presentation.textSizeDisplay).toBe("未确认");
    expect(presentation.textSizeStatus).toBe("needs_confirmation");
  });

  it("4. auto recompute refreshes existing elements consistently across card, inspector and report data", () => {
    const existingElement: DesignElement = {
      element_id: "existing-multi-text",
      source: "manual",
      element_type: "text",
      text_layout: "multi_line",
      text_role: "body",
      character_height_px: 36,
      character_height_source: "measured_rendered_character",
      normalized_bounds: { x: 0.1, y: 0.2, width: 0.8, height: 120 / 2532 },
      image_pixel_bounds: { x: 117, y: 506, width: 936, height: 120 },
      calibration_mode: "preset",
      created_at: new Date().toISOString()
    };

    const derived = recomputeElementDerivedState(existingElement, fullContext);
    // 36 px * (390 / 1170) = 12 pt
    expect(derived.character_height_design_height).toBe(12);
    expect(derived.text_size_value).toBeUndefined();

    const presentation = buildElementPresentationModel(
      derived,
      fullContext,
      null,
      "ios"
    );

    expect(presentation.textSizeDisplay).toBe("未确认");
    expect(presentation.characterHeightDesignDisplay).toBe("约 12 pt");

    const html = generateSelfContainedHtmlReport({
      title: "UX 报告",
      imageName: "screen.png",
      imageNaturalDimensions: { width: 1170, height: 2532 },
      screenshotScope: "full_screen",
      screenshotScopeLabel: "全屏截图",
      totalElementsCount: 1,
      attentionCount: 0,
      filter: "all",
      filterCount: 1,
      designInfoStatus: "source_available",
      targetPlatform: "ios",
      targetPlatformLabel: "iOS",
      assumptions: [],
      elements: [
        {
          index: 1,
          elementId: derived.element_id,
          label: "Element 1",
          elementType: "text",
          elementTypeLabel: "正文文本",
          interactionType: "none",
          isInteractive: false,
          needsAttention: false,
          highestTier: "L2_PLATFORM_COMPLIANCE",
          highestTierLabel: "平台规范层",
          conclusion: presentation.conclusion,
          conclusionState: presentation.conclusionState,
          conclusionStateLabel: presentation.conclusionStateLabel,
          characterHeightDisplay: presentation.characterHeightDisplay,
          characterHeightDesignDisplay: presentation.characterHeightDesignDisplay,
          visualDimensionsDisplay: presentation.visualPxDisplay
        }
      ],
      summaryData: {
        totalElements: 1,
        interactiveElements: 0,
        attentionCount: 0,
        uncalibratedCount: 0
      }
    });

    expect(html).toContain("代表字符设计空间高度");
    expect(html).toContain("约 12 pt");
  });

  it("5. canvas header/toolbar and layout scroll structure verifies sticky stability and layer hierarchy", () => {
    const cssPath = resolve(__dirname, "../../src/styles.css");
    const css = readFileSync(cssPath, "utf-8");

    // Top workspace header highest priority in workspace
    expect(css).toMatch(/\.topWorkspaceHeader\s*\{[\s\S]*?position:\s*sticky;/);
    expect(css).toMatch(/\.topWorkspaceHeader\s*\{[\s\S]*?z-index:\s*500;/);

    // Canvas header/toolbar sticky with second highest z-index in workspace
    expect(css).toMatch(/\.canvasHeader,\s*\.canvasToolbar\s*\{[\s\S]*?position:\s*sticky;/);
    expect(css).toMatch(/\.canvasHeader,\s*\.canvasToolbar\s*\{[\s\S]*?z-index:\s*50;/);

    // Canvas layout fits viewport without extra document scroll bleed
    expect(css).toMatch(/\.layout\.canvasFirstLayout\s*\{[\s\S]*?overflow:\s*hidden;/);
    expect(css).toMatch(/\.canvasArea\.canvasFirst\s*\{[\s\S]*?overflow-y:\s*auto;/);
  });
});
