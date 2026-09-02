import type {
  PhysicalVisualMeasurement,
  ViewingDistanceEvidence,
  VisualAngleMeasurement
} from "./types";
import { validateViewingDistance } from "./viewingDistance";

/**
 * Calculates visual angle in degrees and arcminutes for a single physical dimension.
 * Uses the exact trigonometric formula:
 *   theta_rad = 2 * atan(size_mm / (2 * distance_mm))
 *
 * Rejects invalid, non-positive, zero, NaN, or infinite sizes/distances by returning null.
 */
export function calculateExactVisualAngle(
  sizeMm: number,
  distanceMm: number
): { deg: number; arcmin: number } | null {
  if (
    typeof sizeMm !== "number" ||
    !Number.isFinite(sizeMm) ||
    sizeMm <= 0 ||
    !validateViewingDistance(distanceMm)
  ) {
    return null;
  }

  // Exact trigonometric angular size formula
  const thetaRad = 2 * Math.atan(sizeMm / (2 * distanceMm));
  const deg = thetaRad * (180 / Math.PI);
  const arcmin = deg * 60;

  // Round to 4 decimal places for precision without floating point noise
  const roundedDeg = Math.round(deg * 10000) / 10000;
  const roundedArcmin = Math.round(arcmin * 100) / 100;

  return {
    deg: roundedDeg,
    arcmin: roundedArcmin
  };
}

/**
 * Derives the physical size in millimeters for a target visual angle and viewing distance.
 * Uses the exact inverse trigonometric angular size formula:
 *   size_mm = 2 * distance_mm * tan(theta_rad / 2)
 *
 * Accepts angle in arcminutes ({ arcmin: number }) or degrees ({ deg: number }).
 * Returns null if distance is invalid or visual angle is non-positive / non-finite.
 */
export function derivePhysicalSizeForVisualAngle(
  visualAngle: { deg?: number; arcmin?: number },
  distanceMm: number
): number | null {
  if (!validateViewingDistance(distanceMm) || !visualAngle) {
    return null;
  }

  let thetaRad: number | null = null;
  if (typeof visualAngle.arcmin === "number" && Number.isFinite(visualAngle.arcmin) && visualAngle.arcmin > 0) {
    const deg = visualAngle.arcmin / 60;
    thetaRad = deg * (Math.PI / 180);
  } else if (typeof visualAngle.deg === "number" && Number.isFinite(visualAngle.deg) && visualAngle.deg > 0) {
    thetaRad = visualAngle.deg * (Math.PI / 180);
  }

  if (thetaRad === null || thetaRad <= 0 || thetaRad >= Math.PI) {
    return null;
  }

  // Exact inverse formula: size = 2 * distance * tan(theta / 2)
  const sizeMm = 2 * distanceMm * Math.tan(thetaRad / 2);
  if (!Number.isFinite(sizeMm) || sizeMm <= 0) {
    return null;
  }

  return Math.round(sizeMm * 10000) / 10000;
}

/**
 * Computes independent horizontal and vertical visual angle measurements
 * from physical visual dimensions and viewing distance evidence.
 *
 * Principles:
 * 1. Independent: Horizontal and vertical angles are computed separately; never averaged.
 * 2. Exact formula: Small-angle approximation is not used.
 * 3. Provenance preservation: Merges upstream assumptions and provenance chains.
 * 4. Measurement only: Returns pure angular measurements with NO compliance verdict.
 *
 * Semantic Boundary:
 * For Text elements, visual bounds height represents element visual angular height.
 * It is NOT character x-height, cap height, or legibility threshold.
 */
export function calculateVisualAngleFromDimensions(
  physical: PhysicalVisualMeasurement,
  distance: ViewingDistanceEvidence
): VisualAngleMeasurement | null {
  if (!distance || !validateViewingDistance(distance.distance_mm)) {
    return null;
  }

  const distMm = distance.distance_mm;

  let horizontalResult: { deg: number; arcmin: number } | null = null;
  if (physical.width_mm !== undefined) {
    horizontalResult = calculateExactVisualAngle(physical.width_mm, distMm);
  }

  let verticalResult: { deg: number; arcmin: number } | null = null;
  if (physical.height_mm !== undefined) {
    verticalResult = calculateExactVisualAngle(physical.height_mm, distMm);
  }

  // If neither dimension yielded a valid visual angle, return null
  if (!horizontalResult && !verticalResult) {
    return null;
  }

  // Merge assumptions from physical and distance evidence
  const mergedAssumptions: string[] = [];
  if (physical.assumptions && physical.assumptions.length > 0) {
    mergedAssumptions.push(...physical.assumptions);
  }
  if (distance.assumptions && distance.assumptions.length > 0) {
    mergedAssumptions.push(...distance.assumptions);
  }

  // Resolve provenance description
  const provParts: string[] = [];
  if (physical.provenance) provParts.push(`物理尺寸: ${physical.provenance}`);
  if (distance.provenance) provParts.push(`视距: ${distance.provenance}`);
  const combinedProvenance = provParts.length > 0 ? provParts.join(" | ") : undefined;

  return {
    horizontal_deg: horizontalResult ? horizontalResult.deg : undefined,
    vertical_deg: verticalResult ? verticalResult.deg : undefined,
    horizontal_arcmin: horizontalResult ? horizontalResult.arcmin : undefined,
    vertical_arcmin: verticalResult ? verticalResult.arcmin : undefined,
    viewing_distance_mm: distMm,
    physical_width_mm: physical.width_mm,
    physical_height_mm: physical.height_mm,
    provenance: combinedProvenance,
    assumptions: mergedAssumptions.length > 0 ? mergedAssumptions : undefined
  };
}
