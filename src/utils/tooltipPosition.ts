export interface TooltipPositionResult {
  top: number;
  left: number;
  placement: "below" | "above";
  maxWidth: number;
  maxHeight: number;
}

export interface AnchorRect {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
  height: number;
}

export interface ViewportSize {
  width?: number;
  height?: number;
  innerWidth?: number;
  innerHeight?: number;
}

/**
 * Calculates deterministic fixed tooltip coordinates ensuring no overflow outside viewport bounds.
 */
export function calculateTooltipPosition(
  anchorRect: AnchorRect,
  tooltipWidth: number,
  tooltipHeight: number,
  viewport: ViewportSize,
  margin: number = 12
): TooltipPositionResult {
  const vWidth = viewport.innerWidth ?? viewport.width ?? 1024;
  const vHeight = viewport.innerHeight ?? viewport.height ?? 768;
  const safeMargin = Math.max(0, margin);
  const maxWidth = Math.min(360, Math.max(160, vWidth - safeMargin * 2));
  const effectiveTooltipWidth = Math.min(tooltipWidth > 0 ? tooltipWidth : maxWidth, maxWidth);

  // Available vertical spaces
  const spaceBelow = Math.max(0, vHeight - anchorRect.bottom - safeMargin);
  const spaceAbove = Math.max(0, anchorRect.top - safeMargin);

  let placement: "below" | "above" = "below";
  let top = anchorRect.bottom + 8;
  let maxHeight = Math.min(vHeight * 0.6, Math.max(120, spaceBelow - 8));

  // If bottom space is too small for tooltip and top has more room, flip above
  const neededHeight = tooltipHeight > 0 ? tooltipHeight + 8 : 140;
  if (spaceBelow < neededHeight && spaceAbove > spaceBelow) {
    placement = "above";
    top = Math.max(safeMargin, anchorRect.top - (tooltipHeight > 0 ? tooltipHeight : 140) - 8);
    maxHeight = Math.min(vHeight * 0.6, Math.max(120, spaceAbove - 8));
  }

  // Horizontal alignment: Center horizontally with anchor by default, clamp strictly to [margin, viewport.width - width - margin]
  const anchorCenterX = anchorRect.left + anchorRect.width / 2;
  let left = anchorCenterX - effectiveTooltipWidth / 2;
  const maxLeft = Math.max(safeMargin, vWidth - effectiveTooltipWidth - safeMargin);
  left = Math.max(safeMargin, Math.min(maxLeft, left));

  return {
    top: Math.round(top),
    left: Math.round(left),
    placement,
    maxWidth: Math.round(maxWidth),
    maxHeight: Math.round(maxHeight)
  };
}
