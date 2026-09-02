import { describe, it, expect } from "vitest";
import {
  createManualDesignElement,
  calculateArea,
  calculateAreaShare,
  calculateAreaMetrics,
  calculateVisualAreaMetrics,
  generateCenteredReferenceTouchBounds,
  calculateRectangleSpacing,
  calculateRectangleOverlap,
  calculateNearestTouchTarget,
  calculateEdgeDistances,
  circleIntersectsRectangle,
  circleIntersectsCircle,
  evaluateWcagTargetSpacingCondition,
  deriveTouchReviewStatus,
  resolveTouchSourceProvenance,
  createTouchEditSnapshot,
  applyTouchEditDraftToElement,
  revertTouchEditDraft
} from "../../src/utils/interactionGeometry";
import type { DesignElement, LogicalUnitMapping } from "../../src/types/designElement";

describe("Interaction Geometry Utilities", () => {
  describe("createManualDesignElement - Safe Defaults", () => {
    it("creates element with default other type, none interaction, and no touch bounds", () => {
      const el = createManualDesignElement(
        { x: 0.1, y: 0.1, width: 0.2, height: 0.2 },
        1000,
        1000,
        1
      );

      expect(el.element_type).toBe("other");
      expect(el.interaction_type).toBe("none");
      expect(el.touch_bounds).toBeUndefined();
      expect(el.touch_bounds_pixel).toBeUndefined();
      expect(el.touch_bounds_source).toBeUndefined();
      expect(el.target_size_evaluation).toBeUndefined();
      expect(el.image_pixel_bounds).toEqual({ x: 100, y: 100, width: 200, height: 200 });
    });
  });

  describe("calculateArea & calculateAreaShare", () => {
    it("computes area and percentage share correctly", () => {
      expect(calculateArea(100, 200)).toBe(20000);
      expect(calculateArea(0, 50)).toBe(0);
      expect(calculateArea(-10, 50)).toBe(0);

      expect(calculateAreaShare(20000, 100000)).toBe(20);
      expect(calculateAreaShare(50, 100)).toBe(50);
      expect(calculateAreaShare(0, 100)).toBe(0);
    });

    it("computes visual area metrics with logical mapping and calibration", () => {
      const mapping: LogicalUnitMapping = {
        platform: "ios",
        unit: "pt",
        image_reference_width: 1170,
        logical_reference_width: 390,
        scale_x: 1 / 3,
        scale_y: 1 / 3,
        quality: "user_specified"
      };

      const metrics = calculateVisualAreaMetrics(
        { x: 100, y: 100, width: 72, height: 72 },
        1170,
        2532,
        mapping,
        {
          width_px: 72,
          height_px: 72,
          width_mm: 5.68,
          height_mm: 5.68,
          ppi: 322,
          calibration_quality: "exact",
          is_calibrated: true
        }
      );

      expect(metrics.pixel_area).toBe(5184);
      expect(metrics.logical_width).toBe(24);
      expect(metrics.logical_height).toBe(24);
      expect(metrics.logical_area).toBe(576);
      expect(metrics.physical_width_mm).toBeCloseTo(5.68, 1);
      expect(metrics.physical_area_mm2).toBeCloseTo(32.3, 1);
    });

    it("computes area metrics for exact, estimated, and relative-only calibration", () => {
      const mapping: LogicalUnitMapping = {
        platform: "android",
        unit: "dp",
        image_reference_width: 1080,
        logical_reference_width: 360,
        scale_x: 1 / 3,
        scale_y: 1 / 3,
        quality: "user_specified"
      };

      // Exact calibration
      const exactMetrics = calculateAreaMetrics(
        { x: 0, y: 0, width: 144, height: 144 },
        1080,
        2400,
        mapping,
        300,
        "exact",
        true
      );
      expect(exactMetrics.logical_area).toBe(2304); // 48 * 48 dp
      expect(exactMetrics.physical_area_mm2).toBeDefined();
      expect(exactMetrics.calibration_quality).toBe("exact");

      // Estimated calibration
      const estimatedMetrics = calculateAreaMetrics(
        { x: 0, y: 0, width: 144, height: 144 },
        1080,
        2400,
        mapping,
        300,
        "estimated",
        true
      );
      expect(estimatedMetrics.calibration_quality).toBe("estimated");

      // Relative only
      const relativeMetrics = calculateAreaMetrics(
        { x: 0, y: 0, width: 144, height: 144 },
        1080,
        2400,
        mapping,
        undefined,
        "relative_only",
        false
      );
      expect(relativeMetrics.physical_area_mm2).toBeUndefined();
    });
  });

  describe("generateCenteredReferenceTouchBounds", () => {
    const iosMapping: LogicalUnitMapping = {
      platform: "ios",
      unit: "pt",
      image_reference_width: 1170,
      logical_reference_width: 390,
      scale_x: 1 / 3,
      scale_y: 1 / 3,
      quality: "user_specified"
    };

    it("generates 44x44 pt centered touch bounds for iOS", () => {
      const visualBounds = { x: 264, y: 264, width: 72, height: 72 };
      const ref = generateCenteredReferenceTouchBounds(visualBounds, 1170, 2532, "ios", iosMapping);

      expect(ref).not.toBeNull();
      expect(ref?.pixel_bounds.x).toBe(234);
      expect(ref?.pixel_bounds.y).toBe(234);
      expect(ref?.pixel_bounds.width).toBe(132);
      expect(ref?.pixel_bounds.height).toBe(132);
      expect(ref?.is_clipped).toBe(false);
    });

    it("generates 48x48 dp centered touch bounds for Android", () => {
      const androidMapping: LogicalUnitMapping = {
        platform: "android",
        unit: "dp",
        image_reference_width: 1080,
        logical_reference_width: 360,
        scale_x: 1 / 3,
        scale_y: 1 / 3,
        quality: "user_specified"
      };

      const visualBounds = { x: 300, y: 300, width: 60, height: 60 };
      const ref = generateCenteredReferenceTouchBounds(visualBounds, 1080, 2400, "android", androidMapping);

      expect(ref).not.toBeNull();
      expect(ref?.logical_width).toBe(48);
      expect(ref?.target_pixel_width).toBe(144);
    });

    it("generates 24x24 CSS px centered touch bounds for Web", () => {
      const webMapping: LogicalUnitMapping = {
        platform: "web",
        unit: "css_px",
        image_reference_width: 1000,
        logical_reference_width: 500,
        scale_x: 0.5,
        scale_y: 0.5,
        quality: "user_specified"
      };

      const visualBounds = { x: 100, y: 100, width: 20, height: 20 };
      const ref = generateCenteredReferenceTouchBounds(visualBounds, 1000, 1000, "web", webMapping);

      expect(ref).not.toBeNull();
      expect(ref?.logical_width).toBe(24);
      expect(ref?.target_pixel_width).toBe(48);
    });

    it("detects clipped bounds when target exceeds image boundaries", () => {
      const visualBounds = { x: 0, y: 0, width: 30, height: 30 };
      const ref = generateCenteredReferenceTouchBounds(visualBounds, 1170, 2532, "ios", iosMapping);

      expect(ref).not.toBeNull();
      expect(ref?.is_clipped).toBe(true);
      expect(ref?.clip_warning).toContain("超出当前局部截图范围");
      expect(ref?.pixel_bounds.x).toBe(0);
      expect(ref?.pixel_bounds.y).toBe(0);
    });

    it("returns null when mapping is unavailable", () => {
      const unavailMapping: LogicalUnitMapping = {
        platform: "ios",
        unit: "pt",
        image_reference_width: 1170,
        logical_reference_width: 390,
        scale_x: 0,
        scale_y: 0,
        quality: "unavailable"
      };
      const ref = generateCenteredReferenceTouchBounds({ x: 10, y: 10, width: 50, height: 50 }, 1000, 1000, "ios", unavailMapping);
      expect(ref).toBeNull();
    });
  });

  describe("calculateRectangleSpacing & Closest Points", () => {
    it("computes horizontal gap with closest facing edge points", () => {
      const rectA = { x: 0, y: 20, width: 100, height: 60 }; // y: 20..80
      const rectB = { x: 150, y: 30, width: 100, height: 80 }; // y: 30..110, y-overlap: 30..80 -> midY = 55

      const res = calculateRectangleSpacing(rectA, rectB);
      expect(res.dx).toBe(50);
      expect(res.dy).toBe(0);
      expect(res.distance).toBe(50);
      expect(res.is_overlapping).toBe(false);
      expect(res.closest_point_a).toEqual({ x: 100, y: 55 });
      expect(res.closest_point_b).toEqual({ x: 150, y: 55 });
    });

    it("computes vertical gap with closest facing edge points", () => {
      const rectA = { x: 30, y: 0, width: 80, height: 100 }; // x: 30..110
      const rectB = { x: 50, y: 140, width: 80, height: 100 }; // x: 50..130, x-overlap: 50..110 -> midX = 80

      const res = calculateRectangleSpacing(rectA, rectB);
      expect(res.dx).toBe(0);
      expect(res.dy).toBe(40);
      expect(res.distance).toBe(40);
      expect(res.closest_point_a).toEqual({ x: 80, y: 100 });
      expect(res.closest_point_b).toEqual({ x: 80, y: 140 });
    });

    it("computes diagonal gap with closest facing corner points", () => {
      const rectA = { x: 0, y: 0, width: 100, height: 100 }; // bottom-right is (100, 100)
      const rectB = { x: 130, y: 140, width: 100, height: 100 }; // top-left is (130, 140)

      const res = calculateRectangleSpacing(rectA, rectB);
      expect(res.dx).toBe(30);
      expect(res.dy).toBe(40);
      expect(res.distance).toBe(50);
      expect(res.closest_point_a).toEqual({ x: 100, y: 100 });
      expect(res.closest_point_b).toEqual({ x: 130, y: 140 });
    });

    it("detects overlap and sets distance to 0", () => {
      const rectA = { x: 0, y: 0, width: 100, height: 100 };
      const rectB = { x: 80, y: 80, width: 100, height: 100 };

      const res = calculateRectangleSpacing(rectA, rectB);
      expect(res.is_overlapping).toBe(true);
      expect(res.distance).toBe(0);
    });
  });

  describe("calculateNearestTouchTarget", () => {
    const elA: DesignElement = {
      element_id: "el-a",
      source: "manual",
      element_type: "button",
      label: "Button A",
      normalized_bounds: { x: 0.1, y: 0.1, width: 0.1, height: 0.1 },
      image_pixel_bounds: { x: 100, y: 100, width: 100, height: 100 },
      calibration_mode: "full_screen",
      created_at: new Date().toISOString(),
      interaction_type: "tap",
      touch_bounds: { x: 0.1, y: 0.1, width: 0.1, height: 0.1 }
    };

    const elB: DesignElement = {
      element_id: "el-b",
      source: "manual",
      element_type: "button",
      label: "Button B",
      normalized_bounds: { x: 0.25, y: 0.1, width: 0.1, height: 0.1 },
      image_pixel_bounds: { x: 250, y: 100, width: 100, height: 100 },
      calibration_mode: "full_screen",
      created_at: new Date().toISOString(),
      interaction_type: "tap",
      touch_bounds: { x: 0.25, y: 0.1, width: 0.1, height: 0.1 }
    };

    const elC: DesignElement = {
      element_id: "el-c",
      source: "manual",
      element_type: "image",
      label: "Image C",
      normalized_bounds: { x: 0.15, y: 0.1, width: 0.05, height: 0.05 },
      image_pixel_bounds: { x: 150, y: 100, width: 50, height: 50 },
      calibration_mode: "full_screen",
      created_at: new Date().toISOString(),
      interaction_type: "none"
    };

    it("finds nearest interactive target with closest points", () => {
      const nearest = calculateNearestTouchTarget(elA, [elA, elB, elC], 1000, 1000);
      expect(nearest).not.toBeNull();
      expect(nearest?.nearest_element_id).toBe("el-b");
      expect(nearest?.distance_px).toBe(50);
      expect(nearest?.closest_point_a).toBeDefined();
      expect(nearest?.closest_point_b).toBeDefined();
    });

    it("returns null if no other interactive elements exist", () => {
      const nearest = calculateNearestTouchTarget(elA, [elA, elC], 1000, 1000);
      expect(nearest).toBeNull();
    });
  });

  describe("Touch Edit Draft Lifecycle (createTouchEditSnapshot, apply, revert)", () => {
    const iosMapping: LogicalUnitMapping = {
      platform: "ios",
      unit: "pt",
      image_reference_width: 1000,
      logical_reference_width: 500,
      scale_x: 0.5,
      scale_y: 0.5,
      quality: "user_specified"
    };

    it("reverts completely if cancelled on element without prior touch bounds", () => {
      const el: DesignElement = {
        element_id: "el-1",
        source: "manual",
        element_type: "other",
        normalized_bounds: { x: 0.1, y: 0.1, width: 0.1, height: 0.1 },
        image_pixel_bounds: { x: 100, y: 100, width: 100, height: 100 },
        calibration_mode: "full_screen",
        created_at: new Date().toISOString(),
        interaction_type: "tap",
        touch_bounds: undefined
      };

      const snapshot = createTouchEditSnapshot(el, 1000, 1000, iosMapping);
      expect(snapshot.draft_touch_bounds).toBeDefined();
      expect(snapshot.initial_touch_bounds).toBeUndefined();

      // User cancels
      const reverted = revertTouchEditDraft(el, snapshot);
      expect(reverted.touch_bounds).toBeUndefined();
      expect(reverted.touch_bounds_source).toBeUndefined();
    });

    it("commits user_defined source on Done if modified", () => {
      const el: DesignElement = {
        element_id: "el-1",
        source: "manual",
        element_type: "button",
        normalized_bounds: { x: 0.1, y: 0.1, width: 0.1, height: 0.1 },
        image_pixel_bounds: { x: 100, y: 100, width: 100, height: 100 },
        calibration_mode: "full_screen",
        created_at: new Date().toISOString(),
        interaction_type: "tap",
        touch_bounds: undefined
      };

      const snapshot = createTouchEditSnapshot(el, 1000, 1000, iosMapping);
      snapshot.draft_touch_bounds = { x: 0.12, y: 0.12, width: 0.15, height: 0.15 };
      snapshot.is_modified = true;

      const committed = applyTouchEditDraftToElement(el, snapshot);
      expect(committed.touch_bounds).toEqual({ x: 0.12, y: 0.12, width: 0.15, height: 0.15 });
      expect(committed.touch_bounds_source).toBe("user_defined");
    });

    it("commits platform_reference source on Done if unmodified platform draft", () => {
      const el: DesignElement = {
        element_id: "el-1",
        source: "manual",
        element_type: "button",
        normalized_bounds: { x: 0.1, y: 0.1, width: 0.1, height: 0.1 },
        image_pixel_bounds: { x: 100, y: 100, width: 100, height: 100 },
        calibration_mode: "full_screen",
        created_at: new Date().toISOString(),
        interaction_type: "tap",
        touch_bounds: undefined
      };

      const snapshot = createTouchEditSnapshot(el, 1000, 1000, iosMapping);
      expect(snapshot.is_modified).toBe(false);

      const committed = applyTouchEditDraftToElement(el, snapshot);
      expect(committed.touch_bounds_source).toBe("platform_reference");
    });

    it("restores copied provenance on Cancel", () => {
      const el: DesignElement = {
        element_id: "el-1",
        source: "manual",
        element_type: "button",
        normalized_bounds: { x: 0.1, y: 0.1, width: 0.1, height: 0.1 },
        image_pixel_bounds: { x: 100, y: 100, width: 100, height: 100 },
        calibration_mode: "full_screen",
        created_at: new Date().toISOString(),
        interaction_type: "tap",
        touch_bounds: { x: 0.08, y: 0.08, width: 0.14, height: 0.14 },
        touch_bounds_source: "copied_from_element",
        copied_from_element_id: "el-source",
        copied_from_element_label: "Origin Button"
      };

      const snapshot = createTouchEditSnapshot(el, 1000, 1000, iosMapping);
      snapshot.draft_touch_bounds = { x: 0.05, y: 0.05, width: 0.2, height: 0.2 };
      snapshot.is_modified = true;

      const reverted = revertTouchEditDraft(el, snapshot);
      expect(reverted.touch_bounds).toEqual({ x: 0.08, y: 0.08, width: 0.14, height: 0.14 });
      expect(reverted.touch_bounds_source).toBe("copied_from_element");
      expect(reverted.copied_from_element_id).toBe("el-source");
      expect(reverted.copied_from_element_label).toBe("Origin Button");
    });
  });

  describe("deriveTouchReviewStatus - No Unverified Spacing Heuristics", () => {
    it("returns not_applicable for non-interactive elements", () => {
      const el: DesignElement = {
        element_id: "txt-1",
        source: "manual",
        element_type: "text",
        normalized_bounds: { x: 0, y: 0, width: 0.1, height: 0.1 },
        image_pixel_bounds: { x: 0, y: 0, width: 100, height: 100 },
        calibration_mode: "full_screen",
        created_at: new Date().toISOString(),
        interaction_type: "none"
      };

      const review = deriveTouchReviewStatus(el, null, "ios");
      expect(review.status).toBe("not_applicable");
    });

    it("returns needs_info if touch bounds not defined", () => {
      const el: DesignElement = {
        element_id: "btn-1",
        source: "manual",
        element_type: "button",
        normalized_bounds: { x: 0, y: 0, width: 0.1, height: 0.1 },
        image_pixel_bounds: { x: 0, y: 0, width: 100, height: 100 },
        calibration_mode: "full_screen",
        created_at: new Date().toISOString(),
        interaction_type: "tap"
      };

      const review = deriveTouchReviewStatus(el, null, "ios");
      expect(review.status).toBe("needs_info");
    });

    it("does not flag attention purely for small spacing when no overlap or rule violation exists", () => {
      const el: DesignElement = {
        element_id: "btn-1",
        source: "manual",
        element_type: "button",
        normalized_bounds: { x: 0, y: 0, width: 0.1, height: 0.1 },
        image_pixel_bounds: { x: 0, y: 0, width: 100, height: 100 },
        calibration_mode: "full_screen",
        created_at: new Date().toISOString(),
        interaction_type: "tap",
        touch_bounds: { x: 0, y: 0, width: 0.1, height: 0.1 },
        target_size_evaluation: {
          status: "meets_default",
          measured_width: 44,
          measured_height: 44,
          unit: "pt",
          summary_text: "满足 44pt",
          detail_text: "",
          reference: "Apple HIG"
        }
      };

      const smallSpacingNearest = {
        nearest_element_id: "btn-2",
        nearest_element_label: "Button 2",
        distance_px: 6,
        distance_logical: 2,
        logical_unit: "pt",
        overlap: {
          is_overlapping: false,
          overlap_width: 0,
          overlap_height: 0,
          overlap_area: 0
        }
      };

      const iosMapping: LogicalUnitMapping = {
        platform: "ios",
        unit: "pt",
        image_reference_width: 1000,
        logical_reference_width: 500,
        scale_x: 0.5,
        scale_y: 0.5,
        quality: "user_specified"
      };

      const review = deriveTouchReviewStatus(el, smallSpacingNearest, "ios", iosMapping);
      expect(review.status).toBe("meets");
      expect(review.reasons.some(r => r.includes("无重叠"))).toBe(true);
      expect(review.reasons.some(r => r.includes("最近触控间距：2 pt"))).toBe(true);
    });

    it("returns attention when overlap occurs", () => {
      const el: DesignElement = {
        element_id: "btn-1",
        source: "manual",
        element_type: "button",
        normalized_bounds: { x: 0, y: 0, width: 0.1, height: 0.1 },
        image_pixel_bounds: { x: 0, y: 0, width: 100, height: 100 },
        calibration_mode: "full_screen",
        created_at: new Date().toISOString(),
        interaction_type: "tap",
        touch_bounds: { x: 0, y: 0, width: 0.1, height: 0.1 }
      };

      const overlapNearest = {
        nearest_element_id: "btn-2",
        nearest_element_label: "Button 2",
        distance_px: 0,
        overlap: {
          is_overlapping: true,
          overlap_width: 20,
          overlap_height: 20,
          overlap_area: 400
        }
      };

      const review = deriveTouchReviewStatus(el, overlapNearest, "ios");
      expect(review.status).toBe("attention");
      expect(review.reasons.some(r => r.includes("重叠"))).toBe(true);
    });
  });

  describe("Edge-Touch and Corner-Touch Semantics", () => {
    it("treats touching at vertical edge as distance = 0, is_overlapping = false", () => {
      const rectA = { x: 0, y: 0, width: 100, height: 100 };
      const rectB = { x: 100, y: 20, width: 80, height: 60 }; // Shared edge at x = 100, y-overlap 20..80 -> midY = 50

      const res = calculateRectangleSpacing(rectA, rectB);
      expect(res.dx).toBe(0);
      expect(res.dy).toBe(0);
      expect(res.distance).toBe(0);
      expect(res.is_overlapping).toBe(false);
      expect(res.closest_point_a).toEqual({ x: 100, y: 50 });
      expect(res.closest_point_b).toEqual({ x: 100, y: 50 });

      const overlap = calculateRectangleOverlap(rectA, rectB);
      expect(overlap.is_overlapping).toBe(false);
      expect(overlap.overlap_area).toBe(0);
    });

    it("treats touching at horizontal edge as distance = 0, is_overlapping = false", () => {
      const rectA = { x: 0, y: 0, width: 100, height: 100 };
      const rectB = { x: 20, y: 100, width: 60, height: 80 }; // Shared edge at y = 100, x-overlap 20..80 -> midX = 50

      const res = calculateRectangleSpacing(rectA, rectB);
      expect(res.dx).toBe(0);
      expect(res.dy).toBe(0);
      expect(res.distance).toBe(0);
      expect(res.is_overlapping).toBe(false);
      expect(res.closest_point_a).toEqual({ x: 50, y: 100 });
      expect(res.closest_point_b).toEqual({ x: 50, y: 100 });

      const overlap = calculateRectangleOverlap(rectA, rectB);
      expect(overlap.is_overlapping).toBe(false);
    });

    it("treats touching at corner vertex as distance = 0, is_overlapping = false", () => {
      const rectA = { x: 0, y: 0, width: 100, height: 100 };
      const rectB = { x: 100, y: 100, width: 100, height: 100 }; // Shared corner at (100, 100)

      const res = calculateRectangleSpacing(rectA, rectB);
      expect(res.dx).toBe(0);
      expect(res.dy).toBe(0);
      expect(res.distance).toBe(0);
      expect(res.is_overlapping).toBe(false);
      expect(res.closest_point_a).toEqual({ x: 100, y: 100 });
      expect(res.closest_point_b).toEqual({ x: 100, y: 100 });

      const overlap = calculateRectangleOverlap(rectA, rectB);
      expect(overlap.is_overlapping).toBe(false);
    });

    it("requires strictly positive 2D intersection for is_overlapping = true", () => {
      const rectA = { x: 0, y: 0, width: 100, height: 100 };
      const rectB = { x: 99, y: 99, width: 100, height: 100 }; // 1x1 intersection

      const res = calculateRectangleSpacing(rectA, rectB);
      expect(res.is_overlapping).toBe(true);
      expect(res.distance).toBe(0);

      const overlap = calculateRectangleOverlap(rectA, rectB);
      expect(overlap.is_overlapping).toBe(true);
      expect(overlap.overlap_width).toBe(1);
      expect(overlap.overlap_height).toBe(1);
      expect(overlap.overlap_area).toBe(1);
    });
  });

  describe("Logical Spacing Calculation with Anisotropic Scaling (scale_x != scale_y)", () => {
    const nonUniformMapping: LogicalUnitMapping = {
      platform: "web",
      unit: "css_px",
      image_reference_width: 1000,
      logical_reference_width: 500, // scale_x = 0.5
      image_reference_height: 800,
      logical_reference_height: 200, // scale_y = 0.25
      scale_x: 0.5,
      scale_y: 0.25,
      quality: "user_specified"
    };

    const targetEl: DesignElement = {
      element_id: "target",
      source: "manual",
      element_type: "button",
      label: "Target",
      normalized_bounds: { x: 0.1, y: 0.125, width: 0.1, height: 0.125 }, // (100, 100, 100, 100) on 1000x800
      image_pixel_bounds: { x: 100, y: 100, width: 100, height: 100 },
      calibration_mode: "full_screen",
      created_at: new Date().toISOString(),
      interaction_type: "tap",
      touch_bounds: { x: 0.1, y: 0.125, width: 0.1, height: 0.125 }
    };

    it("correctly computes pure horizontal logical distance: dx_px * scale_x", () => {
      const neighborEl: DesignElement = {
        element_id: "neighbor-h",
        source: "manual",
        element_type: "button",
        label: "Neighbor H",
        normalized_bounds: { x: 0.3, y: 0.125, width: 0.1, height: 0.125 }, // (300, 100, 100, 100)
        image_pixel_bounds: { x: 300, y: 100, width: 100, height: 100 },
        calibration_mode: "full_screen",
        created_at: new Date().toISOString(),
        interaction_type: "tap",
        touch_bounds: { x: 0.3, y: 0.125, width: 0.1, height: 0.125 } // dx = 100 px, dy = 0
      };

      const res = calculateNearestTouchTarget(targetEl, [targetEl, neighborEl], 1000, 800, nonUniformMapping);
      expect(res).not.toBeNull();
      expect(res?.distance_px).toBe(100);
      expect(res?.distance_logical).toBe(50); // 100 * 0.5
    });

    it("correctly computes pure vertical logical distance: dy_px * scale_y", () => {
      const neighborEl: DesignElement = {
        element_id: "neighbor-v",
        source: "manual",
        element_type: "button",
        label: "Neighbor V",
        normalized_bounds: { x: 0.1, y: 0.375, width: 0.1, height: 0.125 }, // (100, 300, 100, 100)
        image_pixel_bounds: { x: 100, y: 300, width: 100, height: 100 },
        calibration_mode: "full_screen",
        created_at: new Date().toISOString(),
        interaction_type: "tap",
        touch_bounds: { x: 0.1, y: 0.375, width: 0.1, height: 0.125 } // dx = 0, dy = 100 px
      };

      const res = calculateNearestTouchTarget(targetEl, [targetEl, neighborEl], 1000, 800, nonUniformMapping);
      expect(res).not.toBeNull();
      expect(res?.distance_px).toBe(100);
      expect(res?.distance_logical).toBe(25); // 100 * 0.25
    });

    it("correctly computes diagonal logical distance: sqrt((dx*sx)^2 + (dy*sy)^2)", () => {
      const neighborEl: DesignElement = {
        element_id: "neighbor-d",
        source: "manual",
        element_type: "button",
        label: "Neighbor D",
        normalized_bounds: { x: 0.23, y: 0.3, width: 0.1, height: 0.125 }, // (230, 240, 100, 100)
        image_pixel_bounds: { x: 230, y: 240, width: 100, height: 100 },
        calibration_mode: "full_screen",
        created_at: new Date().toISOString(),
        interaction_type: "tap",
        touch_bounds: { x: 0.23, y: 0.3, width: 0.1, height: 0.125 } // dx = 30 px, dy = 40 px
      };

      const res = calculateNearestTouchTarget(targetEl, [targetEl, neighborEl], 1000, 800, nonUniformMapping);
      expect(res).not.toBeNull();
      expect(res?.distance_px).toBe(50); // hypot(30, 40)
      // logical dx = 30 * 0.5 = 15, logical dy = 40 * 0.25 = 10
      // logical distance = hypot(15, 10) = sqrt(225 + 100) = sqrt(325) = 18.0277...
      expect(res?.distance_logical).toBe(18);
    });
  });

  describe("WCAG SC 2.5.8 Logical CSS Coordinate Space Evaluation", () => {
    const webMapping: LogicalUnitMapping = {
      platform: "web",
      unit: "css_px",
      image_reference_width: 1000,
      logical_reference_width: 500, // scale_x = 0.5 -> 1 px = 0.5 CSS px (2 px = 1 CSS px)
      image_reference_height: 1000,
      logical_reference_height: 500, // scale_y = 0.5
      scale_x: 0.5,
      scale_y: 0.5,
      quality: "user_specified"
    };

    it("evaluates size condition met when >= 24x24 CSS px", () => {
      const el: DesignElement = {
        element_id: "web-btn-large",
        source: "manual",
        element_type: "button",
        label: "Large Button",
        normalized_bounds: { x: 0.1, y: 0.1, width: 0.06, height: 0.06 },
        image_pixel_bounds: { x: 100, y: 100, width: 60, height: 60 }, // 30x30 CSS px
        calibration_mode: "full_screen",
        created_at: new Date().toISOString(),
        interaction_type: "tap",
        touch_bounds: { x: 0.1, y: 0.1, width: 0.06, height: 0.06 }
      };

      const res = evaluateWcagTargetSpacingCondition(el, [el], 1000, 1000, webMapping);
      expect(res.status).toBe("size_condition_met");
    });

    it("detects spacing circle conflict when undersized target is within 24 CSS px center-circle of neighbor", () => {
      // Target: 20x20 px -> 10x10 CSS px, center at (105, 105) px -> (52.5, 52.5) CSS px. Circle radius = 12 CSS px.
      const target: DesignElement = {
        element_id: "web-btn-small",
        source: "manual",
        element_type: "button",
        label: "Small Button",
        normalized_bounds: { x: 0.1, y: 0.1, width: 0.02, height: 0.02 },
        image_pixel_bounds: { x: 100, y: 100, width: 20, height: 20 },
        calibration_mode: "full_screen",
        created_at: new Date().toISOString(),
        interaction_type: "tap",
        touch_bounds: { x: 0.1, y: 0.1, width: 0.02, height: 0.02 }
      };

      // Neighbor: at x = 124 px (gap = 4 px = 2 CSS px). Center at (134, 105) px -> (67, 52.5) CSS px.
      // Distance between centers in CSS px = 67 - 52.5 = 14.5 CSS px < 24 CSS px (12 + 12 = 24).
      const neighbor: DesignElement = {
        element_id: "neighbor",
        source: "manual",
        element_type: "button",
        label: "Neighbor",
        normalized_bounds: { x: 0.124, y: 0.1, width: 0.02, height: 0.02 },
        image_pixel_bounds: { x: 124, y: 100, width: 20, height: 20 },
        calibration_mode: "full_screen",
        created_at: new Date().toISOString(),
        interaction_type: "tap",
        touch_bounds: { x: 0.124, y: 0.1, width: 0.02, height: 0.02 }
      };

      const res = evaluateWcagTargetSpacingCondition(target, [target, neighbor], 1000, 1000, webMapping);
      expect(res.status).toBe("spacing_circle_conflict");
      expect(res.conflicting_element_ids).toContain("neighbor");
    });

    it("clears spacing circle when neighbors are outside 24 CSS px circle", () => {
      const target: DesignElement = {
        element_id: "web-btn-small",
        source: "manual",
        element_type: "button",
        label: "Small Button",
        normalized_bounds: { x: 0.1, y: 0.1, width: 0.02, height: 0.02 },
        image_pixel_bounds: { x: 100, y: 100, width: 20, height: 20 }, // 10x10 CSS px, center = (52.5, 52.5)
        calibration_mode: "full_screen",
        created_at: new Date().toISOString(),
        interaction_type: "tap",
        touch_bounds: { x: 0.1, y: 0.1, width: 0.02, height: 0.02 }
      };

      // Neighbor: at x = 200 px -> (100 CSS px). Center at 105 CSS px. Distance = 52.5 CSS px > 24 CSS px.
      const neighborFar: DesignElement = {
        element_id: "neighbor-far",
        source: "manual",
        element_type: "button",
        label: "Far Neighbor",
        normalized_bounds: { x: 0.2, y: 0.1, width: 0.02, height: 0.02 },
        image_pixel_bounds: { x: 200, y: 100, width: 20, height: 20 },
        calibration_mode: "full_screen",
        created_at: new Date().toISOString(),
        interaction_type: "tap",
        touch_bounds: { x: 0.2, y: 0.1, width: 0.02, height: 0.02 }
      };

      const res = evaluateWcagTargetSpacingCondition(target, [target, neighborFar], 1000, 1000, webMapping);
      expect(res.status).toBe("spacing_circle_clear");
    });
  });

  describe("Custom Platform Reference Integrity", () => {
    const customMapping: LogicalUnitMapping = {
      platform: "custom",
      unit: "custom",
      image_reference_width: 1000,
      logical_reference_width: 500,
      scale_x: 0.5,
      scale_y: 0.5,
      quality: "user_specified"
    };

    it("returns null for generateCenteredReferenceTouchBounds under custom platform", () => {
      const visualBounds = { x: 100, y: 100, width: 50, height: 50 };
      const ref = generateCenteredReferenceTouchBounds(visualBounds, 1000, 1000, "custom", customMapping);
      expect(ref).toBeNull();
    });

    it("does not evaluate platform preset target size rules under custom platform", () => {
      const el: DesignElement = {
        element_id: "custom-el",
        source: "manual",
        element_type: "button",
        label: "Custom Button",
        normalized_bounds: { x: 0.1, y: 0.1, width: 0.05, height: 0.05 },
        image_pixel_bounds: { x: 100, y: 100, width: 50, height: 50 },
        calibration_mode: "full_screen",
        created_at: new Date().toISOString(),
        interaction_type: "tap",
        touch_bounds: { x: 0.1, y: 0.1, width: 0.05, height: 0.05 }
      };

      const review = deriveTouchReviewStatus(el, null, "custom", customMapping);
      expect(review.status).toBe("measurement_only");
      expect(review.reasons.some(r => r.includes("自定义单位模式"))).toBe(true);
    });
  });

  describe("Clipping Lifecycle & Review Status", () => {
    const iosMapping: LogicalUnitMapping = {
      platform: "ios",
      unit: "pt",
      image_reference_width: 1000,
      logical_reference_width: 500, // scale_x = 0.5 -> 44pt = 88px
      scale_x: 0.5,
      scale_y: 0.5,
      quality: "user_specified"
    };

    it("sets touch_bounds_reference_clipped and triggers attention in review", () => {
      // Near top-left edge: visual at (10, 10, 20, 20), center at (20, 20). 88x88 px box goes from -24 to 64 -> clipped
      const ref = generateCenteredReferenceTouchBounds({ x: 10, y: 10, width: 20, height: 20 }, 1000, 1000, "ios", iosMapping);
      expect(ref).not.toBeNull();
      expect(ref?.is_clipped).toBe(true);
      expect(ref?.clip_warning).toBe("建议触控区域超出当前局部截图范围，当前只能确认可见部分。");

      const el: DesignElement = {
        element_id: "clipped-el",
        source: "manual",
        element_type: "button",
        label: "Clipped Button",
        normalized_bounds: { x: 0.01, y: 0.01, width: 0.02, height: 0.02 },
        image_pixel_bounds: { x: 10, y: 10, width: 20, height: 20 },
        calibration_mode: "full_screen",
        created_at: new Date().toISOString(),
        interaction_type: "tap",
        touch_bounds: ref!.normalized_bounds,
        touch_bounds_pixel: ref!.pixel_bounds,
        touch_bounds_source: "platform_reference",
        touch_bounds_reference_clipped: true,
        touch_bounds_reference_warning: ref!.clip_warning
      };

      const review = deriveTouchReviewStatus(el, null, "ios", iosMapping);
      expect(review.status).toBe("attention");
      expect(review.reasons.some(r => r.includes("建议触控区域超出当前截图范围"))).toBe(true);
    });

    it("clears clipping metadata when user manually modifies touch bounds", () => {
      const el: DesignElement = {
        element_id: "clipped-el",
        source: "manual",
        element_type: "button",
        label: "Clipped Button",
        normalized_bounds: { x: 0.01, y: 0.01, width: 0.02, height: 0.02 },
        image_pixel_bounds: { x: 10, y: 10, width: 20, height: 20 },
        calibration_mode: "full_screen",
        created_at: new Date().toISOString(),
        interaction_type: "tap",
        touch_bounds: { x: 0, y: 0, width: 0.064, height: 0.064 },
        touch_bounds_source: "platform_reference",
        touch_bounds_reference_clipped: true,
        touch_bounds_reference_warning: "建议触控区域超出当前局部截图范围，当前只能确认可见部分。"
      };

      const snapshot = createTouchEditSnapshot(el, 1000, 1000, iosMapping);
      expect(snapshot.draft_touch_bounds_reference_clipped).toBe(true);

      // User manually modifies bounds
      snapshot.draft_touch_bounds = { x: 0, y: 0, width: 0.05, height: 0.05 };
      snapshot.is_modified = true;

      const committed = applyTouchEditDraftToElement(el, snapshot);
      expect(committed.touch_bounds_source).toBe("user_defined");
      expect(committed.touch_bounds_reference_clipped).toBeUndefined();
      expect(committed.touch_bounds_reference_warning).toBeUndefined();
    });

    it("restores clipping metadata on Cancel", () => {
      const el: DesignElement = {
        element_id: "clipped-el",
        source: "manual",
        element_type: "button",
        label: "Clipped Button",
        normalized_bounds: { x: 0.01, y: 0.01, width: 0.02, height: 0.02 },
        image_pixel_bounds: { x: 10, y: 10, width: 20, height: 20 },
        calibration_mode: "full_screen",
        created_at: new Date().toISOString(),
        interaction_type: "tap",
        touch_bounds: { x: 0, y: 0, width: 0.064, height: 0.064 },
        touch_bounds_source: "platform_reference",
        touch_bounds_reference_clipped: true,
        touch_bounds_reference_warning: "建议触控区域超出当前局部截图范围，当前只能确认可见部分。"
      };

      const snapshot = createTouchEditSnapshot(el, 1000, 1000, iosMapping);
      snapshot.draft_touch_bounds = { x: 0, y: 0, width: 0.08, height: 0.08 };
      snapshot.is_modified = true;

      const reverted = revertTouchEditDraft(el, snapshot);
      expect(reverted.touch_bounds_reference_clipped).toBe(true);
      expect(reverted.touch_bounds_reference_warning).toBe("建议触控区域超出当前局部截图范围，当前只能确认可见部分。");
    });
  });

  describe("Multi-tier Touch Source Provenance & Truthful Review Status", () => {
    it("resolves confirmed_touch_bounds when user_defined or platform_reference exists", () => {
      const elConfirmed: DesignElement = {
        element_id: "el-c",
        source: "manual",
        element_type: "button",
        normalized_bounds: { x: 0, y: 0, width: 0.1, height: 0.1 },
        image_pixel_bounds: { x: 0, y: 0, width: 100, height: 100 },
        calibration_mode: "full_screen",
        interaction_type: "tap",
        touch_bounds: { x: 0, y: 0, width: 0.1, height: 0.1 },
        touch_bounds_source: "user_defined"
      };

      expect(resolveTouchSourceProvenance(elConfirmed)).toBe("confirmed_touch_bounds");
    });

    it("resolves visual_bounds_proxy when visual_copy is used or touch_bounds missing", () => {
      const elProxy: DesignElement = {
        element_id: "el-p",
        source: "manual",
        element_type: "button",
        normalized_bounds: { x: 0, y: 0, width: 0.1, height: 0.1 },
        image_pixel_bounds: { x: 0, y: 0, width: 100, height: 100 },
        calibration_mode: "full_screen",
        interaction_type: "tap",
        touch_bounds: { x: 0, y: 0, width: 0.1, height: 0.1 },
        touch_bounds_source: "visual_copy"
      };

      expect(resolveTouchSourceProvenance(elProxy)).toBe("visual_bounds_proxy");

      const elMissingTouchBounds: DesignElement = {
        ...elProxy,
        touch_bounds: undefined,
        touch_bounds_source: undefined
      };
      expect(resolveTouchSourceProvenance(elMissingTouchBounds)).toBe("visual_bounds_proxy");
    });

    it("evaluates visual proxy with undersized target to estimated_attention with explicit caveat", () => {
      const elSmallProxy: DesignElement = {
        element_id: "el-sp",
        source: "manual",
        element_type: "icon",
        normalized_bounds: { x: 0, y: 0, width: 0.02, height: 0.02 },
        image_pixel_bounds: { x: 0, y: 0, width: 20, height: 20 },
        calibration_mode: "full_screen",
        interaction_type: "tap",
        touch_bounds: { x: 0, y: 0, width: 0.02, height: 0.02 },
        touch_bounds_source: "visual_copy",
        target_size_evaluation: {
          unit: "pt",
          measured_width: 20,
          measured_height: 20,
          min_side: 20,
          threshold_width: 44,
          threshold_height: 44,
          status: "below_minimum",
          summary_text: "低于 44pt",
          detail_text: "",
          rule_id: "apple_hig_target_size",
          rule_layer: "L2_PLATFORM_GUIDANCE",
          reasoning_type: "platform_spec",
          reference: "Apple HIG",
          reference_status: "verified_reference",
          claim_strength: "formal_guidance"
        }
      };

      const review = deriveTouchReviewStatus(elSmallProxy, null, "ios", {
        platform: "ios",
        unit: "pt",
        image_reference_width: 1000,
        logical_reference_width: 1000,
        scale_x: 1,
        scale_y: 1,
        quality: "user_specified"
      });

      expect(review.status).toBe("estimated_attention");
      expect(review.reasons.some(r => r.includes("基于可视范围估算偏小"))).toBe(true);
    });
  });
});
