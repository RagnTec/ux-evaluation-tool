import type {
  ElementType,
  PixelBounds,
  PhysicalGeometry,
  CalibrationQuality
} from "../types/designElement";

export type EvaluationModuleKey =
  | "size_position"
  | "text_contrast"
  | "touch_area_size"
  | "minimum_side"
  | "non_text_contrast";

/**
 * Returns the list of applicable real evaluation modules for a given element type.
 */
export function getApplicableEvaluationModules(elementType: ElementType): EvaluationModuleKey[] {
  switch (elementType) {
    case "text":
      return ["size_position", "text_contrast"];
    case "button":
      return ["size_position", "touch_area_size", "minimum_side", "non_text_contrast"];
    case "icon":
      return ["size_position", "minimum_side", "non_text_contrast"];
    case "input":
      return ["size_position", "touch_area_size", "minimum_side", "non_text_contrast"];
    case "image":
    case "other":
    default:
      return ["size_position"];
  }
}

export interface MinimumSideMetric {
  min_px: number;
  min_mm?: number;
  calibration_quality: CalibrationQuality;
}

/**
 * Computes the minimum side dimension (min of width and height) in pixels and physical millimeters if calibrated.
 */
export function calculateMinimumSide(
  pixelBounds: PixelBounds,
  physicalGeometry?: PhysicalGeometry
): MinimumSideMetric {
  const min_px = Math.min(pixelBounds.width, pixelBounds.height);
  const quality = physicalGeometry?.calibration_quality || "relative_only";

  let min_mm: number | undefined;
  if (
    (quality === "exact" || quality === "estimated") &&
    physicalGeometry?.width_mm !== undefined &&
    physicalGeometry?.height_mm !== undefined
  ) {
    min_mm = Math.min(physicalGeometry.width_mm, physicalGeometry.height_mm);
    min_mm = Math.round(min_mm * 100) / 100;
  }

  return {
    min_px,
    min_mm,
    calibration_quality: quality
  };
}
