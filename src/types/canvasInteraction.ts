import type { NormalizedBounds } from "./designElement";

export interface CanvasPoint {
  x: number;
  y: number;
}

export type ResizeHandle = "nw" | "ne" | "sw" | "se";

export type CanvasInteraction =
  | { type: "idle" }
  | {
      type: "pending_move";
      elementId: string;
      pointerId: number;
      startPointer: CanvasPoint; // client coordinates (clientX, clientY)
      originalBounds: NormalizedBounds;
    }
  | {
      type: "moving";
      elementId: string;
      pointerId: number;
      startPointer: CanvasPoint; // client coordinates (clientX, clientY)
      originalBounds: NormalizedBounds;
    }
  | {
      type: "resizing";
      elementId: string;
      pointerId: number;
      handle: ResizeHandle;
      startPointer: CanvasPoint; // client coordinates (clientX, clientY)
      originalBounds: NormalizedBounds;
    }
  | {
      type: "creating";
      pointerId: number;
      startPoint: CanvasPoint; // stage container-relative coordinates
      currentPoint: CanvasPoint; // stage container-relative coordinates
    };

export type TouchCanvasInteraction =
  | { type: "idle" }
  | {
      type: "pending_move";
      pointerId: number;
      startPointer: CanvasPoint;
      originalBounds: NormalizedBounds;
    }
  | {
      type: "moving";
      pointerId: number;
      startPointer: CanvasPoint;
      originalBounds: NormalizedBounds;
    }
  | {
      type: "resizing";
      pointerId: number;
      handle: ResizeHandle;
      startPointer: CanvasPoint;
      originalBounds: NormalizedBounds;
    };
