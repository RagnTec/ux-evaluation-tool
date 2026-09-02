import type {
  DesignElement,
  LogicalUnitMapping,
  CalibrationQuality,
  TouchSourceProvenance,
  TextSizeSource,
  EstimatedTextSizeSource,
  TextVisualMeasurementTarget,
  TargetPlatform
} from "../types/designElement";
import type { DerivedEvaluationContext } from "./interactionGeometry";
import { formatAreaShare } from "./presentationPolicy";
import {
  calculateVisualAreaMetrics,
  deriveTouchReviewStatus,
  resolveTouchSourceProvenance,
  getEffectiveTouchPixelBounds,
  recomputeElementDerivedState,
  type NearestTouchTargetResult,
  type TouchReviewResult
} from "./interactionGeometry";
import { calculateMinimumSide } from "./evaluationRouting";
import { mapPixelBoundsToLogical } from "./logicalMapping";
import { computeRelativeTypographyMetrics } from "./textSizeEvaluation";
import { computeElementVisualAngle } from "../adapters/humanFactorsAdapter";
import {
  elementTypeLabels,
  interactionTypeLabels,
  touchSourceProvenanceLabels,
  touchReviewStatusLabels,
  getElementTypeLabel,
  getInteractionTypeLabel,
  getTouchSourceProvenanceLabel,
  getTouchReviewStatusLabel,
  getElementDisplayName
} from "./labels";
import {
  getUnifiedResultExplanation,
  assessTextLayoutCapacity,
  type EvaluationConclusionState,
  type UnifiedResultExplanation,
  type ElementActionableFinding,
  type ConclusionPresentationState,
  getConclusionPresentationState
} from "./impactRecommendation";
import { formatNumericValue } from "./metricFormatting";
import type { ScenarioScope } from "../humanFactors/types";
import type { Locale } from "../i18n/types";


export interface ElementPresentationModel {
  elementId: string;
  label: string;
  elementType: string;
  elementTypeLabel: string;
  actionableFindings: ElementActionableFinding[];

  // Visual Bounds
  visualPxWidth: number;
  visualPxHeight: number;
  visualPxDisplay: string;
  visualAreaDisplay: string;
  screenSharePercentage: number;
  screenShareLabel: string;
  screenShareDisplay: string;
  minSideDisplay: string;

  // Logical Design Dimensions
  isLogicalConfigured: boolean;
  logicalWidth?: number;
  logicalHeight?: number;
  logicalUnit?: string;
  logicalDisplay?: string;
  scaleRatioDisplay?: string;
  logicalUnavailableGuidance?: string;

  // Physical Dimensions
  isPhysicalAvailable: boolean;
  physicalWidthMm?: number;
  physicalHeightMm?: number;
  physicalDisplay?: string;
  physicalQuality?: CalibrationQuality;
  physicalProvenance?: string;
  physicalUnavailableReason?: string;

  // Human Factors / Visual Angle
  isVisualAngleAvailable: boolean;
  visualAngleHorizontalDeg?: number;
  visualAngleVerticalDeg?: number;
  visualAngleHorizontalArcmin?: number;
  visualAngleVerticalArcmin?: number;
  visualAngleDisplay?: string;
  visualAngleDetailDisplay?: string;
  visualAngleViewingDistanceDisplay?: string;
  visualAngleProvenance?: string;
  visualAngleAssumptions?: string[];
  visualAngleUnavailableGuidance?: string;
  visualAngleTextSemanticNote?: string;

  // Typography (Text only)
  isText: boolean;
  textVisualMeasurementTarget?: TextVisualMeasurementTarget;
  isSingleLineVisual?: boolean;
  textVisualHeightDisplay?: string;
  textDesignHeightDisplay?: string;
  textPhysicalHeightDisplay?: string;
  textVisualAngleDisplay?: string;
  textVisualShareDisplay?: string;
  relativeTypographyDisplay?: string;
  textSizeStatus: "user_confirmed" | "needs_confirmation" | "missing_logical_basis" | "not_text";
  textSizeDisplay: string;
  textSizeGuidance?: string;
  estimatedTextSizeValue?: number;
  estimatedTextSizeUnit?: string;
  estimatedTextSizeSource?: EstimatedTextSizeSource;
  estimatedTextSizeSourceLabel?: string;
  estimatedTextSizeStatus: "available" | "unavailable_multiline_whole" | "missing_logical_basis" | "not_text";
  estimatedTextSizeDisplay: string;
  estimatedTextSizeGuidance?: string;
  estimatedTextSizeAdvisory?: string;
  characterHeightVisualAngleArcmin?: number;
  characterHeightVisualAngleDisplay?: string;
  characterHeightSourceLabel?: string;

  // Interaction & Touch
  isInteractive: boolean;

  interactionType: string;
  interactionTypeLabel: string;
  hasTouchBounds: boolean;
  touchProvenance: TouchSourceProvenance;
  touchProvenanceLabel: string;
  touchDimensionsDisplay?: string;
  nearestSpacingDisplay: string;
  touchReview: TouchReviewResult;
  touchVerdictLabel: string;
  touchVerdictBadgeClass: string;

  // Contrast
  hasContrast: boolean;
  contrastRatio?: number;
  contrastRatioDisplay?: string;
  contrastPassed?: boolean;
  contrastState: "confirmed" | "provisional" | "missing";
  contrastStatusLabel: string;
  foregroundColor?: string;
  backgroundColor?: string;

  // Unified Evaluation Conclusion (Consistent across Card, Inspector, Preview & HTML)
  conclusionState: EvaluationConclusionState;
  conclusionStateLabel: string;
  conclusionStateBadgeClass: string;
  conclusionPresentation: ConclusionPresentationState;
  conclusion: string;
  whyItMatters: string;
  unifiedExplanation: UnifiedResultExplanation;
  // Evaluation tier (derived from highest active rule layer)
  highestTier?: string;
  highestTierLabel?: string;
}

/**
 * Derives scenario scope ensuring human factors references are gated strictly by structured scenario domain.
 * Free text and context environment keywords MUST NOT silently determine normative domain rules.
 */
export function deriveScenarioScope(
  _scenario?: string,
  _contextEnvironment?: string,
  _contextOperationState?: string,
  scenarioDomain?: string
): ScenarioScope {
  let normalizedDomain: "automotive" | "mobile" | "web" | "generic_display" | "unknown" = "unknown";
  if (scenarioDomain === "automotive") {
    normalizedDomain = "automotive";
  } else if (scenarioDomain === "mobile") {
    normalizedDomain = "mobile";
  } else if (scenarioDomain === "web" || scenarioDomain === "desktop") {
    normalizedDomain = "web";
  } else if (scenarioDomain === "generic_display") {
    normalizedDomain = "generic_display";
  } else {
    normalizedDomain = "unknown";
  }

  return {
    domain: normalizedDomain,
    observer_role: "unspecified",
    operation_state: "unspecified",
    criticality: "normal_interaction",
    time_criticality: "unspecified"
  };
}

/**
 * Builds a pure presentation model for a DesignElement ensuring consistent
 * display semantics across Summary cards, Element Inspector, and Report Preview.
 */
export function buildElementPresentationModel(
  rawElement: DesignElement,
  context: DerivedEvaluationContext,
  nearestInfo?: NearestTouchTargetResult | null,
  targetPlatform: TargetPlatform = "unknown",
  allElements?: DesignElement[],
  locale: Locale = "zh-CN"
): ElementPresentationModel {
  const element = recomputeElementDerivedState(rawElement, context);
  if (rawElement.physical_geometry) {
    element.physical_geometry = rawElement.physical_geometry;
  }

  const imageWidth = context.imageNaturalWidth || 0;
  const imageHeight = context.imageNaturalHeight || 0;
  const calMode = element.calibration_mode || context.calibrationMode;
  const logical = context.logicalMapping;
  const effectivePlatform = logical?.platform || targetPlatform;

  // 1. Visual metrics
  const pxW = element.image_pixel_bounds.width;
  const pxH = element.image_pixel_bounds.height;
  const visualPxDisplay = `${pxW} × ${pxH} px`;

  const areaShare = formatAreaShare(element.image_pixel_bounds, imageWidth, imageHeight, calMode, locale);
  const visualArea = calculateVisualAreaMetrics(
    element.image_pixel_bounds,
    imageWidth,
    imageHeight,
    logical || undefined,
    element.physical_geometry
  );
  const visualAreaDisplay = visualArea ? `${visualArea.pixel_area.toLocaleString()} px²` : `${pxW * pxH} px²`;
  const screenShareDisplay = `${areaShare.label} ${areaShare.percentageText}`;

  const minSide = calculateMinimumSide(element.image_pixel_bounds, element.physical_geometry);
  const minSideDisplay = minSide?.min_mm ? `${minSide.min_px} px (${locale === "en" ? "≈ " : "约 "}${minSide.min_mm} mm)` : `${minSide.min_px} px`;

  // 2. Logical design dimensions
  const scaleX = logical ? (logical.scale_x || ((logical as any).scale_factor ? 1 / (logical as any).scale_factor : 0)) : 0;
  const scaleY = logical ? (logical.scale_y || scaleX) : 0;
  const isLogicalConfigured = !!(logical && logical.quality !== "unavailable" && scaleX > 0);
  let logicalDisplay: string | undefined = undefined;
  let scaleRatioDisplay: string | undefined = undefined;
  let logicalUnavailableGuidance: string | undefined = undefined;

  let logicalWidth: number | undefined = undefined;
  let logicalHeight: number | undefined = undefined;
  let logicalUnit: string | undefined = undefined;

  if (isLogicalConfigured && logical) {
    logicalWidth = Math.round(pxW * scaleX * 10) / 10;
    logicalHeight = Math.round(pxH * scaleY * 10) / 10;
    logicalUnit = logical.unit === "css_px" ? "CSS px" : logical.unit;
    logicalDisplay = `${logicalWidth} × ${logicalHeight} ${logicalUnit}`;
    scaleRatioDisplay = `1 ${logicalUnit} = ${(1 / scaleX).toFixed(2)} px`;
  } else {
    logicalUnavailableGuidance = locale === "en"
      ? "Provide design frame width (e.g. 390 pt / 360 dp) to enable logical design unit evaluation."
      : "补充设计稿基准宽度（如 390 pt / 360 dp）后可启用设计尺寸评估。";
  }

  // 3. Physical dimensions
  const phys = element.physical_geometry;
  const isPhysicalAvailable = !!(phys && phys.is_calibrated && phys.width_mm && phys.height_mm);
  let physicalDisplay: string | undefined = undefined;
  let physicalProvenance: string | undefined = undefined;
  let physicalUnavailableReason: string | undefined = undefined;

  if (isPhysicalAvailable && phys) {
    if (phys.calibration_quality === "exact") {
      physicalDisplay = `${locale === "en" ? "≈ " : "约 "}${phys.width_mm} × ${phys.height_mm} mm`;
      physicalProvenance = locale === "en" ? "Hardware Calibrated" : "硬件校准";
    } else {
      physicalDisplay = `${locale === "en" ? "≈ " : "约 "}${phys.width_mm} × ${phys.height_mm} mm`;
      physicalProvenance = calMode === "cropped" ? (locale === "en" ? "Cropped Screenshot Estimate" : "局部截图估算") : (locale === "en" ? "Scaled Fit Estimate" : "等比贴合估算");
    }
  } else {
    if (context.calibrationMode === "full_screen" && context.resolution && context.imageNaturalWidth && context.imageNaturalHeight) {
      physicalUnavailableReason = locale === "en" ? "Screenshot aspect ratio does not match screen resolution" : "截图比例与屏幕分辨率不一致";
    } else {
      physicalUnavailableReason = locale === "en" ? "Screen hardware parameters not configured" : "未配置屏幕硬件参数";
    }
  }

  // 4. Visual Angle (Human Factors)
  const visualAngle = computeElementVisualAngle(element, imageWidth, imageHeight, context.displaySize, context.resolution, context.viewingDistance);
  const isVisualAngleAvailable = !!(visualAngle && visualAngle.vertical_arcmin !== undefined);
  let visualAngleDisplay: string | undefined = undefined;
  let visualAngleDetailDisplay: string | undefined = undefined;
  let visualAngleViewingDistanceDisplay: string | undefined = undefined;
  let visualAngleProvenance: string | undefined = undefined;
  let visualAngleAssumptions: string[] | undefined = undefined;
  let visualAngleUnavailableGuidance: string | undefined = undefined;
  let visualAngleTextSemanticNote: string | undefined = undefined;

  if (isVisualAngleAvailable && visualAngle) {
    const isEstimated = visualAngle.quality === "estimated";
    const prefix = isEstimated ? (locale === "en" ? "≈ " : "约 ") : "";
    const hDeg = formatNumericValue(visualAngle.horizontal_deg, 2);
    const vDeg = formatNumericValue(visualAngle.vertical_deg, 2);
    const hArcmin = formatNumericValue(visualAngle.horizontal_arcmin, 1);
    const vArcmin = formatNumericValue(visualAngle.vertical_arcmin, 1);

    if (visualAngle.horizontal_deg && visualAngle.vertical_deg) {
      visualAngleDisplay = `${prefix}${hDeg}° × ${vDeg}°`;
      visualAngleDetailDisplay = locale === "en" ? `H ${hDeg}° (${hArcmin}′) × V ${vDeg}° (${vArcmin}′)` : `水平 ${hDeg}° (${hArcmin}′) × 垂直 ${vDeg}° (${vArcmin}′)`;
    } else if (visualAngle.horizontal_deg) {
      visualAngleDisplay = `${prefix}H ${hDeg}°`;
      visualAngleDetailDisplay = locale === "en" ? `H ${hDeg}° (${hArcmin}′)` : `水平 ${hDeg}° (${hArcmin}′)`;
    } else {
      visualAngleDisplay = `${prefix}V ${vDeg}°`;
      visualAngleDetailDisplay = locale === "en" ? `V ${vDeg}° (${vArcmin}′)` : `垂直 ${vDeg}° (${vArcmin}′)`;
    }

    visualAngleViewingDistanceDisplay = locale === "en" ? `Based on ${visualAngle.viewing_distance_mm} mm viewing distance` : `基于 ${visualAngle.viewing_distance_mm} mm 观看距离`;
    visualAngleProvenance = isEstimated ? (locale === "en" ? "Estimated Visual Angle" : "估算视角") : (locale === "en" ? "Calculated Visual Angle" : "精确计算视角");
    visualAngleAssumptions = visualAngle.assumptions;

    if (element.element_type === "text") {
      visualAngleTextSemanticNote = locale === "en" ? "Visual angle is derived from visible bounding box; does not represent individual character height or font size." : "当前视觉角基于圈选文字区域的可视边界计算，不等同于字符高度、x-height 或源字号。";
    }
  } else {
    if (isPhysicalAvailable && !context.viewingDistance) {
      visualAngleUnavailableGuidance = locale === "en" ? "Provide viewing distance (e.g. 500 mm / 50 cm) to calculate visual angle." : "补充观看距离（如 500 mm / 50 cm）后可计算人因视角大小。";
    } else if (!isPhysicalAvailable && context.viewingDistance) {
      visualAngleUnavailableGuidance = locale === "en" ? "Configure screen hardware size and resolution to calculate visual angle." : "配置屏幕硬件尺寸与分辨率后可计算人因视角大小。";
    } else {
      visualAngleUnavailableGuidance = locale === "en" ? "Configure screen hardware and viewing distance to calculate visual angle." : "配置屏幕硬件与观看距离后可计算人因视角大小。";
    }
  }

  // 5. Typography (Text only)
  const isText = element.element_type === "text";
  let textVisualHeightDisplay: string | undefined = undefined;
  let textDesignHeightDisplay: string | undefined = undefined;
  let textPhysicalHeightDisplay: string | undefined = undefined;
  let textVisualAngleDisplay: string | undefined = undefined;
  let textVisualShareDisplay: string | undefined = undefined;
  let relativeTypographyDisplay: string | undefined = undefined;
  let textSizeStatus: "user_confirmed" | "needs_confirmation" | "missing_logical_basis" | "not_text" = "not_text";
  let textSizeDisplay: string = locale === "en" ? "Non-text element" : "非文字元素";
  let textSizeGuidance: string | undefined = undefined;

  const textVisualTarget: TextVisualMeasurementTarget = element.text_visual_measurement_target || (element.text_layout === "multi_line" ? "whole_text_bounds" : "single_rendered_line");
  const isSingleLineVisual = isText && (textVisualTarget === "single_rendered_line" || (element.text_layout === "single_line" && textVisualTarget !== "whole_text_bounds"));

  if (isText) {
    const textPxHeight = element.image_pixel_bounds.height;
    if (isLogicalConfigured && logical) {
      const hLogical = formatNumericValue(textPxHeight * (logical.scale_y || logical.scale_x), 1);
      const uStr = logical.unit === "css_px" ? "CSS px" : logical.unit;
      textVisualHeightDisplay = `${formatNumericValue(textPxHeight, 1)} px (${hLogical} ${uStr})`;
      textDesignHeightDisplay = `${locale === "en" ? "≈ " : "约 "}${hLogical} ${uStr}`;
    } else {
      textVisualHeightDisplay = `${formatNumericValue(textPxHeight, 1)} px`;
    }

    if (phys && phys.is_calibrated && phys.height_mm) {
      textPhysicalHeightDisplay = `${locale === "en" ? "≈ " : "约 "}${formatNumericValue(phys.height_mm, 2)} mm`;
    }

    if (visualAngle && visualAngle.vertical_arcmin !== undefined) {
      textVisualAngleDisplay = `${formatNumericValue(visualAngle.vertical_arcmin, 1)}′ (${formatNumericValue(visualAngle.vertical_deg, 2)}°)`;
    }

    const relTypo = computeRelativeTypographyMetrics(element, imageHeight, allElements);
    if (relTypo) {
      textVisualShareDisplay = relTypo.relativeShareFormatted;
      relativeTypographyDisplay = relTypo.relativeRatioDisplay;
    }

    const uStr = element.text_size_unit === "css_px" ? "CSS px" : (element.text_size_unit || "pt");

    if (element.text_size_source === "user_confirmed" && element.text_size_value !== undefined) {
      textSizeStatus = "user_confirmed";
      textSizeDisplay = `${formatNumericValue(element.text_size_value, 1)} ${uStr} (${locale === "en" ? "User Confirmed" : "人工确认"})`;
    } else if (element.text_size_source === "design_source" && element.text_size_value !== undefined) {
      textSizeStatus = "user_confirmed";
      textSizeDisplay = `${formatNumericValue(element.text_size_value, 1)} ${uStr} (${locale === "en" ? "Design Source" : "设计源字号"})`;
    } else if (!isLogicalConfigured) {
      textSizeStatus = "missing_logical_basis";
      textSizeDisplay = locale === "en" ? "Unavailable" : "暂不可换算";
      textSizeGuidance = locale === "en" ? "Missing design basis. Provide design frame dimensions to scale automatically, or enter known font size directly." : "缺少设计尺寸换算依据。补充设计稿尺寸信息后可自动换算，或直接手动填写已知值。";
    } else {
      textSizeStatus = "needs_confirmation" as any;
      textSizeDisplay = locale === "en" ? "Unconfirmed" : "未确认";
      textSizeGuidance = locale === "en" ? "Source design font size unconfirmed. Enter verified font size from design specifications." : "源设计字号未确认，请输入设计源中的真实字号。";
    }
  }

  // Screenshot Font Size Estimate (Heuristic, distinct from source font size)
  let estimatedTextSizeValue: number | undefined = undefined;
  let estimatedTextSizeUnit: string | undefined = undefined;
  let estimatedTextSizeSource: EstimatedTextSizeSource | undefined = undefined;
  let estimatedTextSizeSourceLabel: string | undefined = undefined;
  let estimatedTextSizeStatus: "available" | "unavailable_multiline_whole" | "missing_logical_basis" | "not_text" = "not_text";
  let estimatedTextSizeDisplay = locale === "en" ? "Non-text element" : "非文字元素";
  let estimatedTextSizeGuidance: string | undefined = undefined;
  let estimatedTextSizeAdvisory: string | undefined = undefined;

  if (isText) {
    estimatedTextSizeValue = element.estimated_text_size_value;
    estimatedTextSizeSource = element.estimated_text_size_source;
    const estUStr = element.estimated_text_size_unit === "css_px" ? "CSS px" : (element.estimated_text_size_unit || (logical?.unit === "css_px" ? "CSS px" : logical?.unit || "pt"));
    estimatedTextSizeUnit = estUStr;

    if (element.estimated_text_size_value !== undefined) {
      estimatedTextSizeStatus = "available";
      estimatedTextSizeDisplay = `${formatNumericValue(element.estimated_text_size_value, 1)} ${estUStr}`;
      estimatedTextSizeSourceLabel = element.estimated_text_size_source === "estimated_from_character_height"
        ? (locale === "en" ? "Representative character height estimate" : "代表字符高度粗略估算")
        : (locale === "en" ? "Single-line visual height estimate" : "单行可视高度估算");
      estimatedTextSizeGuidance = locale === "en" ? "Estimated from screenshot visible height; advisory only, does not equal source font size." : "按截图可视高度粗略换算，仅供参考，不等于设计源字号。";

      // Advisory reference comparison (never formal PASS / FAIL)
      if (effectivePlatform === "ios") {
        const refVal = (element.text_role === "caption" || element.text_role === "other") ? 11 : 17;
        const diff = refVal - element.estimated_text_size_value;
        if (diff > 0) {
          estimatedTextSizeAdvisory = locale === "en"
            ? `Apple ${element.text_role === "caption" ? "Caption" : "Body"} font reference: ≥ ${refVal} pt (Estimated ≈ ${formatNumericValue(diff, 1)} pt below reference; heuristic estimate, not a formal guideline PASS/FAIL)`
            : `Apple ${element.text_role === "caption" ? "注脚" : "正文"}字号参考：≥ ${refVal} pt（估算值约低于参考值 ${formatNumericValue(diff, 1)} pt，基于截图估算，不作为正式规范通过/不通过判断）`;
        } else {
          estimatedTextSizeAdvisory = locale === "en"
            ? `Apple ${element.text_role === "caption" ? "Caption" : "Body"} font reference: ≥ ${refVal} pt (Estimated value within reference range; heuristic estimate, not a formal guideline PASS/FAIL)`
            : `Apple ${element.text_role === "caption" ? "注脚" : "正文"}字号参考：≥ ${refVal} pt（估算值已达到参考范围，基于截图估算，不作为正式规范通过/不通过判断）`;
        }
      } else if (effectivePlatform === "android") {
        const refVal = (element.text_role === "caption" || element.text_role === "other") ? 11 : 12;
        const diff = refVal - element.estimated_text_size_value;
        if (diff > 0) {
          estimatedTextSizeAdvisory = locale === "en"
            ? `Android ${element.text_role === "caption" ? "Caption" : "Body"} font reference: ≥ ${refVal} sp (Estimated ≈ ${formatNumericValue(diff, 1)} sp below reference; heuristic estimate, not a formal guideline PASS/FAIL)`
            : `Android ${element.text_role === "caption" ? "注脚" : "正文"}字号参考：≥ ${refVal} sp（估算值约低于参考值 ${formatNumericValue(diff, 1)} sp，基于截图估算，不作为正式规范通过/不通过判断）`;
        } else {
          estimatedTextSizeAdvisory = locale === "en"
            ? `Android ${element.text_role === "caption" ? "Caption" : "Body"} font reference: ≥ ${refVal} sp (Estimated value within reference range; heuristic estimate, not a formal guideline PASS/FAIL)`
            : `Android ${element.text_role === "caption" ? "注脚" : "正文"}字号参考：≥ ${refVal} sp（估算值已达到参考范围，基于截图估算，不作为正式规范通过/不通过判断）`;
        }
      }
    } else if (!isLogicalConfigured) {
      estimatedTextSizeStatus = "missing_logical_basis";
      estimatedTextSizeDisplay = locale === "en" ? "Unavailable" : "暂不可换算";
      estimatedTextSizeGuidance = locale === "en" ? "Missing design basis for logical font estimation" : "缺少设计尺寸换算依据";
    } else if (element.text_layout === "multi_line" && (element.text_visual_measurement_target === "whole_text_bounds" || !element.text_visual_measurement_target) && !element.character_height_px) {
      estimatedTextSizeStatus = "unavailable_multiline_whole";
      estimatedTextSizeDisplay = locale === "en" ? "Unavailable" : "暂不可估算";
      estimatedTextSizeGuidance = locale === "en" ? "Whole multiline text box cannot infer single-line font size." : "当前框选为完整多行文本框，无法由整段高度估算单行字号。";
    } else {
      estimatedTextSizeStatus = "unavailable_multiline_whole";
      estimatedTextSizeDisplay = locale === "en" ? "Unavailable" : "暂不可估算";
      estimatedTextSizeGuidance = locale === "en" ? "Measurement target does not support font size estimation." : "当前测量目标不支持字号估算。";
    }
  }

  // Character Height / Single-line Text measurement resolution
  let characterHeightPx: number | undefined = undefined;
  let characterHeightDisplay: string | undefined = undefined;
  let characterHeightDesignDisplay: string | undefined = undefined;
  let characterHeightPhysicalMm: number | undefined = undefined;
  let characterHeightPhysicalDisplay: string | undefined = undefined;
  let characterHeightVisualAngleArcmin: number | undefined = undefined;
  let characterHeightVisualAngleDisplay: string | undefined = undefined;
  let characterHeightSourceLabel: string | undefined = undefined;

  if (isText) {
    const isSingleLine = element.text_layout === "single_line" || element.text_visual_measurement_target === "single_rendered_line";

    if (element.character_height_px && element.character_height_px > 0) {
      const isCharInvalid = element.image_pixel_bounds.height > 0 &&
        element.character_height_px > element.image_pixel_bounds.height + 0.01;

      characterHeightPx = element.character_height_px;
      if (isCharInvalid) {
        characterHeightDisplay = locale === "en" ? "Invalid character measurement, please re-draw" : "代表字符测量异常，请重新框选";
        characterHeightDesignDisplay = undefined;
        characterHeightPhysicalMm = undefined;
        characterHeightPhysicalDisplay = undefined;
        characterHeightVisualAngleArcmin = undefined;
        characterHeightVisualAngleDisplay = undefined;
        characterHeightSourceLabel = locale === "en" ? "Measurement error" : "测量异常";
      } else {
        characterHeightDisplay = `${formatNumericValue(element.character_height_px, 1)} px`;
        if (isLogicalConfigured && logical) {
          const scale = logical.scale_y || logical.scale_x || ((logical as Record<string, any>).scale_factor ? 1 / (logical as Record<string, any>).scale_factor : 1);
          const designH = element.character_height_design_height ?? (Math.round(element.character_height_px * scale * 10) / 10);
          const u = logical.unit === "css_px" ? "CSS px" : (logical.unit || "pt");
          characterHeightDesignDisplay = `${locale === "en" ? "≈ " : "约 "}${formatNumericValue(designH, 1)} ${u}`;
        }
        if (element.character_height_physical_mm) {
          characterHeightPhysicalMm = parseFloat(formatNumericValue(element.character_height_physical_mm, 2));
          characterHeightPhysicalDisplay = `${locale === "en" ? "≈ " : "约 "}${formatNumericValue(element.character_height_physical_mm, 2)} mm`;
        }
        if (element.character_height_visual_angle) {
          characterHeightVisualAngleArcmin = parseFloat(formatNumericValue(element.character_height_visual_angle.arcmin, 1));
          characterHeightVisualAngleDisplay = `${formatNumericValue(element.character_height_visual_angle.arcmin, 1)}′ (${formatNumericValue(element.character_height_visual_angle.deg, 2)}°)`;
        }
        characterHeightSourceLabel = locale === "en"
          ? "Representative character measurement (Precise)"
          : (element.character_height_source === "measured_rendered_character"
            ? "手动测量字符高度"
            : element.character_height_source === "confirmed_element_bounds"
            ? "确认边界为字符高度"
            : "已测量字符高度");
      }
    } else {
      characterHeightPx = undefined;
      characterHeightDesignDisplay = undefined;
      characterHeightPhysicalMm = undefined;
      characterHeightPhysicalDisplay = undefined;
      characterHeightVisualAngleArcmin = undefined;
      characterHeightVisualAngleDisplay = undefined;
      if (isSingleLine) {
        characterHeightDisplay = locale === "en" ? "Not measured (Single line - measure a character for precision)" : "未测量代表字符（单行文本，可测量代表字符以提高精度）";
        characterHeightSourceLabel = locale === "en"
          ? "Single rendered line bounds available. Measure a representative character for character-level metrics."
          : "当前具有单行可视高度。可测量代表字符以获取字符级指标。";
      } else {
        characterHeightDisplay = locale === "en" ? "Not measured (Multiline - measure a character for precision)" : "未测量代表字符（多行文本，可测量代表字符以获取字符级指标）";
        characterHeightSourceLabel = locale === "en" ? "Representative character not measured" : "未测量代表字符";
      }
    }
  }

  // 6. Interaction & Touch
  const isInteractive = element.interaction_type !== "none" && element.interaction_type !== undefined;
  const provenance = resolveTouchSourceProvenance(element);
  const touchProvenanceLabel = getTouchSourceProvenanceLabel(provenance, locale);
  const hasTouchBounds = isInteractive && !!element.touch_bounds;

  let touchDimensionsDisplay: string | undefined = undefined;
  if (isInteractive) {
    const touchPx = getEffectiveTouchPixelBounds(element, imageWidth, imageHeight);
    if (touchPx) {
      if (isLogicalConfigured && logical) {
        const mapped = mapPixelBoundsToLogical(touchPx, logical);
        const u = logical.unit === "css_px" ? "CSS px" : logical.unit;
        touchDimensionsDisplay = `${mapped.width} × ${mapped.height} ${u} (${touchPx.width} × ${touchPx.height} px)`;
      } else {
        touchDimensionsDisplay = `${touchPx.width} × ${touchPx.height} px`;
      }
    }
  }


  let nearestSpacingDisplay = locale === "en" ? "No adjacent touch targets" : "无相邻热区";
  if (nearestInfo) {
    if (nearestInfo.overlap?.is_overlapping) {
      nearestSpacingDisplay = `⚠️ ${locale === "en" ? "Touch Overlap" : "触控重叠"} (${nearestInfo.overlap.overlap_area} px²)`;
    } else if (nearestInfo.distance_logical !== undefined && nearestInfo.logical_unit) {
      nearestSpacingDisplay = `${nearestInfo.distance_logical} ${nearestInfo.logical_unit} (${locale === "en" ? "to " : "至 "}${nearestInfo.nearest_element_label || (locale === "en" ? "adjacent element" : "相邻元素")})`;
    } else {
      nearestSpacingDisplay = `${nearestInfo.distance_px} px (${locale === "en" ? "to " : "至 "}${nearestInfo.nearest_element_label || (locale === "en" ? "adjacent element" : "相邻元素")})`;
    }
  }

  const touchReview = deriveTouchReviewStatus(element, nearestInfo || null, effectivePlatform, logical || undefined);
  const touchVerdictLabel = getTouchReviewStatusLabel(touchReview.status, locale);

  let touchVerdictBadgeClass = "suitability-neutral";
  if (touchReview.status === "meets") touchVerdictBadgeClass = "suitability-suitable";
  else if (touchReview.status === "attention" || touchReview.status === "estimated_attention") touchVerdictBadgeClass = "suitability-risk";
  else if (touchReview.status === "estimated_meets") touchVerdictBadgeClass = "suitability-warning";

  // 7. Contrast
  const contrast = element.contrast_evaluation;
  const hasContrast = !!contrast;
  const contrastState = contrast?.status === "provisional" ? "provisional" : contrast ? "confirmed" : "missing";

  let contrastStatusLabel = locale === "en" ? "Pending Color Sampling" : "待取色检查";
  if (contrast) {
    if (contrastState === "provisional") {
      contrastStatusLabel = `${locale === "en" ? "Provisional" : "临时预设"} (${contrast.contrast_ratio}:1 ${contrast.passed ? (locale === "en" ? "Pass" : "达标") : (locale === "en" ? "Below" : "偏低")})`;
    } else {
      contrastStatusLabel = `${contrast.contrast_ratio}:1 (${contrast.passed ? (locale === "en" ? "Pass ✓" : "达标 ✓") : (locale === "en" ? "Below ✕" : "偏低 ✕")})`;
    }
  }

  // 8. Unified Explanation & Conclusion State
  const scenarioScope = deriveScenarioScope(
    context.scenario,
    context.contextEnvironment,
    context.contextOperationState,
    context.scenarioDomain
  );

  const textLayoutAssessment = isText
    ? assessTextLayoutCapacity(element, context.imageNaturalWidth, context.userGroups)
    : null;

  const unifiedExplanation = getUnifiedResultExplanation({
    element,
    logicalMapping: logical || null,
    calibrationMode: calMode,
    touchStatus: touchReview.status,
    touchReasons: touchReview.reasons,
    textSizeEval: element.text_size_evaluation,
    targetSizeEval: element.target_size_evaluation,
    contrastEval: element.contrast_evaluation,
    nearestSpacingPx: nearestInfo?.distance_px,
    nearestSpacingLogical: nearestInfo?.distance_logical,
    isOverlapping: nearestInfo?.overlap?.is_overlapping,
    scenarioScope,
    textLayoutAssessment,
    imageNaturalWidth: context.imageNaturalWidth,
    userGroups: context.userGroups,
    viewingDistance: context.viewingDistance,
    locale
  });

  return {
    elementId: element.element_id,
    label: getElementDisplayName(element, allElements ? allElements.findIndex((e) => e.element_id === element.element_id) : 0, locale),
    elementType: element.element_type,
    elementTypeLabel: getElementTypeLabel(element.element_type, locale),

    // Visual
    visualPxWidth: pxW,
    visualPxHeight: pxH,
    visualPxDisplay,
    visualAreaDisplay,
    screenSharePercentage: areaShare.percentage,
    screenShareLabel: areaShare.label,
    screenShareDisplay,
    minSideDisplay,

    // Logical
    isLogicalConfigured,
    logicalWidth,
    logicalHeight,
    logicalUnit,
    logicalDisplay,
    scaleRatioDisplay,
    logicalUnavailableGuidance,

    // Physical
    isPhysicalAvailable,
    physicalWidthMm: phys?.width_mm,
    physicalHeightMm: phys?.height_mm,
    physicalDisplay,
    physicalQuality: phys?.calibration_quality,
    physicalProvenance,
    physicalUnavailableReason,

    // Human Factors / Visual Angle
    isVisualAngleAvailable,
    visualAngleHorizontalDeg: visualAngle?.horizontal_deg,
    visualAngleVerticalDeg: visualAngle?.vertical_deg,
    visualAngleHorizontalArcmin: visualAngle?.horizontal_arcmin,
    visualAngleVerticalArcmin: visualAngle?.vertical_arcmin,
    visualAngleDisplay,
    visualAngleDetailDisplay,
    visualAngleViewingDistanceDisplay,
    visualAngleProvenance,
    visualAngleAssumptions,
    visualAngleUnavailableGuidance,
    visualAngleTextSemanticNote,

    // Typography
    isText,
    textVisualMeasurementTarget: textVisualTarget,
    isSingleLineVisual,
    textVisualHeightDisplay,
    textDesignHeightDisplay,
    textPhysicalHeightDisplay,
    textVisualAngleDisplay,
    textVisualShareDisplay,
    relativeTypographyDisplay,
    textLayout: element.text_layout,
    textRole: element.text_role,
    textWeightCategory: element.text_weight_category,
    textSizeValue: element.text_size_value,
    textSizeUnit: element.text_size_unit,
    textSizeSource: element.text_size_source,
    textSizeStatus,
    textSizeDisplay,
    textSizeGuidance,

    // Screenshot Font Size Estimate (Heuristic)
    estimatedTextSizeValue,
    estimatedTextSizeUnit,
    estimatedTextSizeSource,
    estimatedTextSizeSourceLabel,
    estimatedTextSizeStatus,
    estimatedTextSizeDisplay,
    estimatedTextSizeGuidance,
    estimatedTextSizeAdvisory,

    // Character Height
    characterHeightPx,
    characterHeightDisplay,
    characterHeightDesignDisplay,
    characterHeightPhysicalMm,
    characterHeightPhysicalDisplay,
    characterHeightVisualAngleArcmin,
    characterHeightVisualAngleDisplay,
    characterHeightSourceLabel,

    // Interaction
    isInteractive,
    interactionType: element.interaction_type || "none",
    interactionTypeLabel: getInteractionTypeLabel(element.interaction_type || "none", locale),
    hasTouchBounds,
    touchProvenance: provenance,
    touchProvenanceLabel: getTouchSourceProvenanceLabel(provenance, locale),
    touchDimensionsDisplay,
    nearestSpacingDisplay,
    touchReview,
    touchVerdictLabel: getTouchReviewStatusLabel(touchReview.status, locale),
    touchVerdictBadgeClass,

    // Contrast
    hasContrast,
    contrastRatio: contrast?.contrast_ratio,
    contrastRatioDisplay: contrast ? `${contrast.contrast_ratio}:1` : undefined,
    contrastPassed: contrast?.passed,
    contrastState,
    contrastStatusLabel,
    foregroundColor: element.foreground_color,
    backgroundColor: element.background_color,

    // Unified Conclusion
    conclusionState: unifiedExplanation.conclusionState,
    conclusionStateLabel: unifiedExplanation.conclusionStateLabel,
    conclusionStateBadgeClass: `badge-${unifiedExplanation.conclusionState}`,
    conclusionPresentation: unifiedExplanation.presentationState || getConclusionPresentationState(unifiedExplanation.conclusionState, locale),
    conclusion: unifiedExplanation.conclusion,
    actionableFindings: unifiedExplanation.actionableFindings,
    whyItMatters: unifiedExplanation.whyItMatters,
    unifiedExplanation
  };
}
