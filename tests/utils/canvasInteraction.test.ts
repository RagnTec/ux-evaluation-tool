import { describe, it, expect } from "vitest";
import {
  hasExceededDragThreshold,
  calculateMovedNormalizedBounds,
  calculateResizedNormalizedBounds,
  calculateCreatedNormalizedBounds,
  resolvePointerUpIntent
} from "../../src/utils/canvasInteraction";
import type { NormalizedBounds } from "../../src/types/annotation";

describe("Canvas Interaction Utilities (Phase 3I P0 Hotfix)", () => {
  describe("hasExceededDragThreshold", () => {
    it("returns false for 0px movement", () => {
      const p1 = { x: 100, y: 100 };
      const p2 = { x: 100, y: 100 };
      expect(hasExceededDragThreshold(p1, p2, 4)).toBe(false);
    });

    it("returns false for sub-threshold movements (< 4px)", () => {
      const p1 = { x: 100, y: 100 };
      // 2px horizontal
      expect(hasExceededDragThreshold(p1, { x: 102, y: 100 }, 4)).toBe(false);
      // 3px vertical
      expect(hasExceededDragThreshold(p1, { x: 100, y: 103 }, 4)).toBe(false);
      // (2, 2) diagonal: sqrt(4 + 4) = 2.828px < 4px
      expect(hasExceededDragThreshold(p1, { x: 102, y: 102 }, 4)).toBe(false);
    });

    it("returns true exactly at or beyond threshold (>= 4px)", () => {
      const p1 = { x: 100, y: 100 };
      // Exactly 4px horizontal
      expect(hasExceededDragThreshold(p1, { x: 104, y: 100 }, 4)).toBe(true);
      // Exactly 4px vertical
      expect(hasExceededDragThreshold(p1, { x: 100, y: 104 }, 4)).toBe(true);
      // (3, 3) diagonal: sqrt(9 + 9) = 4.24px >= 4px
      expect(hasExceededDragThreshold(p1, { x: 103, y: 103 }, 4)).toBe(true);
      // Large movement
      expect(hasExceededDragThreshold(p1, { x: 150, y: 200 }, 4)).toBe(true);
    });

    it("supports custom threshold distance", () => {
      const p1 = { x: 50, y: 50 };
      expect(hasExceededDragThreshold(p1, { x: 55, y: 50 }, 10)).toBe(false);
      expect(hasExceededDragThreshold(p1, { x: 61, y: 50 }, 10)).toBe(true);
    });
  });

  describe("calculateMovedNormalizedBounds", () => {
    const initialBounds: NormalizedBounds = {
      x: 0.2,
      y: 0.3,
      width: 0.2,
      height: 0.15
    };

    it("applies normal delta within canvas bounds", () => {
      const moved = calculateMovedNormalizedBounds(initialBounds, 0.1, 0.05);
      expect(moved.x).toBeCloseTo(0.3);
      expect(moved.y).toBeCloseTo(0.35);
      expect(moved.width).toBeCloseTo(0.2);
      expect(moved.height).toBeCloseTo(0.15);
    });

    it("clamps to left and top edges without changing width or height", () => {
      const moved = calculateMovedNormalizedBounds(initialBounds, -0.5, -0.5);
      expect(moved.x).toBe(0);
      expect(moved.y).toBe(0);
      expect(moved.width).toBe(initialBounds.width);
      expect(moved.height).toBe(initialBounds.height);
    });

    it("clamps to right and bottom edges without changing width or height", () => {
      const moved = calculateMovedNormalizedBounds(initialBounds, 0.9, 0.9);
      expect(moved.x).toBeCloseTo(0.8); // 1 - 0.2 = 0.8
      expect(moved.y).toBeCloseTo(0.85); // 1 - 0.15 = 0.85
      expect(moved.width).toBe(initialBounds.width);
      expect(moved.height).toBe(initialBounds.height);
    });
  });

  describe("calculateResizedNormalizedBounds", () => {
    const initialBounds: NormalizedBounds = {
      x: 0.2,
      y: 0.2,
      width: 0.4,
      height: 0.4
    };

    it("resizes with southeast (se) handle", () => {
      const resized = calculateResizedNormalizedBounds(initialBounds, "se", 0.1, 0.1, 0.01);
      expect(resized.x).toBe(0.2);
      expect(resized.y).toBe(0.2);
      expect(resized.width).toBeCloseTo(0.5);
      expect(resized.height).toBeCloseTo(0.5);
    });

    it("resizes with northwest (nw) handle", () => {
      const resized = calculateResizedNormalizedBounds(initialBounds, "nw", 0.1, 0.1, 0.01);
      expect(resized.x).toBeCloseTo(0.3);
      expect(resized.y).toBeCloseTo(0.3);
      expect(resized.width).toBeCloseTo(0.3);
      expect(resized.height).toBeCloseTo(0.3);
    });

    it("resizes with northeast (ne) handle", () => {
      const resized = calculateResizedNormalizedBounds(initialBounds, "ne", 0.1, -0.05, 0.01);
      expect(resized.x).toBe(0.2);
      expect(resized.y).toBeCloseTo(0.15);
      expect(resized.width).toBeCloseTo(0.5);
      expect(resized.height).toBeCloseTo(0.45);
    });

    it("resizes with southwest (sw) handle", () => {
      const resized = calculateResizedNormalizedBounds(initialBounds, "sw", -0.05, 0.1, 0.01);
      expect(resized.x).toBeCloseTo(0.15);
      expect(resized.y).toBe(0.2);
      expect(resized.width).toBeCloseTo(0.45);
      expect(resized.height).toBeCloseTo(0.5);
    });

    it("enforces minSize limit when shrinking handles beyond threshold", () => {
      const smallBounds: NormalizedBounds = { x: 0.2, y: 0.2, width: 0.05, height: 0.05 };
      const shrunk = calculateResizedNormalizedBounds(smallBounds, "se", -0.1, -0.1, 0.02);
      expect(shrunk.width).toBe(0.02);
      expect(shrunk.height).toBe(0.02);
    });
  });

  describe("calculateCreatedNormalizedBounds", () => {
    it("creates normalized bounds from top-left to bottom-right drag", () => {
      const start = { x: 100, y: 200 };
      const current = { x: 300, y: 500 };
      const bounds = calculateCreatedNormalizedBounds(start, current, 1000, 1000, 0.01);
      expect(bounds).not.toBeNull();
      expect(bounds?.x).toBeCloseTo(0.1);
      expect(bounds?.y).toBeCloseTo(0.2);
      expect(bounds?.width).toBeCloseTo(0.2);
      expect(bounds?.height).toBeCloseTo(0.3);
    });

    it("creates normalized bounds from bottom-right to top-left drag", () => {
      const start = { x: 300, y: 500 };
      const current = { x: 100, y: 200 };
      const bounds = calculateCreatedNormalizedBounds(start, current, 1000, 1000, 0.01);
      expect(bounds).not.toBeNull();
      expect(bounds?.x).toBeCloseTo(0.1);
      expect(bounds?.y).toBeCloseTo(0.2);
      expect(bounds?.width).toBeCloseTo(0.2);
      expect(bounds?.height).toBeCloseTo(0.3);
    });

    it("rejects creations smaller than minSize", () => {
      const start = { x: 100, y: 100 };
      // 5px drag on 1000px container = 0.005 < 0.01 minSize
      const current = { x: 105, y: 105 };
      const bounds = calculateCreatedNormalizedBounds(start, current, 1000, 1000, 0.01);
      expect(bounds).toBeNull();
    });

    it("clamps drag beyond container boundaries to [0, 1]", () => {
      const start = { x: 500, y: 500 };
      const current = { x: 1500, y: 1200 };
      const bounds = calculateCreatedNormalizedBounds(start, current, 1000, 1000, 0.01);
      expect(bounds).not.toBeNull();
      expect(bounds?.x).toBeCloseTo(0.5);
      expect(bounds?.y).toBeCloseTo(0.5);
      expect(bounds?.width).toBeCloseTo(0.5);
      expect(bounds?.height).toBeCloseTo(0.5);
    });

    it("safely handles 0 width or height containers", () => {
      const start = { x: 10, y: 10 };
      const current = { x: 50, y: 50 };
      expect(calculateCreatedNormalizedBounds(start, current, 0, 1000, 0.01)).toBeNull();
      expect(calculateCreatedNormalizedBounds(start, current, 1000, 0, 0.01)).toBeNull();
    });
  });

  describe("resolvePointerUpIntent (Phase 3I P0 Hotfix 2)", () => {
    it("interprets pending_move as Click -> opens Inspector", () => {
      const interaction = {
        type: "pending_move" as const,
        elementId: "elem-123",
        pointerId: 1,
        startPointer: { x: 100, y: 100 },
        originalBounds: { x: 0.1, y: 0.1, width: 0.2, height: 0.2 }
      };
      const intent = resolvePointerUpIntent(interaction);
      expect(intent.action).toBe("select_and_open_inspector");
      if (intent.action === "select_and_open_inspector") {
        expect(intent.elementId).toBe("elem-123");
      }
    });

    it("interprets sub-threshold jitter as Click", () => {
      const start = { x: 100, y: 100 };
      const current = { x: 102, y: 101 }; // dx=2, dy=1 -> hypot=2.23px < 4px
      const exceeded = hasExceededDragThreshold(start, current, 4);
      expect(exceeded).toBe(false);

      // State remains pending_move
      const interaction = {
        type: "pending_move" as const,
        elementId: "elem-456",
        pointerId: 1,
        startPointer: start,
        originalBounds: { x: 0.1, y: 0.1, width: 0.2, height: 0.2 }
      };
      const intent = resolvePointerUpIntent(interaction);
      expect(intent.action).toBe("select_and_open_inspector");
    });

    it("interprets moving as Move -> commits move without opening Inspector", () => {
      const interaction = {
        type: "moving" as const,
        elementId: "elem-123",
        pointerId: 1,
        startPointer: { x: 100, y: 100 },
        originalBounds: { x: 0.1, y: 0.1, width: 0.2, height: 0.2 }
      };
      const intent = resolvePointerUpIntent(interaction);
      expect(intent.action).toBe("commit_move");
      if (intent.action === "commit_move") {
        expect(intent.shouldOpenInspector).toBe(false);
      }
    });

    it("interprets resizing as Resize -> commits resize without opening Inspector", () => {
      const interaction = {
        type: "resizing" as const,
        elementId: "elem-123",
        pointerId: 1,
        handle: "se" as const,
        startPointer: { x: 100, y: 100 },
        originalBounds: { x: 0.1, y: 0.1, width: 0.2, height: 0.2 }
      };
      const intent = resolvePointerUpIntent(interaction);
      expect(intent.action).toBe("commit_resize");
      if (intent.action === "commit_resize") {
        expect(intent.shouldOpenInspector).toBe(false);
      }
    });

    it("interprets creating as creation commit", () => {
      const interaction = {
        type: "creating" as const,
        pointerId: 1,
        startPoint: { x: 50, y: 50 },
        currentPoint: { x: 200, y: 200 }
      };
      const intent = resolvePointerUpIntent(interaction);
      expect(intent.action).toBe("commit_creation");
    });

    it("returns none for idle state", () => {
      const intent = resolvePointerUpIntent({ type: "idle" });
      expect(intent.action).toBe("none");
    });
  });

  describe("Terminology Audit Regression", () => {
    it("confirms user-facing definitionRegistry contains no generic 几何", async () => {
      const { definitionRegistry } = await import("../../src/content/definitionRegistry");
      Object.values(definitionRegistry).forEach((item) => {
        expect(item.label).not.toContain("几何");
        expect(item.plain_definition).not.toContain("几何");
        expect(item.why_it_matters).not.toContain("几何");
        if (item.caution) {
          expect(item.caution).not.toContain("几何");
        }
      });
    });

    it("confirms capability tier and check labels contain no generic 几何", async () => {
      const { EVALUATION_CHECK_LABELS, EVALUATION_TIER_LABELS } = await import(
        "../../src/types/capability"
      );
      Object.values(EVALUATION_CHECK_LABELS).forEach((label) => {
        expect(label).not.toContain("几何");
      });
      Object.values(EVALUATION_TIER_LABELS).forEach((label) => {
        expect(label).not.toContain("几何");
      });
    });
  });
});
