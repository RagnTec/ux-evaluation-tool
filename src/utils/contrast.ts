import type { ColorState, ContrastEvaluation } from "../types/designElement";

/**
 * Parses a hex or rgb string into an [R, G, B] tuple (0-255).
 */
export function parseColorToRgb(colorStr: string): [number, number, number] | null {
  if (!colorStr) return null;
  const trimmed = colorStr.trim().toLowerCase();

  // Hex: #fff or #ffffff or fff or ffffff
  const hexMatch = trimmed.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hexMatch) {
    const raw = hexMatch[1];
    if (raw.length === 3) {
      const r = parseInt(raw[0] + raw[0], 16);
      const g = parseInt(raw[1] + raw[1], 16);
      const b = parseInt(raw[2] + raw[2], 16);
      return [r, g, b];
    } else {
      const r = parseInt(raw.substring(0, 2), 16);
      const g = parseInt(raw.substring(2, 4), 16);
      const b = parseInt(raw.substring(4, 6), 16);
      return [r, g, b];
    }
  }

  // RGB / RGBA: rgb(255, 255, 255)
  const rgbMatch = trimmed.match(/^rgba?\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})/i);
  if (rgbMatch) {
    const r = Math.min(255, Math.max(0, parseInt(rgbMatch[1], 10)));
    const g = Math.min(255, Math.max(0, parseInt(rgbMatch[2], 10)));
    const b = Math.min(255, Math.max(0, parseInt(rgbMatch[3], 10)));
    return [r, g, b];
  }

  return null;
}

/**
 * Converts RGB tuple to uppercase 6-character hex string (#RRGGBB).
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.min(255, Math.max(0, Math.round(v)));
  const toHex = (v: number) => clamp(v).toString(16).padStart(2, "0").toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Calculates standard sRGB relative luminance according to WCAG 2.x specification.
 * L = 0.2126 * R + 0.7152 * G + 0.0722 * B
 */
export function calculateRelativeLuminance(rgb: [number, number, number]): number {
  const sRgb = rgb.map((val) => {
    const s = val / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  const luminance = 0.2126 * sRgb[0] + 0.7152 * sRgb[1] + 0.0722 * sRgb[2];
  return luminance;
}

/**
 * Calculates the exact contrast ratio between two sRGB colors.
 * Ratio = (L1 + 0.05) / (L2 + 0.05) where L1 >= L2.
 */
export function calculateContrastRatio(
  rgb1: [number, number, number],
  rgb2: [number, number, number]
): { ratio: number; l1: number; l2: number } {
  const lum1 = calculateRelativeLuminance(rgb1);
  const lum2 = calculateRelativeLuminance(rgb2);

  const l1 = Math.max(lum1, lum2);
  const l2 = Math.min(lum1, lum2);

  const rawRatio = (l1 + 0.05) / (l2 + 0.05);
  // Round to 2 decimal places deterministically
  const ratio = Math.round(rawRatio * 100) / 100;

  return { ratio, l1, l2 };
}

/**
 * Evaluates WCAG 2.2 Success Criterion 1.4.3 Contrast (Minimum) for a given color pair and text size.
 */
export function evaluateWcagContrast(
  fgColor: string,
  bgColor: string,
  textSizeCategory: "normal" | "large" = "normal",
  fgState: ColorState = "confirmed",
  bgState: ColorState = "confirmed"
): ContrastEvaluation | null {
  const fgRgb = parseColorToRgb(fgColor);
  const bgRgb = parseColorToRgb(bgColor);

  if (!fgRgb || !bgRgb) return null;

  const fgHex = rgbToHex(...fgRgb);
  const bgHex = rgbToHex(...bgRgb);

  const { ratio } = calculateContrastRatio(fgRgb, bgRgb);
  const fgLum = calculateRelativeLuminance(fgRgb);
  const bgLum = calculateRelativeLuminance(bgRgb);

  // Normal text requires 4.5:1, Large text requires 3.0:1 (WCAG SC 1.4.3 Level AA)
  const threshold = textSizeCategory === "large" ? 3.0 : 4.5;
  const passed = ratio >= threshold;

  const isProvisional = fgState === "provisional" || bgState === "provisional";
  let provisional_message: string | undefined = undefined;
  if (isProvisional) {
    if (fgState === "provisional" && bgState === "confirmed") {
      provisional_message = "当前前景色为临时预设，对比度仅供参考。请取色或输入前景色以最终确认。";
    } else if (bgState === "provisional" && fgState === "confirmed") {
      provisional_message = "当前背景色为临时预设，对比度仅供参考。请取色或输入背景色以最终确认。";
    } else {
      provisional_message = "前景与背景色均包含临时预设值，计算结果仅供参考。";
    }
  }

  return {
    evaluation_type: "text",
    status: isProvisional ? "provisional" : "confirmed",
    foreground_hex: fgHex,
    foreground_rgb: fgRgb,
    foreground_state: fgState,
    background_hex: bgHex,
    background_rgb: bgRgb,
    background_state: bgState,
    foreground_luminance: Math.round(fgLum * 10000) / 10000,
    background_luminance: Math.round(bgLum * 10000) / 10000,
    contrast_ratio: ratio,
    text_size_category: textSizeCategory,
    threshold,
    passed,
    rule_id: "L1-WCAG-SC-1.4.3",
    rule_layer: "L1_HARD_CONSTRAINT",
    reasoning_type: "rule_match",
    reference: "WCAG 2.2 Success Criterion 1.4.3 Contrast (Minimum)",
    reference_status: "verified_reference",
    claim_strength: isProvisional ? "medium" : "strong",
    provisional_message
  };
}

/**
 * Evaluates WCAG 2.2 Success Criterion 1.4.11 Non-text Contrast for UI components and graphical objects.
 * Threshold is 3.0:1 (WCAG SC 1.4.11 Level AA).
 */
export function evaluateWcagNonTextContrast(
  componentColor: string,
  bgColor: string,
  compState: ColorState = "confirmed",
  bgState: ColorState = "confirmed"
): ContrastEvaluation | null {
  const compRgb = parseColorToRgb(componentColor);
  const bgRgb = parseColorToRgb(bgColor);

  if (!compRgb || !bgRgb) return null;

  const compHex = rgbToHex(...compRgb);
  const bgHex = rgbToHex(...bgRgb);

  const { ratio } = calculateContrastRatio(compRgb, bgRgb);
  const compLum = calculateRelativeLuminance(compRgb);
  const bgLum = calculateRelativeLuminance(bgRgb);

  const threshold = 3.0;
  const passed = ratio >= threshold;

  const isProvisional = compState === "provisional" || bgState === "provisional";
  let provisional_message: string | undefined = undefined;
  if (isProvisional) {
    if (compState === "provisional" && bgState === "confirmed") {
      provisional_message = "当前主体色为临时预设，对比度仅供参考。请取色或输入主体色以最终确认。";
    } else if (bgState === "provisional" && compState === "confirmed") {
      provisional_message = "当前背景色为临时预设，对比度仅供参考。请取色或输入背景色以最终确认。";
    } else {
      provisional_message = "主体色与背景色均包含临时预设值，计算结果仅供参考。";
    }
  }

  return {
    evaluation_type: "non_text",
    status: isProvisional ? "provisional" : "confirmed",
    foreground_hex: compHex,
    foreground_rgb: compRgb,
    foreground_state: compState,
    background_hex: bgHex,
    background_rgb: bgRgb,
    background_state: bgState,
    foreground_luminance: Math.round(compLum * 10000) / 10000,
    background_luminance: Math.round(bgLum * 10000) / 10000,
    contrast_ratio: ratio,
    threshold,
    passed,
    rule_id: "L1-WCAG-SC-1.4.11",
    rule_layer: "L1_HARD_CONSTRAINT",
    reasoning_type: "rule_match",
    reference: "WCAG 2.2 Success Criterion 1.4.11 Non-text Contrast",
    reference_status: "verified_reference",
    claim_strength: isProvisional ? "medium" : "strong",
    provisional_message
  };
}
