import type { NormalizedBounds } from "../types/designElement";
import type { CanvasPoint, ResizeHandle } from "../types/canvasInteraction";

/**
 * Checks if Euclidean distance between start pointer position and current pointer position
 * has reached or exceeded the drag threshold (default 4 CSS pixels).
 */
export function hasExceededDragThreshold(
  start: CanvasPoint,
  current: CanvasPoint,
  thresholdPx = 4
): boolean {
  const dx = current.x - start.x;
  const dy = current.y - start.y;
  return Math.hypot(dx, dy) >= thresholdPx;
}

/**
 * Calculates moved normalized bounds by adding delta (deltaNormX, deltaNormY) to originalBounds,
 * safely clamping to the [0.0, 1.0] viewport without resizing.
 */
export function calculateMovedNormalizedBounds(
  originalBounds: NormalizedBounds,
  deltaNormX: number,
  deltaNormY: number
): NormalizedBounds {
  const clampedWidth = Math.min(Math.max(originalBounds.width, 0.01), 1);
  const clampedHeight = Math.min(Math.max(originalBounds.height, 0.01), 1);

  const minX = 0;
  const maxX = Math.max(0, 1 - clampedWidth);
  const minY = 0;
  const maxY = Math.max(0, 1 - clampedHeight);

  const newX = Math.min(Math.max(originalBounds.x + deltaNormX, minX), maxX);
  const newY = Math.min(Math.max(originalBounds.y + deltaNormY, minY), maxY);

  return {
    x: Math.round(newX * 10000) / 10000,
    y: Math.round(newY * 10000) / 10000,
    width: Math.round(clampedWidth * 10000) / 10000,
    height: Math.round(clampedHeight * 10000) / 10000
  };
}

/**
 * Calculates resized normalized bounds from originalBounds when dragging a corner handle (nw, ne, sw, se).
 * Safely enforces minSize (default 0.01) and viewport boundaries [0.0, 1.0].
 */
export function calculateResizedNormalizedBounds(
  originalBounds: NormalizedBounds,
  handle: ResizeHandle,
  deltaNormX: number,
  deltaNormY: number,
  minSize = 0.01
): NormalizedBounds {
  let left = originalBounds.x;
  let top = originalBounds.y;
  let right = originalBounds.x + originalBounds.width;
  let bottom = originalBounds.y + originalBounds.height;

  switch (handle) {
    case "nw": {
      left = Math.max(0, Math.min(right - minSize, left + deltaNormX));
      top = Math.max(0, Math.min(bottom - minSize, top + deltaNormY));
      break;
    }
    case "ne": {
      right = Math.min(1, Math.max(left + minSize, right + deltaNormX));
      top = Math.max(0, Math.min(bottom - minSize, top + deltaNormY));
      break;
    }
    case "sw": {
      left = Math.max(0, Math.min(right - minSize, left + deltaNormX));
      bottom = Math.min(1, Math.max(top + minSize, bottom + deltaNormY));
      break;
    }
    case "se": {
      right = Math.min(1, Math.max(left + minSize, right + deltaNormX));
      bottom = Math.min(1, Math.max(top + minSize, bottom + deltaNormY));
      break;
    }
  }

  const width = Math.max(minSize, right - left);
  const height = Math.max(minSize, bottom - top);

  return {
    x: Math.round(left * 10000) / 10000,
    y: Math.round(top * 10000) / 10000,
    width: Math.round(width * 10000) / 10000,
    height: Math.round(height * 10000) / 10000
  };
}

/**
 * Calculates created normalized bounds from two container-relative pixel points.
 * Returns null if either width or height is below minSize (0.01).
 */
export function calculateCreatedNormalizedBounds(
  startPoint: CanvasPoint,
  currentPoint: CanvasPoint,
  containerWidth: number,
  containerHeight: number,
  minSize = 0.01
): NormalizedBounds | null {
  if (containerWidth <= 0 || containerHeight <= 0) {
    return null;
  }

  const left = Math.max(0, Math.min(startPoint.x, currentPoint.x));
  const top = Math.max(0, Math.min(startPoint.y, currentPoint.y));
  const right = Math.min(containerWidth, Math.max(startPoint.x, currentPoint.x));
  const bottom = Math.min(containerHeight, Math.max(startPoint.y, currentPoint.y));

  const x = Math.max(0, Math.min(1, left / containerWidth));
  const y = Math.max(0, Math.min(1, top / containerHeight));
  const width = Math.max(0, Math.min(1 - x, (right - left) / containerWidth));
  const height = Math.max(0, Math.min(1 - y, (bottom - top) / containerHeight));

  if (width < minSize || height < minSize) {
    return null;
  }

  return {
    x: Math.round(x * 10000) / 10000,
    y: Math.round(y * 10000) / 10000,
    width: Math.round(width * 10000) / 10000,
    height: Math.round(height * 10000) / 10000
  };
}

export type PointerUpIntentAction =
  | { action: "select_and_open_inspector"; elementId: string }
  | { action: "commit_move"; shouldOpenInspector: false }
  | { action: "commit_resize"; shouldOpenInspector: false }
  | { action: "commit_creation" }
  | { action: "none" };

/**
 * Pure intent resolver for pointer up gestures:
 * - pending_move (sub-threshold click) -> select element & open inspector
 * - moving (drag exceeded threshold) -> commit move geometry without popping open inspector
 * - resizing (corner handle drag) -> commit resize geometry without popping open inspector
 * - creating -> commit new element creation
 * - idle -> no action
 */
export function resolvePointerUpIntent(
  interaction: { type: string; elementId?: string }
): PointerUpIntentAction {
  switch (interaction.type) {
    case "pending_move":
      return {
        action: "select_and_open_inspector",
        elementId: interaction.elementId || ""
      };
    case "moving":
      return {
        action: "commit_move",
        shouldOpenInspector: false
      };
    case "resizing":
      return {
        action: "commit_resize",
        shouldOpenInspector: false
      };
    case "creating":
      return {
        action: "commit_creation"
      };
    case "idle":
    default:
      return {
        action: "none"
      };
  }
}
