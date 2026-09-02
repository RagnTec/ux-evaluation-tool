import type {
  LogicalUnit,
  LogicalMappingQuality,
  LogicalUnitMapping,
  TargetPlatform,
  TargetSizeEvaluation,
  PixelBounds
} from "../types/designElement";

/**
 * Calculates scale factors between image pixel dimensions and logical platform units.
 * Returns scale_x and scale_y (logical_size / image_pixel_size), plus an optional warning
 * if X and Y scales differ significantly (>5%).
 */
export function calculateLogicalScale(
  imageRefWidth: number,
  logicalRefWidth: number,
  imageRefHeight?: number,
  logicalRefHeight?: number
): { scale_x: number; scale_y: number; warning?: string } | null {
  if (
    isNaN(imageRefWidth) ||
    isNaN(logicalRefWidth) ||
    imageRefWidth <= 0 ||
    logicalRefWidth <= 0
  ) {
    return null;
  }

  const scale_x = logicalRefWidth / imageRefWidth;
  let scale_y = scale_x;
  let warning: string | undefined;

  if (
    imageRefHeight !== undefined &&
    logicalRefHeight !== undefined &&
    !isNaN(imageRefHeight) &&
    !isNaN(logicalRefHeight) &&
    imageRefHeight > 0 &&
    logicalRefHeight > 0
  ) {
    scale_y = logicalRefHeight / imageRefHeight;
    const diff = Math.abs(scale_x - scale_y);
    const maxScale = Math.max(scale_x, scale_y);
    if (maxScale > 0 && diff / maxScale > 0.05) {
      warning = `水平与垂直缩放比例不一致（X 轴 ${scale_x.toFixed(3)}, Y 轴 ${scale_y.toFixed(3)}），可能存在非等比拉伸或输入误差。`;
    }
  }

  return { scale_x, scale_y, warning };
}

/**
 * Maps element pixel bounds into logical dimensions (CSS px, pt, dp).
 */
export function mapPixelBoundsToLogical(
  pixelBounds: PixelBounds,
  mapping: LogicalUnitMapping
): { width: number; height: number; min_side: number } {
  const width = Number((pixelBounds.width * mapping.scale_x).toFixed(1));
  const height = Number((pixelBounds.height * mapping.scale_y).toFixed(1));
  const min_side = Math.min(width, height);
  return { width, height, min_side };
}

/**
 * Creates a structured LogicalUnitMapping object.
 */
export function createLogicalUnitMapping(
  platform: TargetPlatform,
  unit: LogicalUnit,
  imageRefWidth: number,
  logicalRefWidth: number,
  imageRefHeight?: number,
  logicalRefHeight?: number,
  quality: LogicalMappingQuality = "user_specified"
): LogicalUnitMapping | null {
  const scaleRes = calculateLogicalScale(
    imageRefWidth,
    logicalRefWidth,
    imageRefHeight,
    logicalRefHeight
  );
  if (!scaleRes) return null;

  return {
    platform,
    unit,
    image_reference_width: imageRefWidth,
    logical_reference_width: logicalRefWidth,
    image_reference_height: imageRefHeight,
    logical_reference_height: logicalRefHeight,
    scale_x: scaleRes.scale_x,
    scale_y: scaleRes.scale_y,
    quality,
    warning: scaleRes.warning
  };
}

/**
 * Creates a logical unit mapping for a cropped screenshot based on preserved original full screenshot pixel scale.
 * scale = fullDesignWidth / originalFullImageWidth.
 */
export function createCroppedPreservedScaleMapping(
  platform: TargetPlatform,
  unit: LogicalUnit,
  originalFullImageWidth: number,
  fullDesignWidth: number,
  quality: LogicalMappingQuality = "user_specified"
): LogicalUnitMapping | null {
  if (
    isNaN(originalFullImageWidth) ||
    isNaN(fullDesignWidth) ||
    originalFullImageWidth <= 0 ||
    fullDesignWidth <= 0
  ) {
    return null;
  }

  const scale = fullDesignWidth / originalFullImageWidth;
  return {
    platform,
    unit,
    image_reference_width: originalFullImageWidth,
    logical_reference_width: fullDesignWidth,
    scale_x: scale,
    scale_y: scale,
    quality,
    warning: "当前局部截图按原完整截图的像素比例进行设计单位换算。"
  };
}

/**
 * Formats user-friendly scale ratio representation, e.g. "1 image px ≈ 0.152 pt (1 pt ≈ 6.56 image px)".
 */
export function formatScaleRatio(mapping: LogicalUnitMapping, locale: "en" | "zh-CN" = "zh-CN"): string {
  const unitLabel = mapping.unit === "css_px" ? "CSS px" : mapping.unit;
  if (mapping.scale_x <= 0) return "";
  const unitPerImagePx = Number(mapping.scale_x.toFixed(3));
  const imagePxPerUnit = (1 / mapping.scale_x).toFixed(2).replace(/\.00$/, "");
  if (locale === "en") {
    return `1 image px ≈ ${unitPerImagePx} ${unitLabel} (1 ${unitLabel} ≈ ${imagePxPerUnit} image px)`;
  }
  return `1 图像像素 ≈ ${unitPerImagePx} ${unitLabel} (1 ${unitLabel} ≈ ${imagePxPerUnit} 图像像素)`;
}

/**
 * Evaluates target size against platform accessibility guidelines or standards.
 * Web: WCAG 2.2 SC 2.5.8 Target Size (Minimum) - 24x24 CSS px
 * Android: Android Accessibility Guidelines - 48x48 dp
 * iOS: Apple HIG Accessibility - 44x44 pt default / 28x28 pt minimum
 */
export function evaluateTargetSize(
  logicalBounds: { width: number; height: number },
  mapping?: LogicalUnitMapping
): TargetSizeEvaluation | null {
  if (!mapping || mapping.quality === "unavailable") return null;
  const unit = mapping.unit;
  const platform = mapping.platform;
  const { width, height } = logicalBounds;
  if (width <= 0 || height <= 0) return null;

  const min_side = Math.min(width, height);
  let basis: TargetSizeEvaluation["result_basis"] = "user_confirmed";
  if (mapping.quality === "inferred_profile") basis = "inferred";
  if (mapping.quality === "exact_profile") basis = "exact";

  const inferredText = basis === "inferred" ? " (自动估算)" : "";

  // 1. Web / CSS px / WCAG 2.2 SC 2.5.8 (Level AA)
  if (unit === "css_px" || platform === "web") {
    const threshold_width = 24;
    const threshold_height = 24;
    const isMet = width >= threshold_width && height >= threshold_height;

    return {
      unit: "css_px",
      measured_width: width,
      measured_height: height,
      min_side,
      threshold_width,
      threshold_height,
      status: isMet ? "condition_met" : "needs_review",
      summary_text: (isMet ? "达到 SC 2.5.8 的尺寸条件" : "低于 24 CSS px 尺寸条件，需继续检查 spacing / exception 才能确定 SC 2.5.8 结果。") + inferredText,
      detail_text: isMet
        ? `触控目标尺寸为 ${width} × ${height} CSS px，达到 24 × 24 CSS px 尺寸基准要求。`
        : `触控目标尺寸为 ${width} × ${height} CSS px（低于 24 × 24 CSS px）。根据 SC 2.5.8，如果具有充分间距（如 24px 目标直径无重叠）、内联链接或基本呈现例外，仍可能合规，需结合上下文审查。`,
      rule_id: "L1-WCAG-SC-2.5.8",
      rule_layer: "L1_HARD_CONSTRAINT",
      reasoning_type: "rule_match",
      reference: "WCAG 2.2 Success Criterion 2.5.8 Target Size (Minimum)",
      reference_status: "verified_reference",
      claim_strength: "strong",
      result_basis: basis
    };
  }

  // 2. Android / dp / 48x48 dp
  if (unit === "dp" || platform === "android") {
    const threshold_width = 48;
    const threshold_height = 48;
    const isMet = width >= threshold_width && height >= threshold_height;

    return {
      unit: "dp",
      measured_width: width,
      measured_height: height,
      min_side,
      threshold_width,
      threshold_height,
      status: isMet ? "condition_met" : "below_minimum",
      summary_text: (isMet ? "达到推荐范围" : "不满足基本要求") + inferredText,
      detail_text: isMet
        ? `控件尺寸为 ${width} × ${height} dp，达到 Android 官方推荐的 48 × 48 dp 触控目标尺寸。`
        : `控件尺寸为 ${width} × ${height} dp，低于 Android 官方推荐的 48 × 48 dp 触控目标尺寸（建议通过增加内边距或可点击区域优化）。`,
      rule_id: "L2-ANDROID-TARGET-SIZE-48DP",
      rule_layer: "L2_PLATFORM_GUIDELINE",
      reasoning_type: "rule_match",
      reference: "Android Accessibility Guidelines — Target size (48x48 dp)",
      reference_status: "verified_reference",
      claim_strength: "strong",
      result_basis: basis
    };
  }

  // 3. Apple / iOS / pt / 44x44 pt default & 28x28 pt minimum
  if (unit === "pt" || platform === "ios") {
    const default_threshold = 44;
    const min_threshold = 28;
    let status: TargetSizeEvaluation["status"];
    let summary_text: string;
    let detail_text: string;

    if (width >= default_threshold && height >= default_threshold) {
      status = "meets_default";
      summary_text = "符合默认推荐尺寸";
      detail_text = `触控目标尺寸为 ${width} × ${height} pt，达到 Apple HIG 默认推荐的 44 × 44 pt 触控区域要求。`;
    } else if (width >= min_threshold && height >= min_threshold) {
      status = "meets_minimum";
      summary_text = "达到最小尺寸但低于默认推荐";
      detail_text = `触控目标尺寸为 ${width} × ${height} pt，达到 Apple HIG 28 × 28 pt 最小控件尺寸，但低于 44 × 44 pt 默认推荐标准。`;
    } else {
      status = "below_minimum";
      summary_text = "低于最小控件尺寸";
      detail_text = `触控目标尺寸为 ${width} × ${height} pt，低于 Apple HIG 28 × 28 pt 最小控件尺寸要求。`;
    }

    return {
      unit: "pt",
      measured_width: width,
      measured_height: height,
      min_side,
      threshold_width: default_threshold,
      threshold_height: default_threshold,
      status,
      summary_text: summary_text + inferredText,
      detail_text,
      rule_id: "L2-APPLE-HIG-TARGET-SIZE",
      rule_layer: "L2_PLATFORM_GUIDELINE",
      reasoning_type: "rule_match",
      reference: "Apple Human Interface Guidelines — Accessibility — Control Target Size",
      reference_status: "verified_reference",
      claim_strength: "strong",
      result_basis: basis
    };
  }

  return null;
}
