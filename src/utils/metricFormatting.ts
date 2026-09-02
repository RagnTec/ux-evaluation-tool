import type { CalibrationQuality, LogicalUnitMapping } from "../types/designElement";
import type { Locale } from "../i18n/types";

export interface MetricDisplay {
  primary: string;
  secondary: string;
  tertiary?: string;
  compact: string;
}

/**
 * Shared numeric formatter that eliminates floating-point long tails (e.g. -5.800000000000001),
 * removes -0 / -0.0, and formats integers without unnecessary trailing decimals.
 */
export function formatNumericValue(val: number | undefined | null, maxDecimals: number = 1): string {
  if (val === undefined || val === null || isNaN(val) || !isFinite(val)) return "0";
  const factor = Math.pow(10, maxDecimals);
  let rounded = Math.round(val * factor) / factor;
  if (Object.is(rounded, -0) || Math.abs(rounded) < 1e-10) {
    rounded = 0;
  }
  const str = rounded.toFixed(maxDecimals);
  if (str.includes(".")) {
    return str.replace(/\.?0+$/, "");
  }
  return str;
}

export function formatSignedNumericValue(val: number | undefined | null, maxDecimals: number = 1): string {
  if (val === undefined || val === null) return "0";
  const formatted = formatNumericValue(val, maxDecimals);
  if (formatted.startsWith("-") || formatted === "0") {
    return formatted;
  }
  return `+${formatted}`;
}

/**
 * Formats a single 1D dimension (such as short side, width, height, or spacing)
 * prioritizing designer logical units (pt / dp / CSS px), then image pixels, then physical mm.
 */
export function formatSingleDimension(
  pixelValue: number,
  logicalMapping?: LogicalUnitMapping,
  physicalMm?: number,
  calibrationQuality?: CalibrationQuality,
  dimension: "width" | "height" = "width",
  locale: Locale = "zh-CN"
): MetricDisplay {
  const roundedPx = formatNumericValue(pixelValue, 1);
  const hasLogical = logicalMapping && logicalMapping.quality !== "unavailable";
  const scale = dimension === "height" ? logicalMapping?.scale_y ?? logicalMapping?.scale_x ?? 1 : logicalMapping?.scale_x ?? 1;
  const logicalUnit = logicalMapping?.unit || "pt";

  if (hasLogical) {
    const logicalVal = formatNumericValue(pixelValue * scale, 1);
    const primary = `${logicalVal} ${logicalUnit}`;
    const secondary = `${roundedPx} px`;

    let tertiary: string | undefined = undefined;
    if (physicalMm !== undefined && physicalMm > 0) {
      const roundedMm = formatNumericValue(physicalMm, 2);
      if (calibrationQuality === "exact") {
        tertiary = `${roundedMm} mm`;
      } else if (calibrationQuality === "estimated") {
        tertiary = locale === "en" ? `~${roundedMm} mm (est.)` : `约 ${roundedMm} mm 估算`;
      }
    }

    const compactParts = [primary, `${roundedPx} px`];
    if (tertiary) compactParts.push(tertiary);

    return {
      primary,
      secondary,
      tertiary,
      compact: compactParts.join(" · ")
    };
  }

  // No logical mapping available
  const primary = `${roundedPx} px`;
  let secondary = "";
  let tertiary: string | undefined = undefined;

  if (physicalMm !== undefined && physicalMm > 0) {
    const roundedMm = formatNumericValue(physicalMm, 2);
    if (calibrationQuality === "exact") {
      secondary = `${roundedMm} mm`;
    } else if (calibrationQuality === "estimated") {
      secondary = locale === "en" ? `~${roundedMm} mm (est.)` : `约 ${roundedMm} mm 估算`;
    }
  }

  const compactParts = [primary];
  if (secondary) compactParts.push(secondary);

  return {
    primary,
    secondary: secondary || "",
    tertiary,
    compact: compactParts.join(" · ")
  };
}

/**
 * Formats a 2D dimension pair (width × height) prioritizing designer units.
 */
export function formatDimensionPair(
  widthPx: number,
  heightPx: number,
  logicalMapping?: LogicalUnitMapping,
  physicalWidthMm?: number,
  physicalHeightMm?: number,
  calibrationQuality?: CalibrationQuality,
  locale: Locale = "zh-CN"
): MetricDisplay {
  const roundedW = formatNumericValue(widthPx, 1);
  const roundedH = formatNumericValue(heightPx, 1);
  const hasLogical = logicalMapping && logicalMapping.quality !== "unavailable";

  if (hasLogical) {
    const scaleX = logicalMapping?.scale_x ?? 1;
    const scaleY = logicalMapping?.scale_y ?? logicalMapping?.scale_x ?? 1;
    const unit = logicalMapping?.unit || "pt";
    const logicalW = formatNumericValue(widthPx * scaleX, 1);
    const logicalH = formatNumericValue(heightPx * scaleY, 1);

    const primary = `${logicalW} × ${logicalH} ${unit}`;
    const secondary = `${roundedW} × ${roundedH} px`;

    let tertiary: string | undefined = undefined;
    if (physicalWidthMm && physicalHeightMm && physicalWidthMm > 0 && physicalHeightMm > 0) {
      const mmW = formatNumericValue(physicalWidthMm, 2);
      const mmH = formatNumericValue(physicalHeightMm, 2);
      if (calibrationQuality === "exact") {
        tertiary = `${mmW} × ${mmH} mm`;
      } else if (calibrationQuality === "estimated") {
        tertiary = locale === "en" ? `~${mmW} × ${mmH} mm (est.)` : `约 ${mmW} × ${mmH} mm 估算`;
      }
    }

    const compactParts = [primary, `${roundedW} × ${roundedH} px`];
    if (tertiary) compactParts.push(tertiary);

    return {
      primary,
      secondary,
      tertiary,
      compact: compactParts.join(" · ")
    };
  }

  // No logical mapping available
  const primary = `${roundedW} × ${roundedH} px`;
  let secondary = "";

  if (physicalWidthMm && physicalHeightMm && physicalWidthMm > 0 && physicalHeightMm > 0) {
    const mmW = Math.round(physicalWidthMm * 10) / 10;
    const mmH = Math.round(physicalHeightMm * 10) / 10;
    if (calibrationQuality === "exact") {
      secondary = `${mmW} × ${mmH} mm`;
    } else if (calibrationQuality === "estimated") {
      secondary = locale === "en" ? `~${mmW} × ${mmH} mm (est.)` : `约 ${mmW} × ${mmH} mm 估算`;
    }
  }

  const compactParts = [primary];
  if (secondary) compactParts.push(secondary);

  return {
    primary,
    secondary: secondary || "",
    compact: compactParts.join(" · ")
  };
}

/**
 * Formats an area metric (width × height area) prioritizing designer units.
 */
export function formatAreaMetric(
  pixelArea: number,
  logicalMapping?: LogicalUnitMapping,
  physicalMmArea?: number,
  calibrationQuality?: CalibrationQuality,
  locale: Locale = "zh-CN"
): MetricDisplay {
  const roundedPx = formatNumericValue(pixelArea, 1);
  const hasLogical = logicalMapping && logicalMapping.quality !== "unavailable";

  if (hasLogical) {
    const scaleArea = (logicalMapping?.scale_x ?? 1) * (logicalMapping?.scale_y ?? logicalMapping?.scale_x ?? 1);
    const unit = logicalMapping?.unit || "pt";
    const logicalArea = formatNumericValue(pixelArea * scaleArea, 1);

    const primary = `${logicalArea} ${unit}²`;
    const secondary = `${roundedPx} px²`;

    let tertiary: string | undefined = undefined;
    if (physicalMmArea && physicalMmArea > 0) {
      const mmArea = formatNumericValue(physicalMmArea, 2);
      if (calibrationQuality === "exact") {
        tertiary = `${mmArea} mm²`;
      } else if (calibrationQuality === "estimated") {
        tertiary = locale === "en" ? `~${mmArea} mm² (est.)` : `约 ${mmArea} mm²（估算）`;
      }
    }

    const compactParts = [primary, secondary];
    if (tertiary) compactParts.push(tertiary);

    return {
      primary,
      secondary,
      tertiary,
      compact: compactParts.join(" · ")
    };
  }

  // No logical mapping available
  const primary = `${roundedPx} px²`;
  let secondary = "";

  if (physicalMmArea && physicalMmArea > 0) {
    const mmArea = formatNumericValue(physicalMmArea, 2);
    if (calibrationQuality === "exact") {
      secondary = `${mmArea} mm²`;
    } else if (calibrationQuality === "estimated") {
      secondary = locale === "en" ? `~${mmArea} mm² (est.)` : `约 ${mmArea} mm²（估算）`;
    }
  }

  const compactParts = [primary];
  if (secondary) compactParts.push(secondary);

  return {
    primary,
    secondary: secondary || (locale === "en" ? "Design basis unconfigured" : "未配置设计尺寸基准"),
    compact: compactParts.join(" · ")
  };
}
