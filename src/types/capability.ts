import type { ResultBasis } from "./designElement";

export type EvaluationTier =
  | "screenshot_fact"
  | "hardware_assumed"
  | "design_mapped"
  | "source_confirmed";

export const EVALUATION_TIER_LABELS: Record<EvaluationTier, string> = {
  screenshot_fact: "截图事实",
  hardware_assumed: "硬件参数估算",
  design_mapped: "设计基准校验",
  source_confirmed: "源数据确认"
};

export const EVALUATION_TIER_LABELS_EN: Record<EvaluationTier, string> = {
  screenshot_fact: "Screenshot Fact",
  hardware_assumed: "Hardware Assumed",
  design_mapped: "Design Mapped",
  source_confirmed: "Source Confirmed"
};

export function getEvaluationTierLabel(tier: EvaluationTier, locale: "en" | "zh-CN" = "zh-CN"): string {
  return locale === "en" ? EVALUATION_TIER_LABELS_EN[tier] || tier : EVALUATION_TIER_LABELS[tier] || tier;
}

export const EVALUATION_TIER_DESCRIPTIONS: Record<EvaluationTier, string> = {
  screenshot_fact: "基于截图中的原始像素、坐标、相对比例与直接采样数据。",
  hardware_assumed: "基于填写的屏幕硬件参数（尺寸与分辨率）进行近似物理换算。",
  design_mapped: "基于设计尺寸基准（pt / dp / CSS px）进行平台规范与字号校验。",
  source_confirmed: "基于直接确认的设计源数据或已验证的确定性信息。"
};

export type EvaluationCheckId =
  | "visual_geometry"
  | "contrast"
  | "touch_geometry"
  | "physical_geometry"
  | "typography"
  | "platform_target_size";

export const EVALUATION_CHECK_LABELS: Record<EvaluationCheckId, string> = {
  visual_geometry: "视觉尺寸与空间关系",
  contrast: "色彩对比度",
  touch_geometry: "触控区域与热区关系",
  physical_geometry: "物理尺寸",
  typography: "文字字号",
  platform_target_size: "平台触控规范"
};

export const EVALUATION_CHECK_LABELS_EN: Record<EvaluationCheckId, string> = {
  visual_geometry: "Visual Size & Spatial Layout",
  contrast: "Color Contrast",
  touch_geometry: "Touch Target & Insets",
  physical_geometry: "Physical Dimensions",
  typography: "Typography & Font Size",
  platform_target_size: "Platform Touch Guideline"
};

export function getEvaluationCheckLabel(checkId: EvaluationCheckId, locale: "en" | "zh-CN" = "zh-CN"): string {
  return locale === "en" ? EVALUATION_CHECK_LABELS_EN[checkId] || checkId : EVALUATION_CHECK_LABELS[checkId] || checkId;
}

/**
 * Granular evaluation capability identifiers for individual measurable metrics.
 */
export type EvaluationMetricCapabilityId =
  | "visual_pixel_size"
  | "screen_share"
  | "visual_area"
  | "contrast"
  | "physical_visual_size"
  | "logical_visual_size"
  | "estimated_font_size"
  | "confirmed_font_size"
  | "touch_visual_proxy"
  | "confirmed_touch_size"
  | "touch_spacing_measurement"
  | "platform_touch_rule"
  | "text_contrast_rule"
  | "physical_human_factors_check"
  | "visual_angle_measurement";

export const EVALUATION_METRIC_CAPABILITY_LABELS: Record<EvaluationMetricCapabilityId, string> = {
  visual_pixel_size: "可视像素尺寸",
  screen_share: "屏幕 / 截图面积占比",
  visual_area: "截图像素面积",
  contrast: "色彩明度对比度",
  physical_visual_size: "物理可视尺寸 (mm)",
  logical_visual_size: "逻辑设计尺寸 (pt/dp/CSS px)",
  estimated_font_size: "截图估算字号",
  confirmed_font_size: "人工确认源字号",
  touch_visual_proxy: "可视触控代理尺寸",
  confirmed_touch_size: "确认触控热区尺寸",
  touch_spacing_measurement: "相邻触控间距测量",
  platform_touch_rule: "平台推荐触控尺寸校验",
  text_contrast_rule: "WCAG 文本对比度标准",
  physical_human_factors_check: "人因视距与物理视角分析",
  visual_angle_measurement: "人因视距视角测量 (Visual Angle)"
};

export type AvailableFact =
  | "image_uploaded"
  | "image_natural_dimensions"
  | "screenshot_scope_full"
  | "screenshot_scope_cropped"
  | "crop_scale_unknown"
  | "crop_scale_preserved"
  | "screen_diagonal"
  | "screen_resolution"
  | "hardware_aspect_matched"
  | "original_full_image_width"
  | "original_full_image_height"
  | "contain_estimation_enabled"
  | "logical_mapping"
  | "logical_design_width"
  | "physical_mapping"
  | "visual_bounds"
  | "touch_bounds"
  | "touch_bounds_confirmed"
  | "foreground_color"
  | "background_color"
  | "both_colors_confirmed"
  | "single_color_provisional"
  | "text_single_line"
  | "text_multi_line"
  | "estimated_text_size"
  | "confirmed_text_size"
  | "target_platform_known"
  | "viewing_distance";

export interface TierRequirement {
  tier: EvaluationTier;
  requiredFacts: AvailableFact[];
  missingFactLabels?: Record<string, string>;
  description: string;
}

export interface EvaluationCapabilityDefinition {
  checkId: EvaluationCheckId;
  name: string;
  tiers: TierRequirement[];
}

export interface ResolvedCapability {
  checkId: EvaluationCheckId;
  name: string;
  highestAvailableTier: EvaluationTier;
  availableTiers: EvaluationTier[];
  nextTier: EvaluationTier | null;
  missingRequirementsForNextTier: string[];
  missingFactIdsForNextTier: AvailableFact[];
  statusLabel: string;
  statusLevel: "ready" | "partial" | "missing";
  tierDescription: string;
}

export interface MetricCapabilityResult {
  capabilityId: EvaluationMetricCapabilityId;
  name: string;
  available: boolean;
  tier: EvaluationTier;
  result_basis?: ResultBasis;
  requiredFacts: AvailableFact[];
  missingFacts: AvailableFact[];
  missingFactLabels: string[];
  assumptions: string[];
  provenance: string;
}

/**
 * Normalized evidence facts model capturing all facts known by the user.
 */
export interface EvaluationEvidenceFacts {
  imageNaturalWidth?: number;
  imageNaturalHeight?: number;
  screenshotScope: "full_screen" | "cropped";
  screenDiagonalInches?: number;
  hardwareResolutionWidth?: number;
  hardwareResolutionHeight?: number;
  containAssumptionEnabled?: boolean;
  deviceLogicalWidth?: number;
  deviceLogicalHeight?: number;
  deviceLogicalUnit?: string;
  deviceLogicalSource?: string;
  designBasisWidth?: number;
  designBasisHeight?: number;
  designUnit?: string;
  designBasisSource?: string;
  viewingDistance?: string;
  platform?: "web" | "ios" | "android" | "custom" | "unknown";
  confirmedTouchBounds?: boolean;
  confirmedFontSize?: boolean;
  confirmedColors?: boolean;
}
