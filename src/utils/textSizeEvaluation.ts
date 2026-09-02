import type {
  DesignElement,
  EstimatedTextSizeSource,
  LogicalUnitMapping,
  PixelBounds,
  TextEvaluationBasis,
  TextRole,
  TextSizeEvaluation,
  TextSizeSource,
  TextSizeUnit,
  TextWeightCategory
} from "../types/designElement";
import { formatNumericValue } from "./metricFormatting";

/**
 * Estimates text size from single-line visual bounding box height and design size basis.
 * Returns null if logical mapping is not configured or unavailable.
 */
export function estimateTextSizeFromVisualBounds(
  visualPixelBounds: PixelBounds,
  logicalMapping?: LogicalUnitMapping,
  customUnit?: TextSizeUnit
): { value: number; unit: TextSizeUnit } | null {
  if (!logicalMapping || logicalMapping.quality === "unavailable") {
    return null;
  }
  const scaleY = logicalMapping.scale_y || ((logicalMapping as Record<string, any>).scale_factor ? 1 / (logicalMapping as Record<string, any>).scale_factor : 1);
  if (scaleY <= 0 || visualPixelBounds.height <= 0) {
    return null;
  }

  const logicalHeight = visualPixelBounds.height * scaleY;
  let unit: TextSizeUnit = "pt";

  if (logicalMapping.platform === "ios") {
    unit = "pt";
  } else if (logicalMapping.platform === "android") {
    unit = "sp";
  } else if (logicalMapping.platform === "web") {
    unit = "css_px";
  } else if (logicalMapping.platform === "custom") {
    unit = customUnit || "pt";
  }

  const roundedValue = Math.round(logicalHeight * 10) / 10;

  return {
    value: roundedValue,
    unit
  };
}

/**
 * Estimates text size from representative character height and design size basis.
 * Returns null if logical mapping is not configured or unavailable.
 */
export function estimateTextSizeFromCharacterHeight(
  characterHeightPx: number,
  logicalMapping?: LogicalUnitMapping,
  customUnit?: TextSizeUnit
): { value: number; unit: TextSizeUnit } | null {
  if (!logicalMapping || logicalMapping.quality === "unavailable") {
    return null;
  }
  const scaleY = logicalMapping.scale_y || logicalMapping.scale_x || ((logicalMapping as Record<string, any>).scale_factor ? 1 / (logicalMapping as Record<string, any>).scale_factor : 1);
  if (scaleY <= 0 || characterHeightPx <= 0) {
    return null;
  }

  const logicalHeight = characterHeightPx * scaleY;
  let unit: TextSizeUnit = "pt";

  if (logicalMapping.platform === "ios") {
    unit = "pt";
  } else if (logicalMapping.platform === "android") {
    unit = "sp";
  } else if (logicalMapping.platform === "web") {
    unit = "css_px";
  } else if (logicalMapping.platform === "custom") {
    unit = customUnit || "pt";
  }

  const roundedValue = Math.round(logicalHeight * 10) / 10;

  return {
    value: roundedValue,
    unit
  };
}

/**
 * Automatically derives WCAG SC 1.4.3 text size category (normal vs. large)
 * based on font size and font weight according to W3C specifications:
 * - CSS px (user_confirmed / design_source): Regular >= 24 CSS px, Bold >= 18.5 CSS px -> large
 * - pt (user_confirmed / design_source): Regular >= 18pt, Bold >= 14pt -> large
 * - sp: Remains normal by default; sp cannot be assumed equal to points without explicit scaling facts
 * - Estimated text: Always conservative normal for formal contrast checking
 */
export function deriveAutomaticContrastSizeCategory(
  textSizeValue?: number,
  textWeight: TextWeightCategory = "regular",
  unit: TextSizeUnit = "pt",
  source: TextSizeSource = "user_confirmed"
): "normal" | "large" | undefined {
  if (textSizeValue === undefined || textSizeValue <= 0) {
    return undefined;
  }

  // If estimated, do NOT automatically weaken threshold to large text (3:1)
  if (source !== "user_confirmed" && source !== "design_source") {
    return "normal";
  }

  const isBold = textWeight === "bold";

  if (unit === "css_px") {
    if (isBold) {
      return textSizeValue >= 18.5 ? "large" : "normal";
    }
    return textSizeValue >= 24 ? "large" : "normal";
  }

  if (unit === "pt") {
    if (isBold) {
      return textSizeValue >= 14 ? "large" : "normal";
    }
    return textSizeValue >= 18 ? "large" : "normal";
  }

  // Android sp or custom: do NOT automatically classify as large text based on sp alone.
  // Formal WCAG category remains normal unless explicit point conversion is confirmed.
  return "normal";
}

export interface RelativeTypographyMetrics {
  visualHeightPx: number;
  relativeShareToImageHeight: number;
  relativeShareFormatted: string;
  ratioToSmallestText?: number;
  ratioToLargestText?: number;
  relativeRatioDisplay?: string;
}

/**
 * Computes descriptive screenshot-level relative typography metrics without inferring unverified semantic hierarchies.
 */
export function computeRelativeTypographyMetrics(
  element: DesignElement,
  imageHeight: number,
  allElements?: DesignElement[]
): RelativeTypographyMetrics | null {
  if (element.element_type !== "text" || !element.image_pixel_bounds || element.image_pixel_bounds.height <= 0) {
    return null;
  }

  const h = element.image_pixel_bounds.height;
  const share = imageHeight > 0 ? (h / imageHeight) * 100 : 0;
  const shareFormatted = `占截图高度 ${share.toFixed(1)}%`;

  let ratioToSmallestText: number | undefined;
  let ratioToLargestText: number | undefined;
  let relativeRatioDisplay: string | undefined;

  if (allElements && allElements.length > 1) {
    const textElements = allElements.filter(
      (el) => el.element_type === "text" && el.image_pixel_bounds && el.image_pixel_bounds.height > 0
    );
    if (textElements.length > 1) {
      const heights = textElements.map((el) => el.image_pixel_bounds.height);
      const minH = Math.min(...heights);
      const maxH = Math.max(...heights);

      if (minH > 0 && Math.abs(h - minH) > 1) {
        ratioToSmallestText = Math.round((h / minH) * 10) / 10;
        relativeRatioDisplay = `约为最小文本标注的 ${ratioToSmallestText}×`;
      } else if (maxH > 0 && Math.abs(h - maxH) > 1) {
        ratioToLargestText = Math.round((h / maxH) * 10) / 10;
        relativeRatioDisplay = `约为最大文本标注的 ${ratioToLargestText}×`;
      }
    }
  }

  return {
    visualHeightPx: h,
    relativeShareToImageHeight: share,
    relativeShareFormatted: shareFormatted,
    ratioToSmallestText,
    ratioToLargestText,
    relativeRatioDisplay
  };
}

/**
 * Evaluates text size against platform design guidelines and references.
 * Strictly preserves source distinctions (estimated_from_visual_bounds vs. user_confirmed).
 */
export function evaluateTextSize(
  element: DesignElement,
  platform: "web" | "ios" | "android" | "custom" | "unknown" = "unknown",
  logicalMapping?: LogicalUnitMapping
): TextSizeEvaluation | undefined {
  if (element.element_type !== "text") return undefined;

  const role = element.text_role || "body";
  const platformDefaultUnit: TextSizeUnit = platform === "ios" ? "pt" : platform === "android" ? "sp" : "css_px";

  const isConfirmed = (element.text_size_source === "user_confirmed" || element.text_size_source === "design_source") &&
    element.text_size_value !== undefined && element.text_size_value > 0;

  const hasEstimate = !isConfirmed && element.estimated_text_size_value !== undefined && element.estimated_text_size_value > 0;

  if (!isConfirmed && !hasEstimate) {
    const isLogicalConfigured = logicalMapping && logicalMapping.quality !== "unavailable";
    return {
      status: "needs_info",
      measured_value: 0,
      unit: element.text_size_unit || platformDefaultUnit,
      source: "estimated_from_visual_bounds",
      summary_text: isLogicalConfigured ? "源设计字号未确认" : "缺少设计尺寸换算依据",
      detail_text: isLogicalConfigured
        ? "源设计字号未确认，请输入设计源中的真实字号。"
        : "缺少设计尺寸换算依据，请补充设计稿尺寸信息。",
      contrast_category_auto: "normal",
      result_basis: "inferred",
      evaluation_basis: "missing_basis",
      is_estimated: true
    };
  }

  const effectiveValue = isConfirmed ? element.text_size_value! : element.estimated_text_size_value!;
  const unit: TextSizeUnit = isConfirmed
    ? (element.text_size_unit || platformDefaultUnit)
    : (element.estimated_text_size_unit || platformDefaultUnit);
  const source = isConfirmed
    ? element.text_size_source!
    : (element.estimated_text_size_source || "estimated_from_single_line_visual_height");

  let basis: TextSizeEvaluation["result_basis"] = isConfirmed
    ? (element.text_size_source === "design_source" && logicalMapping?.quality === "exact_profile" ? "exact" : "user_confirmed")
    : "inferred";

  const evalBasis: TextEvaluationBasis = isConfirmed ? "confirmed_source" : "screenshot_estimate";
  const isEstimated = !isConfirmed;

  const autoContrastCategory = deriveAutomaticContrastSizeCategory(
    effectiveValue,
    element.text_weight_category || "regular",
    unit,
    source as TextSizeSource
  );

  if (platform === "ios") {
    const isFallbackRole = role !== "body";
    const roleLabel = role === "heading" ? "标题" : role === "caption" ? "说明/注脚" : role === "label" ? "标签/表单" : role === "helper" ? "辅助说明" : role === "menu" ? "菜单文字" : role === "annotation" ? "注释文字" : "非正文文字";
    const ruleRef = isFallbackRole
      ? "Apple Human Interface Guidelines - Typography (暂借用正文参考)"
      : "Apple Human Interface Guidelines - Typography";
    const roleFallbackDetail = isFallbackRole ? `当前角色（${roleLabel}）暂无独立规范，当前按正文文字参考临时校验。` : "";

    if (effectiveValue >= 17) {
      return {
        status: "meets_default",
        measured_value: effectiveValue,
        unit,
        source,
        summary_text: isConfirmed
          ? `达到 Apple HIG 推荐正文字号 (17pt${isFallbackRole ? "，暂借用正文文字阈值" : ""})`
          : `截图估算字号约 ${formatNumericValue(effectiveValue, 1)} pt，达到推荐值（≥ 17 pt${isFallbackRole ? "，暂借用正文文字阈值" : ""}）。`,
        detail_text: isConfirmed
          ? `${roleFallbackDetail}当前已确认字号为 ${effectiveValue} pt，满足 Apple HIG Typography 推荐正文字号 (17pt)。`
          : `${roleFallbackDetail}基于截图估算，当前估算字号约 ${formatNumericValue(effectiveValue, 1)} pt，达到 Apple HIG Typography 推荐正文字号 (≥ 17 pt)。基于截图估算，不代表已确认设计源字号。`,
        rule_id: isFallbackRole ? "L2-APPLE-TEXT-FALLBACK" : "L2-APPLE-BODY-TEXT",
        rule_layer: "L2_PLATFORM_GUIDELINE",
        reference: ruleRef,
        reference_status: "pending_verification",
        contrast_category_auto: autoContrastCategory,
        result_basis: basis,
        evaluation_basis: evalBasis,
        is_estimated: isEstimated
      };
    } else if (effectiveValue >= 11) {
      const diff = formatNumericValue(17 - effectiveValue, 1);
      return {
        status: "meets_minimum",
        measured_value: effectiveValue,
        unit,
        source,
        summary_text: isConfirmed
          ? `满足基本要求 (≥ 11pt)，但未达推荐正文 (≥ 17pt${isFallbackRole ? "，暂借用正文文字阈值" : ""})`
          : `当前截图估算字号约 ${formatNumericValue(effectiveValue, 1)} pt，已达到基本要求（≥ 11 pt），但仍低于推荐值（≥ 17 pt）${diff} pt${isFallbackRole ? "（暂借用正文文字阈值）" : ""}。`,
        detail_text: isConfirmed
          ? `${roleFallbackDetail}当前已确认字号为 ${effectiveValue} pt，达到 Apple HIG 11pt 基本要求，但低于 17pt 推荐正文建议。`
          : `${roleFallbackDetail}基于截图估算，当前估算字号约 ${formatNumericValue(effectiveValue, 1)} pt，已达到基本要求（≥ 11 pt），但仍低于推荐值（≥ 17 pt）${diff} pt。基于截图估算，不代表已确认设计源字号。`,
        rule_id: isFallbackRole ? "L2-APPLE-TEXT-FALLBACK" : "L2-APPLE-BODY-TEXT",
        rule_layer: "L2_PLATFORM_GUIDELINE",
        reference: ruleRef,
        reference_status: "pending_verification",
        contrast_category_auto: autoContrastCategory,
        result_basis: basis,
        evaluation_basis: evalBasis,
        is_estimated: isEstimated
      };
    } else {
      const diff = formatNumericValue(11 - effectiveValue, 1);
      return {
        status: "below_minimum",
        measured_value: effectiveValue,
        unit,
        source,
        summary_text: isConfirmed
          ? `低于 11pt 基本要求${isFallbackRole ? " (暂借用正文文字阈值)" : ""}`
          : `截图估算字号约 ${formatNumericValue(effectiveValue, 1)} pt，低于基本要求（≥ 11 pt）${diff} pt${isFallbackRole ? "（暂借用正文文字阈值）" : ""}。`,
        detail_text: isConfirmed
          ? `${roleFallbackDetail}当前已确认字号为 ${effectiveValue} pt，低于 Apple HIG 11pt 基本要求，小屏下可能存在可读性风险。`
          : `${roleFallbackDetail}基于截图估算，当前估算字号约 ${formatNumericValue(effectiveValue, 1)} pt，低于 Apple HIG 11pt 基本要求 ${diff} pt。基于截图估算，不代表已确认设计源字号。`,
        rule_id: isFallbackRole ? "L2-APPLE-TEXT-FALLBACK" : "L2-APPLE-BODY-TEXT",
        rule_layer: "L2_PLATFORM_GUIDELINE",
        reference: ruleRef,
        reference_status: "pending_verification",
        contrast_category_auto: autoContrastCategory,
        result_basis: basis,
        evaluation_basis: evalBasis,
        is_estimated: isEstimated
      };
    }
  }

  if (platform === "android") {
    const isFallbackRole = role !== "body";
    const roleLabel = role === "heading" ? "标题" : role === "caption" ? "说明/注脚" : role === "label" ? "标签/表单" : role === "helper" ? "辅助说明" : role === "menu" ? "菜单文字" : role === "annotation" ? "注释文字" : "非正文文字";
    const ruleRef = isFallbackRole
      ? "Android Accessibility - Text size (暂借用正文参考)"
      : "Android Accessibility - Text size";
    const roleFallbackDetail = isFallbackRole ? `当前角色（${roleLabel}）暂无独立规范，当前按正文文字参考临时校验。` : "";

    if (effectiveValue >= 12) {
      return {
        status: "meets_default",
        measured_value: effectiveValue,
        unit,
        source,
        summary_text: isConfirmed
          ? `达到 Android 设计指南建议正文字号 (12sp${isFallbackRole ? "，暂借用正文文字阈值" : ""})`
          : `截图估算字号约 ${formatNumericValue(effectiveValue, 1)} sp，达到建议值（≥ 12 sp${isFallbackRole ? "，暂借用正文文字阈值" : ""}）。`,
        detail_text: isConfirmed
          ? `${roleFallbackDetail}当前已确认字号为 ${effectiveValue} sp，满足 Android Accessibility Guidelines 正文不低于 12sp 建议。`
          : `${roleFallbackDetail}基于截图估算，当前估算字号约 ${formatNumericValue(effectiveValue, 1)} sp，满足 Android Accessibility Guidelines 建议正文字号 (≥ 12 sp)。基于截图估算，不代表已确认设计源字号。`,
        rule_id: isFallbackRole ? "L2-ANDROID-TEXT-FALLBACK" : "L2-ANDROID-BODY-TEXT",
        rule_layer: "L2_PLATFORM_GUIDELINE",
        reference: ruleRef,
        reference_status: "pending_verification",
        contrast_category_auto: autoContrastCategory,
        result_basis: basis,
        evaluation_basis: evalBasis,
        is_estimated: isEstimated
      };
    } else {
      const diff = formatNumericValue(12 - effectiveValue, 1);
      return {
        status: "below_minimum",
        measured_value: effectiveValue,
        unit,
        source,
        summary_text: isConfirmed
          ? `低于 Android 设计指南建议正文字号 (12sp${isFallbackRole ? "，暂借用正文文字阈值" : ""})`
          : `截图估算字号约 ${formatNumericValue(effectiveValue, 1)} sp，低于建议正文字号（≥ 12 sp）${diff} sp${isFallbackRole ? "（暂借用正文文字阈值）" : ""}。`,
        detail_text: isConfirmed
          ? `${roleFallbackDetail}当前已确认字号为 ${effectiveValue} sp，低于 Android Accessibility Guidelines 正文 12sp 建议，建议结合实际字体与可读性确认。`
          : `${roleFallbackDetail}基于截图估算，当前估算字号约 ${formatNumericValue(effectiveValue, 1)} sp，低于 Android Accessibility Guidelines 建议正文字号 (≥ 12 sp) ${diff} sp。基于截图估算，不代表已确认设计源字号。`,
        rule_id: isFallbackRole ? "L2-ANDROID-TEXT-FALLBACK" : "L2-ANDROID-BODY-TEXT",
        rule_layer: "L2_PLATFORM_GUIDELINE",
        reference: ruleRef,
        reference_status: "pending_verification",
        contrast_category_auto: autoContrastCategory,
        result_basis: basis,
        evaluation_basis: evalBasis,
        is_estimated: isEstimated
      };
    }
  }

  if (platform === "web") {
    const contrastCatStr = autoContrastCategory === "large" ? "大字号 (3:1 阈值)" : "普通字号 (4.5:1 阈值)";
    return {
      status: "measurement_only",
      measured_value: effectiveValue,
      unit,
      source,
      summary_text: isConfirmed ? `当前字号：${effectiveValue} CSS px` : `截图估算字号：约 ${formatNumericValue(effectiveValue, 1)} CSS px`,
      detail_text: `WCAG 2.2 未定义通用最小字号，当前字号用于判定 SC 1.4.3 对比度类别（判定为：${contrastCatStr}）。${isConfirmed ? "根据已确认字号确定。" : "基于截图估算，仅供参考。"}`,
      contrast_category_auto: autoContrastCategory,
      result_basis: basis,
      evaluation_basis: evalBasis,
      is_estimated: isEstimated
    };
  }

  if (platform === "unknown") {
    return {
      status: "custom_unit",
      measured_value: effectiveValue,
      unit,
      source,
      summary_text: isConfirmed ? `当前字号：${effectiveValue} ${unit}` : `截图估算字号：约 ${formatNumericValue(effectiveValue, 1)} ${unit}`,
      detail_text: `未知/通用平台模式，不执行特定平台字号规则核验。`,
      contrast_category_auto: autoContrastCategory,
      result_basis: basis,
      evaluation_basis: evalBasis,
      is_estimated: isEstimated
    };
  }

  return {
    status: "custom_unit",
    measured_value: effectiveValue,
    unit,
    source,
    summary_text: isConfirmed ? `当前字号：${effectiveValue} ${unit}` : `截图估算字号：约 ${formatNumericValue(effectiveValue, 1)} ${unit}`,
    detail_text: `自定义单位模式，不执行预设平台字号规则核验。`,
    contrast_category_auto: autoContrastCategory,
    result_basis: basis,
    evaluation_basis: evalBasis,
    is_estimated: isEstimated
  };
}

/**
 * Helper to update or recalculate an element's text size when bounds or mapping changes.
 * Preserves user_confirmed values and only recalculates for estimated_from_visual_bounds or estimated_from_character_height.
 */
export function recalculateElementTextSize(
  element: DesignElement,
  logicalMapping?: LogicalUnitMapping,
  customUnit?: TextSizeUnit
): Partial<DesignElement> {
  if (element.element_type !== "text") {
    return {
      text_size_value: undefined,
      text_size_unit: undefined,
      text_size_source: undefined,
      text_size_evaluation: undefined,
      text_visual_measurement_target: undefined,
      estimated_text_size_value: undefined,
      estimated_text_size_unit: undefined,
      estimated_text_size_source: undefined
    };
  }

  const layout = element.text_layout || "single_line";
  const target = element.text_visual_measurement_target || (layout === "multi_line" ? "whole_text_bounds" : "single_rendered_line");
  const source = element.text_size_source;
  const platform = logicalMapping?.platform || "ios";

  // Heuristic screenshot font size estimation (app-local, never writes to text_size_value)
  let estimatedValue: number | undefined = undefined;
  let estimatedUnit: TextSizeUnit | undefined = undefined;
  let estimatedSource: EstimatedTextSizeSource | undefined = undefined;

  if (element.character_height_px && element.character_height_px > 0) {
    const charEst = estimateTextSizeFromCharacterHeight(element.character_height_px, logicalMapping, customUnit);
    if (charEst) {
      estimatedValue = charEst.value;
      estimatedUnit = charEst.unit;
      estimatedSource = "estimated_from_character_height";
    }
  } else if (layout === "single_line" || target === "single_rendered_line") {
    const lineEst = estimateTextSizeFromVisualBounds(element.image_pixel_bounds, logicalMapping, customUnit);
    if (lineEst) {
      estimatedValue = lineEst.value;
      estimatedUnit = lineEst.unit;
      estimatedSource = "estimated_from_single_line_visual_height";
    }
  }

  // 1. User confirmed or design source size is preserved as formal source font size
  if ((source === "user_confirmed" || source === "design_source") && element.text_size_value !== undefined && element.text_size_value > 0) {
    const evaluation = evaluateTextSize(
      {
        ...element,
        estimated_text_size_value: estimatedValue,
        estimated_text_size_unit: estimatedUnit,
        estimated_text_size_source: estimatedSource
      },
      platform,
      logicalMapping
    );
    return {
      text_layout: layout,
      text_visual_measurement_target: target,
      text_role: element.text_role || "body",
      text_weight_category: element.text_weight_category || "regular",
      text_size_value: element.text_size_value,
      text_size_unit: element.text_size_unit || (platform === "ios" ? "pt" : platform === "android" ? "sp" : "css_px"),
      text_size_source: source,
      text_size_evaluation: evaluation,
      estimated_text_size_value: estimatedValue,
      estimated_text_size_unit: estimatedUnit,
      estimated_text_size_source: estimatedSource
    };
  }

  // 2. Unconfirmed source font size:
  // Source font size remains undefined, evaluation falls back to estimatedValue
  const evaluation = evaluateTextSize(
    {
      ...element,
      text_size_value: undefined,
      text_size_source: undefined,
      estimated_text_size_value: estimatedValue,
      estimated_text_size_unit: estimatedUnit,
      estimated_text_size_source: estimatedSource
    },
    platform,
    logicalMapping
  );

  return {
    text_layout: layout,
    text_visual_measurement_target: target,
    text_role: element.text_role || "body",
    text_weight_category: element.text_weight_category || "regular",
    text_size_value: undefined,
    text_size_unit: undefined,
    text_size_source: undefined,
    text_size_evaluation: evaluation,
    estimated_text_size_value: estimatedValue,
    estimated_text_size_unit: estimatedUnit,
    estimated_text_size_source: estimatedSource
  };
}
