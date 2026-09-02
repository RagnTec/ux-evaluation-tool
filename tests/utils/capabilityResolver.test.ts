import { describe, it, expect } from "vitest";
import {
  collectAvailableFacts,
  resolveEvaluationCapability,
  resolveAllCapabilities,
  type CapabilityContext
} from "../../src/utils/capabilityResolver";
import type { AvailableFact } from "../../src/types/capability";
import type { DesignElement, LogicalUnitMapping } from "../../src/types/designElement";
import { createLogicalUnitMapping } from "../../src/utils/logicalMapping";

describe("Capability Resolver (Phase 3H)", () => {
  const dummyElement: DesignElement = {
    element_id: "el_1",
    element_type: "text",
    image_pixel_bounds: { x: 50, y: 100, width: 200, height: 40 },
    normalized_bounds: { top: 0.1, left: 0.1, width: 0.2, height: 0.05 },
    interaction_type: "none",
    text_layout: "single_line",
    text_size_source: "estimated_from_visual_bounds",
    text_size_value: 16,
    text_size_unit: "pt"
  };

  const sampleMapping: LogicalUnitMapping = createLogicalUnitMapping(
    "ios",
    "pt",
    1170,
    390,
    undefined,
    undefined,
    "user_specified"
  )!;

  describe("collectAvailableFacts", () => {
    it("should extract screenshot facts when only image dimensions are provided", () => {
      const ctx: CapabilityContext = {
        imageWidth: 1170,
        imageHeight: 2532,
        calibrationMode: "full_screen"
      };

      const facts = collectAvailableFacts(ctx, null);
      expect(facts.has("image_uploaded")).toBe(true);
      expect(facts.has("image_natural_dimensions")).toBe(true);
      expect(facts.has("screenshot_scope_full")).toBe(true);
      expect(facts.has("screen_diagonal")).toBe(false);
      expect(facts.has("screen_resolution")).toBe(false);
      expect(facts.has("logical_mapping")).toBe(false);
    });

    it("should extract screen hardware facts when displaySize and resolution are given", () => {
      const ctx: CapabilityContext = {
        imageWidth: 1170,
        imageHeight: 2532,
        calibrationMode: "full_screen",
        displaySize: "6.1 inch",
        resolution: "1170x2532"
      };

      const facts = collectAvailableFacts(ctx, null);
      expect(facts.has("screen_diagonal")).toBe(true);
      expect(facts.has("screen_resolution")).toBe(true);
      expect(facts.has("hardware_aspect_matched")).toBe(true);
    });

    it("should extract element facts when element is passed", () => {
      const ctx: CapabilityContext = {
        imageWidth: 1170,
        imageHeight: 2532,
        calibrationMode: "full_screen",
        logicalMapping: sampleMapping
      };

      const facts = collectAvailableFacts(ctx, dummyElement);
      expect(facts.has("visual_bounds")).toBe(true);
      expect(facts.has("text_single_line")).toBe(true);
      expect(facts.has("estimated_text_size")).toBe(true);
      expect(facts.has("logical_mapping")).toBe(true);
    });

    it("should detect user-confirmed font size", () => {
      const confirmedEl: DesignElement = {
        ...dummyElement,
        text_size_source: "user_confirmed",
        text_size_value: 17
      };

      const facts = collectAvailableFacts({ imageWidth: 1170, imageHeight: 2532 }, confirmedEl);
      expect(facts.has("confirmed_text_size")).toBe(true);
    });
  });

  describe("resolveEvaluationCapability", () => {
    it("should resolve visual_geometry to screenshot_fact with screenshot facts", () => {
      const facts = new Set<AvailableFact>(["image_uploaded", "visual_bounds"]);
      const cap = resolveEvaluationCapability("visual_geometry", facts);

      expect(cap.highestAvailableTier).toBe("screenshot_fact");
      expect(cap.nextTier).toBeNull();
      expect(cap.missingRequirementsForNextTier).toHaveLength(0);
    });

    it("should resolve physical_geometry to screenshot_fact when hardware parameters are missing", () => {
      const facts = new Set<AvailableFact>(["image_uploaded", "visual_bounds"]);
      const cap = resolveEvaluationCapability("physical_geometry", facts);

      expect(cap.highestAvailableTier).toBe("screenshot_fact");
      expect(cap.nextTier).toBe("hardware_assumed");
      expect(cap.missingRequirementsForNextTier.length).toBeGreaterThan(0);
      expect(cap.missingFactIdsForNextTier).toContain("screen_diagonal");
      expect(cap.missingFactIdsForNextTier).toContain("screen_resolution");
    });

    it("should upgrade physical_geometry to hardware_assumed when screen parameters are provided", () => {
      const facts = new Set<AvailableFact>([
        "image_uploaded",
        "visual_bounds",
        "screen_diagonal",
        "screen_resolution",
        "hardware_aspect_matched"
      ]);
      const cap = resolveEvaluationCapability("physical_geometry", facts);

      expect(cap.highestAvailableTier).toBe("hardware_assumed");
      expect(cap.nextTier).toBe("source_confirmed");
    });

    it("should resolve typography to screenshot_fact without logical mapping", () => {
      const facts = new Set<AvailableFact>([
        "image_uploaded",
        "visual_bounds",
        "text_single_line"
      ]);
      const cap = resolveEvaluationCapability("typography", facts);

      expect(cap.highestAvailableTier).toBe("screenshot_fact");
      expect(cap.nextTier).toBe("design_mapped");
      expect(cap.missingFactIdsForNextTier).toContain("logical_mapping");
    });

    it("should upgrade typography to design_mapped with logical mapping", () => {
      const facts = new Set<AvailableFact>([
        "image_uploaded",
        "visual_bounds",
        "logical_mapping",
        "text_single_line",
        "estimated_text_size"
      ]);
      const cap = resolveEvaluationCapability("typography", facts);

      expect(cap.highestAvailableTier).toBe("design_mapped");
      expect(cap.nextTier).toBe("source_confirmed");
      expect(cap.missingFactIdsForNextTier).toContain("confirmed_text_size");
    });

    it("should upgrade typography to source_confirmed when font size is user confirmed", () => {
      const facts = new Set<AvailableFact>([
        "image_uploaded",
        "visual_bounds",
        "confirmed_text_size"
      ]);
      const cap = resolveEvaluationCapability("typography", facts);

      expect(cap.highestAvailableTier).toBe("source_confirmed");
      expect(cap.nextTier).toBeNull();
    });

    it("should resolve platform_target_size appropriately", () => {
      const factsWithoutMap = new Set<AvailableFact>([
        "image_uploaded",
        "visual_bounds",
        "touch_bounds"
      ]);
      const cap1 = resolveEvaluationCapability("platform_target_size", factsWithoutMap);
      expect(cap1.highestAvailableTier).toBe("screenshot_fact");
      expect(cap1.nextTier).toBe("design_mapped");

      // Logical mapping without known platform (e.g. custom / unknown platform)
      const factsWithMapUnknownPlatform = new Set<AvailableFact>([
        "image_uploaded",
        "visual_bounds",
        "touch_bounds",
        "logical_mapping"
      ]);
      const cap2 = resolveEvaluationCapability("platform_target_size", factsWithMapUnknownPlatform);
      expect(cap2.highestAvailableTier).toBe("screenshot_fact");
      expect(cap2.missingFactIdsForNextTier).toContain("target_platform_known");

      // Logical mapping with known platform (iOS / Android / Web)
      const factsWithMapKnownPlatform = new Set<AvailableFact>([
        "image_uploaded",
        "visual_bounds",
        "touch_bounds",
        "logical_mapping",
        "target_platform_known"
      ]);
      const cap3 = resolveEvaluationCapability("platform_target_size", factsWithMapKnownPlatform);
      expect(cap3.highestAvailableTier).toBe("design_mapped");
      expect(cap3.nextTier).toBe("source_confirmed");
    });
  });

  describe("resolveAllCapabilities & Mixed Precision", () => {
    it("should resolve all 6 checks and support mixed precision in the same workspace", () => {
      const ctx: CapabilityContext = {
        imageWidth: 1170,
        imageHeight: 2532,
        calibrationMode: "full_screen",
        displaySize: "6.1 inch",
        resolution: "1170x2532",
        logicalMapping: undefined // No design mapping
      };

      const capabilities = resolveAllCapabilities(ctx, dummyElement);

      // 1. visual_geometry is at screenshot_fact
      expect(capabilities.visual_geometry.highestAvailableTier).toBe("screenshot_fact");

      // 2. physical_geometry is at hardware_assumed (Hardware parameters known)
      expect(capabilities.physical_geometry.highestAvailableTier).toBe("hardware_assumed");

      // 3. typography is at screenshot_fact (No logical mapping yet)
      expect(capabilities.typography.highestAvailableTier).toBe("screenshot_fact");

      // 4. platform_target_size is at screenshot_fact (No logical mapping yet)
      expect(capabilities.platform_target_size.highestAvailableTier).toBe("screenshot_fact");

      // Verifies that mixed tiers coexist gracefully
      expect(capabilities.physical_geometry.highestAvailableTier).not.toEqual(
        capabilities.typography.highestAvailableTier
      );
    });
  });
});
