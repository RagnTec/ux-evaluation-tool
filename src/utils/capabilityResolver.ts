import type {
  EvaluationCheckId,
  EvaluationTier,
  AvailableFact,
  EvaluationCapabilityDefinition,
  ResolvedCapability,
  EvaluationMetricCapabilityId,
  MetricCapabilityResult
} from "../types/capability";
import {
  EVALUATION_CHECK_LABELS,
  EVALUATION_TIER_LABELS,
  EVALUATION_TIER_DESCRIPTIONS,
  EVALUATION_METRIC_CAPABILITY_LABELS
} from "../types/capability";
import type {
  DesignElement,
  LogicalUnitMapping,
  CalibrationMode,
  PhysicalGeometry
} from "../types/designElement";
import type { CroppedScaleMode } from "../types/workspace";
import { parseDisplaySize, parseResolution } from "./calibration";
import { parseViewingDistanceMm } from "../humanFactors";

export interface CapabilityContext {
  imageWidth?: number;
  imageHeight?: number;
  imageName?: string;
  calibrationMode?: CalibrationMode;
  croppedScaleMode?: CroppedScaleMode;
  originalImageReferenceWidth?: number;
  allowEstimation?: boolean;
  displaySize?: string;
  resolution?: string;
  viewingDistance?: string;
  contextEnvironment?: string;
  contextOperationState?: string;
  logicalMapping?: LogicalUnitMapping | null;
  calibration?: PhysicalGeometry | null;
}

export const CAPABILITY_DEFINITIONS: Record<EvaluationCheckId, EvaluationCapabilityDefinition> = {
  visual_geometry: {
    checkId: "visual_geometry",
    name: EVALUATION_CHECK_LABELS.visual_geometry,
    tiers: [
      {
        tier: "screenshot_fact",
        requiredFacts: ["image_uploaded", "visual_bounds"],
        description: "基于截图像素边界与截图占比进行空间关系分析。"
      }
    ]
  },
  contrast: {
    checkId: "contrast",
    name: EVALUATION_CHECK_LABELS.contrast,
    tiers: [
      {
        tier: "screenshot_fact",
        requiredFacts: ["image_uploaded", "visual_bounds", "single_color_provisional"],
        description: "单侧取色完成，提供临时参考对比度与取色指导。"
      },
      {
        tier: "source_confirmed",
        requiredFacts: ["image_uploaded", "visual_bounds", "both_colors_confirmed"],
        description: "前景色与背景色均已确认，提供确定性 WCAG 2.2 色彩对比度校验。"
      }
    ]
  },
  touch_geometry: {
    checkId: "touch_geometry",
    name: EVALUATION_CHECK_LABELS.touch_geometry,
    tiers: [
      {
        tier: "screenshot_fact",
        requiredFacts: ["image_uploaded", "visual_bounds", "touch_bounds"],
        description: "基于像素级热区进行重叠检测与最近邻交互间距分析。"
      },
      {
        tier: "source_confirmed",
        requiredFacts: ["image_uploaded", "visual_bounds", "touch_bounds_confirmed"],
        description: "触控热区由设计者明确确认或调整，位置与范围关系具有确定性。"
      }
    ]
  },
  physical_geometry: {
    checkId: "physical_geometry",
    name: EVALUATION_CHECK_LABELS.physical_geometry,
    tiers: [
      {
        tier: "screenshot_fact",
        requiredFacts: ["image_uploaded", "visual_bounds"],
        description: "仅提供图像像素尺寸与屏幕/截图面积占比。"
      },
      {
        tier: "hardware_assumed",
        requiredFacts: [
          "image_uploaded",
          "visual_bounds",
          "screen_diagonal",
          "screen_resolution",
          "hardware_aspect_matched"
        ],
        description: "基于屏幕硬件对角线与分辨率进行近似物理毫米换算。"
      },
      {
        tier: "source_confirmed",
        requiredFacts: [
          "image_uploaded",
          "visual_bounds",
          "physical_mapping"
        ],
        description: "基于精确的设备硬件校准与确定的物理映射。"
      }
    ]
  },
  typography: {
    checkId: "typography",
    name: EVALUATION_CHECK_LABELS.typography,
    tiers: [
      {
        tier: "screenshot_fact",
        requiredFacts: ["image_uploaded", "visual_bounds"],
        description: "仅提供文本框视觉高度（像素）。"
      },
      {
        tier: "design_mapped",
        requiredFacts: [
          "image_uploaded",
          "visual_bounds",
          "logical_mapping",
          "text_single_line",
          "estimated_text_size"
        ],
        description: "基于设计尺寸信息由单行文字高度自动估算字号。"
      },
      {
        tier: "source_confirmed",
        requiredFacts: [
          "image_uploaded",
          "visual_bounds",
          "confirmed_text_size"
        ],
        description: "直接由设计者或源数据确认真实字号。"
      }
    ]
  },
  platform_target_size: {
    checkId: "platform_target_size",
    name: EVALUATION_CHECK_LABELS.platform_target_size,
    tiers: [
      {
        tier: "screenshot_fact",
        requiredFacts: ["image_uploaded", "visual_bounds"],
        description: "仅提供像素尺寸，无法直接对比平台规范。"
      },
      {
        tier: "design_mapped",
        requiredFacts: [
          "image_uploaded",
          "visual_bounds",
          "logical_mapping",
          "target_platform_known"
        ],
        description: "基于设计尺寸信息换算为 pt / dp / CSS px 并比对 Apple HIG / Android / WCAG 规范。"
      },
      {
        tier: "source_confirmed",
        requiredFacts: [
          "image_uploaded",
          "visual_bounds",
          "logical_mapping",
          "target_platform_known",
          "touch_bounds_confirmed"
        ],
        description: "基于已确认的触控热区与设计单位进行规范复核。"
      }
    ]
  }
};

/**
 * Gathers the set of available facts from workspace context and the currently active element.
 */
export function collectAvailableFacts(
  ctx: CapabilityContext,
  element?: DesignElement | null
): Set<AvailableFact> {
  const facts = new Set<AvailableFact>();

  const hasImage = Boolean(ctx.imageWidth && ctx.imageHeight && ctx.imageWidth > 0 && ctx.imageHeight > 0);
  if (hasImage) {
    facts.add("image_uploaded");
    facts.add("image_natural_dimensions");
  }

  const isFullScreen = ctx.calibrationMode !== "cropped";
  if (isFullScreen) {
    facts.add("screenshot_scope_full");
  } else {
    facts.add("screenshot_scope_cropped");
    if (ctx.croppedScaleMode === "preserved_pixel_scale") {
      facts.add("crop_scale_preserved");
      if (ctx.originalImageReferenceWidth && ctx.originalImageReferenceWidth > 0) {
        facts.add("original_full_image_width");
      }
    } else {
      facts.add("crop_scale_unknown");
    }
  }

  const diag = parseDisplaySize(ctx.displaySize || "");
  const res = parseResolution(ctx.resolution || "");
  if (diag && diag > 0) {
    facts.add("screen_diagonal");
  }
  if (res && res.width > 0 && res.height > 0) {
    facts.add("screen_resolution");
  }

  if (ctx.allowEstimation) {
    facts.add("contain_estimation_enabled");
  }

  if (ctx.viewingDistance && parseViewingDistanceMm(ctx.viewingDistance) !== null) {
    facts.add("viewing_distance");
  }

  // Check hardware aspect ratio match for full screen or preserved crop
  if (hasImage && res && res.width > 0 && res.height > 0) {
    if (isFullScreen) {
      const imgRatio = (ctx.imageWidth || 1) / (ctx.imageHeight || 1);
      const resRatio = res.width / res.height;
      const diffDirect = Math.abs(imgRatio - resRatio) / Math.max(imgRatio, resRatio);
      const diffInverted = Math.abs(imgRatio - 1 / resRatio) / Math.max(imgRatio, 1 / resRatio);
      if (diffDirect <= 0.05 || diffInverted <= 0.05) {
        facts.add("hardware_aspect_matched");
      } else if (ctx.allowEstimation) {
        // When contain estimation is enabled, physical estimation is supported as contain assumption
        facts.add("hardware_aspect_matched");
      }
    } else if (ctx.croppedScaleMode === "preserved_pixel_scale" && ctx.originalImageReferenceWidth) {
      // Cropped with preserved scale
      facts.add("hardware_aspect_matched");
    }
  }

  if (
    ctx.logicalMapping &&
    ctx.logicalMapping.quality !== "unavailable" &&
    ctx.logicalMapping.scale_x > 0
  ) {
    facts.add("logical_mapping");
    if (ctx.logicalMapping.logical_reference_width > 0) {
      facts.add("logical_design_width");
    }
    if (
      ctx.logicalMapping.platform &&
      ctx.logicalMapping.platform !== "custom" &&
      ctx.logicalMapping.platform !== "unknown"
    ) {
      facts.add("target_platform_known");
    }
  }

  if (
    ctx.calibration &&
    ctx.calibration.is_calibrated &&
    ctx.calibration.calibration_quality !== "relative_only"
  ) {
    facts.add("physical_mapping");
  }

  // Element-level facts
  if (element) {
    if (element.image_pixel_bounds && element.image_pixel_bounds.width > 0 && element.image_pixel_bounds.height > 0) {
      facts.add("visual_bounds");
    }
    if (element.touch_bounds_pixel || element.touch_bounds || element.interaction_type !== "none") {
      facts.add("touch_bounds");
    }
    if (element.touch_bounds_source === "user_defined" || element.touch_bounds_source === "platform_reference") {
      facts.add("touch_bounds_confirmed");
    }

    const fgConfirmed = Boolean(element.foreground_color && element.foreground_color_state === "confirmed");
    const bgConfirmed = Boolean(element.background_color && element.background_color_state === "confirmed");
    const fgPresent = Boolean(element.foreground_color);
    const bgPresent = Boolean(element.background_color);

    if (fgConfirmed && bgConfirmed) {
      facts.add("both_colors_confirmed");
      facts.add("foreground_color");
      facts.add("background_color");
    } else if (fgPresent || bgPresent) {
      facts.add("single_color_provisional");
      if (fgPresent) facts.add("foreground_color");
      if (bgPresent) facts.add("background_color");
    }

    const isSingleLineTarget = element.text_visual_measurement_target === "single_rendered_line" ||
      (!element.text_visual_measurement_target && element.text_layout !== "multi_line") ||
      Boolean(element.character_height_px);

    if (isSingleLineTarget) {
      facts.add("text_single_line");
    } else {
      facts.add("text_multi_line");
    }

    if (element.text_size_source === "user_confirmed" || element.text_size_source === "design_source") {
      facts.add("confirmed_text_size");
    } else if (
      element.text_size_source === "estimated_from_visual_bounds" ||
      element.text_size_source === "estimated_from_character_height" ||
      element.text_size_evaluation
    ) {
      facts.add("estimated_text_size");
    }
  }

  return facts;
}

/**
 * Resolves the highest supported tier and missing requirements for a given check family.
 */
export function resolveEvaluationCapability(
  checkId: EvaluationCheckId,
  availableFacts: Set<AvailableFact>
): ResolvedCapability {
  const def = CAPABILITY_DEFINITIONS[checkId];
  if (!def) {
    return {
      checkId,
      name: checkId,
      highestAvailableTier: "screenshot_fact",
      availableTiers: ["screenshot_fact"],
      nextTier: null,
      missingRequirementsForNextTier: [],
      missingFactIdsForNextTier: [],
      statusLabel: "截图事实",
      statusLevel: "ready",
      tierDescription: EVALUATION_TIER_DESCRIPTIONS.screenshot_fact
    };
  }

  const availableTiers: EvaluationTier[] = [];
  let highestTier: EvaluationTier = "screenshot_fact";

  for (const tierReq of def.tiers) {
    const isSatisfied = tierReq.requiredFacts.every((f) => availableFacts.has(f));
    if (isSatisfied) {
      availableTiers.push(tierReq.tier);
      highestTier = tierReq.tier;
    }
  }

  if (availableTiers.length === 0) {
    availableTiers.push("screenshot_fact");
    highestTier = "screenshot_fact";
  }

  let nextTier: EvaluationTier | null = null;
  const missingRequirements: string[] = [];
  const missingFactIds: AvailableFact[] = [];

  const highestTierIndex = def.tiers.findIndex((t) => t.tier === highestTier);
  if (highestTierIndex !== -1 && highestTierIndex < def.tiers.length - 1) {
    const nextTierReq = def.tiers[highestTierIndex + 1];
    nextTier = nextTierReq.tier;

    for (const reqFact of nextTierReq.requiredFacts) {
      if (!availableFacts.has(reqFact)) {
        missingFactIds.push(reqFact);
        const readable = getReadableFactRequirement(reqFact, checkId, availableFacts);
        if (readable && !missingRequirements.includes(readable)) {
          missingRequirements.push(readable);
        }
      }
    }
  }

  let statusLevel: "ready" | "partial" | "missing" = "ready";
  let statusLabel = EVALUATION_TIER_LABELS[highestTier];

  if (highestTier === "source_confirmed") {
    statusLevel = "ready";
    statusLabel = `✓ ${EVALUATION_TIER_LABELS.source_confirmed}`;
  } else if (highestTier === "design_mapped") {
    statusLevel = "ready";
    statusLabel = `✓ ${EVALUATION_TIER_LABELS.design_mapped}`;
  } else if (highestTier === "hardware_assumed") {
    statusLevel = "partial";
    statusLabel = `◐ ${EVALUATION_TIER_LABELS.hardware_assumed}`;
  } else {
    if (nextTier) {
      statusLevel = "partial";
      statusLabel = `◐ ${EVALUATION_TIER_LABELS.screenshot_fact}`;
    } else {
      statusLevel = "ready";
      statusLabel = `✓ ${EVALUATION_TIER_LABELS.screenshot_fact}`;
    }
  }

  return {
    checkId,
    name: def.name,
    highestAvailableTier: highestTier,
    availableTiers,
    nextTier,
    missingRequirementsForNextTier: missingRequirements,
    missingFactIdsForNextTier: missingFactIds,
    statusLabel,
    statusLevel,
    tierDescription: EVALUATION_TIER_DESCRIPTIONS[highestTier]
  };
}

/**
 * Resolves capabilities across all check families.
 */
export function resolveAllCapabilities(
  ctx: CapabilityContext,
  element?: DesignElement | null
): Record<EvaluationCheckId, ResolvedCapability> {
  const facts = collectAvailableFacts(ctx, element);
  const result: Partial<Record<EvaluationCheckId, ResolvedCapability>> = {};

  const allCheckIds: EvaluationCheckId[] = [
    "visual_geometry",
    "contrast",
    "touch_geometry",
    "physical_geometry",
    "typography",
    "platform_target_size"
  ];

  for (const checkId of allCheckIds) {
    result[checkId] = resolveEvaluationCapability(checkId, facts);
  }

  return result as Record<EvaluationCheckId, ResolvedCapability>;
}

/**
 * Resolves a granular metric capability answering exactly:
 * "What can we compute for this specific metric with current facts?"
 */
export function resolveMetricCapability(
  capabilityId: EvaluationMetricCapabilityId,
  availableFacts: Set<AvailableFact>,
  ctx?: CapabilityContext,
  element?: DesignElement | null
): MetricCapabilityResult {
  const name = EVALUATION_METRIC_CAPABILITY_LABELS[capabilityId] || capabilityId;
  const isImageAvailable = availableFacts.has("image_uploaded") && availableFacts.has("image_natural_dimensions");
  const hasBounds = availableFacts.has("visual_bounds");
  const isText = element ? element.element_type === "text" : false;
  const isInteractive = element ? (element.interaction_type !== "none" && Boolean(element.interaction_type)) : true;

  switch (capabilityId) {
    case "visual_pixel_size": {
      const available = isImageAvailable && hasBounds;
      return {
        capabilityId,
        name,
        available,
        tier: "screenshot_fact",
        result_basis: "exact",
        requiredFacts: ["image_uploaded", "visual_bounds"],
        missingFacts: available ? [] : ["image_uploaded", "visual_bounds"].filter((f) => !availableFacts.has(f as AvailableFact)) as AvailableFact[],
        missingFactLabels: available ? [] : ["上传图片并圈选元素"],
        assumptions: [],
        provenance: "截图直接像素测量"
      };
    }

    case "screen_share": {
      const available = isImageAvailable && hasBounds;
      const isFullScreen = availableFacts.has("screenshot_scope_full");
      return {
        capabilityId,
        name,
        available,
        tier: "screenshot_fact",
        result_basis: "exact",
        requiredFacts: ["image_uploaded", "visual_bounds"],
        missingFacts: available ? [] : ["image_uploaded", "visual_bounds"].filter((f) => !availableFacts.has(f as AvailableFact)) as AvailableFact[],
        missingFactLabels: available ? [] : ["上传图片并圈选元素"],
        assumptions: isFullScreen ? ["假设截图覆盖全屏画布"] : ["基于当前局部截图计算相对面积占比"],
        provenance: isFullScreen ? "全屏截图像素面积占比" : "局部截图像素面积占比"
      };
    }

    case "visual_area": {
      const available = isImageAvailable && hasBounds;
      return {
        capabilityId,
        name,
        available,
        tier: "screenshot_fact",
        result_basis: "exact",
        requiredFacts: ["image_uploaded", "visual_bounds"],
        missingFacts: available ? [] : ["image_uploaded", "visual_bounds"].filter((f) => !availableFacts.has(f as AvailableFact)) as AvailableFact[],
        missingFactLabels: available ? [] : ["上传图片并圈选元素"],
        assumptions: [],
        provenance: "截图像素面积 (px²)"
      };
    }

    case "contrast": {
      const bothConfirmed = availableFacts.has("both_colors_confirmed");
      const singleProv = availableFacts.has("single_color_provisional");
      const available = hasBounds && (bothConfirmed || singleProv);
      return {
        capabilityId,
        name,
        available,
        tier: bothConfirmed ? "source_confirmed" : "screenshot_fact",
        result_basis: bothConfirmed ? "user_confirmed" : singleProv ? "inferred" : undefined,
        requiredFacts: ["visual_bounds", "single_color_provisional"],
        missingFacts: available ? [] : ["single_color_provisional"],
        missingFactLabels: available ? [] : ["提取前景色与背景色"],
        assumptions: singleProv ? ["单侧取色时默认另一侧为标准对比基准色"] : [],
        provenance: bothConfirmed ? "人工确认前背景色" : singleProv ? "单侧取色临时预设" : "待取色"
      };
    }

    case "physical_visual_size": {
      const hasPhysical = availableFacts.has("physical_mapping") || (availableFacts.has("screen_diagonal") && availableFacts.has("screen_resolution") && availableFacts.has("hardware_aspect_matched"));
      const isContain = Boolean(ctx?.allowEstimation && !availableFacts.has("hardware_aspect_matched"));
      const available = hasBounds && (hasPhysical || isContain);
      const missing: AvailableFact[] = [];
      const missingLabels: string[] = [];
      if (!availableFacts.has("screen_diagonal")) {
        missing.push("screen_diagonal");
        missingLabels.push("屏幕尺寸（对角线）");
      }
      if (!availableFacts.has("screen_resolution")) {
        missing.push("screen_resolution");
        missingLabels.push("屏幕硬件分辨率");
      }

      return {
        capabilityId,
        name,
        available,
        tier: "hardware_assumed",
        result_basis: "inferred",
        requiredFacts: ["visual_bounds", "screen_diagonal", "screen_resolution", "hardware_aspect_matched"],
        missingFacts: available ? [] : missing,
        missingFactLabels: available ? [] : missingLabels,
        assumptions: isContain
          ? ["假设截图在目标屏幕上按等比贴合 (Contain / Letterbox) 居中展示"]
          : ["假设截图按点对点像素铺满目标屏幕"],
        provenance: isContain ? "等比贴合估算" : hasPhysical ? "硬件参数换算" : "未校准"
      };
    }

    case "logical_visual_size": {
      const available = hasBounds && availableFacts.has("logical_mapping");
      return {
        capabilityId,
        name,
        available,
        tier: "design_mapped",
        result_basis: "inferred",
        requiredFacts: ["visual_bounds", "logical_mapping"],
        missingFacts: available ? [] : ["logical_mapping"],
        missingFactLabels: available ? [] : ["设计尺寸信息（设计稿宽度与单位）"],
        assumptions: ["假设截图像素与设计稿尺寸成固定等比缩放"],
        provenance: available ? "基于设计稿基准换算" : "未配置设计稿尺寸信息"
      };
    }

    case "estimated_font_size": {
      const isSingleLine = availableFacts.has("text_single_line");
      const hasLogical = availableFacts.has("logical_mapping");
      const available = isText && hasBounds && isSingleLine && hasLogical;
      const missing: AvailableFact[] = [];
      const missingLabels: string[] = [];
      if (!hasLogical) {
        missing.push("logical_mapping");
        missingLabels.push("设计尺寸信息（设计稿宽度）");
      }
      if (!isSingleLine) {
        missing.push("text_single_line");
        missingLabels.push("单行文字（多行需手动确认字号）");
      }

      return {
        capabilityId,
        name,
        available,
        tier: "design_mapped",
        result_basis: "inferred",
        requiredFacts: ["visual_bounds", "logical_mapping", "text_single_line"],
        missingFacts: available ? [] : missing,
        missingFactLabels: available ? [] : missingLabels,
        assumptions: ["基于单行文字包围盒视觉高度按设计比例估算字号"],
        provenance: available ? "单行文字可视边界截图估算" : "不可估算"
      };
    }

    case "confirmed_font_size": {
      const available = isText && availableFacts.has("confirmed_text_size");
      return {
        capabilityId,
        name,
        available,
        tier: "source_confirmed",
        result_basis: "user_confirmed",
        requiredFacts: ["visual_bounds", "confirmed_text_size"],
        missingFacts: available ? [] : ["confirmed_text_size"],
        missingFactLabels: available ? [] : ["手动填写并确认设计源字号"],
        assumptions: [],
        provenance: available ? "设计者人工确认" : "未确认"
      };
    }

    case "touch_visual_proxy": {
      const available = isInteractive && hasBounds;
      return {
        capabilityId,
        name,
        available,
        tier: "screenshot_fact",
        result_basis: "inferred",
        requiredFacts: ["visual_bounds"],
        missingFacts: available ? [] : ["visual_bounds"],
        missingFactLabels: available ? [] : ["圈选可交互元素可视范围"],
        assumptions: ["假设计击热区与可视包围盒重合（实际通常外扩）"],
        provenance: "基于可视范围代理估算"
      };
    }

    case "confirmed_touch_size": {
      const available = isInteractive && availableFacts.has("touch_bounds_confirmed");
      return {
        capabilityId,
        name,
        available,
        tier: "source_confirmed",
        result_basis: "user_confirmed",
        requiredFacts: ["visual_bounds", "touch_bounds_confirmed"],
        missingFacts: available ? [] : ["touch_bounds_confirmed"],
        missingFactLabels: available ? [] : ["手动调整或确认实际触控热区"],
        assumptions: [],
        provenance: available ? "设计者明确定义触控热区" : "未配置独立热区"
      };
    }

    case "touch_spacing_measurement": {
      const available = isInteractive && hasBounds;
      return {
        capabilityId,
        name,
        available,
        tier: "screenshot_fact",
        result_basis: "exact",
        requiredFacts: ["visual_bounds"],
        missingFacts: available ? [] : ["visual_bounds"],
        missingFactLabels: available ? [] : ["圈选触控目标"],
        assumptions: [],
        provenance: "相邻热区/元素边缘最近像素距离直接测量"
      };
    }

    case "platform_touch_rule": {
      const hasLogical = availableFacts.has("logical_mapping");
      const hasPlatform = availableFacts.has("target_platform_known");
      const isConfirmed = availableFacts.has("touch_bounds_confirmed");
      const available = isInteractive && hasLogical && hasPlatform;
      const missing: AvailableFact[] = [];
      const missingLabels: string[] = [];
      if (!hasLogical) {
        missing.push("logical_mapping");
        missingLabels.push("设计尺寸信息（设计稿宽度）");
      }
      if (!hasPlatform) {
        missing.push("target_platform_known");
        missingLabels.push("明确指定目标平台 (iOS / Android / Web)");
      }

      return {
        capabilityId,
        name,
        available,
        tier: isConfirmed ? "source_confirmed" : "design_mapped",
        result_basis: isConfirmed ? "user_confirmed" : "inferred",
        requiredFacts: ["visual_bounds", "logical_mapping", "target_platform_known"],
        missingFacts: available ? [] : missing,
        missingFactLabels: available ? [] : missingLabels,
        assumptions: isConfirmed ? [] : ["基于可视范围代理比对平台推荐阈值"],
        provenance: available ? "平台规范或无障碍标准比对" : "平台规则暂未启用"
      };
    }

    case "text_contrast_rule": {
      const bothConfirmed = availableFacts.has("both_colors_confirmed");
      const singleProv = availableFacts.has("single_color_provisional");
      const available = isText && hasBounds && (bothConfirmed || singleProv);
      return {
        capabilityId,
        name,
        available,
        tier: bothConfirmed ? "source_confirmed" : "screenshot_fact",
        result_basis: bothConfirmed ? "user_confirmed" : "inferred",
        requiredFacts: ["visual_bounds", "single_color_provisional"],
        missingFacts: available ? [] : ["single_color_provisional"],
        missingFactLabels: available ? [] : ["吸取文字前景色与背景色"],
        assumptions: singleProv ? ["单侧取色临时参考"] : [],
        provenance: "WCAG 2.2 SC 1.4.3 文本色彩对比度标准"
      };
    }

    case "physical_human_factors_check":
    case "visual_angle_measurement": {
      const hasPhysical = availableFacts.has("physical_mapping") || (availableFacts.has("screen_diagonal") && availableFacts.has("screen_resolution") && availableFacts.has("hardware_aspect_matched"));
      const isContain = Boolean(ctx?.allowEstimation && !availableFacts.has("hardware_aspect_matched"));
      const canComputePhysical = hasBounds && (hasPhysical || isContain);
      const hasDist = availableFacts.has("viewing_distance");
      const available = canComputePhysical && hasDist;
      const missing: AvailableFact[] = [];
      const missingLabels: string[] = [];
      if (!availableFacts.has("screen_diagonal")) {
        missing.push("screen_diagonal");
        missingLabels.push("屏幕硬件尺寸与分辨率");
      }
      if (!hasDist) {
        missing.push("viewing_distance");
        missingLabels.push("使用视距 (例如 500 mm 或 50 cm)");
      }

      const assumptions: string[] = [];
      if (isContain) {
        assumptions.push("物理尺寸基于屏幕等比贴合估算");
      }
      assumptions.push("基于实际视距与物理毫米尺寸使用精确三角几何公式 theta = 2 * atan(size / (2 * distance)) 测量视角");

      return {
        capabilityId,
        name,
        available,
        tier: "hardware_assumed",
        result_basis: "inferred",
        requiredFacts: ["visual_bounds", "screen_diagonal", "screen_resolution", "viewing_distance"],
        missingFacts: available ? [] : missing,
        missingFactLabels: available ? [] : missingLabels,
        assumptions,
        provenance: available
          ? (isContain ? "等比贴合物理估算视角测量" : "硬件校准物理视角测量")
          : "未满足视距或物理测量条件"
      };
    }

    default: {
      return {
        capabilityId,
        name,
        available: false,
        tier: "screenshot_fact",
        requiredFacts: [],
        missingFacts: [],
        missingFactLabels: [],
        assumptions: [],
        provenance: "未定义能力"
      };
    }
  }
}

/**
 * Resolves all granular metric capabilities for an element/context.
 */
export function resolveAllMetricCapabilities(
  ctx: CapabilityContext,
  element?: DesignElement | null
): Record<EvaluationMetricCapabilityId, MetricCapabilityResult> {
  const facts = collectAvailableFacts(ctx, element);
  const metricIds: EvaluationMetricCapabilityId[] = [
    "visual_pixel_size",
    "screen_share",
    "visual_area",
    "contrast",
    "physical_visual_size",
    "logical_visual_size",
    "estimated_font_size",
    "confirmed_font_size",
    "touch_visual_proxy",
    "confirmed_touch_size",
    "touch_spacing_measurement",
    "platform_touch_rule",
    "text_contrast_rule",
    "physical_human_factors_check",
    "visual_angle_measurement"
  ];

  const results: Partial<Record<EvaluationMetricCapabilityId, MetricCapabilityResult>> = {};
  for (const id of metricIds) {
    results[id] = resolveMetricCapability(id, facts, ctx, element);
  }

  return results as Record<EvaluationMetricCapabilityId, MetricCapabilityResult>;
}

function getReadableFactRequirement(
  fact: AvailableFact,
  checkId: EvaluationCheckId,
  availableFacts: Set<AvailableFact>
): string {
  switch (fact) {
    case "screen_diagonal":
    case "screen_resolution":
      if (!availableFacts.has("screen_diagonal") && !availableFacts.has("screen_resolution")) {
        return "屏幕尺寸与分辨率";
      }
      return fact === "screen_diagonal" ? "屏幕尺寸（对角线）" : "屏幕分辨率";
    case "hardware_aspect_matched":
      if (availableFacts.has("screenshot_scope_cropped")) {
        return "原完整截图宽度（保持原像素比例）";
      }
      return "屏幕分辨率比例与截图匹配（或启用等比贴合粗略估算）";
    case "logical_mapping":
    case "logical_design_width":
      return "设计尺寸信息（设计稿宽度）";
    case "both_colors_confirmed":
      return "确认前景色与背景色";
    case "single_color_provisional":
      return "至少吸取一种颜色";
    case "text_single_line":
      return "确认单行文本（多行文本请分别圈选或手动指定字号）";
    case "confirmed_text_size":
      return "确认设计字号";
    case "touch_bounds_confirmed":
      return "确认触控热区边界";
    case "target_platform_known":
      return "明确目标平台（iOS / Android / Web）";
    case "physical_mapping":
      return "物理屏幕校准参数";
    case "viewing_distance":
      return "使用场景视距";
    default:
      return "补充相关评估参数";
  }
}
