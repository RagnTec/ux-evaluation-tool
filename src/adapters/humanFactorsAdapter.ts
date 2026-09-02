import type { DesignElement } from "../types/designElement";
import type {
  PhysicalVisualMeasurement,
  ViewingDistanceEvidence,
  VisualAngleMeasurement,
  ViewingDistanceSource
} from "../humanFactors";
import {
  parseViewingDistanceMm,
  createViewingDistanceEvidence,
  calculateVisualAngleFromDimensions
} from "../humanFactors";

/**
 * Adapts an application DesignElement into a normalized PhysicalVisualMeasurement.
 */
export function adaptElementPhysicalVisual(
  element: DesignElement
): PhysicalVisualMeasurement | null {
  const phys = element.physical_geometry;
  if (!phys || !phys.is_calibrated) {
    return null;
  }

  const widthMm = phys.width_mm && phys.width_mm > 0 ? phys.width_mm : undefined;
  const heightMm = phys.height_mm && phys.height_mm > 0 ? phys.height_mm : undefined;

  if (widthMm === undefined && heightMm === undefined) {
    return null;
  }

  const isExact = phys.calibration_quality === "exact";
  const provenance = isExact
    ? "硬件屏幕校准"
    : element.calibration_mode === "cropped"
    ? "局部截图估算"
    : "等比贴合估算";

  const assumptions: string[] = [];
  if (!isExact) {
    assumptions.push("物理尺寸基于屏幕等比贴合或局部缩放估算");
  }

  return {
    width_mm: widthMm,
    height_mm: heightMm,
    provenance,
    assumptions: assumptions.length > 0 ? assumptions : undefined
  };
}

/**
 * Adapts raw context viewing distance into normalized ViewingDistanceEvidence.
 */
export function adaptViewingDistanceEvidence(
  rawDistance: unknown,
  source: ViewingDistanceSource = "user_confirmed"
): ViewingDistanceEvidence | null {
  const distanceMm = parseViewingDistanceMm(rawDistance);
  if (distanceMm === null) {
    return null;
  }

  const provenance = source === "user_confirmed"
    ? "用户指定视距"
    : source === "scenario_assumed"
    ? "场景预设视距"
    : "视距数据";

  return createViewingDistanceEvidence(distanceMm, source, provenance);
}

/**
 * Computes visual angle measurement for a DesignElement given raw context viewing distance.
 * Returns null if either physical measurement or viewing distance is unavailable.
 */
export function computeElementVisualAngle(
  element: DesignElement,
  rawDistance: unknown,
  distanceSource: ViewingDistanceSource = "user_confirmed"
): VisualAngleMeasurement | null {
  const physical = adaptElementPhysicalVisual(element);
  if (!physical) return null;

  const distance = adaptViewingDistanceEvidence(rawDistance, distanceSource);
  if (!distance) return null;

  return calculateVisualAngleFromDimensions(physical, distance);
}
