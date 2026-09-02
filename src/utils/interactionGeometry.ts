import type {
  DesignElement,
  LogicalUnitMapping,
  PhysicalGeometry,
  PixelBounds,
  NormalizedBounds,
  TouchReviewStatus,
  CalibrationMode,
  TargetSizeEvaluation,
  TouchBoundsSource,
  TouchSourceProvenance,
  ColorState
} from "../types/designElement";
import type { CroppedScaleMode } from "../types/workspace";
import { calculatePhysicalGeometry } from "./calibration";
import { mapPixelBoundsToLogical, evaluateTargetSize } from "./logicalMapping";
import { recalculateElementTextSize } from "./textSizeEvaluation";
import { evaluateWcagContrast, evaluateWcagNonTextContrast } from "./contrast";
import { parseViewingDistanceMm, calculateExactVisualAngle } from "../humanFactors";

export interface DerivedEvaluationContext {
  imageNaturalWidth: number;
  imageNaturalHeight: number;
  calibrationMode: CalibrationMode;
  croppedScaleMode?: CroppedScaleMode;
  originalImageReferenceWidth?: number;
  allowEstimation: boolean;
  displaySize?: string;
  resolution?: string;
  viewingDistance?: string;
  logicalMapping?: LogicalUnitMapping | null;
  contextEnvironment?: string;
  contextOperationState?: string;
  userGroups?: string[];
  scenario?: string;
  scenarioDomain?: string;
  ruleSets?: string[];
  dimensions?: string[];
}


export interface Point2D {
  x: number;
  y: number;
}

export interface AreaMetrics {
  pixel_width: number;
  pixel_height: number;
  pixel_area: number;
  image_area: number;
  image_share_percentage: number;
  logical_width?: number;
  logical_height?: number;
  logical_area?: number;
  logical_unit?: string;
  physical_width_mm?: number;
  physical_height_mm?: number;
  physical_area_mm2?: number;
  calibration_quality?: string;
}

export interface CenteredReferenceResult {
  normalized_bounds: NormalizedBounds;
  pixel_bounds: PixelBounds;
  logical_width: number;
  logical_height: number;
  target_pixel_width: number;
  target_pixel_height: number;
  is_clipped: boolean;
  clip_warning?: string;
}

export interface RectangleSpacingResult {
  dx: number;
  dy: number;
  distance: number;
  closest_point_a?: Point2D;
  closest_point_b?: Point2D;
  is_overlapping: boolean;
}

export interface RectangleOverlapResult {
  is_overlapping: boolean;
  overlap_width: number;
  overlap_height: number;
  overlap_area: number;
}

export interface NearestTouchTargetResult {
  nearest_element_id?: string;
  nearest_element_label?: string;
  distance_px: number;
  distance_logical?: number;
  distance_mm?: number;
  logical_unit?: string;
  closest_point_a?: Point2D;
  closest_point_b?: Point2D;
  overlap?: RectangleOverlapResult;
}

export interface EdgeDistancesResult {
  top_px: number;
  bottom_px: number;
  left_px: number;
  right_px: number;
  top_logical?: number;
  bottom_logical?: number;
  left_logical?: number;
  right_logical?: number;
  top_mm?: number;
  bottom_mm?: number;
  left_mm?: number;
  right_mm?: number;
}

export interface WcagSpacingEvaluation {
  status: "size_condition_met" | "spacing_circle_clear" | "spacing_circle_conflict" | "unavailable";
  summary_text: string;
  detail_text: string;
  conflicting_element_ids?: string[];
}

export interface TouchReviewResult {
  status: TouchReviewStatus;
  reasons: string[];
  recommendations: string[];
}

export interface TouchEditSnapshot {
  element_id: string;
  initial_touch_bounds?: NormalizedBounds;
  initial_touch_bounds_pixel?: PixelBounds;
  initial_touch_bounds_source?: TouchBoundsSource;
  initial_touch_bounds_reference_clipped?: boolean;
  initial_touch_bounds_reference_warning?: string;
  initial_copied_from_element_id?: string;
  initial_copied_from_element_label?: string;
  draft_touch_bounds: NormalizedBounds;
  draft_touch_bounds_pixel: PixelBounds;
  draft_touch_bounds_source: TouchBoundsSource;
  draft_touch_bounds_reference_clipped?: boolean;
  draft_touch_bounds_reference_warning?: string;
  draft_copied_from_element_id?: string;
  draft_copied_from_element_label?: string;
  is_modified: boolean;
}

/**
 * Recomputes all derived evaluations for a design element based on current source context facts.
 * Pure selector/transformation: does not mutate inputs.
 */
export function recomputeElementDerivedState(
  element: DesignElement,
  context: DerivedEvaluationContext
): DesignElement {
  const effectiveCalMode = element.calibration_mode || context.calibrationMode;
  const effectiveAllowEstimation = context.allowEstimation !== undefined
    ? context.allowEstimation
    : (element.allow_estimation !== undefined ? element.allow_estimation : false);

  const physical = (context.displaySize && context.resolution && context.imageNaturalWidth > 0 && context.imageNaturalHeight > 0)
    ? calculatePhysicalGeometry(
        element.normalized_bounds,
        context.imageNaturalWidth,
        context.imageNaturalHeight,
        context.displaySize,
        context.resolution,
        effectiveCalMode,
        effectiveAllowEstimation,
        context.croppedScaleMode,
        context.originalImageReferenceWidth
      )
    : element.physical_geometry;

  let targetEval: TargetSizeEvaluation | undefined = undefined;
  const isInteractive = element.interaction_type !== undefined
    ? element.interaction_type !== "none"
    : ["button", "input"].includes(element.element_type);
  if (context.logicalMapping && isInteractive) {
    const effectivePx = getEffectiveTouchPixelBounds(element, context.imageNaturalWidth, context.imageNaturalHeight);
    if (effectivePx) {
      const logical = mapPixelBoundsToLogical(effectivePx, context.logicalMapping);
      targetEval = evaluateTargetSize(logical, context.logicalMapping) || undefined;
      if (targetEval && !element.touch_bounds) {
        targetEval.result_basis = "inferred";
      }
    }
  }

  let updatedEl: DesignElement = {
    ...element,
    physical_geometry: physical,
    logical_mapping: context.logicalMapping || undefined,
    target_size_evaluation: targetEval
  };

  if (updatedEl.element_type === "text") {
    const textPartial = recalculateElementTextSize(updatedEl, context.logicalMapping || undefined);
    updatedEl = { ...updatedEl, ...textPartial };
    if (updatedEl.text_size_evaluation?.contrast_category_auto) {
      updatedEl.text_size_category = updatedEl.text_size_evaluation.contrast_category_auto;
    }

    // Recompute character / single-line text physical & visual angle with physical consistency protection
    const isSingleLine = updatedEl.text_layout === "single_line" || updatedEl.text_visual_measurement_target === "single_rendered_line";

    if (updatedEl.character_height_px && updatedEl.character_height_px > 0) {
      // User provided explicit representative character height measurement (highest precision)
      const containerHeightPx = updatedEl.image_pixel_bounds.height;
      const isCharPxValid = containerHeightPx <= 0 || updatedEl.character_height_px <= containerHeightPx + 0.01;

      if (isCharPxValid && context.logicalMapping && context.logicalMapping.quality !== "unavailable") {
        const scale = context.logicalMapping.scale_y || context.logicalMapping.scale_x || ((context.logicalMapping as Record<string, any>).scale_factor ? 1 / (context.logicalMapping as Record<string, any>).scale_factor : 1);
        updatedEl.character_height_design_height = Math.round(updatedEl.character_height_px * scale * 10) / 10;
      } else {
        updatedEl.character_height_design_height = undefined;
      }

      if (isCharPxValid && physical && physical.is_calibrated && physical.height_mm && containerHeightPx > 0) {
        const charPhysicalMm = Math.round(((updatedEl.character_height_px / containerHeightPx) * physical.height_mm) * 1000) / 1000;
        const isPhysicalValid = charPhysicalMm <= physical.height_mm + 0.01;
        if (isPhysicalValid) {
          updatedEl.character_height_physical_mm = charPhysicalMm;
        } else {
          updatedEl.character_height_physical_mm = undefined;
        }
      } else {
        updatedEl.character_height_physical_mm = undefined;
      }

      if (updatedEl.character_height_physical_mm && context.viewingDistance) {
        const distMm = parseViewingDistanceMm(context.viewingDistance);
        if (distMm) {
          const va = calculateExactVisualAngle(updatedEl.character_height_physical_mm, distMm);
          const containerVa = physical?.height_mm ? calculateExactVisualAngle(physical.height_mm, distMm) : null;
          const isAngleValid = va && (!containerVa || va.arcmin <= containerVa.arcmin + 0.01);
          if (va && isAngleValid) {
            updatedEl.character_height_visual_angle = {
              deg: va.deg,
              arcmin: va.arcmin,
              provenance: "hardware_and_distance_calculated"
            };
          } else {
            updatedEl.character_height_visual_angle = undefined;
          }
        } else {
          updatedEl.character_height_visual_angle = undefined;
        }
      } else {
        updatedEl.character_height_visual_angle = undefined;
      }
    } else {
      // Without explicit representative character measurement, character_height_* remains undefined
      updatedEl.character_height_design_height = undefined;
      updatedEl.character_height_physical_mm = undefined;
      updatedEl.character_height_visual_angle = undefined;
    }
  } else {
    // When element_type is not text, clean up text-specific derived state and typography properties
    updatedEl.text_size_evaluation = undefined;
    updatedEl.text_size_category = undefined;
    updatedEl.text_size_value = undefined;
    updatedEl.text_size_unit = undefined;
    updatedEl.text_size_source = undefined;
    updatedEl.text_role = undefined;
    updatedEl.text_layout = undefined;
    updatedEl.text_visual_measurement_target = undefined;
    updatedEl.text_weight_category = undefined;
    updatedEl.character_height_px = undefined;
    updatedEl.character_height_source = undefined;
    updatedEl.character_height_physical_mm = undefined;
    updatedEl.character_height_visual_angle = undefined;
  }


  const fg = updatedEl.foreground_color;
  const bg = updatedEl.background_color;
  const fgState: ColorState = updatedEl.foreground_color_state || (fg ? "confirmed" : "missing");
  const bgState: ColorState = updatedEl.background_color_state || (bg ? "confirmed" : "missing");

  if (fg && bg) {
    if (updatedEl.element_type === "text") {
      const cat = updatedEl.text_size_category || updatedEl.text_size_evaluation?.contrast_category_auto || "normal";
      updatedEl.contrast_evaluation = evaluateWcagContrast(fg, bg, cat, fgState, bgState) || undefined;
    } else if (["button", "icon", "input"].includes(updatedEl.element_type)) {
      updatedEl.contrast_evaluation = evaluateWcagNonTextContrast(fg, bg, fgState, bgState) || undefined;
    }
  } else if (fg && !bg) {
    const provBg = "#FFFFFF";
    if (updatedEl.element_type === "text") {
      const cat = updatedEl.text_size_category || updatedEl.text_size_evaluation?.contrast_category_auto || "normal";
      updatedEl.contrast_evaluation = evaluateWcagContrast(fg, provBg, cat, fgState, "provisional") || undefined;
    } else if (["button", "icon", "input"].includes(updatedEl.element_type)) {
      updatedEl.contrast_evaluation = evaluateWcagNonTextContrast(fg, provBg, fgState, "provisional") || undefined;
    }
  } else if (!fg && bg) {
    const provFg = "#000000";
    if (updatedEl.element_type === "text") {
      const cat = updatedEl.text_size_category || updatedEl.text_size_evaluation?.contrast_category_auto || "normal";
      updatedEl.contrast_evaluation = evaluateWcagContrast(provFg, bg, cat, "provisional", bgState) || undefined;
    } else if (["button", "icon", "input"].includes(updatedEl.element_type)) {
      updatedEl.contrast_evaluation = evaluateWcagNonTextContrast(provFg, bg, "provisional", bgState) || undefined;
    }
  } else {
    updatedEl.contrast_evaluation = undefined;
  }

  return updatedEl;
}

/**
 * Pure helper to create a new manual design element with safe defaults:
 * element_type = "other", interaction_type = "none", touch_bounds = undefined.
 */
export function createManualDesignElement(
  bounds: NormalizedBounds,
  imageWidth: number,
  imageHeight: number,
  index: number,
  calibrationMode: CalibrationMode = "full_screen",
  allowEstimation: boolean = false,
  displaySize?: string,
  resolution?: string
): DesignElement {
  const pixelBounds: PixelBounds = {
    x: Math.round(bounds.x * imageWidth),
    y: Math.round(bounds.y * imageHeight),
    width: Math.round(bounds.width * imageWidth),
    height: Math.round(bounds.height * imageHeight)
  };

  const physical = (displaySize && resolution)
    ? calculatePhysicalGeometry(
        bounds,
        imageWidth,
        imageHeight,
        displaySize,
        resolution,
        calibrationMode,
        allowEstimation
      )
    : undefined;

  return {
    element_id: `manual-el-${Date.now()}-${index}`,
    source: "manual",
    element_type: "other",
    label: `元素 #${index}`,
    normalized_bounds: bounds,
    image_pixel_bounds: pixelBounds,
    calibration_mode: calibrationMode,
    allow_estimation: undefined,
    physical_geometry: physical,
    interaction_type: "none",
    touch_bounds: undefined,
    touch_bounds_pixel: undefined,
    touch_bounds_source: undefined,
    target_size_evaluation: undefined,
    created_at: new Date().toISOString()
  };
}

/**
 * Calculate rectangle area.
 */
export function calculateArea(width: number, height: number): number {
  if (width <= 0 || height <= 0) return 0;
  return width * height;
}

/**
 * Calculate area share percentage (0 to 100).
 */
export function calculateAreaShare(elementArea: number, totalArea: number): number {
  if (totalArea <= 0 || elementArea <= 0) return 0;
  const share = (elementArea / totalArea) * 100;
  return Math.min(100, Math.max(0, Math.round(share * 100) / 100));
}

/**
 * Generalized area metrics calculator for any pixel bounds (visual or touch).
 */
export function calculateAreaMetrics(
  pixelBounds: PixelBounds,
  imageWidth: number,
  imageHeight: number,
  logicalMapping?: LogicalUnitMapping,
  ppi?: number,
  calibrationQuality?: string,
  isCalibrated?: boolean
): AreaMetrics {
  const pixelArea = calculateArea(pixelBounds.width, pixelBounds.height);
  const imageArea = calculateArea(imageWidth, imageHeight);
  const imageShare = calculateAreaShare(pixelArea, imageArea);

  const res: AreaMetrics = {
    pixel_width: pixelBounds.width,
    pixel_height: pixelBounds.height,
    pixel_area: pixelArea,
    image_area: imageArea,
    image_share_percentage: imageShare
  };

  if (logicalMapping && logicalMapping.quality !== "unavailable" && logicalMapping.scale_x > 0 && logicalMapping.scale_y > 0) {
    res.logical_width = Math.round(pixelBounds.width * logicalMapping.scale_x * 10) / 10;
    res.logical_height = Math.round(pixelBounds.height * logicalMapping.scale_y * 10) / 10;
    res.logical_area = Math.round(res.logical_width * res.logical_height * 10) / 10;
    res.logical_unit = logicalMapping.unit === "css_px" ? "CSS px" : logicalMapping.unit;
  }

  if (isCalibrated && ppi && ppi > 0) {
    const mmPerPx = 25.4 / ppi;
    res.physical_width_mm = Math.round(pixelBounds.width * mmPerPx * 100) / 100;
    res.physical_height_mm = Math.round(pixelBounds.height * mmPerPx * 100) / 100;
    res.physical_area_mm2 = Math.round(res.physical_width_mm * res.physical_height_mm * 10) / 10;
    res.calibration_quality = calibrationQuality;
  }

  return res;
}

/**
 * Calculate comprehensive visual area metrics.
 */
export function calculateVisualAreaMetrics(
  pixelBounds: PixelBounds,
  imageWidth: number,
  imageHeight: number,
  logicalMapping?: LogicalUnitMapping,
  physicalGeometry?: PhysicalGeometry
): AreaMetrics {
  return calculateAreaMetrics(
    pixelBounds,
    imageWidth,
    imageHeight,
    logicalMapping,
    physicalGeometry?.ppi,
    physicalGeometry?.calibration_quality,
    physicalGeometry?.is_calibrated
  );
}

/**
 * Generate centered platform reference touch bounds.
 */
export function generateCenteredReferenceTouchBounds(
  visualPixelBounds: PixelBounds,
  imageWidth: number,
  imageHeight: number,
  platform: "web" | "ios" | "android" | "custom" | "unknown",
  logicalMapping?: LogicalUnitMapping
): CenteredReferenceResult | null {
  if (!logicalMapping || logicalMapping.quality === "unavailable") {
    return null;
  }
  if (logicalMapping.scale_x <= 0 || logicalMapping.scale_y <= 0) {
    return null;
  }

  // Custom or unknown platform has NO invented platform reference area
  if (platform === "custom" || platform === "unknown" || logicalMapping.platform === "custom" || logicalMapping.platform === "unknown") {
    return null;
  }

  // Determine target logical size
  let logicalW = 44;
  let logicalH = 44;
  if (platform === "android") {
    logicalW = 48;
    logicalH = 48;
  } else if (platform === "web") {
    logicalW = 24;
    logicalH = 24;
  } else if (platform === "ios") {
    logicalW = 44;
    logicalH = 44;
  } else {
    return null;
  }

  const targetPxW = logicalW / logicalMapping.scale_x;
  const targetPxH = logicalH / logicalMapping.scale_y;

  const visualCenterX = visualPixelBounds.x + visualPixelBounds.width / 2;
  const visualCenterY = visualPixelBounds.y + visualPixelBounds.height / 2;

  const unclippedX = visualCenterX - targetPxW / 2;
  const unclippedY = visualCenterY - targetPxH / 2;

  const isClipped =
    unclippedX < 0 ||
    unclippedY < 0 ||
    unclippedX + targetPxW > imageWidth ||
    unclippedY + targetPxH > imageHeight;

  const clampedX = Math.max(0, unclippedX);
  const clampedY = Math.max(0, unclippedY);
  const clampedR = Math.min(imageWidth, unclippedX + targetPxW);
  const clampedB = Math.min(imageHeight, unclippedY + targetPxH);
  const clampedW = Math.max(1, clampedR - clampedX);
  const clampedH = Math.max(1, clampedB - clampedY);

  return {
    normalized_bounds: {
      x: clampedX / imageWidth,
      y: clampedY / imageHeight,
      width: clampedW / imageWidth,
      height: clampedH / imageHeight
    },
    pixel_bounds: {
      x: Math.round(clampedX),
      y: Math.round(clampedY),
      width: Math.round(clampedW),
      height: Math.round(clampedH)
    },
    logical_width: logicalW,
    logical_height: logicalH,
    target_pixel_width: Math.round(targetPxW),
    target_pixel_height: Math.round(targetPxH),
    is_clipped: isClipped,
    clip_warning: isClipped
      ? "建议触控区域超出当前局部截图范围，当前只能确认可见部分。"
      : undefined
  };
}

/**
 * Calculate spacing and closest boundary points between two axis-aligned rectangles.
 * Note: Rectangles touching at edges or corners have distance = 0 and is_overlapping = false.
 * Positive overlap area is required for is_overlapping = true.
 */
export function calculateRectangleSpacing(
  rectA: PixelBounds,
  rectB: PixelBounds
): RectangleSpacingResult {
  const x1 = rectA.x;
  const x1b = rectA.x + rectA.width;
  const y1 = rectA.y;
  const y1b = rectA.y + rectA.height;

  const x2 = rectB.x;
  const x2b = rectB.x + rectB.width;
  const y2 = rectB.y;
  const y2b = rectB.y + rectB.height;

  const xOverlap = Math.max(0, Math.min(x1b, x2b) - Math.max(x1, x2));
  const yOverlap = Math.max(0, Math.min(y1b, y2b) - Math.max(y1, y2));

  // True overlap requires strictly positive intersection in BOTH dimensions
  if (xOverlap > 0 && yOverlap > 0) {
    return {
      dx: 0,
      dy: 0,
      distance: 0,
      is_overlapping: true
    };
  }

  let dx = 0;
  let ax: number | null = null;
  let bx: number | null = null;
  if (x1b <= x2) {
    dx = x2 - x1b;
    ax = x1b;
    bx = x2;
  } else if (x2b <= x1) {
    dx = x1 - x2b;
    ax = x1;
    bx = x2b;
  }

  let dy = 0;
  let ay: number | null = null;
  let by: number | null = null;
  if (y1b <= y2) {
    dy = y2 - y1b;
    ay = y1b;
    by = y2;
  } else if (y2b <= y1) {
    dy = y1 - y2b;
    ay = y1;
    by = y2b;
  }

  let closestA: Point2D;
  let closestB: Point2D;
  let distance: number;

  if (ax !== null && bx !== null && ay === null && by === null) {
    // Horizontal gap or vertical edge touch
    const midY = (Math.max(y1, y2) + Math.min(y1b, y2b)) / 2;
    closestA = { x: ax, y: midY };
    closestB = { x: bx, y: midY };
    distance = dx;
  } else if (ay !== null && by !== null && ax === null && bx === null) {
    // Vertical gap or horizontal edge touch
    const midX = (Math.max(x1, x2) + Math.min(x1b, x2b)) / 2;
    closestA = { x: midX, y: ay };
    closestB = { x: midX, y: by };
    distance = dy;
  } else if (ax !== null && bx !== null && ay !== null && by !== null) {
    // Diagonal gap or corner touch
    closestA = { x: ax, y: ay };
    closestB = { x: bx, y: by };
    distance = Math.hypot(dx, dy);
  } else {
    // Fallback
    closestA = { x: (x1 + x1b) / 2, y: (y1 + y1b) / 2 };
    closestB = { x: (x2 + x2b) / 2, y: (y2 + y2b) / 2 };
    distance = 0;
  }

  return {
    dx: Math.round(dx * 10) / 10,
    dy: Math.round(dy * 10) / 10,
    distance: Math.round(distance * 10) / 10,
    closest_point_a: {
      x: Math.round(closestA.x * 10) / 10,
      y: Math.round(closestA.y * 10) / 10
    },
    closest_point_b: {
      x: Math.round(closestB.x * 10) / 10,
      y: Math.round(closestB.y * 10) / 10
    },
    is_overlapping: false
  };
}

/**
 * Calculate overlap between two axis-aligned rectangles.
 */
export function calculateRectangleOverlap(
  rectA: PixelBounds,
  rectB: PixelBounds
): RectangleOverlapResult {
  const xOverlap = Math.max(0, Math.min(rectA.x + rectA.width, rectB.x + rectB.width) - Math.max(rectA.x, rectB.x));
  const yOverlap = Math.max(0, Math.min(rectA.y + rectA.height, rectB.y + rectB.height) - Math.max(rectA.y, rectB.y));
  const isOverlapping = xOverlap > 0 && yOverlap > 0;
  const overlapArea = isOverlapping ? xOverlap * yOverlap : 0;

  return {
    is_overlapping: isOverlapping,
    overlap_width: Math.round(xOverlap * 10) / 10,
    overlap_height: Math.round(yOverlap * 10) / 10,
    overlap_area: Math.round(overlapArea * 10) / 10
  };
}

/**
 * Calculate nearest touch target among all defined interactive elements.
 * Correctly computes logical distance using component scaling: sqrt(dx_log^2 + dy_log^2).
 */
export function calculateNearestTouchTarget(
  targetElement: DesignElement,
  allElements: DesignElement[],
  imageWidth: number,
  imageHeight: number,
  logicalMapping?: LogicalUnitMapping,
  mmPerPixel?: number
): NearestTouchTargetResult | null {
  const targetBounds = getEffectiveTouchPixelBounds(targetElement, imageWidth, imageHeight);
  if (!targetBounds) return null;

  let nearestEl: DesignElement | null = null;
  let minDistance = Infinity;
  let nearestOverlap: RectangleOverlapResult | undefined;
  let closestA: Point2D | undefined;
  let closestB: Point2D | undefined;
  let minSpacing: RectangleSpacingResult | undefined;

  for (const el of allElements) {
    if (el.element_id === targetElement.element_id) continue;
    if (el.interaction_type === "none") continue;

    const elBounds = getEffectiveTouchPixelBounds(el, imageWidth, imageHeight);
    if (!elBounds) continue;

    const overlap = calculateRectangleOverlap(targetBounds, elBounds);
    if (overlap.is_overlapping) {
      nearestEl = el;
      minDistance = 0;
      nearestOverlap = overlap;
      closestA = undefined;
      closestB = undefined;
      minSpacing = { dx: 0, dy: 0, distance: 0, is_overlapping: true };
      break;
    }

    const spacing = calculateRectangleSpacing(targetBounds, elBounds);
    if (spacing.distance < minDistance) {
      minDistance = spacing.distance;
      nearestEl = el;
      nearestOverlap = undefined;
      closestA = spacing.closest_point_a;
      closestB = spacing.closest_point_b;
      minSpacing = spacing;
    }
  }

  if (!nearestEl) return null;

  const res: NearestTouchTargetResult = {
    nearest_element_id: nearestEl.element_id,
    nearest_element_label: nearestEl.label || `Element #${allElements.findIndex(e => e.element_id === nearestEl!.element_id) + 1}`,
    distance_px: minDistance,
    closest_point_a: closestA,
    closest_point_b: closestB,
    overlap: nearestOverlap
  };

  if (logicalMapping && logicalMapping.quality !== "unavailable") {
    if (minSpacing && !minSpacing.is_overlapping) {
      const logicalDx = minSpacing.dx * logicalMapping.scale_x;
      const logicalDy = minSpacing.dy * logicalMapping.scale_y;
      const logicalDist = Math.hypot(logicalDx, logicalDy);
      res.distance_logical = Math.round(logicalDist * 10) / 10;
    } else {
      res.distance_logical = 0;
    }
    res.logical_unit = logicalMapping.unit === "css_px" ? "CSS px" : logicalMapping.unit;
  }

  if (mmPerPixel && mmPerPixel > 0) {
    res.distance_mm = Math.round(minDistance * mmPerPixel * 10) / 10;
  }

  return res;
}

/**
 * Helper to get pixel touch bounds for an element.
 */
export function getEffectiveTouchPixelBounds(
  element: DesignElement,
  imageWidth: number,
  imageHeight: number
): PixelBounds | null {
  if (element.interaction_type === "none") return null;

  if (element.touch_bounds) {
    return {
      x: Math.round(element.touch_bounds.x * imageWidth),
      y: Math.round(element.touch_bounds.y * imageHeight),
      width: Math.round(element.touch_bounds.width * imageWidth),
      height: Math.round(element.touch_bounds.height * imageHeight)
    };
  }

  if (element.touch_bounds_pixel) {
    return element.touch_bounds_pixel;
  }

  if (element.image_pixel_bounds && element.image_pixel_bounds.width > 0 && element.image_pixel_bounds.height > 0) {
    return element.image_pixel_bounds;
  }

  if (element.normalized_bounds && imageWidth > 0 && imageHeight > 0) {
    return {
      x: Math.round(element.normalized_bounds.x * imageWidth),
      y: Math.round(element.normalized_bounds.y * imageHeight),
      width: Math.round(element.normalized_bounds.width * imageWidth),
      height: Math.round(element.normalized_bounds.height * imageHeight)
    };
  }

  return null;
}


/**
 * Distance to image/screen edges.
 */
export function calculateEdgeDistances(
  touchBounds: PixelBounds,
  imageWidth: number,
  imageHeight: number,
  logicalMapping?: LogicalUnitMapping,
  mmPerPixel?: number
): EdgeDistancesResult {
  const topPx = Math.max(0, touchBounds.y);
  const bottomPx = Math.max(0, imageHeight - (touchBounds.y + touchBounds.height));
  const leftPx = Math.max(0, touchBounds.x);
  const rightPx = Math.max(0, imageWidth - (touchBounds.x + touchBounds.width));

  const res: EdgeDistancesResult = {
    top_px: topPx,
    bottom_px: bottomPx,
    left_px: leftPx,
    right_px: rightPx
  };

  if (logicalMapping && logicalMapping.quality !== "unavailable") {
    res.top_logical = Math.round(topPx * logicalMapping.scale_y * 10) / 10;
    res.bottom_logical = Math.round(bottomPx * logicalMapping.scale_y * 10) / 10;
    res.left_logical = Math.round(leftPx * logicalMapping.scale_x * 10) / 10;
    res.right_logical = Math.round(rightPx * logicalMapping.scale_x * 10) / 10;
  }

  if (mmPerPixel && mmPerPixel > 0) {
    res.top_mm = Math.round(topPx * mmPerPixel * 10) / 10;
    res.bottom_mm = Math.round(bottomPx * mmPerPixel * 10) / 10;
    res.left_mm = Math.round(leftPx * mmPerPixel * 10) / 10;
    res.right_mm = Math.round(rightPx * mmPerPixel * 10) / 10;
  }

  return res;
}

/**
 * Circle-rectangle intersection check.
 */
export function circleIntersectsRectangle(
  cx: number,
  cy: number,
  r: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number
): boolean {
  const closestX = Math.max(rx, Math.min(cx, rx + rw));
  const closestY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy < r * r;
}

/**
 * Circle-circle intersection check.
 */
export function circleIntersectsCircle(
  c1x: number,
  c1y: number,
  r1: number,
  c2x: number,
  c2y: number,
  r2: number
): boolean {
  const dx = c1x - c2x;
  const dy = c1y - c2y;
  const radiusSum = r1 + r2;
  return dx * dx + dy * dy < radiusSum * radiusSum;
}

/**
 * WCAG SC 2.5.8 spacing condition evaluation for Web platform in logical CSS coordinate space.
 */
export function evaluateWcagTargetSpacingCondition(
  targetElement: DesignElement,
  allElements: DesignElement[],
  imageWidth: number,
  imageHeight: number,
  logicalMapping?: LogicalUnitMapping
): WcagSpacingEvaluation {
  if (!logicalMapping || logicalMapping.quality === "unavailable" || logicalMapping.unit !== "css_px") {
    return {
      status: "unavailable",
      summary_text: "需建立 Web (CSS px) 设计尺寸基准后方可执行 SC 2.5.8 间距判定。",
      detail_text: "WCAG 2.2 SC 2.5.8 基于 24 CSS px 基准尺寸定义。"
    };
  }

  const targetBounds = getEffectiveTouchPixelBounds(targetElement, imageWidth, imageHeight);
  if (!targetBounds) {
    return {
      status: "unavailable",
      summary_text: "尚未定义触控区域，无法执行间距检查。",
      detail_text: "请先设置触控区域或选择平台建议区域。"
    };
  }

  // Convert target bounds to CSS logical coordinates
  const targetLogical = {
    x: targetBounds.x * logicalMapping.scale_x,
    y: targetBounds.y * logicalMapping.scale_y,
    width: targetBounds.width * logicalMapping.scale_x,
    height: targetBounds.height * logicalMapping.scale_y
  };

  // If >= 24x24 CSS px, size condition met
  if (targetLogical.width >= 24 && targetLogical.height >= 24) {
    return {
      status: "size_condition_met",
      summary_text: "达到 SC 2.5.8 的尺寸条件",
      detail_text: `当前触控区域为 ${Math.round(targetLogical.width)} × ${Math.round(targetLogical.height)} CSS px，已满足 24×24 CSS px 独立目标尺寸要求，无需依赖间距例外。`,
    };
  }

  // Undersized: Evaluate in CSS logical coordinates with 24 CSS px diameter circle at center (radius = 12 CSS px)
  const targetCenterX = targetLogical.x + targetLogical.width / 2;
  const targetCenterY = targetLogical.y + targetLogical.height / 2;
  const targetRadius = 12; // 12 CSS px

  const conflictingIds: string[] = [];

  for (const other of allElements) {
    if (other.element_id === targetElement.element_id) continue;
    if (other.interaction_type === "none") continue;

    const otherBounds = getEffectiveTouchPixelBounds(other, imageWidth, imageHeight);
    if (!otherBounds) continue;

    const otherLogical = {
      x: otherBounds.x * logicalMapping.scale_x,
      y: otherBounds.y * logicalMapping.scale_y,
      width: otherBounds.width * logicalMapping.scale_x,
      height: otherBounds.height * logicalMapping.scale_y
    };

    if (otherLogical.width < 24 || otherLogical.height < 24) {
      const otherCenterX = otherLogical.x + otherLogical.width / 2;
      const otherCenterY = otherLogical.y + otherLogical.height / 2;
      const otherRadius = 12; // 12 CSS px

      if (circleIntersectsCircle(targetCenterX, targetCenterY, targetRadius, otherCenterX, otherCenterY, otherRadius)) {
        conflictingIds.push(other.element_id);
      }
    } else {
      if (circleIntersectsRectangle(targetCenterX, targetCenterY, targetRadius, otherLogical.x, otherLogical.y, otherLogical.width, otherLogical.height)) {
        conflictingIds.push(other.element_id);
      }
    }
  }

  if (conflictingIds.length > 0) {
    return {
      status: "spacing_circle_conflict",
      summary_text: "当前 spacing condition 存在冲突，需要调整目标尺寸、位置或进一步检查其他适用例外。",
      detail_text: "在 24 CSS px 直径间距圆范围内检测到相邻触控目标。根据 SC 2.5.8，需进一步确认是否存在内联文本、浏览器默认控件或基本呈现等例外。",
      conflicting_element_ids: conflictingIds
    };
  }

  return {
    status: "spacing_circle_clear",
    summary_text: "在当前已定义的触控目标中，未发现 SC 2.5.8 spacing circle 交叠。",
    detail_text: "该结果仅覆盖当前已定义的触控目标，仍需结合 Equivalent / Inline / User Agent Control / Essential 等适用条件判断完整 SC 结果。"
  };
}

/**
 * Touch Edit Lifecycle Helper: Create initial editing snapshot.
 */
export function createTouchEditSnapshot(
  element: DesignElement,
  imageWidth: number,
  imageHeight: number,
  logicalMapping?: LogicalUnitMapping
): TouchEditSnapshot {
  let draftBounds: NormalizedBounds;
  let draftPixel: PixelBounds;
  let draftSource: TouchBoundsSource;
  let draftClipped: boolean | undefined = element.touch_bounds_reference_clipped;
  let draftWarning: string | undefined = element.touch_bounds_reference_warning;

  if (element.touch_bounds) {
    draftBounds = { ...element.touch_bounds };
    draftPixel = element.touch_bounds_pixel
      ? { ...element.touch_bounds_pixel }
      : {
          x: Math.round(draftBounds.x * imageWidth),
          y: Math.round(draftBounds.y * imageHeight),
          width: Math.round(draftBounds.width * imageWidth),
          height: Math.round(draftBounds.height * imageHeight)
        };
    draftSource = element.touch_bounds_source || "user_defined";
  } else {
    const refRes = (logicalMapping && logicalMapping.platform !== "custom")
      ? generateCenteredReferenceTouchBounds(
          element.image_pixel_bounds,
          imageWidth,
          imageHeight,
          logicalMapping.platform,
          logicalMapping
        )
      : null;

    if (refRes) {
      draftBounds = refRes.normalized_bounds;
      draftPixel = refRes.pixel_bounds;
      draftSource = "platform_reference";
      draftClipped = refRes.is_clipped;
      draftWarning = refRes.clip_warning;
    } else {
      draftBounds = { ...element.normalized_bounds };
      draftPixel = { ...element.image_pixel_bounds };
      draftSource = "visual_copy";
      draftClipped = undefined;
      draftWarning = undefined;
    }
  }

  return {
    element_id: element.element_id,
    initial_touch_bounds: element.touch_bounds ? { ...element.touch_bounds } : undefined,
    initial_touch_bounds_pixel: element.touch_bounds_pixel ? { ...element.touch_bounds_pixel } : undefined,
    initial_touch_bounds_source: element.touch_bounds_source,
    initial_touch_bounds_reference_clipped: element.touch_bounds_reference_clipped,
    initial_touch_bounds_reference_warning: element.touch_bounds_reference_warning,
    initial_copied_from_element_id: element.copied_from_element_id,
    initial_copied_from_element_label: element.copied_from_element_label,
    draft_touch_bounds: draftBounds,
    draft_touch_bounds_pixel: draftPixel,
    draft_touch_bounds_source: draftSource,
    draft_touch_bounds_reference_clipped: draftClipped,
    draft_touch_bounds_reference_warning: draftWarning,
    draft_copied_from_element_id: element.copied_from_element_id,
    draft_copied_from_element_label: element.copied_from_element_label,
    is_modified: false
  };
}

/**
 * Touch Edit Lifecycle Helper: Commit draft changes into formal element state on Done.
 */
export function applyTouchEditDraftToElement(
  element: DesignElement,
  snapshot: TouchEditSnapshot
): DesignElement {
  const finalSource: TouchBoundsSource = snapshot.is_modified
    ? "user_defined"
    : snapshot.draft_touch_bounds_source;

  return {
    ...element,
    touch_bounds: { ...snapshot.draft_touch_bounds },
    touch_bounds_pixel: { ...snapshot.draft_touch_bounds_pixel },
    touch_bounds_source: finalSource,
    touch_bounds_reference_clipped: snapshot.is_modified ? undefined : snapshot.draft_touch_bounds_reference_clipped,
    touch_bounds_reference_warning: snapshot.is_modified ? undefined : snapshot.draft_touch_bounds_reference_warning,
    copied_from_element_id: finalSource === "copied_from_element" ? snapshot.draft_copied_from_element_id : undefined,
    copied_from_element_label: finalSource === "copied_from_element" ? snapshot.draft_copied_from_element_label : undefined,
    last_modified_source: "manual"
  };
}

/**
 * Touch Edit Lifecycle Helper: Revert element state back to pre-edit snapshot on Cancel.
 */
export function revertTouchEditDraft(
  element: DesignElement,
  snapshot: TouchEditSnapshot
): DesignElement {
  return {
    ...element,
    touch_bounds: snapshot.initial_touch_bounds ? { ...snapshot.initial_touch_bounds } : undefined,
    touch_bounds_pixel: snapshot.initial_touch_bounds_pixel ? { ...snapshot.initial_touch_bounds_pixel } : undefined,
    touch_bounds_source: snapshot.initial_touch_bounds_source,
    touch_bounds_reference_clipped: snapshot.initial_touch_bounds_reference_clipped,
    touch_bounds_reference_warning: snapshot.initial_touch_bounds_reference_warning,
    copied_from_element_id: snapshot.initial_copied_from_element_id,
    copied_from_element_label: snapshot.initial_copied_from_element_label
  };
}

/**
 * Resolves touch region provenance:
 * - confirmed_touch_bounds: user explicitly adjusted or applied platform reference
 * - visual_bounds_proxy: touch bounds not set, visual box temporarily copied/used as fallback proxy
 * - missing: no bounds exist
 */
export function resolveTouchSourceProvenance(element: DesignElement): TouchSourceProvenance {
  if (!element.touch_bounds && !element.image_pixel_bounds) {
    return "missing";
  }
  if (!element.touch_bounds) {
    return "visual_bounds_proxy";
  }
  if (element.touch_bounds_source === "visual_copy") {
    return "visual_bounds_proxy";
  }
  if (
    element.touch_bounds_source === "user_defined" ||
    element.touch_bounds_source === "platform_reference" ||
    element.touch_bounds_source === "copied_from_element"
  ) {
    return "confirmed_touch_bounds";
  }
  return "confirmed_touch_bounds";
}

/**
 * Derive qualitative touch reasonableness output without numeric score or unverified spacing heuristics.
 */
export function deriveTouchReviewStatus(
  element: DesignElement,
  nearestInfo: NearestTouchTargetResult | null,
  platform: "web" | "ios" | "android" | "custom" | "unknown" = "unknown",
  logicalMapping?: LogicalUnitMapping,
  wcagSpacing?: WcagSpacingEvaluation
): TouchReviewResult {
  if (element.interaction_type === "none") {
    return {
      status: "not_applicable",
      reasons: ["当前元素未定义为可交互对象，不执行触控范围与目标尺寸评估。"],
      recommendations: []
    };
  }

  const provenance = resolveTouchSourceProvenance(element);
  const isProxy = provenance === "visual_bounds_proxy";
  const reasons: string[] = [];
  const recommendations: string[] = [];

  // 1. Clipped Reference Check
  let isClipped = false;
  if (element.touch_bounds_reference_clipped) {
    isClipped = true;
    reasons.push("⚠️ 建议触控区域超出当前截图范围，仅能确认可见部分。");
    recommendations.push("建议触控区域超出截图范围，无法确认完整平台目标是否达标，建议提供完整截图或按可见范围调整。");
  }

  // 2. Overlap Check
  let isOverlap = false;
  if (nearestInfo && nearestInfo.overlap && nearestInfo.overlap.is_overlapping) {
    isOverlap = true;
    reasons.push(`⚠️ 与相邻触控目标 (${nearestInfo.nearest_element_label}) 存在触控重叠 (重叠面积 ${nearestInfo.overlap.overlap_area} px²)`);
    recommendations.push("当前两个触控区域存在重叠，建议调整触控范围或元素间距以消除点击歧义。");
  } else if (nearestInfo) {
    const spacingStr = nearestInfo.distance_logical !== undefined
      ? `${nearestInfo.distance_logical} ${nearestInfo.logical_unit}`
      : `${nearestInfo.distance_px} px`;
    reasons.push(`✓ 与最近触控目标 (${nearestInfo.nearest_element_label}) 无重叠`);
    reasons.push(`最近触控间距：${spacingStr}`);
  } else {
    reasons.push("✓ 当前未发现其他相邻触控目标");
  }

  // 3. Platform Target Size Check
  let sizeVerdict: "meets" | "below" | "needs_info" | "no_rule" = "no_rule";

  if (!logicalMapping || platform === "custom" || platform === "unknown") {
    if (platform === "unknown") {
      sizeVerdict = "no_rule";
      reasons.push("ℹ️ 未知/通用平台，无预设平台尺寸阈值，仅记录测量值。");
    } else if (platform === "custom") {
      sizeVerdict = "no_rule";
      reasons.push("ℹ️ 自定义单位模式，无预设平台尺寸阈值，仅记录测量值。");
    } else {
      sizeVerdict = "needs_info";
      reasons.push("ℹ️ 尚未建立设计尺寸基准，需配置设计基准或触控范围以进行评估。");
    }
  } else if (element.target_size_evaluation) {
    const evalRes = element.target_size_evaluation;
    if (evalRes.status === "meets_default" || evalRes.status === "condition_met") {
      sizeVerdict = "meets";
      reasons.push(`✓ 达到平台当前尺寸参考 (${evalRes.measured_width} × ${evalRes.measured_height} ${evalRes.unit})`);
    } else if (evalRes.status === "meets_minimum") {
      sizeVerdict = "below";
      reasons.push(`⚠️ 达到 Apple HIG 最小尺寸 (28pt)，但低于默认推荐尺寸 (44pt)`);
      recommendations.push("图标视觉尺寸无需放大，可通过扩大透明触控区域达到平台推荐尺寸。");
    } else if (evalRes.status === "below_minimum" || evalRes.status === "needs_review") {
      sizeVerdict = "below";
      if (platform === "android") {
        reasons.push(`⚠️ 低于 Android 推荐触控尺寸 (48dp)`);
        recommendations.push("当前触控区域低于 Android 48dp 推荐尺寸，可通过扩大透明点击区域进行优化。");
      } else if (platform === "ios") {
        reasons.push(`⚠️ 低于 Apple HIG 最小控件尺寸 (28pt)`);
        recommendations.push("图标视觉尺寸无需放大，可通过扩大透明触控区域达到平台参考尺寸。");
      } else if (platform === "web") {
        if (wcagSpacing && wcagSpacing.status === "spacing_circle_conflict") {
          reasons.push(`⚠️ 低于 24 CSS px 且 24px 间距圆存在交叠冲突`);
          recommendations.push("建议调整触控目标尺寸至 24×24 CSS px 或增大与周边元素的间距。");
        } else if (wcagSpacing && wcagSpacing.status === "spacing_circle_clear") {
          sizeVerdict = "meets";
          reasons.push(`ℹ️ 低于 24 CSS px，但满足 24px 间距圆例外条件`);
        } else {
          reasons.push(`⚠️ 低于 24 CSS px 尺寸条件`);
        }
      }
    }
  } else {
    // If no target_size_evaluation was precomputed on element, compute directly from pixel bounds & logicalMapping
    const touchPx = element.image_pixel_bounds;
    if (touchPx && logicalMapping) {
      const mapped = mapPixelBoundsToLogical(touchPx, logicalMapping);
      const minTarget = platform === "android" ? 48 : platform === "web" ? 24 : 44;
      const uStr = logicalMapping.unit === "css_px" ? "CSS px" : logicalMapping.unit;
      if (mapped.width >= minTarget && mapped.height >= minTarget) {
        sizeVerdict = "meets";
        reasons.push(`✓ 达到平台当前尺寸参考 (${mapped.width} × ${mapped.height} ${uStr})`);
      } else {
        sizeVerdict = "below";
        reasons.push(`⚠️ 估算触控尺寸 (${mapped.width} × ${mapped.height} ${uStr}) 低于平台参考`);
      }
    } else {
      sizeVerdict = "needs_info";
      reasons.push("ℹ️ 触控尺寸待结合设计基准进行计算。");
    }
  }

  // Derive final status
  let finalStatus: TouchReviewStatus = "meets";

  if (isOverlap || isClipped) {
    finalStatus = "attention";
  } else if (sizeVerdict === "no_rule") {
    finalStatus = "measurement_only";
  } else if (sizeVerdict === "needs_info") {
    finalStatus = "needs_info";
  } else if (isProxy) {
    if (sizeVerdict === "below") {
      finalStatus = "estimated_attention";
      reasons.unshift("⚠️ 基于可视范围估算偏小 (建议确认实际触控范围)");
    } else {
      finalStatus = "estimated_meets";
      reasons.unshift("ℹ️ 基于可视范围估算 (需确认实际触控范围)");
    }
  } else if (sizeVerdict === "below") {
    finalStatus = "attention";
  } else {
    finalStatus = "meets";
  }

  return {
    status: finalStatus,
    reasons,
    recommendations
  };
}
