import type {
  AnnotationStatus,
  ClaimStrength,
  ConflictStatus,
  EvidenceLevel,
  IssueType,
  ReasoningType,
  ReferenceStatus,
  RuleLayer,
  Severity,
  Suitability
} from "../types/annotation";
import type {
  LogicalMappingQuality,
  LogicalUnit,
  TargetSizeStatus
} from "../types/designElement";
import type { Locale } from "../i18n/types";

export const issueTypeLabels: Record<IssueType, string> = {
  touch_target: "触控目标",
  spacing: "目标间距",
  contrast: "颜色对比",
  readability: "文字可读性",
  information_hierarchy: "信息层级",
  cognitive_load: "认知负荷",
  recognition: "识别性",
  custom_rule: "自定义规则"
};

export const issueTypeLabelsEn: Record<IssueType, string> = {
  touch_target: "Touch Target",
  spacing: "Target Spacing",
  contrast: "Color Contrast",
  readability: "Text Readability",
  information_hierarchy: "Information Hierarchy",
  cognitive_load: "Cognitive Load",
  recognition: "Recognition",
  custom_rule: "Custom Rule"
};

export function getIssueTypeLabel(type: IssueType, locale: Locale = "zh-CN"): string {
  return locale === "en" ? issueTypeLabelsEn[type] || type : issueTypeLabels[type] || type;
}

export const severityLabels: Record<Severity, string> = {
  low: "低",
  medium: "中",
  high: "高",
  critical: "严重"
};

export const severityLabelsEn: Record<Severity, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical"
};

export function getSeverityLabel(severity: Severity, locale: Locale = "zh-CN"): string {
  return locale === "en" ? severityLabelsEn[severity] || severity : severityLabels[severity] || severity;
}

export const reasoningTypeLabels: Record<ReasoningType, string> = {
  rule_match: "规范命中",
  theory_inference: "理论推断",
  heuristic_risk: "启发式风险",
  custom_rule: "自定义规则"
};

export const reasoningTypeLabelsEn: Record<ReasoningType, string> = {
  rule_match: "Guideline Match",
  theory_inference: "Theory Inference",
  heuristic_risk: "Heuristic Risk",
  custom_rule: "Custom Rule"
};

export function getReasoningTypeLabel(type: ReasoningType, locale: Locale = "zh-CN"): string {
  return locale === "en" ? reasoningTypeLabelsEn[type] || type : reasoningTypeLabels[type] || type;
}

export const ruleLayerLabels: Record<RuleLayer, string> = {
  L1_HARD_CONSTRAINT: "L1 强规则",
  L2_PLATFORM_GUIDELINE: "L2 平台指南",
  L3_HUMAN_FACTORS: "L3 人因理论",
  L4_DOMAIN_RULE: "L4 场景规则",
  L5_CUSTOM_RULE: "L5 自定义规则"
};

export const ruleLayerLabelsEn: Record<RuleLayer, string> = {
  L1_HARD_CONSTRAINT: "L1 Hard Constraint",
  L2_PLATFORM_GUIDELINE: "L2 Platform Guideline",
  L3_HUMAN_FACTORS: "L3 Human Factors",
  L4_DOMAIN_RULE: "L4 Domain Rule",
  L5_CUSTOM_RULE: "L5 Custom Rule"
};

export function getRuleLayerLabel(layer: RuleLayer, locale: Locale = "zh-CN"): string {
  return locale === "en" ? ruleLayerLabelsEn[layer] || layer : ruleLayerLabels[layer] || layer;
}

export const evidenceLevelLabels: Record<EvidenceLevel, string> = {
  standard: "标准依据",
  platform_guideline: "平台指南",
  theory: "理论依据",
  heuristic: "启发式依据",
  custom: "自定义依据"
};

export const evidenceLevelLabelsEn: Record<EvidenceLevel, string> = {
  standard: "Standard Reference",
  platform_guideline: "Platform Guideline",
  theory: "Theory Reference",
  heuristic: "Heuristic Reference",
  custom: "Custom Reference"
};

export function getEvidenceLevelLabel(level: EvidenceLevel, locale: Locale = "zh-CN"): string {
  return locale === "en" ? evidenceLevelLabelsEn[level] || level : evidenceLevelLabels[level] || level;
}

export const statusLabels: Record<AnnotationStatus, string> = {
  OPEN: "待处理",
  ACKNOWLEDGED: "已确认",
  FIXED: "已修正",
  VERIFIED: "已验证",
  CLOSED: "已关闭"
};

export const statusLabelsEn: Record<AnnotationStatus, string> = {
  OPEN: "Open",
  ACKNOWLEDGED: "Acknowledged",
  FIXED: "Fixed",
  VERIFIED: "Verified",
  CLOSED: "Closed"
};

export function getStatusLabel(status: AnnotationStatus, locale: Locale = "zh-CN"): string {
  return locale === "en" ? statusLabelsEn[status] || status : statusLabels[status] || status;
}

export const conflictStatusMessages: Record<ConflictStatus, string> = {
  none: "",
  potential_conflict: "该结论可能涉及规则冲突，需要人工确认。",
  overridden: "该结论已被更高优先级规则覆盖，需要复核。",
  blocked_by_higher_priority_rule: "该结论受到更高优先级规则限制，需要人工确认。"
};

export const conflictStatusMessagesEn: Record<ConflictStatus, string> = {
  none: "",
  potential_conflict: "This finding may involve a rule conflict requiring manual review.",
  overridden: "This finding is overridden by a higher-priority rule.",
  blocked_by_higher_priority_rule: "This finding is constrained by a higher-priority rule."
};

export function getConflictStatusMessage(status: ConflictStatus, locale: Locale = "zh-CN"): string {
  return locale === "en" ? conflictStatusMessagesEn[status] || "" : conflictStatusMessages[status] || "";
}

export const referenceStatusLabels: Record<ReferenceStatus, string> = {
  verified_reference: "已核验依据",
  example_reference: "示例依据",
  pending_verification: "待核验依据"
};

export const referenceStatusLabelsEn: Record<ReferenceStatus, string> = {
  verified_reference: "Verified Reference",
  example_reference: "Example Reference",
  pending_verification: "Pending Verification"
};

export function getReferenceStatusLabel(status: ReferenceStatus, locale: Locale = "zh-CN"): string {
  return locale === "en" ? referenceStatusLabelsEn[status] || status : referenceStatusLabels[status] || status;
}

export const referenceStatusMessages: Record<ReferenceStatus, string> = {
  verified_reference: "命中规则风险",
  example_reference: "示例依据提示",
  pending_verification: "待核验依据，不作为强结论"
};

export const referenceStatusMessagesEn: Record<ReferenceStatus, string> = {
  verified_reference: "Rule Match Risk",
  example_reference: "Example Reference Notice",
  pending_verification: "Pending verification; not a definitive conclusion"
};

export const claimStrengthLabels: Record<ClaimStrength, string> = {
  strong: "强结论",
  moderate: "中等结论",
  weak: "弱提示"
};

export const claimStrengthLabelsEn: Record<ClaimStrength, string> = {
  strong: "Strong",
  moderate: "Moderate",
  weak: "Weak Notice"
};

export function getClaimStrengthLabel(strength: ClaimStrength, locale: Locale = "zh-CN"): string {
  return locale === "en" ? claimStrengthLabelsEn[strength] || strength : claimStrengthLabels[strength] || strength;
}

export const suitabilityLabels: Record<Suitability, string> = {
  suitable: "适合",
  acceptable: "可接受",
  risk: "风险升高",
  not_suitable: "不适合",
  unknown: "待核验"
};

export const suitabilityLabelsEn: Record<Suitability, string> = {
  suitable: "Suitable",
  acceptable: "Acceptable",
  risk: "Elevated Risk",
  not_suitable: "Not Suitable",
  unknown: "Pending Verification"
};

export function getSuitabilityLabel(suitability: Suitability, locale: Locale = "zh-CN"): string {
  return locale === "en" ? suitabilityLabelsEn[suitability] || suitability : suitabilityLabels[suitability] || suitability;
}

export type ElementTypeKey = "text" | "button" | "icon" | "image" | "input" | "other";

export const elementTypeLabels: Record<ElementTypeKey, string> = {
  text: "文本 (Text)",
  button: "按钮 / 触控目标 (Button)",
  icon: "图标 (Icon)",
  image: "图片 (Image)",
  input: "输入框 (Input)",
  other: "其他元素 (Other)"
};

export const elementTypeLabelsEn: Record<ElementTypeKey, string> = {
  text: "Text",
  button: "Button / Touch Target",
  icon: "Icon",
  image: "Image",
  input: "Input Field",
  other: "Other Element"
};

export function getElementTypeLabel(type: ElementTypeKey | string, locale: Locale = "zh-CN"): string {
  const key = type as ElementTypeKey;
  return locale === "en" ? elementTypeLabelsEn[key] || type : elementTypeLabels[key] || type;
}

export type CalibrationQualityKey = "exact" | "estimated" | "relative_only";

export const calibrationQualityLabels: Record<CalibrationQualityKey, string> = {
  exact: "精确尺寸 (Exact)",
  estimated: "估算尺寸 (Estimated)",
  relative_only: "仅相对尺寸 (Relative Only)"
};

export const calibrationQualityLabelsEn: Record<CalibrationQualityKey, string> = {
  exact: "Exact",
  estimated: "Estimated",
  relative_only: "Relative Only"
};

export function getCalibrationQualityLabel(quality: CalibrationQualityKey, locale: Locale = "zh-CN"): string {
  return locale === "en" ? calibrationQualityLabelsEn[quality] || quality : calibrationQualityLabels[quality] || quality;
}

export const logicalMappingQualityLabels: Record<LogicalMappingQuality, string> = {
  inferred_profile: "自动估算",
  exact_profile: "预置配置映射 (Exact Profile)",
  user_specified: "用户指定映射 (User Specified)",
  unavailable: "尚未建立映射 (Unavailable)"
};

export const logicalMappingQualityLabelsEn: Record<LogicalMappingQuality, string> = {
  inferred_profile: "Inferred Profile",
  exact_profile: "Exact Profile",
  user_specified: "User Specified",
  unavailable: "Unavailable"
};

export function getLogicalMappingQualityLabel(quality: LogicalMappingQuality, locale: Locale = "zh-CN"): string {
  return locale === "en" ? logicalMappingQualityLabelsEn[quality] || quality : logicalMappingQualityLabels[quality] || quality;
}

export const logicalUnitLabels: Record<LogicalUnit, string> = {
  css_px: "CSS px (Web)",
  pt: "pt (iOS / iPadOS)",
  dp: "dp (Android)"
};

export const logicalUnitLabelsEn: Record<LogicalUnit, string> = {
  css_px: "CSS px (Web)",
  pt: "pt (iOS / iPadOS)",
  dp: "dp (Android)"
};

export function getLogicalUnitLabel(unit: LogicalUnit, locale: Locale = "zh-CN"): string {
  return locale === "en" ? logicalUnitLabelsEn[unit] || unit : logicalUnitLabels[unit] || unit;
}

export const targetSizeStatusLabels: Record<TargetSizeStatus, string> = {
  condition_met: "达到推荐范围",
  needs_review: "满足基本要求，但未达推荐范围",
  meets_default: "达到推荐范围",
  meets_minimum: "满足基本要求，但未达推荐范围",
  below_minimum: "不满足基本要求"
};

export const targetSizeStatusLabelsEn: Record<TargetSizeStatus, string> = {
  condition_met: "Within the recommended range",
  needs_review: "Meets the basic requirement, but below the recommended range",
  meets_default: "Within the recommended range",
  meets_minimum: "Meets the basic requirement, but below the recommended range",
  below_minimum: "Below the basic requirement"
};

export function getTargetSizeStatusLabel(status: TargetSizeStatus, locale: Locale = "zh-CN"): string {
  return locale === "en" ? targetSizeStatusLabelsEn[status] || status : targetSizeStatusLabels[status] || status;
}

export const interactionTypeLabels: Record<"none" | "tap" | "swipe" | "tap_swipe", string> = {
  none: "不可交互",
  tap: "单击 (Tap)",
  swipe: "滑动 (Swipe)",
  tap_swipe: "单击 + 滑动"
};

export const interactionTypeLabelsEn: Record<"none" | "tap" | "swipe" | "tap_swipe", string> = {
  none: "Non-interactive",
  tap: "Tap",
  swipe: "Swipe",
  tap_swipe: "Tap & Swipe"
};

export function getInteractionTypeLabel(type: "none" | "tap" | "swipe" | "tap_swipe", locale: Locale = "zh-CN"): string {
  return locale === "en" ? interactionTypeLabelsEn[type] || type : interactionTypeLabels[type] || type;
}

export const swipeDirectionLabels: Record<"horizontal" | "vertical" | "both", string> = {
  horizontal: "横向 (Horizontal)",
  vertical: "纵向 (Vertical)",
  both: "双向 (Both)"
};

export const swipeDirectionLabelsEn: Record<"horizontal" | "vertical" | "both", string> = {
  horizontal: "Horizontal",
  vertical: "Vertical",
  both: "Both"
};

export const touchBoundsSourceLabels: Record<"platform_reference" | "visual_copy" | "copied_from_element" | "user_defined", string> = {
  platform_reference: "平台建议区域",
  visual_copy: "复制自可视区域",
  copied_from_element: "复制自已有元素",
  user_defined: "用户自定义调整"
};

export const touchBoundsSourceLabelsEn: Record<"platform_reference" | "visual_copy" | "copied_from_element" | "user_defined", string> = {
  platform_reference: "Platform Suggested Bounds",
  visual_copy: "Copied from Visual Bounds",
  copied_from_element: "Copied from Existing Element",
  user_defined: "User Custom Adjusted"
};

export const touchSourceProvenanceLabels: Record<"confirmed_touch_bounds" | "visual_bounds_proxy" | "missing", string> = {
  confirmed_touch_bounds: "已确认触控范围",
  visual_bounds_proxy: "基于可视范围估算",
  missing: "触控范围未配置"
};

export const touchSourceProvenanceLabelsEn: Record<"confirmed_touch_bounds" | "visual_bounds_proxy" | "missing", string> = {
  confirmed_touch_bounds: "Confirmed Touch Bounds",
  visual_bounds_proxy: "Visual Bounds Proxy",
  missing: "Touch Bounds Unset"
};

export function getTouchSourceProvenanceLabel(provenance: "confirmed_touch_bounds" | "visual_bounds_proxy" | "missing", locale: Locale = "zh-CN"): string {
  return locale === "en" ? touchSourceProvenanceLabelsEn[provenance] || provenance : touchSourceProvenanceLabels[provenance] || provenance;
}

export const touchReviewStatusLabels: Record<
  "not_applicable" | "meets" | "attention" | "estimated_meets" | "estimated_attention" | "measurement_only" | "needs_info" | "good",
  string
> = {
  not_applicable: "不适用",
  meets: "达到推荐范围",
  attention: "需关注",
  estimated_meets: "估算达到推荐范围",
  estimated_attention: "估算可能偏小",
  measurement_only: "仅测量",
  needs_info: "待补充信息",
  good: "达到推荐范围"
};

export const touchReviewStatusLabelsEn: Record<
  "not_applicable" | "meets" | "attention" | "estimated_meets" | "estimated_attention" | "measurement_only" | "needs_info" | "good",
  string
> = {
  not_applicable: "Not applicable",
  meets: "Within the recommended range",
  attention: "Needs attention",
  estimated_meets: "Within the recommended range (est.)",
  estimated_attention: "May be below recommended (est.)",
  measurement_only: "Measurement only",
  needs_info: "Additional information required",
  good: "Within the recommended range"
};

export function getTouchReviewStatusLabel(
  status: "not_applicable" | "meets" | "attention" | "estimated_meets" | "estimated_attention" | "measurement_only" | "needs_info" | "good",
  locale: Locale = "zh-CN"
): string {
  return locale === "en" ? touchReviewStatusLabelsEn[status] || status : touchReviewStatusLabels[status] || status;
}

/**
 * Derives a locale-aware element display name.
 * If the element label is a default pattern (e.g. "元素 #1", "Element #1", "元素 1"),
 * it is rendered in the active locale. Custom user-given labels are returned verbatim.
 */
export function getElementDisplayName(
  element?: { label?: string; element_id?: string | number } | null,
  index?: number,
  locale: Locale = "zh-CN"
): string {
  const fallbackNum = index !== undefined ? index + 1 : (element?.element_id || 1);
  const rawLabel = element?.label?.trim() || "";

  if (!rawLabel) {
    return locale === "en" ? `Element #${fallbackNum}` : `元素 #${fallbackNum}`;
  }

  // Check if rawLabel matches default auto-generated format (Chinese or English)
  const defaultPattern = /^(?:元素|Element)\s*#?\s*(\d+)$/i;
  const match = rawLabel.match(defaultPattern);
  if (match) {
    const num = match[1];
    return locale === "en" ? `Element #${num}` : `元素 #${num}`;
  }

  return rawLabel;
}

/**
 * Formats approximate numeric string based on locale ("≈ " vs "约 ").
 */
export function formatApproxValue(val: string | number, locale: Locale = "zh-CN"): string {
  return locale === "en" ? `≈ ${val}` : `约 ${val}`;
}

export const measurementMetricLabelsZh: Record<string, string> = {
  visual_size: "视觉尺寸",
  visual_area: "可视面积",
  screen_share: "屏幕占比",
  crop_share: "当前截图占比",
  physical_size: "物理尺寸",
  actual_physical_size: "实际物理尺寸",
  visual_angle: "视觉角",
  character_visual_angle: "代表字符垂直视角",
  graphical_visual_angle: "图形关键细节视角",
  text_container_visual_angle: "文字区域视角",
  font_size: "文字字号",
  screenshot_font_estimate: "截图字号估算",
  touch_target: "触控热区",
  touch_target_size: "触控尺寸",
  physical_touch_target: "触控物理尺寸",
  nearest_spacing: "最近间距",
  adjacent_touch_spacing: "相邻触控间距",
  contrast: "颜色对比度",
  non_text_contrast: "非文本对比度",
  minimum_side: "短边尺寸",
  viewing_distance: "观看距离"
};

export const measurementMetricLabelsEn: Record<string, string> = {
  visual_size: "Visual Size",
  visual_area: "Visual Area",
  screen_share: "Screen Share",
  crop_share: "Crop Share",
  physical_size: "Physical Size",
  actual_physical_size: "Actual Physical Size",
  visual_angle: "Visual Angle",
  character_visual_angle: "Vertical Visual Angle",
  graphical_visual_angle: "Graphic Detail Visual Angle",
  text_container_visual_angle: "Text Container Visual Angle",
  font_size: "Font Size",
  screenshot_font_estimate: "Screenshot Font Estimate",
  touch_target: "Touch Target",
  touch_target_size: "Touch Target Size",
  physical_touch_target: "Physical Touch Target",
  nearest_spacing: "Nearest Spacing",
  adjacent_touch_spacing: "Adjacent Touch Spacing",
  contrast: "Color Contrast",
  non_text_contrast: "Non-text Contrast",
  minimum_side: "Minimum Side",
  viewing_distance: "Viewing Distance"
};

export function getMeasurementMetricLabel(key: string, locale: Locale = "zh-CN"): string {
  return locale === "en"
    ? measurementMetricLabelsEn[key] || key
    : measurementMetricLabelsZh[key] || key;
}
