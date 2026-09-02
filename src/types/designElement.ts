export type ElementType = "text" | "button" | "icon" | "image" | "input" | "other";

export type InteractionType = "none" | "tap" | "swipe" | "tap_swipe";

export type SwipeDirection = "horizontal" | "vertical" | "both";

export type TouchBoundsSource =
  | "platform_reference"
  | "visual_copy"
  | "copied_from_element"
  | "user_defined";

export type TouchSourceProvenance =
  | "confirmed_touch_bounds"
  | "visual_bounds_proxy"
  | "missing";

export type TouchReviewStatus =
  | "not_applicable"
  | "meets"
  | "attention"
  | "estimated_meets"
  | "estimated_attention"
  | "measurement_only"
  | "needs_info"
  | "good"; // backward compatibility alias for "meets"

export type CalibrationMode = "full_screen" | "cropped";

export type CalibrationQuality = "exact" | "estimated" | "relative_only";

export type LogicalUnit = "css_px" | "pt" | "dp";

export type LogicalMappingQuality = "exact_profile" | "user_specified" | "inferred_profile" | "unavailable";

export type ResultBasis = "relative" | "inferred" | "user_confirmed" | "exact" | "simulated";

export type { EvaluationTier } from "./capability";

export type TargetSizeStatus =
  | "condition_met"
  | "needs_review"
  | "meets_default"
  | "meets_minimum"
  | "below_minimum";

// Text Size & Typography Types
export type TextLayout = "single_line" | "multi_line";

export type TextVisualMeasurementTarget =
  | "single_rendered_line"
  | "whole_text_bounds"
  | "representative_character";

export type TextRole = "body" | "caption" | "label" | "heading" | "other";

export type TextSizeUnit = "pt" | "sp" | "css_px";

export type TextSizeSource =
  | "estimated_from_visual_bounds"
  | "estimated_from_character_height"
  | "user_confirmed"
  | "design_source";

export type EstimatedTextSizeSource =
  | "estimated_from_single_line_visual_height"
  | "estimated_from_character_height";

export type TextWeightCategory = "regular" | "bold";

export type TextSizeReviewStatus =
  | "meets_default"
  | "meets_minimum"
  | "below_minimum"
  | "needs_info"
  | "pending_info"
  | "attention"
  | "custom_unit"
  | "not_applicable"
  | "measurement_only";

export type TextEvaluationBasis = "confirmed_source" | "screenshot_estimate" | "measurement_only" | "missing_basis";

export interface TextSizeEvaluation {
  status: TextSizeReviewStatus;
  measured_value?: number;
  unit?: TextSizeUnit;
  source: TextSizeSource | EstimatedTextSizeSource;
  summary_text: string;
  detail_text: string;
  rule_id?: string;
  rule_layer?: string;
  reference?: string;
  reference_status?: string;
  contrast_category_auto?: "normal" | "large";
  result_basis?: ResultBasis;
  evaluation_basis?: TextEvaluationBasis;
  is_estimated?: boolean;
}

export interface NormalizedBounds {
  x: number; // 0.0 to 1.0
  y: number; // 0.0 to 1.0
  width: number; // 0.0 to 1.0
  height: number; // 0.0 to 1.0
}

export interface PixelBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PhysicalGeometry {
  width_px: number;
  height_px: number;
  width_mm?: number;
  height_mm?: number;
  screen_width_mm?: number;
  screen_height_mm?: number;
  ppi?: number;
  calibration_quality: CalibrationQuality;
  is_calibrated: boolean;
  calibration_message?: string;
  allow_estimation?: boolean;
}

export type TargetPlatform = "web" | "ios" | "android" | "custom" | "unknown";

export interface LogicalUnitMapping {
  platform: TargetPlatform;
  unit: LogicalUnit;
  image_reference_width: number;
  logical_reference_width: number;
  image_reference_height?: number;
  logical_reference_height?: number;
  scale_x: number; // logical_width / image_width
  scale_y: number; // logical_height / image_height
  quality: LogicalMappingQuality;
  warning?: string;
}

export interface TargetSizeEvaluation {
  unit: LogicalUnit;
  measured_width: number;
  measured_height: number;
  min_side: number;
  threshold_width: number;
  threshold_height: number;
  status: TargetSizeStatus;
  summary_text: string;
  detail_text: string;
  rule_id: string;
  rule_layer: string;
  reasoning_type: string;
  reference: string;
  reference_status: string;
  claim_strength: string;
  result_basis?: ResultBasis;
}

export type ColorState = "confirmed" | "provisional" | "missing";

export interface ContrastEvaluation {
  evaluation_type?: "text" | "non_text";
  status?: "confirmed" | "provisional" | "missing";
  foreground_hex: string;
  foreground_rgb: [number, number, number];
  foreground_state?: ColorState;
  background_hex: string;
  background_rgb: [number, number, number];
  background_state?: ColorState;
  foreground_luminance: number;
  background_luminance: number;
  contrast_ratio: number;
  text_size_category?: "normal" | "large";
  threshold: number;
  passed: boolean;
  rule_id: string;
  rule_layer: string;
  reasoning_type: string;
  reference: string;
  reference_status: string;
  claim_strength: string;
  provisional_message?: string;
  result_basis?: ResultBasis;
}

export interface DesignElement {
  element_id: string;
  source: "manual";
  element_type: ElementType;
  label?: string;
  normalized_bounds: NormalizedBounds;
  image_pixel_bounds: PixelBounds;
  calibration_mode: CalibrationMode;
  allow_estimation?: boolean;
  physical_geometry?: PhysicalGeometry;
  logical_mapping?: LogicalUnitMapping;
  target_size_evaluation?: TargetSizeEvaluation;
  // Interaction & Touch bounds
  interaction_type?: InteractionType;
  swipe_direction?: SwipeDirection;
  touch_bounds?: NormalizedBounds;
  touch_bounds_pixel?: PixelBounds;
  touch_bounds_source?: TouchBoundsSource;
  touch_bounds_reference_clipped?: boolean;
  touch_bounds_reference_warning?: string;
  copied_from_element_id?: string;
  copied_from_element_label?: string;
  touch_review_status?: TouchReviewStatus;
  touch_review_reasons?: string[];
  // Typography & Text Specification
  text_layout?: TextLayout;
  text_visual_measurement_target?: TextVisualMeasurementTarget;
  text_role?: TextRole;
  text_size_value?: number;
  text_size_unit?: TextSizeUnit;
  text_size_source?: TextSizeSource;
  text_weight_category?: TextWeightCategory;
  text_size_evaluation?: TextSizeEvaluation;
  // Screenshot font size estimate (heuristic, distinct from source font size)
  estimated_text_size_value?: number;
  estimated_text_size_unit?: TextSizeUnit;
  estimated_text_size_source?: EstimatedTextSizeSource;
  // Character height measurement (screenshot-only rendered character evidence)
  character_height_px?: number;
  character_height_design_height?: number;
  character_height_source?: "measured_rendered_character" | "confirmed_element_bounds" | "unmeasured";
  character_height_physical_mm?: number;
  character_height_visual_angle?: {
    deg: number;
    arcmin: number;
    provenance: string;
    assumptions?: string[];
  };
  // Visual contrast
  foreground_color?: string;
  foreground_color_state?: ColorState;
  foreground_color_provenance?: "screenshot_sample" | "eyedropper_sample" | "manual_input" | "legacy_provisional";
  background_color?: string;
  background_color_state?: ColorState;
  background_color_provenance?: "screenshot_sample" | "eyedropper_sample" | "manual_input" | "legacy_provisional";
  text_size_category?: "normal" | "large";
  contrast_evaluation?: ContrastEvaluation;
  last_modified_source?: "manual";
  created_at: string;
}
