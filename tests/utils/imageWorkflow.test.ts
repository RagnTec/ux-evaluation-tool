import { describe, it, expect } from "vitest";
import { shouldConfirmImageReplacement, createCleanReplacementState } from "../../src/utils/imageWorkflow";
import { collectAvailableFacts, resolveEvaluationCapability } from "../../src/utils/capabilityResolver";
import { DesignElement } from "../../src/types/designElement";

describe("Image Workflow & Replacement Safety", () => {
  const mockElement: DesignElement = {
    id: "el-1",
    label: "提交按钮",
    element_type: "button",
    interaction_type: "tap",
    normalized_bounds: { x: 0.1, y: 0.2, width: 0.3, height: 0.1 },
    image_pixel_bounds: { x: 100, y: 200, width: 300, height: 100 },
    is_interactive: true,
    created_at: 1000,
    updated_at: 1000
  };

  describe("shouldConfirmImageReplacement", () => {
    it("does not require confirmation when workspace has 0 manual elements", () => {
      expect(shouldConfirmImageReplacement(0)).toBe(false);
    });

    it("requires confirmation when workspace has 1 or more real manual elements", () => {
      expect(shouldConfirmImageReplacement(1)).toBe(true);
      expect(shouldConfirmImageReplacement(5)).toBe(true);
    });
  });

  describe("createCleanReplacementState", () => {

    const initialWorkflowState = {
      imageUrl: "blob:http://localhost/old-image",
      imageBlob: new Blob(["old"], { type: "image/png" }),
      imageName: "old_screen.png",
      imageNaturalDimensions: { width: 1280, height: 800 },
      manualElements: [mockElement],
      activeElementId: "el-1",
      logicalMapping: {
        platform: "ios" as const,
        unit: "pt" as const,
        image_reference_width: 1280,
        logical_reference_width: 390,
        scale: 390 / 1280
      },
      imageRefWidthInput: "1280",
      logicalRefWidthInput: "390",
      imageRefHeightInput: "",
      logicalRefHeightInput: "",
      originalFullImageWidthInput: "1280",
      // Global parameters that should be preserved:
      deviceProfile: "mobile",
      displaySize: "6.1 inch",
      resolution: "390x844"
    };

    it("clears element annotations and old image-specific mapping on replacement", () => {
      const newImage = {
        url: "blob:http://localhost/new-image",
        blob: new Blob(["new"], { type: "image/png" }),
        name: "new_screen.png",
        naturalDimensions: { width: 1920, height: 1080 }
      };

      const nextState = createCleanReplacementState(initialWorkflowState, newImage);

      // Cleared element & coordinate state
      expect(nextState.manualElements).toEqual([]);
      expect(nextState.activeElementId).toBeNull();
      expect(nextState.logicalMapping).toBeUndefined();
      expect(nextState.imageRefWidthInput).toBe("");
      expect(nextState.logicalRefWidthInput).toBe("");
      expect(nextState.originalFullImageWidthInput).toBe("");

      // Updated image state
      expect(nextState.imageUrl).toBe("blob:http://localhost/new-image");
      expect(nextState.imageName).toBe("new_screen.png");
      expect(nextState.imageNaturalDimensions).toEqual({ width: 1920, height: 1080 });

      // Preserved global hardware properties
      expect(nextState.deviceProfile).toBe("mobile");
      expect(nextState.displaySize).toBe("6.1 inch");
      expect(nextState.resolution).toBe("390x844");
    });
  });

  describe("Capability Recalculation on Image Dimension Replacement", () => {
    it("downgrades physical geometry from hardware_assumed to screenshot_fact when aspect ratio mismatches", () => {
      // 1. Initial matching image: 2560x1600 hardware resolution (16:10) + 1280x800 image (16:10)
      const matchingFacts = collectAvailableFacts({
        imageWidth: 1280,
        imageHeight: 800,
        calibrationMode: "full_screen",
        displaySize: "13.3 inch",
        resolution: "2560x1600"
      }, mockElement);

      const matchingCap = resolveEvaluationCapability("physical_geometry", matchingFacts);
      expect(matchingCap.highestAvailableTier).toBe("hardware_assumed");

      // 2. Replaced with non-matching aspect ratio image: 1280x720 (16:9)
      const mismatchedFacts = collectAvailableFacts({
        imageWidth: 1280,
        imageHeight: 720,
        calibrationMode: "full_screen",
        displaySize: "13.3 inch",
        resolution: "2560x1600"
      }, mockElement);

      const mismatchedCap = resolveEvaluationCapability("physical_geometry", mismatchedFacts);
      // Because aspect ratio differs by > 3%, hardware_screen_aspect_matched is false, so it falls back to screenshot_fact
      expect(mismatchedCap.highestAvailableTier).toBe("screenshot_fact");
      expect(mismatchedCap.missingRequirementsForNextTier.length).toBeGreaterThan(0);
      expect(mismatchedCap.missingFactIdsForNextTier).toContain("hardware_aspect_matched");
    });

    it("allows immediate annotation on newly uploaded image without requiring parameters upfront", () => {
      const rawImageFacts = collectAvailableFacts({
        imageWidth: 1920,
        imageHeight: 1080
      }, mockElement);

      const visualCap = resolveEvaluationCapability("visual_geometry", rawImageFacts);
      const contrastCap = resolveEvaluationCapability("contrast", rawImageFacts);
      const physicalCap = resolveEvaluationCapability("physical_geometry", rawImageFacts);

      // Screenshot facts are immediately available
      expect(visualCap.highestAvailableTier).toBe("screenshot_fact");
      expect(contrastCap.highestAvailableTier).toBe("screenshot_fact");

      // Advanced tiers explain what is missing without blocking
      expect(physicalCap.highestAvailableTier).toBe("screenshot_fact");
      expect(physicalCap.missingRequirementsForNextTier.length).toBeGreaterThan(0);
    });
  });
});
