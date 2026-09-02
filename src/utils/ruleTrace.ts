import type {
  AxisComparison,
  ComparisonDetails,
  RuleComparisonTrace,
  TraceVerdict
} from "../types/ruleTrace";
import { TRACE_VERDICT_LABELS, getTraceVerdictLabel } from "../types/ruleTrace";
import { getElementDisplayName } from "./labels";
import type {
  DesignElement,
  LogicalUnitMapping,
  TargetSizeEvaluation,
  TextSizeEvaluation,
  ContrastEvaluation,
  CalibrationMode,
  TargetPlatform
} from "../types/designElement";
import type { NearestTouchTargetResult, WcagSpacingEvaluation } from "./interactionGeometry";
import { resolveTouchSourceProvenance, getEffectiveTouchPixelBounds } from "./interactionGeometry";
import type { CandidateHumanFactorsReference, ScenarioScope } from "../humanFactors";
import {
  resolveReferenceEnvelope,
  derivePhysicalSizeForVisualAngle,
  parseViewingDistanceMm
} from "../humanFactors";
import { formatNumericValue, formatSignedNumericValue } from "./metricFormatting";

/**
 * Calculates signed margin for a minimum threshold (current >= threshold).
 * Positive = within/exceeding threshold.
 * Negative = below threshold (deficit).
 */
export function calculateScalarMinMargin(
  current: number,
  threshold: number,
  unit: string = "",
  locale: "en" | "zh-CN" = "zh-CN"
): {
  margin: number;
  marginFormatted: string;
  marginLabel: string;
  meets: boolean;
} {
  const decimals = unit === "mm" || unit === ":1" || unit === "°" ? 2 : 1;
  const rawDiff = current - threshold;
  const numericMargin = parseFloat(formatNumericValue(rawDiff, decimals));
  const sign = numericMargin >= 0 ? "+" : "";
  const marginFormatted = `${sign}${formatNumericValue(rawDiff, decimals)}${unit ? ` ${unit}` : ""}`;
  const absMarginStr = formatNumericValue(Math.abs(rawDiff), decimals);
  const unitSuffix = unit ? ` ${unit}` : "";
  const meets = rawDiff >= -1e-6;

  const marginLabel = meets
    ? (locale === "en" ? `Margin ${marginFormatted}` : `余量 ${marginFormatted}`)
    : (locale === "en" ? `Deficit ${absMarginStr}${unitSuffix}` : `距离参考还差 ${absMarginStr}${unitSuffix}`);

  return {
    margin: numericMargin,
    marginFormatted,
    marginLabel,
    meets
  };
}

/**
 * Calculates signed margin for a maximum threshold (current <= threshold).
 * Positive = within acceptable ceiling.
 * Negative = exceeds ceiling.
 */
export function calculateScalarMaxMargin(
  current: number,
  threshold: number,
  unit: string = "",
  locale: "en" | "zh-CN" = "zh-CN"
): {
  margin: number;
  marginFormatted: string;
  marginLabel: string;
  meets: boolean;
} {
  const decimals = unit === "mm" || unit === ":1" || unit === "°" ? 2 : 1;
  const rawDiff = threshold - current;
  const numericMargin = parseFloat(formatNumericValue(rawDiff, decimals));
  const sign = numericMargin >= 0 ? "+" : "";
  const marginFormatted = `${sign}${formatNumericValue(rawDiff, decimals)}${unit ? ` ${unit}` : ""}`;
  const absMarginStr = formatNumericValue(Math.abs(rawDiff), decimals);
  const unitSuffix = unit ? ` ${unit}` : "";
  const meets = rawDiff >= -1e-6;

  const marginLabel = meets
    ? (locale === "en" ? `Margin ${marginFormatted}` : `余量 ${marginFormatted}`)
    : (locale === "en" ? `Exceeds upper limit ${absMarginStr}${unitSuffix}` : `超出参考上限 ${absMarginStr}${unitSuffix}`);

  return {
    margin: numericMargin,
    marginFormatted,
    marginLabel,
    meets
  };
}

/**
 * Calculates margin and direction for a two-sided range [min, max].
 */
export function calculateScalarRangeMargin(
  current: number,
  min: number,
  max: number,
  unit: string = "",
  locale: "en" | "zh-CN" = "zh-CN"
): {
  margin: number;
  marginFormatted: string;
  marginLabel: string;
  meets: boolean;
  direction: "within" | "below_min" | "above_max";
} {
  const decimals = unit === "mm" || unit === ":1" || unit === "°" ? 2 : 1;
  const unitSuffix = unit ? ` ${unit}` : "";
  if (current < min - 1e-6) {
    const rawDiff = min - current;
    const absMarginStr = formatNumericValue(rawDiff, decimals);
    return {
      margin: -parseFloat(formatNumericValue(rawDiff, decimals)),
      marginFormatted: `-${absMarginStr}${unitSuffix}`,
      marginLabel: locale === "en" ? `Below lower limit ${absMarginStr}${unitSuffix}` : `低于下限 ${absMarginStr}${unitSuffix}`,
      meets: false,
      direction: "below_min"
    };
  } else if (current > max + 1e-6) {
    const rawDiff = current - max;
    const absMarginStr = formatNumericValue(rawDiff, decimals);
    return {
      margin: -parseFloat(formatNumericValue(rawDiff, decimals)),
      marginFormatted: `+${absMarginStr}${unitSuffix}`,
      marginLabel: locale === "en" ? `Exceeds upper limit ${absMarginStr}${unitSuffix}` : `高于上限 ${absMarginStr}${unitSuffix}`,
      meets: false,
      direction: "above_max"
    };
  } else {
    return {
      margin: 0,
      marginFormatted: `0${unitSuffix}`,
      marginLabel: locale === "en" ? `Within recommended range` : `在建议范围内`,
      meets: true,
      direction: "within"
    };
  }
}

/**
 * Evaluates a tiered lower-bound metric (e.g. touch size or font size where higher is better).
 */
export function evaluateTieredLowerBound(
  current: number,
  basicMin: number,
  recommendedMin: number,
  unit: string = "",
  metricName: string = "值",
  isEstimated: boolean = false
): {
  verdict: "below_threshold" | "below_recommended" | "meets_reference";
  verdictLabel: string;
  explanation: string;
  currentDisplay: string;
  basicDisplay: string;
  recommendedDisplay: string;
  currentValue: number;
  currentUnit: string;
  minimumValue: number;
  minimumLabel: string;
  recommendedValue: number;
  recommendedLabel: string;
  gapToMinimum?: number;
  gapToRecommended?: number;
} {
  const decimals = unit === "mm" || unit === ":1" || unit === "°" ? 2 : 1;
  const u = unit ? ` ${unit}` : "";
  const curPrefix = isEstimated ? "约 " : "";
  const curStr = `${curPrefix}${formatNumericValue(current, decimals)}${u}`;
  const basicStr = `≥ ${formatNumericValue(basicMin, decimals)}${u}`;
  const recStr = `≥ ${formatNumericValue(recommendedMin, decimals)}${u}`;

  if (current < basicMin - 1e-6) {
    const diff = formatNumericValue(basicMin - current, decimals);
    const diffNum = parseFloat(diff);
    return {
      verdict: "below_threshold",
      verdictLabel: "不满足基本要求",
      explanation: `当前${metricName}${curStr}，低于基本要求（${basicStr}）${diff}${u}。`,
      currentDisplay: curStr,
      basicDisplay: basicStr,
      recommendedDisplay: recStr,
      currentValue: current,
      currentUnit: unit,
      minimumValue: basicMin,
      minimumLabel: basicStr,
      recommendedValue: recommendedMin,
      recommendedLabel: recStr,
      gapToMinimum: diffNum,
      gapToRecommended: parseFloat(formatNumericValue(recommendedMin - current, decimals))
    };
  } else if (current < recommendedMin - 1e-6) {
    const diff = formatNumericValue(recommendedMin - current, decimals);
    const diffNum = parseFloat(diff);
    return {
      verdict: "below_recommended",
      verdictLabel: "满足基本要求，但未达推荐范围",
      explanation: `当前${metricName}${curStr}，已达到基本要求（${basicStr}），但仍低于推荐值（${recStr}）${diff}${u}。`,
      currentDisplay: curStr,
      basicDisplay: basicStr,
      recommendedDisplay: recStr,
      currentValue: current,
      currentUnit: unit,
      minimumValue: basicMin,
      minimumLabel: basicStr,
      recommendedValue: recommendedMin,
      recommendedLabel: recStr,
      gapToMinimum: 0,
      gapToRecommended: diffNum
    };
  } else {
    return {
      verdict: "meets_reference",
      verdictLabel: "达到推荐范围",
      explanation: `当前${metricName}${curStr}，已达到推荐值（${recStr}）。`,
      currentDisplay: curStr,
      basicDisplay: basicStr,
      recommendedDisplay: recStr,
      currentValue: current,
      currentUnit: unit,
      minimumValue: basicMin,
      minimumLabel: basicStr,
      recommendedValue: recommendedMin,
      recommendedLabel: recStr,
      gapToMinimum: 0,
      gapToRecommended: 0
    };
  }
}

/**
 * Evaluates a tiered upper-bound metric (e.g. latency/duration where lower is better).
 */
export function evaluateTieredUpperBound(
  current: number,
  basicMax: number,
  recommendedMax: number,
  unit: string = "",
  metricName: string = "值",
  isEstimated: boolean = false
): {
  verdict: "below_threshold" | "below_recommended" | "meets_reference";
  verdictLabel: string;
  explanation: string;
  currentDisplay: string;
  basicDisplay: string;
  recommendedDisplay: string;
  currentValue: number;
  currentUnit: string;
  minimumValue: number;
  minimumLabel: string;
  recommendedValue: number;
  recommendedLabel: string;
  gapToMinimum?: number;
  gapToRecommended?: number;
} {
  const decimals = unit === "mm" || unit === ":1" || unit === "°" ? 2 : 1;
  const u = unit ? ` ${unit}` : "";
  const curPrefix = isEstimated ? "约 " : "";
  const curStr = `${curPrefix}${formatNumericValue(current, decimals)}${u}`;
  const basicStr = `≤ ${formatNumericValue(basicMax, decimals)}${u}`;
  const recStr = `≤ ${formatNumericValue(recommendedMax, decimals)}${u}`;

  if (current > basicMax + 1e-6) {
    const diff = formatNumericValue(current - basicMax, decimals);
    const diffNum = parseFloat(diff);
    return {
      verdict: "below_threshold",
      verdictLabel: "不满足基本要求",
      explanation: `当前${metricName}${curStr}，高于基本上限（${basicStr}）${diff}${u}。`,
      currentDisplay: curStr,
      basicDisplay: basicStr,
      recommendedDisplay: recStr,
      currentValue: current,
      currentUnit: unit,
      minimumValue: basicMax,
      minimumLabel: basicStr,
      recommendedValue: recommendedMax,
      recommendedLabel: recStr,
      gapToMinimum: diffNum,
      gapToRecommended: parseFloat(formatNumericValue(current - recommendedMax, decimals))
    };
  } else if (current > recommendedMax + 1e-6) {
    const diff = formatNumericValue(current - recommendedMax, decimals);
    const diffNum = parseFloat(diff);
    return {
      verdict: "below_recommended",
      verdictLabel: "满足基本要求，但未达推荐范围",
      explanation: `当前${metricName}${curStr}，已达到基本要求（${basicStr}），但仍高于推荐值（${recStr}）${diff}${u}。`,
      currentDisplay: curStr,
      basicDisplay: basicStr,
      recommendedDisplay: recStr,
      currentValue: current,
      currentUnit: unit,
      minimumValue: basicMax,
      minimumLabel: basicStr,
      recommendedValue: recommendedMax,
      recommendedLabel: recStr,
      gapToMinimum: 0,
      gapToRecommended: diffNum
    };
  } else {
    return {
      verdict: "meets_reference",
      verdictLabel: "达到推荐范围",
      explanation: `当前${metricName}${curStr}，已达到推荐值（${recStr}）。`,
      currentDisplay: curStr,
      basicDisplay: basicStr,
      recommendedDisplay: recStr,
      currentValue: current,
      currentUnit: unit,
      minimumValue: basicMax,
      minimumLabel: basicStr,
      recommendedValue: recommendedMax,
      recommendedLabel: recStr,
      gapToMinimum: 0,
      gapToRecommended: 0
    };
  }
}

/**
 * Evaluates a tiered two-sided range metric.
 */
export function evaluateTieredRange(
  current: number,
  basicRange: [number, number],
  recommendedRange: [number, number],
  unit: string = "",
  metricName: string = "值",
  isEstimated: boolean = false
): {
  verdict: "below_threshold" | "below_recommended" | "meets_reference";
  verdictLabel: string;
  explanation: string;
  currentDisplay: string;
  basicDisplay: string;
  recommendedDisplay: string;
  currentValue: number;
  currentUnit: string;
  minimumValue: [number, number];
  minimumLabel: string;
  recommendedValue: [number, number];
  recommendedLabel: string;
  gapToMinimum?: number;
  gapToRecommended?: number;
} {
  const decimals = unit === "mm" || unit === ":1" || unit === "°" ? 2 : 1;
  const u = unit ? ` ${unit}` : "";
  const curPrefix = isEstimated ? "约 " : "";
  const curStr = `${curPrefix}${formatNumericValue(current, decimals)}${u}`;
  const basicStr = `${formatNumericValue(basicRange[0], decimals)}–${formatNumericValue(basicRange[1], decimals)}${u}`;
  const recStr = `${formatNumericValue(recommendedRange[0], decimals)}–${formatNumericValue(recommendedRange[1], decimals)}${u}`;

  if (current < basicRange[0] - 1e-6) {
    const diff = formatNumericValue(basicRange[0] - current, decimals);
    return {
      verdict: "below_threshold",
      verdictLabel: "不满足基本要求",
      explanation: `当前${metricName}${curStr}，低于基本范围（${basicStr}）${diff}${u}。`,
      currentDisplay: curStr,
      basicDisplay: basicStr,
      recommendedDisplay: recStr,
      currentValue: current,
      currentUnit: unit,
      minimumValue: basicRange,
      minimumLabel: basicStr,
      recommendedValue: recommendedRange,
      recommendedLabel: recStr,
      gapToMinimum: parseFloat(diff),
      gapToRecommended: parseFloat(formatNumericValue(recommendedRange[0] - current, decimals))
    };
  } else if (current > basicRange[1] + 1e-6) {
    const diff = formatNumericValue(current - basicRange[1], decimals);
    return {
      verdict: "below_threshold",
      verdictLabel: "不满足基本要求",
      explanation: `当前${metricName}${curStr}，高于基本范围（${basicStr}）${diff}${u}。`,
      currentDisplay: curStr,
      basicDisplay: basicStr,
      recommendedDisplay: recStr,
      currentValue: current,
      currentUnit: unit,
      minimumValue: basicRange,
      minimumLabel: basicStr,
      recommendedValue: recommendedRange,
      recommendedLabel: recStr,
      gapToMinimum: parseFloat(diff),
      gapToRecommended: parseFloat(formatNumericValue(current - recommendedRange[1], decimals))
    };
  } else if (current < recommendedRange[0] - 1e-6) {
    const diff = formatNumericValue(recommendedRange[0] - current, decimals);
    return {
      verdict: "below_recommended",
      verdictLabel: "满足基本要求，但未达推荐范围",
      explanation: `当前${metricName}${curStr}，已达到基本范围（${basicStr}），但仍低于推荐范围（${recStr}）${diff}${u}。`,
      currentDisplay: curStr,
      basicDisplay: basicStr,
      recommendedDisplay: recStr,
      currentValue: current,
      currentUnit: unit,
      minimumValue: basicRange,
      minimumLabel: basicStr,
      recommendedValue: recommendedRange,
      recommendedLabel: recStr,
      gapToMinimum: 0,
      gapToRecommended: parseFloat(diff)
    };
  } else if (current > recommendedRange[1] + 1e-6) {
    const diff = formatNumericValue(current - recommendedRange[1], decimals);
    return {
      verdict: "below_recommended",
      verdictLabel: "满足基本要求，但未达推荐范围",
      explanation: `当前${metricName}${curStr}，已达到基本范围（${basicStr}），但仍高于推荐范围（${recStr}）${diff}${u}。`,
      currentDisplay: curStr,
      basicDisplay: basicStr,
      recommendedDisplay: recStr,
      currentValue: current,
      currentUnit: unit,
      minimumValue: basicRange,
      minimumLabel: basicStr,
      recommendedValue: recommendedRange,
      recommendedLabel: recStr,
      gapToMinimum: 0,
      gapToRecommended: parseFloat(diff)
    };
  } else {
    return {
      verdict: "meets_reference",
      verdictLabel: "达到推荐范围",
      explanation: `当前${metricName}${curStr}，已达到推荐范围（${recStr}）。`,
      currentDisplay: curStr,
      basicDisplay: basicStr,
      recommendedDisplay: recStr,
      currentValue: current,
      currentUnit: unit,
      minimumValue: basicRange,
      minimumLabel: basicStr,
      recommendedValue: recommendedRange,
      recommendedLabel: recStr,
      gapToMinimum: 0,
      gapToRecommended: 0
    };
  }
}

/**
 * Calculates independent width and height margins for 2D multi-axis target size rules.
 * Never averages dimensions. Identifies limiting axis.
 */
export function calculateMultiAxisMargin(
  currentW: number,
  currentH: number,
  thresholdW: number,
  thresholdH: number,
  unit: string
): {
  axes: AxisComparison[];
  limitingAxis?: string;
  meets: boolean;
} {
  const wMargin = calculateScalarMinMargin(currentW, thresholdW, unit);
  const hMargin = calculateScalarMinMargin(currentH, thresholdH, unit);

  const axes: AxisComparison[] = [
    {
      axis: "width",
      label: "宽度",
      current: currentW,
      threshold: thresholdW,
      unit,
      margin: wMargin.margin,
      marginFormatted: wMargin.marginFormatted,
      marginLabel: wMargin.marginLabel,
      meets: wMargin.meets
    },
    {
      axis: "height",
      label: "高度",
      current: currentH,
      threshold: thresholdH,
      unit,
      margin: hMargin.margin,
      marginFormatted: hMargin.marginFormatted,
      marginLabel: hMargin.marginLabel,
      meets: hMargin.meets
    }
  ];

  const meets = wMargin.meets && hMargin.meets;

  let limitingAxis: string | undefined = undefined;
  if (!wMargin.meets && !hMargin.meets) {
    limitingAxis = wMargin.margin < hMargin.margin ? "宽度" : "高度";
  } else if (!wMargin.meets) {
    limitingAxis = "宽度";
  } else if (!hMargin.meets) {
    limitingAxis = "高度";
  } else {
    // Both meet: limiting axis is the tighter margin
    limitingAxis = wMargin.margin <= hMargin.margin ? "宽度" : "高度";
  }

  return {
    axes,
    limitingAxis,
    meets
  };
}

/**
 * Builds explainable comparison trace for Touch Target Size.
 */
export function buildTargetSizeTrace(
  element: DesignElement,
  logicalMapping?: LogicalUnitMapping | null,
  wcagSpacing?: WcagSpacingEvaluation | null,
  targetPlatform?: TargetPlatform
): RuleComparisonTrace {
  const isInteractive = element.interaction_type !== "none";
  if (!isInteractive) {
    return {
      checkId: "platform_target_size",
      metricLabel: "触控目标尺寸",
      currentValueDisplay: "不可交互",
      verdict: "not_applicable",
      verdictLabel: TRACE_VERDICT_LABELS.not_applicable,
      comparison: {
        kind: "measurement_only",
        explanation: "当前元素未定义为可交互对象，不执行触控尺寸核验。"
      }
    };
  }

  const touchSource = element.touch_bounds_source;
  const isConfirmed = touchSource === "user_defined" || touchSource === "platform_reference";
  const isProxy = touchSource === "visual_copy" || (!element.touch_bounds && Boolean(element.image_pixel_bounds));
  const isMissing = !element.touch_bounds && !element.image_pixel_bounds;

  if (isMissing) {
    return {
      checkId: "platform_target_size",
      metricLabel: "触控目标尺寸",
      currentValueDisplay: "未配置",
      verdict: "needs_info",
      verdictLabel: TRACE_VERDICT_LABELS.needs_info,
      comparison: {
        kind: "needs_info",
        missingFields: ["实际触控范围"],
        explanation: "尚未配置触控范围，需确认实际交互热区以进行尺寸比对。"
      }
    };
  }

  const effectivePlatform = logicalMapping?.platform || targetPlatform || "custom";
  const unit = logicalMapping?.unit === "css_px" ? "CSS px" : (logicalMapping?.unit || "px");
  const targetEval = element.target_size_evaluation;

  // Missing logical mapping
  if (!logicalMapping) {
    if (effectivePlatform === "ios") {
      return {
        checkId: "platform_target_size",
        metricLabel: "触控目标尺寸 (Apple HIG)",
        currentValueDisplay: "未换算",
        unit: "pt",
        verdict: "needs_info",
        verdictLabel: TRACE_VERDICT_LABELS.needs_info,
        ruleId: "apple_touch_target_44",
        ruleTitle: "Apple HIG 触控目标 (≥ 44 × 44 pt)",
        ruleLayer: "L2_PLATFORM_GUIDELINE",
        evidenceStatus: "verified_reference",
        comparison: {
          kind: "needs_info",
          missingFields: ["设计尺寸换算依据 (Design Basis)"],
          explanation: "平台规则暂不可判断：缺少设计尺寸换算依据"
        },
        whyItMatters: "平台规范要求在逻辑点 (pt) 下满足触控热区基准，未提供设计尺寸换算时暂不执行正式判定。"
      };
    }
    if (effectivePlatform === "android") {
      return {
        checkId: "platform_target_size",
        metricLabel: "触控目标尺寸 (Android Material)",
        currentValueDisplay: "未换算",
        unit: "dp",
        verdict: "needs_info",
        verdictLabel: TRACE_VERDICT_LABELS.needs_info,
        ruleId: "android_touch_target_48",
        ruleTitle: "Android Material 触控目标 (≥ 48 × 48 dp)",
        ruleLayer: "L2_PLATFORM_GUIDELINE",
        evidenceStatus: "verified_reference",
        comparison: {
          kind: "needs_info",
          missingFields: ["设计尺寸换算依据 (Design Basis)"],
          explanation: "平台规则暂不可判断：缺少设计尺寸换算依据"
        },
        whyItMatters: "平台规范要求在密度无关像素 (dp) 下满足触控热区基准，未提供设计尺寸换算时暂不执行正式判定。"
      };
    }
    if (effectivePlatform === "web") {
      return {
        checkId: "platform_target_size",
        metricLabel: "触控目标尺寸 (Web WCAG 2.5.8)",
        currentValueDisplay: "未换算",
        unit: "CSS px",
        verdict: "needs_info",
        verdictLabel: TRACE_VERDICT_LABELS.needs_info,
        ruleId: "wcag_2_5_8",
        ruleTitle: "WCAG 2.2 SC 2.5.8 目标尺寸 (最低 24×24 CSS px 或间距例外)",
        ruleLayer: "L1_HARD_CONSTRAINT",
        evidenceStatus: "verified_reference",
        comparison: {
          kind: "needs_info",
          missingFields: ["设计尺寸换算依据 (Design Basis)"],
          explanation: "平台规则暂不可判断：缺少设计尺寸换算依据"
        },
        whyItMatters: "保障运动障碍及手部精细控制困难用户在点击网页链接与控件时不易误触。"
      };
    }

    const w = targetEval?.measured_width || element.image_pixel_bounds.width;
    const h = targetEval?.measured_height || element.image_pixel_bounds.height;
    return {
      checkId: "platform_target_size",
      metricLabel: "触控目标尺寸",
      currentValueDisplay: `${w} × ${h} ${unit}`,
      unit,
      verdict: isProxy ? "estimated_meets" : "measurement_only",
      verdictLabel: isProxy ? "估算参考" : "仅测量",
      resultBasis: isProxy ? "inferred" : "exact",
      comparison: {
        kind: "measurement_only",
        explanation: isProxy
          ? "基于可视范围估算，当前为自定义或未知平台，无预设平台尺寸阈值。"
          : "已测量触控尺寸。当前为自定义单位模式，无预设平台尺寸阈值。"
      }
    };
  }

  const platform = logicalMapping.platform;

  if (platform === "custom") {
    const w = targetEval?.measured_width || element.image_pixel_bounds.width;
    const h = targetEval?.measured_height || element.image_pixel_bounds.height;
    return {
      checkId: "platform_target_size",
      metricLabel: "触控目标尺寸",
      currentValueDisplay: `${w} × ${h} ${unit}`,
      unit,
      verdict: isProxy ? "estimated_meets" : "measurement_only",
      verdictLabel: isProxy ? "估算参考" : "仅测量",
      resultBasis: isProxy ? "inferred" : "exact",
      comparison: {
        kind: "measurement_only",
        explanation: isProxy
          ? "基于可视范围估算，当前为自定义或未知平台，无预设平台尺寸阈值。"
          : "已测量触控尺寸。当前为自定义单位模式，无预设平台尺寸阈值。"
      }
    };
  }

  // Web WCAG SC 2.5.8 Target Size Minimum (24 CSS px + Spacing Exception)
  if (platform === "web") {
    const curW = targetEval?.measured_width || 0;
    const curH = targetEval?.measured_height || 0;
    const sizeMet = curW >= 24 && curH >= 24;
    const spacingClear = wcagSpacing?.status === "spacing_circle_clear";

    const conditions = [
      {
        name: "目标尺寸条件",
        factDescription: `当前触控尺寸 ${curW} × ${curH} CSS px (要求 ≥ 24 × 24 CSS px)`,
        isMet: sizeMet
      },
      {
        name: "间距例外条件",
        factDescription: spacingClear
          ? "24px 间距圆范围内无相邻目标冲突"
          : (wcagSpacing?.status === "spacing_circle_conflict" ? "24px 间距圆与相邻目标存在交叠" : "未检测到相邻目标"),
        isMet: spacingClear
      }
    ];

    const meetsOverall = sizeMet || spacingClear;
    let verdict: TraceVerdict = "meets";
    if (!meetsOverall) {
      verdict = isProxy ? "estimated_attention" : "attention";
    } else {
      verdict = isProxy ? "estimated_meets" : "meets";
    }

    return {
      checkId: "platform_target_size",
      metricLabel: "触控目标尺寸 (Web WCAG 2.5.8)",
      currentValueDisplay: `${curW} × ${curH} CSS px`,
      unit: "CSS px",
      verdict,
      verdictLabel: TRACE_VERDICT_LABELS[verdict],
      ruleId: "wcag_2_5_8",
      ruleTitle: "WCAG 2.2 SC 2.5.8 目标尺寸 (最低 24×24 CSS px 或间距例外)",
      ruleLayer: "L1_HARD_CONSTRAINT",
      evidenceStatus: "verified_reference",
      claimStrength: "formal_constraint",
      resultBasis: isProxy ? "inferred" : "design_mapped",
      comparison: {
        kind: "conditional",
        summary: meetsOverall ? "满足 WCAG 2.5.8 尺寸或间距例外条件" : "低于 24 CSS px 且未满足间距例外条件",
        conditions
      },
      whyItMatters: "保障运动障碍及手部精细控制困难用户在点击网页链接与控件时不易误触。",
      recommendation: meetsOverall ? undefined : "建议将触控尺寸扩大至 24×24 CSS px，或增大与周边元素的距离。"
    };
  }

  // Android Material (48×48 dp) or Apple HIG (44×44 pt / 28×28 pt)
  const targetThreshold = platform === "android" ? 48 : 44;
  const curW = targetEval?.measured_width || 0;
  const curH = targetEval?.measured_height || 0;
  const multiMargin = calculateMultiAxisMargin(curW, curH, targetThreshold, targetThreshold, unit);

  let verdict: TraceVerdict = "meets";
  if (!multiMargin.meets) {
    if (platform === "ios" && curW >= 28 && curH >= 28) {
      // Meets iOS minimum (28pt) but below recommended (44pt)
      verdict = isProxy ? "estimated_below_recommended" : "below_recommended";
    } else {
      verdict = isProxy ? "estimated_attention" : "attention";
    }
  } else {
    verdict = isProxy ? "estimated_meets" : "meets";
  }

  const ruleTitle = platform === "android"
    ? "Android Material 触控目标推荐 (≥ 48 × 48 dp)"
    : "Apple HIG 触控区域推荐 (≥ 44 × 44 pt，最低 28 × 28 pt)";

  return {
    checkId: "platform_target_size",
    metricLabel: `触控目标尺寸 (${platform.toUpperCase()})`,
    currentValueDisplay: `${curW} × ${curH} ${unit}`,
    unit,
    verdict,
    verdictLabel: TRACE_VERDICT_LABELS[verdict],
    ruleId: platform === "android" ? "android_touch_target_48dp" : "apple_hig_touch_target_44pt",
    ruleTitle,
    ruleLayer: "L2_PLATFORM_GUIDELINE",
    evidenceStatus: "verified_reference",
    claimStrength: "recommended_target",
    resultBasis: isProxy ? "inferred" : "design_mapped",
    comparison: {
      kind: "multi_axis",
      thresholdDisplay: `≥ ${targetThreshold} × ${targetThreshold} ${unit}`,
      axes: multiMargin.axes,
      limitingAxis: multiMargin.limitingAxis
    },
    whyItMatters: "触控目标需满足肢体操作与指尖按压精度要求，足够的触控热区可降低移动设备上的误触与漏触率。",
    recommendation: multiMargin.meets ? undefined : `可通过扩展透明触控热区（Padding）达到平台 ${targetThreshold} ${unit} 推荐尺寸，无需放大视觉图标。`
  };
}

/**
 * Builds explainable comparison trace for Color Contrast (WCAG SC 1.4.3 / SC 1.4.11).
 */
export function buildContrastTrace(
  contrastEval?: ContrastEvaluation | null
): RuleComparisonTrace {
  if (!contrastEval) {
    return {
      checkId: "contrast",
      metricLabel: "色彩对比度",
      currentValueDisplay: "待取色",
      verdict: "needs_info",
      verdictLabel: TRACE_VERDICT_LABELS.needs_info,
      comparison: {
        kind: "needs_info",
        missingFields: ["前景色与背景色"],
        explanation: "请在右侧检查器中使用取色器提取文字前景色与背景色以计算对比度。"
      }
    };
  }

  const currentRatio = contrastEval.contrast_ratio;
  const threshold = contrastEval.threshold || (contrastEval.evaluation_type === "non_text" ? 3.0 : 4.5);
  const marginResult = calculateScalarMinMargin(currentRatio, threshold, ":1");
  const isPassed = contrastEval.passed;
  const verdict: TraceVerdict = isPassed ? "meets" : "attention";

  const ruleTitle = contrastEval.evaluation_type === "non_text"
    ? `WCAG 2.2 SC 1.4.11 非文本对比度 (≥ ${threshold}:1)`
    : `WCAG 2.2 SC 1.4.3 文本对比度 (≥ ${threshold}:1)`;

  return {
    checkId: "contrast",
    metricLabel: contrastEval.evaluation_type === "non_text" ? "非文本对比度" : "文本色彩对比度",
    currentValueDisplay: `${currentRatio}:1`,
    unit: ":1",
    verdict,
    verdictLabel: TRACE_VERDICT_LABELS[verdict],
    ruleId: contrastEval.evaluation_type === "non_text" ? "wcag_1_4_11" : "wcag_1_4_3",
    ruleTitle,
    ruleLayer: contrastEval.rule_layer || "L1_HARD_CONSTRAINT",
    evidenceStatus: (contrastEval.reference_status as any) || "verified_reference",
    claimStrength: contrastEval.claim_strength || "formal_constraint",
    resultBasis: contrastEval.result_basis || (contrastEval.status === "confirmed" ? "user_confirmed" : "inferred"),
    comparison: {
      kind: "scalar_min",
      threshold,
      thresholdDisplay: `≥ ${threshold}:1`,
      margin: marginResult.margin,
      marginFormatted: marginResult.marginFormatted,
      marginLabel: marginResult.marginLabel
    },
    whyItMatters: "足够的明度对比度保障低视力用户、老年人以及在强光/户外环境下仍能清晰识读界面内容。",
    recommendation: isPassed ? undefined : `当前对比度不足 ${threshold}:1，建议加深前景色或提亮背景色以满足无障碍标准。`
  };
}

/**
 * Builds explainable comparison trace for Text Size / Typography.
 */
export function buildTextSizeTrace(
  textSizeEval?: TextSizeEvaluation | null,
  logicalMapping?: LogicalUnitMapping | null,
  targetPlatform?: TargetPlatform
): RuleComparisonTrace {
  const effectivePlatform = logicalMapping?.platform || targetPlatform;

  if (!textSizeEval || textSizeEval.status === "not_applicable") {
    if (effectivePlatform && effectivePlatform !== "unknown" && !logicalMapping) {
      return {
        checkId: "typography",
        metricLabel: "文字字号",
        currentValueDisplay: "未换算",
        verdict: "needs_info",
        verdictLabel: TRACE_VERDICT_LABELS.needs_info,
        ruleId: effectivePlatform === "ios" ? "apple_text_size" : effectivePlatform === "android" ? "android_text_size" : undefined,
        ruleTitle: effectivePlatform === "ios" ? "Apple HIG 正文字号参考 (≥ 17 pt)" : effectivePlatform === "android" ? "Android Material 正文字号参考 (≥ 16 sp)" : undefined,
        comparison: {
          kind: "needs_info",
          missingFields: ["设计尺寸换算依据 (Design Basis)"],
          explanation: "平台规则暂不可判断：缺少设计尺寸换算依据"
        }
      };
    }
    return {
      checkId: "typography",
      metricLabel: "文字字号",
      currentValueDisplay: "未设置",
      verdict: "not_applicable",
      verdictLabel: TRACE_VERDICT_LABELS.not_applicable,
      comparison: {
        kind: "measurement_only",
        explanation: "非文本元素或未启用字号评估。"
      }
    };
  }

  const val = textSizeEval.measured_value || 0;
  const unit = textSizeEval.unit || (logicalMapping?.unit === "css_px" ? "CSS px" : (logicalMapping?.unit || "pt"));
  const isConfirmed = textSizeEval.evaluation_basis === "confirmed_source" || textSizeEval.source === "user_confirmed" || textSizeEval.source === "design_source";

  if (
    textSizeEval.status === "needs_info" ||
    textSizeEval.status === "pending_info" ||
    (!logicalMapping && effectivePlatform && effectivePlatform !== "unknown" && !isConfirmed)
  ) {
    const missingBasis = !logicalMapping && effectivePlatform && effectivePlatform !== "unknown" && !isConfirmed;
    return {
      checkId: "typography",
      metricLabel: "文字字号",
      currentValueDisplay: "未确认",
      unit,
      verdict: "needs_info",
      verdictLabel: TRACE_VERDICT_LABELS.needs_info,
      ruleId: textSizeEval.rule_id || (effectivePlatform === "ios" ? "apple_text_size" : effectivePlatform === "android" ? "android_text_size" : undefined),
      ruleTitle: textSizeEval.rule_id ? undefined : (effectivePlatform === "ios" ? "Apple HIG 正文字号参考 (≥ 17 pt)" : effectivePlatform === "android" ? "Android Material 正文字号参考 (≥ 16 sp)" : undefined),
      comparison: {
        kind: "needs_info",
        missingFields: missingBasis ? ["设计尺寸换算依据 (Design Basis)"] : ["真实源设计字号 (Source Font Size)"],
        explanation: missingBasis
          ? "平台规则暂不可判断：缺少设计尺寸换算依据"
          : "源设计字号未确认，请输入设计源中的真实字号。"
      }
    };
  }

  if (
    textSizeEval.status === "measurement_only" ||
    textSizeEval.status === "custom_unit" ||
    !textSizeEval.rule_id
  ) {
    return {
      checkId: "typography",
      metricLabel: "文字字号",
      currentValueDisplay: isConfirmed ? `${val} ${unit}` : `约 ${val} ${unit}`,
      unit,
      verdict: "measurement_only",
      verdictLabel: TRACE_VERDICT_LABELS.measurement_only,
      resultBasis: isConfirmed ? "user_confirmed" : "inferred",
      comparison: {
        kind: "measurement_only",
        explanation: textSizeEval.detail_text || (isConfirmed ? "当前文字角色无独立校验规则，仅记录字号测量值。" : "当前文字角色无独立校验规则，仅记录截图估算值。")
      },
      whyItMatters: "合适的字号与层级可保障阅读效率，防止小字号在移动设备或弱光环境下产生辨识困难。"
    };
  }

  const isIos = (logicalMapping?.platform || targetPlatform) === "ios";
  const isAndroid = (logicalMapping?.platform || targetPlatform) === "android";
  const minVal = isIos ? 11 : (isAndroid ? 12 : 12);
  const recVal = isIos ? 17 : (isAndroid ? 12 : 16);

  const evalTier = evaluateTieredLowerBound(val, minVal, recVal, unit, "字号", !isConfirmed);

  let verdict: TraceVerdict = "meets";
  if (evalTier.verdict === "below_threshold") {
    verdict = isConfirmed ? "attention" : "estimated_attention";
  } else if (evalTier.verdict === "below_recommended") {
    verdict = isConfirmed ? "below_recommended" : "estimated_below_recommended";
  } else {
    verdict = isConfirmed ? "meets" : "estimated_meets";
  }

  const thresholdDisplay = isIos
    ? `≥ 17 ${unit} (推荐) / ≥ 11 ${unit} (最低)`
    : `≥ ${recVal} ${unit}`;

  let marginLabel = "";
  if (evalTier.verdict === "below_recommended") {
    marginLabel = `达到基本要求 (≥ ${minVal} ${unit})，距离推荐值还差 ${evalTier.gapToRecommended} ${unit}`;
  } else if (evalTier.verdict === "below_threshold") {
    marginLabel = `距离基本要求还差 ${evalTier.gapToMinimum} ${unit}`;
  } else {
    marginLabel = `达到推荐值 (≥ ${recVal} ${unit})`;
  }

  return {
    checkId: "typography",
    metricLabel: "文字字号",
    currentValueDisplay: isConfirmed ? `${formatNumericValue(val, 1)} ${unit}` : `${formatNumericValue(val, 1)} ${unit}（估算）`,
    unit,
    verdict,
    verdictLabel: TRACE_VERDICT_LABELS[verdict],
    ruleId: textSizeEval.rule_id,
    ruleTitle: textSizeEval.reference || `正文字号可读性参考 (${thresholdDisplay})`,
    ruleLayer: textSizeEval.rule_layer || "L2_PLATFORM_GUIDELINE",
    evidenceStatus: isConfirmed && (textSizeEval.reference_status === "verified_reference" || textSizeEval.reference_status === "verified")
      ? "verified_reference"
      : "pending_verification",
    resultBasis: textSizeEval.result_basis || (isConfirmed ? "user_confirmed" : "inferred"),
    comparison: {
      kind: "scalar_min",
      threshold: recVal,
      thresholdDisplay,
      margin: -(evalTier.gapToRecommended || 0),
      marginFormatted: `-${evalTier.gapToRecommended || 0} ${unit}`,
      marginLabel,
      explanation: isConfirmed ? evalTier.explanation : `${textSizeEval.summary_text} 基于截图估算，不代表已确认设计源字号。`
    },
    whyItMatters: "合适的字号与层级可保障阅读效率，防止小字号在移动设备或弱光环境下产生辨识困难。",
    recommendation: (verdict === "attention" || verdict === "estimated_attention")
      ? (isConfirmed
          ? `建议将字号提升至 ${recVal} ${unit} 以上，或增加字重以保证可读性。`
          : `建议确认设计源字号，若实际字号偏小建议提升至 ${recVal} ${unit} 以上。`)
      : (verdict === "below_recommended" || verdict === "estimated_below_recommended")
      ? (isConfirmed
          ? `当前字号已达到基本要求，建议提升至 ${recVal} ${unit} 推荐范围以获得更好的阅读体验。`
          : `估算字号已达基本要求，建议在设计中采用 ${recVal} ${unit} 推荐字号。`)
      : undefined
  };
}


/**
 * Builds explainable comparison trace for Nearest Touch Spacing & Overlap.
 */
export function buildSpacingTrace(
  nearestInfo?: NearestTouchTargetResult | null,
  logicalMapping?: LogicalUnitMapping | null,
  element?: DesignElement | null,
  contextOperationState?: string,
  locale: "en" | "zh-CN" = "zh-CN"
): RuleComparisonTrace {
  if (!nearestInfo) {
    return {
      checkId: "touch_geometry",
      metricLabel: locale === "en" ? "Adjacent Touch Spacing" : "相邻触控间距",
      currentValueDisplay: locale === "en" ? "No adjacent touch targets" : "无相邻热区",
      verdict: "measurement_only",
      verdictLabel: getTraceVerdictLabel("measurement_only", locale),
      comparison: {
        kind: "measurement_only",
        explanation: locale === "en" ? "No adjacent interactive touch targets defined." : "当前未发现已定义的相邻触控目标。"
      }
    };
  }

  const nearestLabel = nearestInfo.nearest_element_label
    ? getElementDisplayName({ label: nearestInfo.nearest_element_label }, undefined, locale)
    : (locale === "en" ? "adjacent element" : "相邻元素");

  if (nearestInfo.overlap && nearestInfo.overlap.is_overlapping) {
    return {
      checkId: "touch_geometry",
      metricLabel: locale === "en" ? "Adjacent Touch Spacing / Overlap" : "相邻触控间距 / 重叠",
      currentValueDisplay: locale === "en" ? `Overlap ${nearestInfo.overlap.overlap_area} px²` : `重叠 ${nearestInfo.overlap.overlap_area} px²`,
      verdict: "attention",
      verdictLabel: getTraceVerdictLabel("attention", locale),
      ruleId: "touch_overlap_conflict",
      ruleTitle: locale === "en" ? "Touch Target Non-overlap Constraint" : "触控区域无重叠约束",
      ruleLayer: "L1_HARD_CONSTRAINT",
      evidenceStatus: "verified_reference",
      claimStrength: "formal_constraint",
      resultBasis: "exact",
      comparison: {
        kind: "conditional",
        summary: locale === "en" ? `Touch target overlaps with ${nearestLabel}` : `与 ${nearestLabel} 存在触控重叠冲突`,
        conditions: [
          {
            name: locale === "en" ? "Target Independence" : "热区独立性",
            factDescription: locale === "en" ? `Overlaps with ${nearestLabel} by ${nearestInfo.overlap.overlap_area} px²` : `与 ${nearestLabel} 重叠面积 ${nearestInfo.overlap.overlap_area} px²`,
            isMet: false
          }
        ]
      },
      whyItMatters: locale === "en" ? "Overlapping touch areas cause gesture ambiguity and high risk of unintended activation." : "重叠的触控热区会导致点击歧义或系统手势冲突，增加用户误触概率。",
      recommendation: locale === "en" ? "Suggest adjusting touch boundaries or increasing element spacing to ensure independent interactive targets." : "建议调整热区范围或增大元素间距，确保相邻触控区域相互独立。"
    };
  }

  const distVal = nearestInfo.distance_logical !== undefined ? nearestInfo.distance_logical : nearestInfo.distance_px;
  const unit = nearestInfo.distance_logical !== undefined && logicalMapping
    ? (logicalMapping.unit === "css_px" ? "CSS px" : logicalMapping.unit)
    : "px";
  const distStr = `${distVal} ${unit}`;
  const isProxy = element?.touch_bounds_source === "visual_copy" || (!element?.touch_bounds && Boolean(element?.image_pixel_bounds));

  const explanation = locale === "en"
    ? (isProxy
        ? `Edge clearance to nearest touch target (${nearestLabel}) is ${distStr} (measured from visual bounds, no overlap).`
        : `Edge clearance to nearest touch target (${nearestLabel}) is ${distStr} (no overlap).`)
    : (isProxy
        ? `距离最近触控目标 (${nearestLabel}) 最短边缘间距为 ${distStr}（基于可视边界测量，无重叠）。`
        : `距离最近触控目标 (${nearestLabel}) 最短边缘间距为 ${distStr}（无重叠）。`);

  return {
    checkId: "touch_geometry",
    metricLabel: locale === "en" ? "Adjacent Touch Spacing" : "相邻触控间距",
    currentValueDisplay: distStr,
    unit,
    verdict: "measurement_only",
    verdictLabel: getTraceVerdictLabel("measurement_only", locale),
    resultBasis: isProxy ? "inferred" : "exact",
    comparison: {
      kind: "measurement_only",
      explanation
    },
    whyItMatters: locale === "en" ? "Records minimum clearance between adjacent interactive elements to guide layout density." : "记录相邻交互控件间的最短距离，辅助排版布局与交互密集度分析。"
  };
}

/**
 * Builds explainable comparison trace for Physical Geometry (Millimeters).
 */
export function buildPhysicalGeometryTrace(
  element: DesignElement,
  calibrationMode: CalibrationMode,
  locale: "en" | "zh-CN" = "zh-CN"
): RuleComparisonTrace {
  const phys = element.physical_geometry;
  const isCalibrated = phys && phys.is_calibrated && phys.calibration_quality !== "relative_only";

  if (!isCalibrated || !phys?.width_mm || !phys?.height_mm) {
    return {
      checkId: "physical_geometry",
      metricLabel: locale === "en" ? "Actual Physical Size" : "实际物理尺寸",
      currentValueDisplay: locale === "en" ? "Unavailable" : "当前不可换算",
      unit: "mm",
      verdict: "not_applicable",
      verdictLabel: getTraceVerdictLabel("not_applicable", locale),
      comparison: {
        kind: "measurement_only",
        explanation: phys?.calibration_message || (locale === "en" ? "Screenshot aspect ratio does not match display resolution, unable to establish full-screen physical dimension scaling." : "当前截图比例与屏幕分辨率不一致，无法稳定建立完整屏幕物理尺寸换算。")
      }
    };
  }

  const dimStr = locale === "en"
    ? `≈ ${formatNumericValue(phys.width_mm, 2)} × ${formatNumericValue(phys.height_mm, 2)} mm`
    : `约 ${formatNumericValue(phys.width_mm, 2)} × ${formatNumericValue(phys.height_mm, 2)} mm`;
  return {
    checkId: "physical_geometry",
    metricLabel: locale === "en" ? "Actual Physical Size" : "实际物理尺寸",
    currentValueDisplay: dimStr,
    unit: "mm",
    verdict: "measurement_only",
    verdictLabel: getTraceVerdictLabel("measurement_only", locale),
    resultBasis: phys.calibration_quality === "exact" ? "exact" : "estimated",
    comparison: {
      kind: "measurement_only",
      explanation: locale === "en"
        ? `Physical dimensions ≈ ${dimStr} (derived from screen ${formatNumericValue(phys.screen_width_mm, 1)} × ${formatNumericValue(phys.screen_height_mm, 1)} mm, ${formatNumericValue(phys.ppi, 1)} PPI for ergonomic reference).`
        : `物理尺寸约 ${dimStr}（基于屏幕 ${formatNumericValue(phys.screen_width_mm, 1)} × ${formatNumericValue(phys.screen_height_mm, 1)} mm，${formatNumericValue(phys.ppi, 1)} PPI 换算，供人体工学参考）。`
    }
  };
}

/**
 * Builds explainable comparison trace for Rendered Character Visual Angle (HF / Automotive).
 */
export function buildCharacterVisualAngleTrace(
  element: DesignElement,
  scenarioScope?: ScenarioScope,
  candidateReferences?: CandidateHumanFactorsReference[],
  viewingDistanceInput?: string | number,
  locale: "en" | "zh-CN" = "zh-CN"
): RuleComparisonTrace | null {
  if (element.element_type !== "text") return null;

  const isCharInvalid = Boolean(
    element.character_height_px &&
    element.image_pixel_bounds.height > 0 &&
    element.character_height_px > element.image_pixel_bounds.height + 0.01
  );

  if (isCharInvalid) {
    return {
      checkId: "human_factors_visual_angle",
      metricLabel: locale === "en" ? "Vertical Visual Angle" : "代表字符垂直视角",
      currentValueDisplay: locale === "en" ? `${formatNumericValue(element.character_height_px!, 1)} px (Measurement Error)` : `${formatNumericValue(element.character_height_px!, 1)} px (测量异常)`,
      unit: "arcmin",
      verdict: "needs_info",
      verdictLabel: getTraceVerdictLabel("needs_info", locale),
      comparison: {
        kind: "needs_info",
        missingFields: locale === "en" ? ["Valid Representative Glyph Measurement"] : ["有效代表字符测量 (valid_character_height)"],
        explanation: locale === "en" ? "Representative character height exceeds container bounds; invalid measurement, please re-draw." : "代表字符测量高度大于文字区域高度，测量异常，请重新框选。"
      }
    };
  }

  const charVa = element.character_height_visual_angle;
  if (!charVa || charVa.arcmin <= 0) {
    if (element.character_height_px) {
      return {
        checkId: "human_factors_visual_angle",
        metricLabel: locale === "en" ? "Vertical Visual Angle" : "代表字符垂直视角",
        currentValueDisplay: locale === "en" ? `${formatNumericValue(element.character_height_px, 1)} px (Viewing Distance Unset)` : `${formatNumericValue(element.character_height_px, 1)} px (视距未配置)`,
        unit: "arcmin",
        verdict: "needs_info",
        verdictLabel: getTraceVerdictLabel("needs_info", locale),
        comparison: {
          kind: "needs_info",
          missingFields: locale === "en" ? ["Viewing Distance"] : ["观看距离 (viewing_distance)"],
          explanation: locale === "en" ? "Representative glyph pixel height acquired. Configure display hardware and viewing distance to calculate retinal visual angle." : "已获取代表字符像素高度，配置屏幕硬件与观看距离后可计算字符垂直视角并比对人因参考。"
        }
      };
    }
    return null;
  }

  // Qualified References
  const defaultCandidates: CandidateHumanFactorsReference[] = [
    // Automotive direct references (NHTSA DOT HS 812 360)
    {
      reference_id: "REF-NHTSA-TEXT-OPTIMAL",
      source: "NHTSA DOT HS 812 360",
      title: "NHTSA 文本字符高度最佳视角参考",
      mechanism: "visual_legibility",
      measurement_target: "character_height",
      target_domain: "automotive",
      value: 20,
      unit: "arcmin",
      default_role: "optimal_reference",
      evidence_strength: "verified",
      applicability_origin: "external_reference",
      applicable_scopes: {
        observer_roles: ["driver"],
        operation_states: ["driving", "parked"]
      }
    },
    {
      reference_id: "REF-NHTSA-TEXT-CRITICAL",
      source: "NHTSA DOT HS 812 360",
      title: "NHTSA 文本字符高度时间敏感建议最小值",
      mechanism: "visual_legibility",
      measurement_target: "character_height",
      target_domain: "automotive",
      value: 16,
      unit: "arcmin",
      default_role: "recommended_minimum",
      evidence_strength: "verified",
      applicability_origin: "external_reference",
      applicable_scopes: {
        observer_roles: ["driver"],
        operation_states: ["driving"],
        time_criticalities: ["time_critical"]
      }
    },
    {
      reference_id: "REF-NHTSA-TEXT-NORMAL",
      source: "NHTSA DOT HS 812 360",
      title: "NHTSA 文本字符高度常规建议最小值",
      mechanism: "visual_legibility",
      measurement_target: "character_height",
      target_domain: "automotive",
      value: 12,
      unit: "arcmin",
      default_role: "recommended_minimum",
      evidence_strength: "verified",
      applicability_origin: "external_reference",
      applicable_scopes: {
        observer_roles: ["driver"],
        operation_states: ["driving", "parked"],
        time_criticalities: ["non_time_critical"]
      }
    },
    // Generic Human Factors character height fallback references
    {
      reference_id: "REF-HF-GENERIC-TEXT-RECOMMENDED",
      source: "通用人因视觉参考",
      title: "通用字符可读性视角推荐参考",
      mechanism: "visual_legibility",
      measurement_target: "character_height",
      value: 20,
      unit: "arcmin",
      default_role: "recommended_minimum",
      evidence_strength: "verified",
      applicability_origin: "direct_human_factors",
      limitations: ["通用人因视觉参考，不代表当前平台正式字号规范"]
    },
    {
      reference_id: "REF-HF-GENERIC-TEXT-BASIC",
      source: "通用人因视觉参考",
      title: "通用字符可读性视角基本参考",
      mechanism: "visual_legibility",
      measurement_target: "character_height",
      value: 16,
      unit: "arcmin",
      default_role: "governing_minimum",
      evidence_strength: "verified",
      applicability_origin: "direct_human_factors",
      limitations: ["通用人因视觉参考，不代表当前平台正式字号规范"]
    }
  ];

  const candidatesToEvaluate = candidateReferences || defaultCandidates;

  const envelope = resolveReferenceEnvelope({
    metric: "character_visual_angle",
    current_measurement: {
      value: charVa.arcmin,
      unit: "arcmin",
      target: "character_height"
    },
    scenario: scenarioScope,
    candidates: candidatesToEvaluate
  });

  const arcminVal = Math.round(charVa.arcmin * 10) / 10;
  const currentDisplay = `${arcminVal}′ (${charVa.deg.toFixed(2)}°)`;

  const distMm = parseViewingDistanceMm(viewingDistanceInput) || (
    element.character_height_physical_mm && charVa.deg
      ? (element.character_height_physical_mm / 2) / Math.tan((charVa.deg * Math.PI) / 360)
      : null
  );

  // Priority 1 & 2: Direct target-domain governing or recommended/optimal reference
  if (
    envelope.governing_references.length > 0 ||
    envelope.recommended_references.length > 0 ||
    envelope.optimal_references.length > 0
  ) {
    const primaryRef =
      envelope.governing_references[0] ||
      envelope.recommended_references[0] ||
      envelope.optimal_references[0];

    const isGenericFallback =
      primaryRef.reference.reference_id === "REF-HF-GENERIC-TEXT-RECOMMENDED" ||
      primaryRef.reference.reference_id === "REF-HF-GENERIC-TEXT-BASIC";

    if (isGenericFallback) {
      const basicMm = distMm ? derivePhysicalSizeForVisualAngle({ arcmin: 16 }, distMm) : null;
      const recMm = distMm ? derivePhysicalSizeForVisualAngle({ arcmin: 20 }, distMm) : null;
      const physicalNote = recMm && basicMm ? ` [对应约 ${recMm.toFixed(2)} mm / ${basicMm.toFixed(2)} mm]` : "";

      let verdict: TraceVerdict;
      let verdictLabel: string;
      let margin: number;
      let marginFormatted: string;
      let marginLabel: string;

      if (arcminVal < 16) {
        verdict = "attention";
        verdictLabel = locale === "en" ? "Below basic reference" : "低于人因基本参考";
        margin = arcminVal - 16;
        marginFormatted = `-${(16 - arcminVal).toFixed(1)}′`;
        marginLabel = locale === "en" ? `Below basic requirement by ${(16 - arcminVal).toFixed(1)}′` : `距离基本要求还差 ${(16 - arcminVal).toFixed(1)}′`;
      } else if (arcminVal < 20) {
        verdict = "below_recommended";
        verdictLabel = locale === "en" ? "Meets basic requirement, but below recommended range" : "满足基本要求，但未达推荐范围";
        margin = arcminVal - 20;
        marginFormatted = `-${(20 - arcminVal).toFixed(1)}′`;
        marginLabel = locale === "en" ? `Meets basic reference (≥ 16′), below recommended by ${(20 - arcminVal).toFixed(1)}′` : `达到基本参考 (≥ 16′)，距离推荐值还差 ${(20 - arcminVal).toFixed(1)}′`;
      } else {
        verdict = "meets";
        verdictLabel = locale === "en" ? "Within recommended range" : "达到通用人因推荐范围";
        margin = arcminVal - 20;
        marginFormatted = `+${(arcminVal - 20).toFixed(1)}′`;
        marginLabel = locale === "en" ? "Meets recommended reference (≥ 20′)" : "达到推荐值 (≥ 20′)";
      }

      return {
        checkId: "human_factors_visual_angle",
        metricLabel: locale === "en" ? "Vertical Visual Angle" : "代表字符垂直视角",
        currentValueDisplay: currentDisplay,
        unit: "arcmin",
        verdict,
        verdictLabel,
        ruleId: "REF-HF-GENERIC-TEXT-RECOMMENDED",
        ruleTitle: locale === "en" ? "General Legibility Human Factors Reference (Basic ≥ 16′ / Rec ≥ 20′)" : `通用字符可读性人因参考 (基本 ≥ 16′ / 推荐 ≥ 20′)`,
        ruleLayer: "L3_HUMAN_FACTORS",
        evidenceStatus: "verified_reference",
        resultBasis: "estimated",
        comparison: {
          kind: "scalar_min",
          threshold: 20,
          thresholdDisplay: locale === "en" ? `≥ 20′ (Recommended) / ≥ 16′ (Basic)${physicalNote}` : `≥ 20′ (推荐) / ≥ 16′ (基本)${physicalNote}`,
          margin,
          marginFormatted,
          marginLabel
        },
        assumptions: [
          locale === "en" ? "General Human Factors reference, does not represent formal platform typography specifications" : "通用人因视觉参考，不代表当前平台正式字号规范",
          ...(distMm ? [locale === "en" ? `At viewing distance ${distMm >= 100 ? (distMm / 10).toFixed(0) + " cm" : distMm.toFixed(0) + " mm"}, recommended physical height ≈ ${recMm?.toFixed(2)} mm, basic height ≈ ${basicMm?.toFixed(2)} mm` : `视距 ${distMm >= 100 ? (distMm / 10).toFixed(0) + " cm" : distMm.toFixed(0) + " mm"} 下对应推荐物理高度约 ${recMm?.toFixed(2)} mm，基本高度约 ${basicMm?.toFixed(2)} mm`] : [])
        ],
        whyItMatters: locale === "en" ? "Visual angle determines retinal image size and is the key physical determinant of legibility in dynamic or mobile environments." : "字符视觉角度决定视网膜成像大小，是影响动态或移动环境下文字瞬时辨识的关键人因物理指标。此项为通用人因视觉参考，不代表当前平台正式字号规范。",
        recommendation: arcminVal < 16
          ? (locale === "en" ? `Representative character visual angle (${arcminVal}′) is below basic reference (16′). Suggest increasing font size or decreasing viewing distance to improve legibility.` : `当前代表字符视角 (${arcminVal}′) 低于通用人因基本参考 (16′)。建议增大字号或缩短视距以提高可读性（通用人因视觉参考，不代表当前平台正式字号规范）。`)
          : arcminVal < 20
          ? (locale === "en" ? `Representative character visual angle (${arcminVal}′) meets basic reference (≥ 16′), but remains below recommended comfortable range (≥ 20′).` : `当前代表字符视角 (${arcminVal}′) 已达到基本要求 (≥ 16′)，但仍低于推荐舒适范围 (≥ 20′)（通用人因视觉参考，不代表当前平台正式字号规范）。`)
          : undefined
      };
    }

    const thresholdVal = Number(primaryRef.reference.value);
    const margin = calculateScalarMinMargin(arcminVal, thresholdVal, "arcmin", locale);

    const verdict: TraceVerdict = margin.meets ? "meets" : "attention";
    const verdictLabel = margin.meets
      ? (locale === "en" ? "Meets Human Factors recommendation" : "达到人因建议参考")
      : (locale === "en" ? "Below Human Factors recommendation" : "低于人因建议参考");

    return {
      checkId: "human_factors_visual_angle",
      metricLabel: locale === "en" ? "Vertical Visual Angle" : "代表字符垂直视角",
      currentValueDisplay: currentDisplay,
      unit: "arcmin",
      verdict,
      verdictLabel,
      ruleId: primaryRef.reference.reference_id,
      ruleTitle: `${primaryRef.reference.source} · ${primaryRef.reference.title} (≥ ${thresholdVal}′)`,
      ruleLayer: "L3_HUMAN_FACTORS",
      evidenceStatus: "verified_reference",
      resultBasis: "estimated",
      comparison: {
        kind: "scalar_min",
        threshold: thresholdVal,
        thresholdDisplay: locale === "en" ? `≥ ${thresholdVal}′ (Recommended Reference)` : `≥ ${thresholdVal}′ (建议参考)`,
        margin: margin.margin,
        marginFormatted: margin.marginFormatted,
        marginLabel: margin.marginLabel
      },
      whyItMatters: locale === "en" ? "Visual angle determines retinal image size and is the key physical determinant of legibility." : "字符视觉角度决定视网膜成像大小，是影响动态或移动环境下文字瞬时辨识的关键人因物理指标。",
      recommendation: !margin.meets
        ? (locale === "en" ? `Representative glyph visual angle (${arcminVal}′) is below recommendation (${thresholdVal}′). Suggest increasing font size or shortening viewing distance.` : `当前字符视角 (${arcminVal}′) 低于人因推荐参考 (${thresholdVal}′)。建议增大字号或缩短视距以提高可辨识度。`)
        : undefined
    };
  }

  // Priority 3: Qualified visual_angle_equivalent adapted reference
  if (envelope.adapted_references.length > 0 && distMm && distMm > 0 && element.character_height_physical_mm) {
    const adaptedRef = envelope.adapted_references[0];
    const refAngleValue = Number(adaptedRef.reference.value);
    const refUnit = adaptedRef.reference.unit || "arcmin";
    const angleParam = refUnit === "deg" ? { deg: refAngleValue } : { arcmin: refAngleValue };

    const targetMm = derivePhysicalSizeForVisualAngle(angleParam, distMm);

    if (targetMm !== null && targetMm > 0) {
      const actualMm = element.character_height_physical_mm;
      const margin = calculateScalarMinMargin(actualMm, targetMm, "mm", locale);
      const verdict: TraceVerdict = margin.meets ? "meets" : "attention";
      const verdictLabel = margin.meets
        ? (locale === "en" ? "Meets adapted recommendation" : "达到换算推荐值")
        : (locale === "en" ? "Below adapted recommendation" : "未达到换算推荐值");
      const distDisplay = distMm >= 100 ? `${(distMm / 10).toFixed(0)} cm` : `${distMm.toFixed(0)} mm`;

      return {
        checkId: "human_factors_visual_angle",
        metricLabel: locale === "en" ? "Equivalent Angle Reference" : "等视角换算参考",
        currentValueDisplay: locale === "en" ? `≈ ${formatNumericValue(actualMm, 2)} mm (${currentDisplay})` : `约 ${formatNumericValue(actualMm, 2)} mm (${currentDisplay})`,
        unit: "mm",
        verdict,
        verdictLabel,
        ruleId: adaptedRef.reference.reference_id,
        ruleTitle: locale === "en" ? `Equivalent Angle Reference · ${adaptedRef.reference.title} (≥ ${formatNumericValue(targetMm, 2)} mm)` : `等视角换算参考 · ${adaptedRef.reference.title} (≥ ${formatNumericValue(targetMm, 2)} mm)`,
        ruleLayer: "L3_HUMAN_FACTORS",
        evidenceStatus: "verified_reference",
        resultBasis: "estimated",
        comparison: {
          kind: "scalar_min",
          threshold: targetMm,
          thresholdDisplay: locale === "en" ? `≥ ${formatNumericValue(targetMm, 2)} mm (Adapted Reference)` : `≥ ${formatNumericValue(targetMm, 2)} mm (等视角换算参考)`,
          margin: margin.margin,
          marginFormatted: margin.marginFormatted,
          marginLabel: margin.marginLabel
        },
        assumptions: [
          locale === "en"
            ? `${refAngleValue}′ visual angle reference mapped to physical size at viewing distance ${distDisplay}. Cross-domain reference, does not represent formal platform specification.`
            : `${refAngleValue}′ 视觉角参考，按当前观看距离 ${distDisplay} 换算。跨场景换算参考，不代表当前平台正式规范。`
        ],
        whyItMatters: locale === "en"
          ? "Cross-domain equivalent angle references map proven visual angle benchmarks to physical sizes at the current viewing distance to aid design evaluation."
          : "跨场景等视角换算参考将其他领域的有效视觉角基准映射至当前视距下的物理尺寸，用于辅助设计评估。跨场景换算参考，不代表当前平台正式规范。",
        recommendation: !margin.meets
          ? (locale === "en" ? `Current physical glyph height (≈ ${formatNumericValue(actualMm, 2)} mm) is below adapted recommended value (${formatNumericValue(targetMm, 2)} mm).` : `当前字符物理高度 (约 ${formatNumericValue(actualMm, 2)} mm) 低于等视角换算推荐值 (${formatNumericValue(targetMm, 2)} mm)。跨场景换算参考，不代表当前平台正式规范。`)
          : undefined
      };
    }
  }

  // Priority 4: Generic measurement only
  return {
    checkId: "human_factors_visual_angle",
    metricLabel: locale === "en" ? "Vertical Visual Angle" : "代表字符垂直视角",
    currentValueDisplay: currentDisplay,
    unit: "arcmin",
    verdict: "measurement_only",
    verdictLabel: getTraceVerdictLabel("measurement_only", locale),
    resultBasis: "estimated",
    comparison: {
      kind: "measurement_only",
      explanation: locale === "en"
        ? `Representative character vertical visual angle: ${currentDisplay} (derived from physical character height ${element.character_height_physical_mm ? element.character_height_physical_mm.toFixed(2) + " mm" : "uncalibrated"} and viewing distance).`
        : `代表字符垂直视角为 ${currentDisplay}（基于字符物理高度 ${element.character_height_physical_mm ? element.character_height_physical_mm.toFixed(2) + " mm" : "未换算"} 与视距测算）。`
    },
    whyItMatters: locale === "en"
      ? "Visual angle is an objective human factors physical metric measuring the retinal image size of text in the human eye."
      : "字符视觉角度是衡量文字在人眼视网膜上实际角大小的客观人因物理量。"
  };
}

/**
 * Builds explainable comparison trace for Symbol / Graphical Detail Visual Angle.
 * Only applies when MeasurementTarget is explicitly symbol / primary_graphical_element.
 * Does NOT apply to generic icon outer bounds or element visual bounds.
 */
export function buildGraphicalVisualAngleTrace(
  element: DesignElement,
  scenarioScope?: ScenarioScope,
  candidateReferences?: CandidateHumanFactorsReference[],
  viewingDistanceInput?: string | number,
  locale: "en" | "zh-CN" = "zh-CN"
): RuleComparisonTrace | null {
  if (element.element_type !== "icon" && element.text_visual_measurement_target !== "symbol") {
    return null;
  }

  // Guard: require explicit symbol/graphical feature measurement target
  const isExplicitGraphicTarget =
    element.text_visual_measurement_target === "symbol" ||
    Boolean(element.character_height_px && element.element_type === "icon");

  if (!isExplicitGraphicTarget) {
    return null;
  }

  const distMm = parseViewingDistanceMm(viewingDistanceInput);
  if (!distMm || distMm <= 0) return null;

  let featureHeightMm = element.character_height_physical_mm;
  if (!featureHeightMm && element.character_height_px && element.image_pixel_bounds.height > 0 && element.physical_geometry?.height_mm) {
    featureHeightMm = Math.round(((element.character_height_px / element.image_pixel_bounds.height) * element.physical_geometry.height_mm) * 1000) / 1000;
  }

  if (!featureHeightMm || featureHeightMm <= 0) return null;

  const angleDeg = 2 * Math.atan(featureHeightMm / (2 * distMm)) * (180 / Math.PI);
  const angleArcmin = Math.round(angleDeg * 60 * 10) / 10;
  const currentDisplay = `${angleArcmin}′ (${angleDeg.toFixed(2)}°)`;

  const isAutomotive = scenarioScope?.domain === "automotive";
  const reqMin = isAutomotive ? 16 : 16;
  const reqRec = isAutomotive ? 24 : 22;

  const basicMm = derivePhysicalSizeForVisualAngle({ arcmin: reqMin }, distMm);
  const recMm = derivePhysicalSizeForVisualAngle({ arcmin: reqRec }, distMm);
  const physicalNote = recMm && basicMm ? ` [对应约 ${recMm.toFixed(2)} mm / ${basicMm.toFixed(2)} mm]` : "";

  let verdict: TraceVerdict;
  let verdictLabel: string;
  let marginLabel: string;

  if (angleArcmin < reqMin) {
    verdict = "attention";
    verdictLabel = locale === "en" ? "Below basic graphic reference" : "低于图形辨识基本参考";
    marginLabel = locale === "en" ? `Below basic requirement by ${(reqMin - angleArcmin).toFixed(1)}′` : `距离基本要求还差 ${(reqMin - angleArcmin).toFixed(1)}′`;
  } else if (angleArcmin < reqRec) {
    verdict = "below_recommended";
    verdictLabel = locale === "en" ? "Meets basic requirement, but below recommended range" : "满足基本要求，但未达推荐范围";
    marginLabel = locale === "en" ? `Meets basic reference (≥ ${reqMin}′), below recommended by ${(reqRec - angleArcmin).toFixed(1)}′` : `达到基本参考 (≥ ${reqMin}′)，距离推荐值还差 ${(reqRec - angleArcmin).toFixed(1)}′`;
  } else {
    verdict = "meets";
    verdictLabel = locale === "en" ? "Within recommended range" : "达到通用图形辨识推荐范围";
    marginLabel = locale === "en" ? `Meets recommended reference (≥ ${reqRec}′)` : `达到推荐值 (≥ ${reqRec}′)`;
  }

  return {
    checkId: "graphical_visual_angle",
    metricLabel: locale === "en" ? "Graphic Detail Visual Angle" : "图形辨识视角",
    currentValueDisplay: currentDisplay,
    unit: "arcmin",
    verdict,
    verdictLabel,
    ruleId: isAutomotive ? "REF-NHTSA-ICON-NORMAL" : "REF-HF-GENERIC-GRAPHIC-RECOMMENDED",
    ruleTitle: locale === "en" ? `General Graphic Legibility Human Factors Reference (Basic ≥ ${reqMin}′ / Rec ≥ ${reqRec}′)` : `通用图形辨识人因参考 (基本 ≥ ${reqMin}′ / 推荐 ≥ ${reqRec}′)`,
    ruleLayer: "L3_HUMAN_FACTORS",
    evidenceStatus: "verified_reference",
    resultBasis: "estimated",
    comparison: {
      kind: "scalar_min",
      threshold: reqRec,
      thresholdDisplay: locale === "en" ? `≥ ${reqRec}′ (Recommended) / ≥ ${reqMin}′ (Basic)${physicalNote}` : `≥ ${reqRec}′ (推荐) / ≥ ${reqMin}′ (基本)${physicalNote}`,
      margin: angleArcmin - reqRec,
      marginFormatted: `${angleArcmin >= reqRec ? "+" : "-"}${Math.abs(angleArcmin - reqRec).toFixed(1)}′`,
      marginLabel
    },
    assumptions: [locale === "en" ? "General Human Factors reference for critical graphical details, does not represent outer bounds requirement" : "通用图形辨识人因参考，仅适用于符号与关键图形细节，不代表外框边界要求"],
    whyItMatters: locale === "en" ? "Visual angle of critical graphic details determines retinal image legibility." : "图形与符号的关键细节视觉角度决定了其在视网膜上的成像辨识度。此项为通用图形辨识人因参考。",
    recommendation: angleArcmin < reqRec
      ? (locale === "en" ? `Graphic key detail visual angle (${angleArcmin}′) is below recommended reference (${reqRec}′). Suggest enlarging core symbol or simplifying details.` : `图形关键细节视角 (${angleArcmin}′) 低于推荐辨识范围 (${reqRec}′)。建议适当放大核心图形或精简细节。`)
      : undefined
  };
}

/**
 * Builds explainable comparison trace for Touch Target Physical Size (Human Factors fallback).
 * Evaluates against 9mm generic handheld recommendation or 17.5mm automotive driving recommendation.
 * Differentiates confirmed touch bounds vs visual bounds proxy.
 */
export function buildTouchPhysicalTrace(
  element: DesignElement,
  scenarioScope?: ScenarioScope,
  mmPerPixel?: number,
  calibrationMode?: string,
  imageWidth: number = 1000,
  imageHeight: number = 1000,
  locale: "en" | "zh-CN" = "zh-CN"
): RuleComparisonTrace | null {
  const isInteractive = element.interaction_type !== undefined
    ? element.interaction_type !== "none"
    : ["button", "input"].includes(element.element_type);
  if (!isInteractive) return null;

  const provenance = resolveTouchSourceProvenance(element);
  if (provenance === "missing") return null;

  const isProxy = provenance === "visual_bounds_proxy";
  const touchPx = getEffectiveTouchPixelBounds(element, imageWidth, imageHeight) || element.image_pixel_bounds;
  if (!touchPx || touchPx.width <= 0 || touchPx.height <= 0) return null;

  let widthMm: number | undefined;
  let heightMm: number | undefined;

  if (mmPerPixel && mmPerPixel > 0) {
    widthMm = Math.round(touchPx.width * mmPerPixel * 10) / 10;
    heightMm = Math.round(touchPx.height * mmPerPixel * 10) / 10;
  } else if (element.physical_geometry?.is_calibrated && element.physical_geometry.width_mm && element.physical_geometry.height_mm) {
    const containerW = element.image_pixel_bounds.width || touchPx.width;
    const containerH = element.image_pixel_bounds.height || touchPx.height;
    widthMm = Math.round(((touchPx.width / containerW) * element.physical_geometry.width_mm) * 10) / 10;
    heightMm = Math.round(((touchPx.height / containerH) * element.physical_geometry.height_mm) * 10) / 10;
  }

  if (!widthMm || !heightMm || widthMm <= 0 || heightMm <= 0) {
    return {
      checkId: "touch_physical_size",
      metricLabel: locale === "en" ? "Physical Touch Target" : "触控物理尺寸",
      currentValueDisplay: locale === "en" ? `${touchPx.width} × ${touchPx.height} px (Hardware Uncalibrated)` : `${touchPx.width} × ${touchPx.height} px (硬件未校准)`,
      unit: "mm",
      verdict: "needs_info",
      verdictLabel: getTraceVerdictLabel("needs_info", locale),
      comparison: {
        kind: "needs_info",
        missingFields: locale === "en" ? ["Display Hardware Calibration"] : ["屏幕硬件校准 (Display Calibration)"],
        explanation: locale === "en" ? "Configure screen dimensions and resolution to calculate physical touch dimensions in millimeters." : "配置屏幕尺寸与分辨率后，可计算触控热区的物理毫米尺寸并进行人因触控评估。"
      }
    };
  }

  const minDim = Math.min(widthMm, heightMm);
  const currentDisplay = locale === "en"
    ? `≈ ${widthMm} × ${heightMm} mm${isProxy ? " (estimated from visible bounds)" : ""}`
    : `约 ${widthMm} × ${heightMm} mm${isProxy ? "（可视区域估算）" : ""}`;

  // Automotive driving vs Generic handheld touch
  const isAutoDriving =
    scenarioScope?.domain === "automotive" &&
    scenarioScope?.observer_role === "driver" &&
    (scenarioScope?.operation_state === "driving" || scenarioScope?.time_criticality === "time_critical");

  const threshold = isAutoDriving ? 17.5 : 9.0;
  const ruleId = isAutoDriving ? "REF-HF-AUTO-TOUCH-RECOMMENDED" : "REF-HF-GENERIC-TOUCH-RECOMMENDED";
  const ruleTitle = isAutoDriving
    ? (locale === "en" ? "Automotive Driving Direct Touch Recommended Reference (≥ 17.5 mm)" : "车载驾驶直接触控推荐参考 (≥ 17.5 mm)")
    : (locale === "en" ? "General Handheld Direct Touch Physical Size Recommendation (≥ 9 mm)" : "通用手持直接触控物理尺寸推荐 (≥ 9 mm)");
  const disclaimer = isAutoDriving
    ? (locale === "en" ? "driving scenario research reference, not a platform-enforced minimum" : "驾驶场景研究参考，非法规强制最低值")
    : (locale === "en" ? "general Human Factors touch reference (≥ 9 mm), not a platform-enforced minimum" : "通用人因触控推荐参考 (≥ 9 mm)，非平台强制最低值");
  const whyItMatters = isAutoDriving
    ? (locale === "en"
        ? "In automotive driving scenarios, smaller direct touch targets significantly increase glance-off-road duration and unintended activation risk. This is a driving research reference, not a mandatory regulation minimum."
        : "车载驾驶场景下，较小的直接触控热区会显著增加驾驶员视线转移时间与误触风险。此项为驾驶场景研究参考，非法规强制最低值。")
    : (locale === "en"
        ? "For handheld direct touch interaction, physical dimensions of 9 mm or larger ensure finger press accuracy and operational fault tolerance. This is a general Human Factors recommendation, not a platform-enforced minimum."
        : "手持直接触控操作中，物理尺寸达到 9mm 以上有助于保障手指按压精度与操作容错率。此项为通用人因触控推荐参考，非平台强制最低值。");

  const meets = minDim >= threshold;
  const diff = Math.abs(Math.round((threshold - minDim) * 10) / 10);

  let verdict: TraceVerdict;
  let verdictLabel: string;

  if (meets) {
    verdict = isProxy ? "estimated_meets" : "meets";
    verdictLabel = isProxy
      ? (locale === "en" ? "Within recommended range (est.)" : "达到推荐参考（估算）")
      : (isAutoDriving
          ? (locale === "en" ? "Meets driving scenario reference" : "达到驾驶场景推荐参考")
          : (locale === "en" ? "Within general touch reference" : "达到通用触控推荐参考"));
  } else {
    verdict = isProxy ? "estimated_below_recommended" : "below_recommended";
    verdictLabel = isProxy
      ? (locale === "en" ? "Below recommended reference (est.)" : "低于推荐参考（估算）")
      : (isAutoDriving
          ? (locale === "en" ? "Below driving scenario reference" : "低于驾驶场景推荐参考")
          : (locale === "en" ? "Below general touch reference" : "低于通用触控推荐参考"));
  }

  const marginLabel = meets
    ? (locale === "en" ? `Meets recommended reference (≥ ${threshold} mm)` : `达到推荐值 (≥ ${threshold} mm)`)
    : (locale === "en" ? `Below recommendation by ${diff} mm` : `距离推荐值还差 ${diff} mm`);

  return {
    checkId: "touch_physical_size",
    metricLabel: locale === "en" ? "Physical Touch Target" : "触控物理尺寸",
    currentValueDisplay: currentDisplay,
    unit: "mm",
    verdict,
    verdictLabel,
    ruleId,
    ruleTitle: `${ruleTitle} · ${disclaimer}`,
    ruleLayer: "L3_HUMAN_FACTORS",
    evidenceStatus: isAutoDriving ? "example_reference" : "verified_reference",
    resultBasis: isProxy ? "estimated" : "direct",
    comparison: {
      kind: "scalar_min",
      threshold,
      thresholdDisplay: locale === "en" ? `≥ ${threshold} mm (Recommended Reference)` : `≥ ${threshold} mm (推荐参考)`,
      margin: minDim - threshold,
      marginFormatted: `${minDim >= threshold ? "+" : "-"}${diff} mm`,
      marginLabel
    },
    assumptions: [disclaimer, ...(isProxy ? [locale === "en" ? "Touch bounds estimated from visible bounds; actual touch target may be larger." : "触控区域按可视区域估算，实际热区可能更大。"] : [])],
    whyItMatters,
    recommendation: !meets
      ? (locale === "en"
          ? `Current physical touch size (≈ ${minDim} mm) is below recommended reference (${threshold} mm). ${isProxy ? "Check whether the actual touch area is already expanded." : "Expand transparent touch padding to achieve recommended size."} (${disclaimer})`
          : `当前触控尺寸 (约 ${minDim} mm) 低于推荐参考 (${threshold} mm)。${isProxy ? "建议确认实际热区是否已扩展。" : "可通过扩大透明热区达到推荐尺寸。"}（${disclaimer}）`)
      : undefined
  };
}

export interface FormattedRuleTrace {
  metricLabel: string;
  currentValueDisplay: string;
  verdictLabel: string;
  verdict: TraceVerdict;
  ruleTitle?: string;
  ruleLayer?: string;
  evidenceStatus?: string;
  marginLabel?: string;
  explanation?: string;
}

export interface PartitionedRuleTraces {
  mainTraces: RuleComparisonTrace[];
  moreMeasurements: RuleComparisonTrace[];
}

/**
 * Sorts and partitions rule comparison traces based on decision value and reference applicability:
 * 1. below_threshold / attention (Risks)
 * 2. below_recommended (Advisory)
 * 3. needs_info (Pending unlock)
 * 4. meets (Passed standards/references)
 * 5. measurement_only (Collapsed under more measurements)
 * not_applicable is excluded from main result display.
 */
export function sortAndPartitionRuleTraces(
  traces: (RuleComparisonTrace | null | undefined)[]
): PartitionedRuleTraces {
  const activeTraces = traces.filter(Boolean) as RuleComparisonTrace[];

  const mainTraces: RuleComparisonTrace[] = [];
  const moreMeasurements: RuleComparisonTrace[] = [];

  for (const trace of activeTraces) {
    if (trace.verdict === "not_applicable") {
      continue;
    }

    // Pure container measurements without independent normative reference rule
    if (trace.checkId === "physical_geometry" || trace.verdict === "measurement_only") {
      moreMeasurements.push(trace);
      continue;
    }

    mainTraces.push(trace);
  }

  const verdictRank: Record<TraceVerdict, number> = {
    attention: 0,
    estimated_attention: 0,
    below_recommended: 1,
    estimated_below_recommended: 1,
    needs_info: 2,
    meets: 3,
    estimated_meets: 3,
    measurement_only: 4,
    not_applicable: 5
  };

  mainTraces.sort((a, b) => (verdictRank[a.verdict] ?? 99) - (verdictRank[b.verdict] ?? 99));

  return { mainTraces, moreMeasurements };
}

export function formatRuleTrace(t: RuleComparisonTrace): FormattedRuleTrace {
  return {
    metricLabel: t.metricLabel,
    currentValueDisplay: t.currentValueDisplay,
    verdictLabel: t.verdictLabel,
    verdict: t.verdict,
    ruleTitle: t.ruleTitle,
    ruleLayer: t.ruleLayer,
    evidenceStatus: t.evidenceStatus,
    marginLabel:
      t.comparison.kind === "scalar_min" || t.comparison.kind === "scalar_max"
        ? t.comparison.marginLabel
        : t.comparison.kind === "multi_axis"
        ? t.comparison.axes.map((a) => `${a.label}: ${a.marginLabel}`).join("；")
        : undefined,
    explanation:
      t.comparison.kind === "measurement_only"
        ? t.comparison.explanation
        : t.comparison.kind === "needs_info"
        ? t.comparison.explanation
        : t.comparison.kind === "conditional"
        ? t.comparison.summary
        : undefined
  };
}
