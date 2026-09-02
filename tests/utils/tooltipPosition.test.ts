import { describe, it, expect } from "vitest";
import { calculateTooltipPosition } from "../../src/utils/tooltipPosition";

describe("calculateTooltipPosition", () => {
  const defaultViewport = {
    innerWidth: 1024,
    innerHeight: 768,
    scrollX: 0,
    scrollY: 0
  };

  it("positions tooltip centered below anchor under standard conditions", () => {
    const anchorRect = {
      left: 500,
      right: 550,
      top: 200,
      bottom: 220,
      width: 50,
      height: 20
    };

    const pos = calculateTooltipPosition(anchorRect, 200, 100, defaultViewport, 12);
    expect(pos.placement).toBe("below");
    expect(pos.top).toBe(228); // bottom 220 + 8px gap
    expect(pos.left).toBe(425); // 500 + 25 - 100 = 425
  });

  it("flips tooltip above anchor when bottom space is insufficient", () => {
    const anchorRect = {
      left: 500,
      right: 550,
      top: 700,
      bottom: 720,
      width: 50,
      height: 20
    };

    // viewport height 768, bottom 720 + 100 + 12 = 832 > 768
    const pos = calculateTooltipPosition(anchorRect, 200, 100, defaultViewport, 12);
    expect(pos.placement).toBe("above");
    expect(pos.top).toBe(592); // top 700 - 100 - 8px gap = 592
  });

  it("clamps tooltip horizontally within viewport margins", () => {
    // Near left edge
    const anchorLeft = {
      left: 10,
      right: 40,
      top: 200,
      bottom: 220,
      width: 30,
      height: 20
    };
    const posLeft = calculateTooltipPosition(anchorLeft, 300, 100, defaultViewport, 12);
    expect(posLeft.left).toBe(12);

    // Near right edge
    const anchorRight = {
      left: 1000,
      right: 1020,
      top: 200,
      bottom: 220,
      width: 20,
      height: 20
    };
    const posRight = calculateTooltipPosition(anchorRight, 300, 100, defaultViewport, 12);
    expect(posRight.left).toBe(1024 - 12 - 300); // 712
  });

  it("adjusts maxWidth and maxHeight when viewport is narrow", () => {
    const smallViewport = {
      innerWidth: 320,
      innerHeight: 480,
      scrollX: 0,
      scrollY: 0
    };
    const anchor = {
      left: 50,
      right: 100,
      top: 100,
      bottom: 120,
      width: 50,
      height: 20
    };
    const pos = calculateTooltipPosition(anchor, 360, 200, smallViewport, 12);
    expect(pos.maxWidth).toBe(320 - 24); // 296
    expect(pos.left).toBe(12);
    expect(pos.maxHeight).toBeGreaterThanOrEqual(120);
  });

  it("ensures maxHeight never collapses to header-only even in restricted vertical spaces", () => {
    const tightViewport = {
      innerWidth: 800,
      innerHeight: 600
    };
    const anchorTight = {
      left: 200,
      right: 250,
      top: 550,
      bottom: 580,
      width: 50,
      height: 30
    };
    // Flipping above because space below is tight (20px) vs above (538px)
    const pos = calculateTooltipPosition(anchorTight, 300, 250, tightViewport, 12);
    expect(pos.placement).toBe("above");
    expect(pos.maxHeight).toBeGreaterThanOrEqual(120);
    expect(pos.maxHeight).toBeLessThanOrEqual(tightViewport.innerHeight * 0.6);
  });
});
