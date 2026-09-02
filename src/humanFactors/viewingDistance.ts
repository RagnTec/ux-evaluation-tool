import type { ViewingDistanceEvidence, ViewingDistanceSource } from "./types";

/**
 * Validates whether a viewing distance value is scientifically acceptable.
 * A valid viewing distance must be a finite number strictly greater than zero.
 * Zero, negative numbers, NaN, and Infinity are strictly rejected.
 */
export function validateViewingDistance(distanceMm: number): boolean {
  return typeof distanceMm === "number" && Number.isFinite(distanceMm) && distanceMm > 0;
}

/**
 * Parses user input or raw context into a normalized viewing distance in millimeters.
 * Supports numbers and common unit strings ("500 mm", "50 cm", "0.5 m", "20 inch").
 * Returns null if input is empty, invalid, non-positive, or unparseable.
 * Does NOT apply any implicit or hardcoded device defaults.
 */
export function parseViewingDistanceMm(input: unknown): number | null {
  if (input === null || input === undefined) return null;

  if (typeof input === "number") {
    return validateViewingDistance(input) ? input : null;
  }

  if (typeof input !== "string") return null;

  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return null;

  // Match number + optional unit
  const match = trimmed.match(/^([\d.]+)\s*([a-z"']*)$/i);
  if (!match) return null;

  const rawNum = parseFloat(match[1]);
  if (!Number.isFinite(rawNum) || rawNum <= 0) return null;

  const unit = match[2]?.trim().toLowerCase();

  let distanceMm: number;
  if (!unit || unit === "mm") {
    distanceMm = rawNum;
  } else if (unit === "cm") {
    distanceMm = rawNum * 10;
  } else if (unit === "m") {
    distanceMm = rawNum * 1000;
  } else if (unit === "inch" || unit === '"' || unit === "in") {
    distanceMm = rawNum * 25.4;
  } else {
    return null;
  }

  const roundedMm = Math.round(distanceMm * 100) / 100;
  return validateViewingDistance(roundedMm) ? roundedMm : null;
}

/**
 * Creates a structured ViewingDistanceEvidence object if valid.
 * Returns null if distance is invalid.
 */
export function createViewingDistanceEvidence(
  distanceMm: number,
  source: ViewingDistanceSource,
  provenance?: string,
  assumptions?: string[]
): ViewingDistanceEvidence | null {
  if (!validateViewingDistance(distanceMm)) {
    return null;
  }

  return {
    distance_mm: distanceMm,
    source,
    provenance,
    assumptions: assumptions ? [...assumptions] : undefined
  };
}
