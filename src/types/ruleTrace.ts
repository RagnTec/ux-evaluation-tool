import type { EvaluationTier, EvaluationCheckId } from "./capability";
import type { ResultBasis } from "./designElement";

export type TraceVerdict =
  | "meets"
  | "below_recommended"
  | "attention"
  | "estimated_meets"
  | "estimated_below_recommended"
  | "estimated_attention"
  | "measurement_only"
  | "needs_info"
  | "not_applicable";

export const TRACE_VERDICT_LABELS: Record<TraceVerdict, string> = {
  meets: "达到推荐范围",
  below_recommended: "满足基本要求，但未达推荐范围",
  attention: "需关注",
  estimated_meets: "估算达到推荐范围",
  estimated_below_recommended: "满足基本要求，但未达推荐范围（估算）",
  estimated_attention: "估算可能偏小",
  measurement_only: "仅测量",
  needs_info: "待补充信息",
  not_applicable: "不适用"
};

export const TRACE_VERDICT_LABELS_EN: Record<TraceVerdict, string> = {
  meets: "Within the recommended range",
  below_recommended: "Meets the basic requirement, but below the recommended range",
  attention: "Needs attention",
  estimated_meets: "Within the recommended range (est.)",
  estimated_below_recommended: "Meets the basic requirement, but below the recommended range (est.)",
  estimated_attention: "May be below recommended (est.)",
  measurement_only: "Measurement only",
  needs_info: "Additional information required",
  not_applicable: "Not applicable"
};

export function getTraceVerdictLabel(verdict: TraceVerdict, locale: "en" | "zh-CN" = "zh-CN"): string {
  return locale === "en" ? TRACE_VERDICT_LABELS_EN[verdict] || verdict : TRACE_VERDICT_LABELS[verdict] || verdict;
}

export interface AxisComparison {
  axis: "width" | "height" | "horizontal" | "vertical";
  label: string; // e.g. "宽度", "高度"
  current: number;
  threshold: number;
  unit: string;
  margin: number; // current - threshold (positive = meets/exceeds, negative = deficit)
  marginFormatted: string; // e.g. "+4 dp", "-8 dp"
  marginLabel: string; // e.g. "余量 +4 dp", "距离参考还差 8 dp"
  meets: boolean;
}

export interface ConditionItem {
  name: string;
  factDescription: string;
  isMet: boolean;
}

export type ComparisonDetails =
  | {
      kind: "scalar_min";
      threshold: number;
      thresholdDisplay: string; // e.g. "≥ 4.5:1", "≥ 48 dp"
      margin: number;
      marginFormatted: string; // e.g. "+1.2", "-1.84"
      marginLabel: string; // e.g. "余量 +1.2", "距离参考还差 1.84"
      explanation?: string;
    }
  | {
      kind: "scalar_max";
      threshold: number;
      thresholdDisplay: string; // e.g. "≤ 100 px"
      margin: number;
      marginFormatted: string;
      marginLabel: string;
      explanation?: string;
    }
  | {
      kind: "range";
      min: number;
      max: number;
      rangeDisplay: string; // e.g. "16–30"
      margin: number;
      marginFormatted: string;
      marginLabel: string;
      direction?: "within" | "below_min" | "above_max";
      explanation?: string;
    }
  | {
      kind: "multi_axis";
      thresholdDisplay: string; // e.g. "≥ 48 × 48 dp"
      axes: AxisComparison[];
      limitingAxis?: string; // e.g. "高度"
    }
  | {
      kind: "conditional";
      summary: string;
      conditions: ConditionItem[];
    }
  | {
      kind: "measurement_only";
      explanation: string;
    }
  | {
      kind: "needs_info";
      missingFields: string[];
      explanation: string;
    };

export interface RuleComparisonTrace {
  checkId: EvaluationCheckId | string;
  metricLabel: string; // e.g. "触控目标尺寸", "文本对比度", "文字字号", "相邻触控间距", "物理尺寸"
  currentValueDisplay: string; // e.g. "52 × 40 dp", "1.16:1", "14 pt", "46 px"
  unit?: string;
  verdict: TraceVerdict;
  verdictLabel: string; // e.g. "达到参考", "需关注", "估算达到参考", "估算可能偏小", "仅测量", "待补充信息"
  ruleId?: string;
  ruleTitle?: string;
  ruleLayer?: string; // e.g. "L1_HARD_CONSTRAINT", "L2_PLATFORM_GUIDELINE", "L3_HUMAN_FACTORS"
  evidenceStatus?: "verified_reference" | "example_reference" | "pending_verification";
  claimStrength?: string;
  resultBasis?: ResultBasis | string;
  evaluationTier?: EvaluationTier;
  comparison: ComparisonDetails;
  whyItMatters?: string;
  recommendation?: string;
  assumptions?: string[];
  missingInputs?: string[];
}
