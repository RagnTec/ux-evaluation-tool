import type { Locale } from "../i18n/types";
import type {
  DesignElement,
  LogicalUnitMapping,
  CalibrationMode,
  TouchReviewStatus,
  TextSizeEvaluation,
  TargetSizeEvaluation,
  ContrastEvaluation,
  TargetPlatform
} from "../types/designElement";
import type { ScenarioScope, CandidateHumanFactorsReference } from "../humanFactors/types";
import { resolveReferenceEnvelope } from "../humanFactors/referenceResolver";
import { derivePhysicalSizeForVisualAngle } from "../humanFactors/visualAngle";
import { parseViewingDistanceMm } from "../humanFactors/viewingDistance";
import { formatNumericValue } from "./metricFormatting";
import { resolveTouchSourceProvenance, getEffectiveTouchPixelBounds } from "./interactionGeometry";

export type EvaluationConclusionState =
  | "meets_reference"
  | "below_threshold"
  | "below_recommended"
  | "measurement_only"
  | "needs_info"
  | "not_applicable";

export const CONCLUSION_STATE_CONFIG: Record<
  EvaluationConclusionState,
  { label: string; labelEn: string; icon: string; tone: "positive" | "danger" | "warning" | "neutral" | "muted" }
> = {
  below_threshold: { label: "不满足基本要求", labelEn: "Below basic requirement", icon: "×", tone: "danger" },
  below_recommended: { label: "满足基本要求，但未达推荐范围", labelEn: "Meets basic requirement, but below recommended range", icon: "!", tone: "warning" },
  meets_reference: { label: "达到推荐范围", labelEn: "Within recommended range", icon: "✓", tone: "positive" },
  measurement_only: { label: "仅测量", labelEn: "Measurement only", icon: "●", tone: "neutral" },
  needs_info: { label: "待补充信息", labelEn: "Additional information required", icon: "○", tone: "muted" },
  not_applicable: { label: "不适用", labelEn: "Not applicable", icon: "—", tone: "muted" }
};

export interface ConclusionPresentationState {
  state: EvaluationConclusionState;
  tone: "positive" | "danger" | "warning" | "neutral" | "muted";
  label: string;
  icon: string;
  badgeClass: string;
  boxClass: string;
  borderClass: string;
  bgHex: string;
  borderHex: string;
  textHex: string;
}

export function getConclusionPresentationState(
  state: EvaluationConclusionState = "measurement_only",
  locale: "en" | "zh-CN" = "zh-CN"
): ConclusionPresentationState {
  switch (state) {
    case "below_threshold":
      return {
        state,
        tone: "danger",
        label: locale === "en" ? "Below the basic requirement" : "不满足基本要求",
        icon: "×",
        badgeClass: "badge-below_threshold",
        boxClass: "state-below_threshold",
        borderClass: "border-danger",
        bgHex: "#fef2f2",
        borderHex: "#fca5a5",
        textHex: "#b91c1c"
      };
    case "below_recommended":
      return {
        state,
        tone: "warning",
        label: locale === "en" ? "Meets the basic requirement, but below the recommended range" : "满足基本要求，但未达推荐范围",
        icon: "!",
        badgeClass: "badge-below_recommended",
        boxClass: "state-below_recommended",
        borderClass: "border-warning",
        bgHex: "#fffbeb",
        borderHex: "#fcd34d",
        textHex: "#b45309"
      };
    case "meets_reference":
      return {
        state,
        tone: "positive",
        label: locale === "en" ? "Within the recommended range" : "达到推荐范围",
        icon: "✓",
        badgeClass: "badge-meets_reference",
        boxClass: "state-meets_reference",
        borderClass: "border-positive",
        bgHex: "#f0fdf4",
        borderHex: "#86efac",
        textHex: "#15803d"
      };
    case "needs_info":
      return {
        state,
        tone: "muted",
        label: locale === "en" ? "Additional information required" : "待补充信息",
        icon: "ℹ",
        badgeClass: "badge-needs_info",
        boxClass: "state-needs_info",
        borderClass: "border-info",
        bgHex: "#eff6ff",
        borderHex: "#bfdbfe",
        textHex: "#1e40af"
      };
    case "not_applicable":
      return {
        state,
        tone: "neutral",
        label: locale === "en" ? "Not applicable" : "不适用",
        icon: "—",
        badgeClass: "badge-not_applicable",
        boxClass: "state-not_applicable",
        borderClass: "border-neutral",
        bgHex: "#f1f5f9",
        borderHex: "#e2e8f0",
        textHex: "#64748b"
      };
    case "measurement_only":
    default:
      return {
        state: "measurement_only",
        tone: "neutral",
        label: locale === "en" ? "Measurement only" : "仅测量",
        icon: "●",
        badgeClass: "badge-measurement_only",
        boxClass: "state-measurement_only",
        borderClass: "border-neutral",
        bgHex: "#f8fafc",
        borderHex: "#cbd5e1",
        textHex: "#475569"
      };
  }
}

export type FindingSeverity = "below_threshold" | "below_recommended" | "needs_info";

export function getFindingPresentationState(severity: FindingSeverity, locale: "en" | "zh-CN" = "zh-CN") {
  switch (severity) {
    case "below_threshold":
      return {
        tone: "danger" as const,
        label: locale === "en" ? "Below the basic requirement" : "不满足基本要求",
        groupClass: "groupBelowThreshold",
        badgeClass: "badge-below_threshold",
        bgHex: "#fef2f2",
        borderHex: "#fecaca",
        borderLeftHex: "#dc2626",
        textHex: "#991b1b"
      };
    case "below_recommended":
      return {
        tone: "warning" as const,
        label: locale === "en" ? "Meets the basic requirement, but below the recommended range" : "满足基本要求，但未达推荐范围",
        groupClass: "groupBelowRecommended",
        badgeClass: "badge-below_recommended",
        bgHex: "#fffbeb",
        borderHex: "#fde68a",
        borderLeftHex: "#d97706",
        textHex: "#92400e"
      };
    case "needs_info":
    default:
      return {
        tone: "muted" as const,
        label: locale === "en" ? "Additional information required" : "待补充信息",
        groupClass: "groupNeedsInfo",
        badgeClass: "badge-needs_info",
        bgHex: "#f8fafc",
        borderHex: "#e2e8f0",
        borderLeftHex: "#64748b",
        textHex: "#334155"
      };
  }
}

export interface ImpactPerspective {
  type: "design" | "product" | "uxr" | "priority";
  label: string;
  content: string;
}

export interface TextLayoutAssessment {
  estimatedCharsPerLine?: number;
  screenWidthShare?: number;
  finding?: "normal" | "possible_excessive_enlargement" | "accessibility_tradeoff";
  label?: string;
  explanation?: string;
}

export interface ElementActionableFinding {
  id: string;
  metricLabel: string;
  severity: "below_threshold" | "below_recommended" | "needs_info";
  severityLabel: string;
  currentValueDisplay: string;
  currentValue?: number;
  currentUnit?: string;
  minimumValue?: number | [number, number];
  minimumLabel?: string;
  minimumDisplay?: string;
  recommendedValue?: number | [number, number];
  recommendedLabel?: string;
  recommendedDisplay?: string;
  gapToMinimum?: number;
  gapToRecommended?: number;
  gapToMinimumDisplay?: string;
  gapToRecommendedDisplay?: string;
  targetThresholdDisplay?: string;
  marginDisplay?: string;
  summaryText: string;
  whyItMatters?: string;
  ruleTitle?: string;
}

export interface GroupedActionableFindings {
  belowThreshold: ElementActionableFinding[];
  belowRecommended: ElementActionableFinding[];
  needsInfo: ElementActionableFinding[];
}

export function groupActionableFindings(findings?: ElementActionableFinding[]): GroupedActionableFindings {
  const result: GroupedActionableFindings = {
    belowThreshold: [],
    belowRecommended: [],
    needsInfo: []
  };

  if (!findings || findings.length === 0) return result;

  const seenIds = new Set<string>();
  for (const f of findings) {
    if (seenIds.has(f.id)) continue;
    seenIds.add(f.id);

    if (f.severity === "below_threshold") {
      result.belowThreshold.push(f);
    } else if (f.severity === "below_recommended") {
      result.belowRecommended.push(f);
    } else if (f.severity === "needs_info") {
      result.needsInfo.push(f);
    }
  }

  return result;
}

export interface UnifiedResultExplanation {
  conclusion: string;
  conclusionState: EvaluationConclusionState;
  conclusionStateLabel: string;
  presentationState: ConclusionPresentationState;
  actionableFindings: ElementActionableFinding[];
  whyItMatters: string;
  perspectives: ImpactPerspective[];
  measurementAndEvidence: {
    ruleId?: string;
    ruleLayer?: string;
    reference?: string;
    referenceStatus?: string;
    claimStrength?: string;
    resultBasis?: string;
    technicalDetails: string[];
  };
}


export interface ExplanationContext {
  element: DesignElement;
  platform?: TargetPlatform;
  logicalMapping?: LogicalUnitMapping | null;
  calibrationMode?: CalibrationMode;
  touchStatus?: TouchReviewStatus;
  touchReasons?: string[];
  textSizeEval?: TextSizeEvaluation | null;
  targetSizeEval?: TargetSizeEvaluation | null;
  contrastEval?: ContrastEvaluation | null;
  nearestSpacingPx?: number | null;
  nearestSpacingLogical?: number | null;
  isOverlapping?: boolean;
  scenarioScope?: ScenarioScope;
  textLayoutAssessment?: TextLayoutAssessment | null;
  imageNaturalWidth?: number;
  imageNaturalHeight?: number;
  userGroups?: string[];
  viewingDistance?: string | number;
  candidateReferences?: CandidateHumanFactorsReference[];
  locale?: Locale;
}


/**
 * Assesses text layout capacity to identify potentially excessive text enlargement without setting normative hard caps.
 */
export function assessTextLayoutCapacity(
  element: DesignElement,
  imageNaturalWidth?: number,
  userGroups?: string[]
): TextLayoutAssessment | null {
  if (element.element_type !== "text") return null;

  const widthPx = element.image_pixel_bounds.width;
  const heightPx = element.image_pixel_bounds.height;
  if (widthPx <= 0 || heightPx <= 0) return null;

  const textRole = element.text_role;
  const isMultiLine = element.text_layout === "multi_line";
  const isExplicitBody = textRole === "body" && element.text_layout !== "single_line";

  // Only evaluate layout capacity for multi-line paragraphs or explicit body text; single-line labels, buttons, headings are exempt
  if (!isMultiLine && !isExplicitBody) {
    return {
      finding: "normal",
      label: "控件/标题文本",
      explanation: "单行文字或控件标签，不应用正文多行排版行密度指标。"
    };
  }

  const screenWidthShare = imageNaturalWidth && imageNaturalWidth > 0
    ? widthPx / imageNaturalWidth
    : undefined;

  const charH = element.character_height_px || (element.text_layout === "single_line" ? heightPx : heightPx / 2);
  const estimatedCharW = Math.max(1, charH * 0.85);
  const estimatedCharsPerLine = Math.max(1, Math.round(widthPx / estimatedCharW));

  const isElderlyOrLowVision = userGroups?.some((g) =>
    g.includes("老年") || g.includes("低视力") || g.includes("无障碍") || g.includes("适老")
  );

  if (isElderlyOrLowVision) {
    return {
      estimatedCharsPerLine,
      screenWidthShare,
      finding: "accessibility_tradeoff",
      label: "大字版排版折衷",
      explanation: `针对适老化/低视力用户放大文字，预估单行容纳约 ${estimatedCharsPerLine} 字，属于可读性优先的排版折衷。`
    };
  }

  return {
    estimatedCharsPerLine,
    screenWidthShare,
    finding: "normal",
    label: "排版容量参考",
    explanation: `预估单行容纳约 ${estimatedCharsPerLine} 字${screenWidthShare ? `，占截图宽度 ${(screenWidthShare * 100).toFixed(1)}%` : ""}。`
  };
}

/**
 * Builds unified multi-perspective impact and recommendation explanation.
 * Strictly adheres to 6 standard conclusion states and multi-finding actionable aggregation.
 */
export function getUnifiedResultExplanation(ctx: ExplanationContext): UnifiedResultExplanation {
  const {
    element,
    platform,
    logicalMapping,
    contrastEval,
    targetSizeEval,
    textSizeEval,
    isOverlapping,
    nearestSpacingLogical,
    scenarioScope,
    textLayoutAssessment,
    imageNaturalWidth,
    imageNaturalHeight,
    userGroups,
    viewingDistance,
    candidateReferences,
    locale = "zh-CN"
  } = ctx;

  const perspectives: ImpactPerspective[] = [];
  const technicalDetails: string[] = [];
  const actionableFindings: ElementActionableFinding[] = [];

  let ruleId: string | undefined = undefined;
  let ruleLayer: string | undefined = undefined;
  let reference: string | undefined = undefined;
  let referenceStatus: string | undefined = undefined;
  let claimStrength: string | undefined = undefined;
  let resultBasis: string | undefined = element.text_size_evaluation?.result_basis || targetSizeEval?.result_basis || "relative";

  if (contrastEval) {
    if (!contrastEval.passed) {
      const diff = Math.round((contrastEval.contrast_ratio - contrastEval.threshold) * 100) / 100;
      const mLabel = locale === "en" ? (contrastEval.evaluation_type === "non_text" ? "Non-text Contrast" : "Color Contrast") : (contrastEval.evaluation_type === "non_text" ? "非文本对比度" : "色彩对比度");
      actionableFindings.push({
        id: "contrast",
        metricLabel: mLabel,
        severity: "below_threshold",
        severityLabel: locale === "en" ? "Below basic requirement" : "不满足基本要求",
        currentValueDisplay: `${contrastEval.contrast_ratio}:1`,
        targetThresholdDisplay: `≥ ${contrastEval.threshold}:1`,
        minimumDisplay: `${contrastEval.threshold}:1`,
        marginDisplay: `${diff}:1`,
        summaryText: locale === "en" ? `Contrast ${contrastEval.contrast_ratio}:1 < Required ${contrastEval.threshold}:1 (Difference ${diff}:1)` : `对比度 ${contrastEval.contrast_ratio}:1 < 基本要求 ${contrastEval.threshold}:1 (差值 ${diff}:1)`,
        whyItMatters: locale === "en" ? "Insufficient color contrast makes text or icons difficult to discern, especially in bright or low-light conditions." : "色彩对比度不足会导致文字或图标在背景中模糊难辨，尤其在反光或弱光环境中。",
        ruleTitle: "WCAG 2.2 SC 1.4.3 / 1.4.11"
      });
      ruleId = contrastEval.rule_id;
      ruleLayer = contrastEval.rule_layer;
      reference = "WCAG 2.2 Success Criterion 1.4.3 / 1.4.11";
      referenceStatus = "verified_reference";
      claimStrength = "strong";
      perspectives.push({
        type: "design",
        label: locale === "en" ? "Design Check" : "设计检查",
        content: locale === "en" ? `Adjust foreground or background color to increase contrast above ${contrastEval.threshold}:1.` : `建议调深前景色或调浅背景色，使对比度提升至 ${contrastEval.threshold}:1 以上。`
      });
      perspectives.push({
        type: "product",
        label: locale === "en" ? "Product / UX Impact" : "产品 / 体验影响",
        content: locale === "en" ? "Insufficient contrast prevents users from reading content clearly under glare or on low-contrast screens." : "对比度不足在低对比度屏幕、反光环境或视觉障碍场景下会导致内容不可辨识。"
      });
      perspectives.push({
        type: "uxr",
        label: locale === "en" ? "User Research / HF" : "用户研究 / 人因验证",
        content: locale === "en" ? "Test legibility under different ambient lighting conditions or grayscale simulation." : "可结合灰度模拟或不同环境光照测试内容辨识度。"
      });
    }
  }

  const isInteractive = element.interaction_type !== undefined
    ? element.interaction_type !== "none"
    : (Boolean(targetSizeEval) || ["button", "input"].includes(element.element_type));
  if (isInteractive) {
    if (isOverlapping) {
      actionableFindings.push({
        id: "touch_overlap",
        metricLabel: locale === "en" ? "Touch Target" : "触控热区",
        severity: "below_threshold",
        severityLabel: getConclusionPresentationState("below_threshold", locale).label,
        currentValueDisplay: locale === "en" ? "Touch Area Overlap" : "触控区域重叠",
        summaryText: locale === "en" ? "Touch target overlaps with adjacent interactive element" : "触控热区与相邻可交互元素存在重叠冲突",
        whyItMatters: locale === "en" ? "Overlapping touch targets cause gesture ambiguity and high risk of unintended activation." : "触控区域重叠会导致手势歧义或系统误判，增加误触或操作冲突风险。"
      });
      perspectives.push({
        type: "design",
        label: locale === "en" ? "Design Check" : "设计检查",
        content: locale === "en" ? "Adjust adjacent control layouts or constrain oversized touch padding to ensure clear clearance between clickable bounds." : "建议调整相邻控件布局或缩小过度扩展的触控区域，确保可点击区域边界之间保持清晰间距。"
      });
      perspectives.push({
        type: "product",
        label: locale === "en" ? "Product / UX Impact" : "产品 / 体验影响",
        content: locale === "en" ? "Overlapping targets may cause unintended activation of adjacent actions, resulting in user error or friction." : "重叠热区可能导致用户在点击某项功能时意外触发邻近操作，引起操作回退或挫败感。"
      });
      perspectives.push({
        type: "priority",
        label: locale === "en" ? "Priority Guidance" : "优先级提示",
        content: locale === "en" ? "Prioritize fixing if the overlap area involves destructive operations (e.g. delete/clear) or critical navigation." : "若重叠区域包含破坏性操作（如删除/清空）或关键入口，建议优先修复。"
      });
    } else if (targetSizeEval) {
      const curW = targetSizeEval.measured_width;
      const curH = targetSizeEval.measured_height;
      const u = targetSizeEval.unit || "pt";
      const isIos = logicalMapping?.platform === "ios";

      if (targetSizeEval.status === "below_minimum") {
        const thresholdDisplay = `≥ ${targetSizeEval.threshold_width} × ${targetSizeEval.threshold_height} ${u}`;
        const minText = isIos ? "28 × 28 pt" : thresholdDisplay;
        const recText = isIos ? "44 × 44 pt" : (logicalMapping?.platform === "android" ? "48 × 48 dp" : undefined);
        let summary = locale === "en"
          ? `Touch target size ${curW} × ${curH} ${u} < Minimum requirement ${minText || thresholdDisplay}`
          : `触控尺寸 ${curW} × ${curH} ${u} < 基本要求 ${minText || thresholdDisplay}`;
        if (isIos) {
          if (curW < 28 && curH < 28) {
            summary = locale === "en" ? `Touch width and height (${curW} × ${curH} pt) are both below minimum 28 pt` : `触控宽高 (${curW} × ${curH} pt) 均低于基本要求 28 pt`;
          } else if (curW < 28) {
            summary = locale === "en" ? `Touch width ${curW} pt < Minimum requirement 28 pt` : `触控宽度 ${curW} pt < 基本要求 28 pt`;
          } else if (curH < 28) {
            summary = locale === "en" ? `Touch height ${curH} pt < Minimum requirement 28 pt` : `触控高度 ${curH} pt < 基本要求 28 pt`;
          }
        }
        actionableFindings.push({
          id: "touch_target_size",
          metricLabel: locale === "en" ? "Touch Target Size" : "触控尺寸",
          severity: "below_threshold",
          severityLabel: getConclusionPresentationState("below_threshold", locale).label,
          currentValueDisplay: `${curW} × ${curH} ${u}`,
          targetThresholdDisplay: thresholdDisplay,
          minimumDisplay: minText,
          recommendedDisplay: recText,
          summaryText: summary,
          whyItMatters: locale === "en" ? "When interactive target dimensions fall below platform standards, users experience increased target acquisition difficulty and high tap error rates." : "目标尺寸低于平台基准要求时，手指在快速点按或不稳定环境中难以准确命中目标。",
          ruleTitle: targetSizeEval.reference
        });

        ruleId = targetSizeEval.rule_id;
        ruleLayer = targetSizeEval.rule_layer;
        reference = targetSizeEval.reference;
        referenceStatus = targetSizeEval.reference_status;
        claimStrength = targetSizeEval.claim_strength;
        perspectives.push({
          type: "design",
          label: locale === "en" ? "Design Check" : "设计检查",
          content: locale === "en" ? "Confirm whether actual touch target extends beyond visible bounds. Expand transparent touch padding to satisfy platform minimum guidelines." : "建议确认实际触控区域是否大于当前可视区域；如需扩大操作区域，可通过扩大透明热区达到平台最低尺寸。"
        });
        perspectives.push({
          type: "product",
          label: locale === "en" ? "Product / UX Impact" : "产品 / 体验影响",
          content: locale === "en" ? "Undersized interactive targets significantly increase missed taps and interaction latency." : "过小的操作目标会显著增加误触率和点按耗时。"
        });
      } else if (targetSizeEval.status === "meets_minimum" || targetSizeEval.status === "needs_review") {
        const minVal = isIos ? 28 : undefined;
        const recVal = isIos ? 44 : (logicalMapping?.platform === "android" ? 48 : undefined);
        const minText = minVal ? `${minVal} × ${minVal} ${u}` : undefined;
        const recText = recVal ? `${recVal} × ${recVal} ${u}` : undefined;

        let summary = locale === "en"
          ? `Touch target size ${curW} × ${curH} ${u} (Minimum ${minText || "28 pt"}, Recommended ${recText || "44 pt"}): Meets minimum, but below recommended`
          : `触控尺寸 ${curW} × ${curH} ${u}（基本要求 ${minText || "28 pt"}，推荐 ${recText || "44 pt"}）：已达到基本要求，但仍低于推荐值`;
        if (isIos) {
          const diffW = formatNumericValue(44 - curW, 1);
          const diffH = formatNumericValue(44 - curH, 1);
          if (curW < 44 && curH < 44) {
            summary = locale === "en" ? `Touch width and height meet minimum (≥ 28 × 28 pt), but below recommended (width diff ${diffW} pt, height diff ${diffH} pt)` : `触控宽高已达到基本要求 (≥ 28 × 28 pt)，但仍低于推荐值 (宽差 ${diffW} pt，高差 ${diffH} pt)`;
          } else if (curW < 44) {
            summary = locale === "en" ? `Width meets minimum, but below recommended by ${diffW} pt` : `宽度已达到基本要求，但仍低于推荐值 ${diffW} pt`;
          } else if (curH < 44) {
            summary = locale === "en" ? `Height meets minimum, but below recommended by ${diffH} pt` : `高度已达到基本要求，但仍低于推荐值 ${diffH} pt`;
          }
        } else if (logicalMapping?.platform === "android") {
          const diffW = formatNumericValue(48 - curW, 1);
          const diffH = formatNumericValue(48 - curH, 1);
          if (curW < 48 && curH < 48) {
            summary = locale === "en" ? `Touch width and height meet minimum, but below recommended (width diff ${diffW} dp, height diff ${diffH} dp)` : `触控宽高已达到基本要求，但仍低于推荐值 (宽差 ${diffW} dp，高差 ${diffH} dp)`;
          } else if (curW < 48) {
            summary = locale === "en" ? `Width meets minimum, but below recommended by ${diffW} dp` : `宽度已达到基本要求，但仍低于推荐值 ${diffW} dp`;
          } else if (curH < 48) {
            summary = locale === "en" ? `Height meets minimum, but below recommended by ${diffH} dp` : `高度已达到基本要求，但仍低于推荐值 ${diffH} dp`;
          }
        }
        actionableFindings.push({
          id: "touch_target_size",
          metricLabel: locale === "en" ? "Touch Target Size" : "触控尺寸",
          severity: "below_recommended",
          severityLabel: getConclusionPresentationState("below_recommended", locale).label,
          currentValueDisplay: `${curW} × ${curH} ${u}`,
          targetThresholdDisplay: isIos ? "≥ 44 × 44 pt" : (recText ? `≥ ${recText}` : "≥ 44 × 44 pt"),
          minimumDisplay: minText,
          recommendedDisplay: recText,
          summaryText: summary,
          whyItMatters: locale === "en" ? "Target dimensions meet basic requirement but remain below recommended comfortable size, offering reduced fault tolerance in mobile environments." : "目标尺寸虽达到最低可用标准，但低于平台推荐舒适尺寸，在移动晃动环境下容错率较低。",
          ruleTitle: targetSizeEval.reference
        });
        ruleId = targetSizeEval.rule_id;
        ruleLayer = targetSizeEval.rule_layer;
        reference = targetSizeEval.reference;
        referenceStatus = targetSizeEval.reference_status;
        claimStrength = targetSizeEval.claim_strength;
        perspectives.push({
          type: "design",
          label: locale === "en" ? "Design Check" : "设计检查",
          content: locale === "en" ? "Suggest extending touch bounds to platform default recommended size (e.g. iOS 44 pt) via transparent padding, without modifying visual asset." : "建议通过扩大透明外边距/内边距将热区扩展至平台默认推荐尺寸（如 iOS 44pt），无需改变视觉图标。"
        });
        perspectives.push({
          type: "product",
          label: locale === "en" ? "Product / UX Impact" : "产品 / 体验影响",
          content: locale === "en" ? "Controls between minimum and recommended sizes work in static contexts, but may cause slight tapping friction when walking or in bumpy environments." : "介于最低与推荐尺寸之间的控件在日常静态使用尚可，但在移动行走或颠簸场景可能出现轻微点按困难。"
        });
      } else if (targetSizeEval.status === "meets_default" || targetSizeEval.status === "condition_met") {
        ruleId = targetSizeEval.rule_id;
        ruleLayer = targetSizeEval.rule_layer;
        reference = targetSizeEval.reference;
        referenceStatus = targetSizeEval.reference_status;
        claimStrength = targetSizeEval.claim_strength;
        perspectives.push({
          type: "design",
          label: locale === "en" ? "Design Check" : "设计检查",
          content: locale === "en" ? "Current size satisfies recommended guidelines; maintain visual and hierarchy consistency with peer interactive components." : "当前尺寸符合推荐基准，注意保持与其他同级操作组件的视觉与层级一致性。"
        });
        perspectives.push({
          type: "product",
          label: "产品 / 体验影响",
          content: "适中的目标尺寸有助于保障日常操作的流畅度和容错率。"
        });
      }
    } else {
      // Human Factors physical touch fallback when logical mapping/platform rule is missing
      const provenance = resolveTouchSourceProvenance(element);
      if (provenance !== "missing") {
        const isProxy = provenance === "visual_bounds_proxy";
        const touchPx = (imageNaturalWidth && imageNaturalHeight ? getEffectiveTouchPixelBounds(element, imageNaturalWidth, imageNaturalHeight) : undefined) || element.image_pixel_bounds;
        let widthMm: number | undefined;
        let heightMm: number | undefined;

        if (element.physical_geometry?.is_calibrated && element.physical_geometry.width_mm && element.physical_geometry.height_mm) {
          const containerW = element.image_pixel_bounds.width || touchPx.width;
          const containerH = element.image_pixel_bounds.height || touchPx.height;
          widthMm = Math.round(((touchPx.width / containerW) * element.physical_geometry.width_mm) * 10) / 10;
          heightMm = Math.round(((touchPx.height / containerH) * element.physical_geometry.height_mm) * 10) / 10;
        }

        if (widthMm && heightMm && widthMm > 0 && heightMm > 0) {
          const minDim = Math.min(widthMm, heightMm);
          const isAutoDriving =
            scenarioScope?.domain === "automotive" &&
            scenarioScope?.observer_role === "driver" &&
            (scenarioScope?.operation_state === "driving" || scenarioScope?.time_criticality === "time_critical");

          const threshold = isAutoDriving ? 17.5 : 9.0;
          const ruleTitle = isAutoDriving
            ? (locale === "en" ? "Automotive Driving Direct Touch Recommended Reference (≥ 17.5 mm)" : "车载驾驶直接触控推荐参考 (≥ 17.5 mm)")
            : (locale === "en" ? "General Handheld Direct Touch Physical Size Recommendation (≥ 9 mm)" : "通用手持直接触控物理尺寸推荐 (≥ 9 mm)");
          const disclaimer = isAutoDriving
            ? (locale === "en" ? "driving scenario research reference, not a platform-enforced minimum" : "驾驶场景研究参考，非法规强制最低值")
            : (locale === "en" ? "general Human Factors recommendation, not a platform-enforced minimum" : "通用人因触控推荐参考 (≥ 9 mm)，非平台强制最低值");
          const whyItMatters = isAutoDriving
            ? (locale === "en"
                ? "In automotive driving scenarios, smaller direct touch targets significantly increase glance-off-road duration and unintended activation risk. This is a driving research reference, not a mandatory regulation minimum."
                : "车载驾驶场景下，较小的直接触控热区会显著增加驾驶员视线转移时间与误触风险。此项为驾驶场景研究参考，非法规强制最低值。")
            : (locale === "en"
                ? "For handheld direct touch interaction, physical dimensions of 9 mm or larger ensure finger press accuracy and fault tolerance. This is a general Human Factors recommendation, not a platform-enforced minimum."
                : "手持直接触控操作中，物理尺寸达到 9mm 以上有助于保障手指按压精度与操作容错率。此项为通用人因触控推荐参考，非平台强制最低值。");

          if (minDim < threshold) {
            const diff = formatNumericValue(threshold - minDim, 1);
            actionableFindings.push({
              id: "touch_physical_fallback",
              metricLabel: locale === "en" ? "Physical Touch Target" : "触控物理尺寸",
              severity: "below_recommended",
              severityLabel: getConclusionPresentationState("below_recommended", locale).label,
              currentValueDisplay: locale === "en" ? `≈ ${widthMm} × ${heightMm} mm` : `约 ${widthMm} × ${heightMm} mm`,
              targetThresholdDisplay: `≥ ${threshold} mm`,
              recommendedDisplay: `${threshold} mm`,
              marginDisplay: `-${diff} mm`,
              summaryText: locale === "en"
                ? `Physical touch target ≈ ${widthMm} × ${heightMm} mm < Recommended reference ${threshold} mm (Deficit ${diff} mm${isProxy ? ", estimated from visible bounds" : ""}; ${disclaimer})`
                : `触控物理尺寸约 ${widthMm} × ${heightMm} mm < 推荐值 ${threshold} mm (差值 ${diff} mm${isProxy ? "，触控区域按可视区域估算" : ""}，${disclaimer})`,
              whyItMatters,
              ruleTitle
            });
            ruleId = isAutoDriving ? "REF-HF-AUTO-TOUCH-RECOMMENDED" : "REF-HF-GENERIC-TOUCH-RECOMMENDED";
            ruleLayer = "L3_HUMAN_FACTORS";
            reference = ruleTitle;
            referenceStatus = isAutoDriving ? "example_reference" : "verified_reference";
            claimStrength = "moderate";
            perspectives.push({
              type: "design",
              label: locale === "en" ? "Design Check" : "设计检查",
              content: locale === "en"
                ? `Suggest expanding touch bounds to achieve physical dimensions of ${threshold} mm or larger (${disclaimer}).`
                : `建议扩大触控热区使物理尺寸达到 ${threshold} mm 以上（${disclaimer}）。`
            });
          }
        }
      }
    }
    if (nearestSpacingLogical !== undefined && nearestSpacingLogical !== null) {
      technicalDetails.push(locale === "en" ? `Nearest spacing: ${nearestSpacingLogical} ${logicalMapping?.unit || "px"}` : `最近邻交互元素间距: ${nearestSpacingLogical} ${logicalMapping?.unit || "px"}`);
    }
  }

  if (element.element_type === "text") {
    const isCharInvalid = Boolean(
      element.character_height_px &&
      element.image_pixel_bounds.height > 0 &&
      element.character_height_px > element.image_pixel_bounds.height + 0.01
    );

    if (!isCharInvalid && element.character_height_visual_angle) {
      const charArcmin = element.character_height_visual_angle.arcmin;
      const isAutomotive = scenarioScope?.domain === "automotive";
      const isTimeCritical = scenarioScope?.time_criticality === "time_critical";
      if (isAutomotive && scenarioScope?.observer_role === "driver") {
        const reqMin = isTimeCritical ? 16 : 12;
        if (charArcmin < reqMin) {
          const diff = formatNumericValue(reqMin - charArcmin, 1);
          actionableFindings.push({
            id: "character_visual_angle",
            metricLabel: locale === "en" ? "Vertical Visual Angle" : "代表字符垂直视角",
            severity: "below_recommended",
            severityLabel: getConclusionPresentationState("below_recommended", locale).label,
            currentValueDisplay: `${formatNumericValue(charArcmin, 1)}′`,
            targetThresholdDisplay: `≥ ${reqMin}′`,
            minimumDisplay: `${reqMin}′`,
            recommendedDisplay: "20′",
            marginDisplay: `-${diff}′`,
            summaryText: locale === "en"
              ? `Representative character vertical visual angle ${formatNumericValue(charArcmin, 1)}′ < Recommended value ${reqMin}′ (Deficit ${diff}′)`
              : `代表字符垂直视角 ${formatNumericValue(charArcmin, 1)}′ < 推荐值 ${reqMin}′ (差值 ${diff}′)`,
            whyItMatters: locale === "en"
              ? "In dynamic automotive driving scenarios, character visual angle below recommendation significantly increases glance-off-road duration."
              : "车载驾驶移动场景下，文字垂直视角低于推荐最小值会导致视线脱离路面时间显著增加。",
            ruleTitle: "NHTSA DOT HS 812 360"
          });
          ruleId = isTimeCritical ? "REF-NHTSA-TEXT-CRITICAL" : "REF-NHTSA-TEXT-NORMAL";
          ruleLayer = "L3_HUMAN_FACTORS";
          reference = "NHTSA DOT HS 812 360";
          referenceStatus = "verified_reference";
          perspectives.push({
            type: "design",
            label: locale === "en" ? "Design Check" : "设计检查",
            content: locale === "en"
              ? `Suggest increasing glyph size to achieve visual angle of ${reqMin}′ or larger (optimal 20′) to minimize eyes-off-road glance time.`
              : `建议增大字符尺寸使视角达到 ${reqMin}′ 以上（最优建议 20′），以减少驾驶中的注视转移时间。`
          });
        }
      } else {
        // Generic Human Factors character height fallback (16' basic / 20' recommended)
        const isConfirmedFont = textSizeEval && (textSizeEval.evaluation_basis === "confirmed_source" || textSizeEval.source === "user_confirmed" || textSizeEval.source === "design_source");
        if (!isConfirmedFont) {
          if (charArcmin < 16) {
            const diff = formatNumericValue(16 - charArcmin, 1);
            actionableFindings.push({
              id: "character_visual_angle",
              metricLabel: locale === "en" ? "Vertical Visual Angle" : "代表字符垂直视角",
              severity: "below_threshold",
              severityLabel: getConclusionPresentationState("below_threshold", locale).label,
              currentValueDisplay: `${formatNumericValue(charArcmin, 1)}′`,
              targetThresholdDisplay: "≥ 16′",
              minimumDisplay: "16′",
              recommendedDisplay: "20′",
              marginDisplay: `-${diff}′`,
              summaryText: locale === "en" ? `Vertical visual angle ${formatNumericValue(charArcmin, 1)}′ < Baseline 16′ (Diff -${diff}′, general HF reference, not formal platform font requirement)` : `代表字符垂直视角 ${formatNumericValue(charArcmin, 1)}′ < 基本要求 16′ (差值 ${diff}′，通用人因视觉参考，不代表当前平台正式字号规范)`,
              whyItMatters: locale === "en" ? "Visual angle determines retinal image size and is the key physical determinant of legibility. This is a general HF reference." : "字符视觉角度决定视网膜成像大小，是影响文字可读性的关键物理指标。此项为通用人因视觉参考，不代表当前平台正式字号规范。",
              ruleTitle: locale === "en" ? "General Legibility Human Factors Reference (Basic ≥ 16′ / Rec ≥ 20′)" : "通用字符可读性人因参考 (基本 ≥ 16′ / 推荐 ≥ 20′)"
            });
            ruleId = "REF-HF-GENERIC-TEXT-BASIC";
            ruleLayer = "L3_HUMAN_FACTORS";
            reference = locale === "en" ? "General Legibility Human Factors Reference (Basic ≥ 16′ / Rec ≥ 20′)" : "通用字符可读性人因参考 (基本 ≥ 16′ / 推荐 ≥ 20′)";
            referenceStatus = "verified_reference";
            claimStrength = "moderate";
          } else if (charArcmin < 20) {
            const diff = formatNumericValue(20 - charArcmin, 1);
            actionableFindings.push({
              id: "character_visual_angle",
              metricLabel: locale === "en" ? "Vertical Visual Angle" : "代表字符垂直视角",
              severity: "below_recommended",
              severityLabel: getConclusionPresentationState("below_recommended", locale).label,
              currentValueDisplay: `${formatNumericValue(charArcmin, 1)}′`,
              targetThresholdDisplay: "≥ 20′",
              minimumDisplay: "16′",
              recommendedDisplay: "20′",
              marginDisplay: `-${diff}′`,
              summaryText: locale === "en" ? `Vertical visual angle ${formatNumericValue(charArcmin, 1)}′, meets baseline (≥ 16′), but below recommended (≥ 20′) by ${diff}′ (general HF reference)` : `代表字符垂直视角 ${formatNumericValue(charArcmin, 1)}′，已达到基本要求 (≥ 16′)，但仍低于推荐值 (≥ 20′) ${diff}′ (通用人因视觉参考，不代表当前平台正式字号规范)`,
              whyItMatters: locale === "en" ? "Visual angle determines retinal image size and is the key physical determinant of legibility. This is a general HF reference." : "字符视觉角度决定视网膜成像大小，是影响文字可读性的关键物理指标。此项为通用人因视觉参考，不代表当前平台正式字号规范。",
              ruleTitle: locale === "en" ? "General Legibility Human Factors Reference (Basic ≥ 16′ / Rec ≥ 20′)" : "通用字符可读性人因参考 (基本 ≥ 16′ / 推荐 ≥ 20′)"
            });
            ruleId = "REF-HF-GENERIC-TEXT-RECOMMENDED";
            ruleLayer = "L3_HUMAN_FACTORS";
            reference = locale === "en" ? "General Legibility Human Factors Reference (Basic ≥ 16′ / Rec ≥ 20′)" : "通用字符可读性人因参考 (基本 ≥ 16′ / 推荐 ≥ 20′)";
            referenceStatus = "verified_reference";
            claimStrength = "moderate";
          }
        }
      }
    } else if (candidateReferences && candidateReferences.length > 0 && element.character_height_physical_mm && viewingDistance) {
        const distMm = typeof viewingDistance === "number"
          ? viewingDistance
          : parseViewingDistanceMm(viewingDistance);

        if (distMm && distMm > 0) {
          const charArcmin = element.character_height_visual_angle?.arcmin || ((element.character_height_physical_mm / distMm) * (180 / Math.PI) * 60);
          const envelope = resolveReferenceEnvelope({
            metric: "character_visual_angle",
            current_measurement: {
              value: charArcmin,
              unit: "arcmin",
              target: "character_height"
            },
            scenario: scenarioScope,
            candidates: candidateReferences
          });

          if (envelope.adapted_references.length > 0) {
            const adaptedRef = envelope.adapted_references[0];
            const refAngleVal = Number(adaptedRef.reference.value);
            const refUnit = adaptedRef.reference.unit || "arcmin";
            const targetMm = derivePhysicalSizeForVisualAngle(
              refUnit === "deg" ? { deg: refAngleVal } : { arcmin: refAngleVal },
              distMm
            );

            if (targetMm !== null && element.character_height_physical_mm < targetMm) {
              const diffMm = formatNumericValue(targetMm - element.character_height_physical_mm, 2);
              actionableFindings.push({
                id: "character_visual_angle_adapted",
                metricLabel: locale === "en" ? "Adapted Visual Angle Reference" : "等视角换算参考",
                severity: "below_recommended",
                severityLabel: getConclusionPresentationState("below_recommended", locale).label,
                currentValueDisplay: locale === "en" ? `≈ ${formatNumericValue(element.character_height_physical_mm, 2)} mm (${formatNumericValue(charArcmin, 1)}′)` : `约 ${formatNumericValue(element.character_height_physical_mm, 2)} mm (${formatNumericValue(charArcmin, 1)}′)`,
                targetThresholdDisplay: `≥ ${formatNumericValue(targetMm, 2)} mm`,
                minimumDisplay: `${formatNumericValue(targetMm, 2)} mm`,
                recommendedDisplay: `${formatNumericValue(targetMm, 2)} mm`,
                marginDisplay: `-${diffMm} mm`,
                summaryText: locale === "en"
                  ? `Physical glyph height ≈ ${formatNumericValue(element.character_height_physical_mm, 2)} mm < Adapted recommendation ${formatNumericValue(targetMm, 2)} mm (mapped from ${refAngleVal}′ visual angle at current viewing distance; cross-domain reference)`
                  : `代表字符物理高度约 ${formatNumericValue(element.character_height_physical_mm, 2)} mm < 等视角换算推荐值 ${formatNumericValue(targetMm, 2)} mm (依据 ${refAngleVal}′ 视角与当前视距换算，跨场景换算参考，不代表当前平台正式规范)`,
                whyItMatters: locale === "en"
                  ? "Cross-domain equivalent angle references map proven visual angle benchmarks to physical dimensions at the current viewing distance to aid design evaluation."
                  : "跨场景等视角换算参考将其他领域的有效视觉角基准映射至当前视距下的物理尺寸，用于辅助设计评估。跨场景换算参考，不代表当前平台正式规范。",
                ruleTitle: locale === "en" ? `Adapted Angle Reference · ${adaptedRef.reference.title}` : `等视角换算参考 · ${adaptedRef.reference.title}`
              });
              ruleId = adaptedRef.reference.reference_id;
              ruleLayer = "L3_HUMAN_FACTORS";
              reference = locale === "en" ? `Adapted Angle Reference · ${adaptedRef.reference.title}` : `等视角换算参考 · ${adaptedRef.reference.title}`;
              referenceStatus = "context_adapted";
              perspectives.push({
                type: "design",
                label: locale === "en" ? "Adapted Reference" : "换算参考",
                content: locale === "en"
                  ? `Suggest increasing character size to achieve physical height of ${formatNumericValue(targetMm, 2)} mm or larger. Cross-domain reference.`
                  : `建议增大字符尺寸使物理高度达到 ${formatNumericValue(targetMm, 2)} mm 以上。跨场景换算参考，不代表当前平台正式规范。`
              });
            }
          }
        }
    } else if (element.physical_geometry?.is_calibrated && element.physical_geometry.height_mm && viewingDistance) {
      const distMm = typeof viewingDistance === "number"
        ? viewingDistance
        : parseFloat(String(viewingDistance).replace(/[^0-9.]/g, ""));
      if (distMm && distMm > 0 && element.physical_geometry.height_mm) {
        const containerAngleDeg = 2 * Math.atan(element.physical_geometry.height_mm / (2 * distMm)) * (180 / Math.PI);
        const containerAngleArcmin = containerAngleDeg * 60;
        const isAutomotive = scenarioScope?.domain === "automotive";
        const isTimeCritical = scenarioScope?.time_criticality === "time_critical";
        const reqMin = isTimeCritical ? 16 : 12;

        if (isAutomotive && containerAngleArcmin < reqMin) {
          const diff = formatNumericValue(reqMin - containerAngleArcmin, 1);
          actionableFindings.push({
            id: "text_container_visual_angle",
            metricLabel: locale === "en" ? "Text Container Visual Angle" : "文字区域视角",
            severity: "below_recommended",
            severityLabel: getConclusionPresentationState("below_recommended", locale).label,
            currentValueDisplay: `${formatNumericValue(containerAngleArcmin, 1)}′`,
            targetThresholdDisplay: `≥ ${reqMin}′`,
            minimumDisplay: `${reqMin}′`,
            recommendedDisplay: "20′",
            marginDisplay: `-${diff}′`,
            summaryText: locale === "en"
              ? `Text container overall height visual angle is only ${formatNumericValue(containerAngleArcmin, 1)}′ < Recommended ${reqMin}′ (container height is already below single-character reference)`
              : `文字区域整体高度视角仅 ${formatNumericValue(containerAngleArcmin, 1)}′ < 推荐值 ${reqMin}′ (整个文字区域已低于字符参考，实际字符只可能更小)`,
            whyItMatters: locale === "en"
              ? "The vertical visual angle of the entire text container is below recommended single-character minimum; text legibility is compromised at this viewing distance."
              : "整个文字区域的垂直视角已低于推荐的单字符最低视角，实际文字在此视距下辨识难度较高。",
            ruleTitle: locale === "en" ? "NHTSA DOT HS 812 360 (Upper Bound Inference)" : "NHTSA DOT HS 812 360 (上限推断)"
          });

          ruleId = "REF-NHTSA-TEXT-UPPER-BOUND-INFERENCE";
          ruleLayer = "L3_HUMAN_FACTORS";
          reference = locale === "en" ? "NHTSA DOT HS 812 360 (Upper Bound Inference)" : "NHTSA DOT HS 812 360 (上限推断)";
          referenceStatus = "verified_reference";
          resultBasis = "inferred";
          perspectives.push({
            type: "design",
            label: locale === "en" ? "Design Check" : "设计检查",
            content: locale === "en"
              ? `Entire text container height does not satisfy ${reqMin}′ visual angle requirement. Text is overly compact; suggest increasing font size or decreasing viewing distance.`
              : `当前整个文字容器的高度均未达到 ${reqMin}′ 视角要求，文字排版过于紧凑，建议增大字号或缩短视距。`
          });
        } else if (isAutomotive) {
          actionableFindings.push({
            id: "character_visual_angle_pending",
            metricLabel: locale === "en" ? "Character Visual Angle" : "字符视角",
            severity: "needs_info",
            severityLabel: getConclusionPresentationState("needs_info", locale).label,
            currentValueDisplay: locale === "en" ? `Container ${formatNumericValue(containerAngleArcmin, 1)}′` : `区域 ${formatNumericValue(containerAngleArcmin, 1)}′`,
            summaryText: locale === "en"
              ? `Text container overall angle is ${formatNumericValue(containerAngleArcmin, 1)}′; measure representative glyph height to evaluate legibility`
              : `文字区域整体视角为 ${formatNumericValue(containerAngleArcmin, 1)}′，需进一步测量代表字符高度以确认可读性`,
            whyItMatters: locale === "en"
              ? "Text container dimensions are adequate, but actual rendered glyph height is unknown. Representative glyph measurement is required."
              : "文字容器尺寸充足，但实际字符渲染高度未知，需测量代表字符高度方可确认是否达到视网膜视角参考。"
          });

          perspectives.push({
            type: "design",
            label: locale === "en" ? "Measurement Guidance" : "测量建议",
            content: locale === "en"
              ? "Click 'Measure Character Height' in the inspector and select an individual glyph to obtain retinal visual angle evaluation."
              : "建议在检查器中点击「测量代表字符高度」框选单个字符，以获取准确视网膜角度评估。"
          });
        }
      }
    }
  }

  // Graphical / Symbol Visual Angle Fallback
  if (element.element_type === "icon" || element.text_visual_measurement_target === "symbol") {
    const isExplicitGraphicTarget =
      element.text_visual_measurement_target === "symbol" ||
      Boolean(element.character_height_px && element.element_type === "icon");

    if (isExplicitGraphicTarget && viewingDistance) {
      const distMm = typeof viewingDistance === "number"
        ? viewingDistance
        : parseViewingDistanceMm(viewingDistance);

      let featureHeightMm = element.character_height_physical_mm;
      if (!featureHeightMm && element.character_height_px && element.image_pixel_bounds.height > 0 && element.physical_geometry?.height_mm) {
        featureHeightMm = Math.round(((element.character_height_px / element.image_pixel_bounds.height) * element.physical_geometry.height_mm) * 1000) / 1000;
      }

      if (distMm && distMm > 0 && featureHeightMm && featureHeightMm > 0) {
        const angleDeg = 2 * Math.atan(featureHeightMm / (2 * distMm)) * (180 / Math.PI);
        const angleArcmin = Math.round(angleDeg * 60 * 10) / 10;
        const isAutomotive = scenarioScope?.domain === "automotive";
        const reqMin = isAutomotive ? 16 : 16;
        const reqRec = isAutomotive ? 24 : 22;

        if (angleArcmin < reqMin) {
          const diff = formatNumericValue(reqMin - angleArcmin, 1);
          actionableFindings.push({
            id: "graphical_visual_angle",
            metricLabel: locale === "en" ? "Graphic Detail Visual Angle" : "图形辨识视角",
            severity: "below_threshold",
            severityLabel: getConclusionPresentationState("below_threshold", locale).label,
            currentValueDisplay: `${angleArcmin}′`,
            targetThresholdDisplay: `≥ ${reqMin}′`,
            minimumDisplay: `${reqMin}′`,
            recommendedDisplay: `${reqRec}′`,
            marginDisplay: `-${diff}′`,
            summaryText: locale === "en"
              ? `Graphic critical detail visual angle ${angleArcmin}′ < Baseline ${reqMin}′ (Deficit ${diff}′; general graphic legibility reference)`
              : `图形关键细节视角 ${angleArcmin}′ < 基本要求 ${reqMin}′ (差值 ${diff}′，通用图形辨识人因参考，仅适用于关键细节，不代表外框边界要求)`,
            whyItMatters: locale === "en"
              ? "Visual angle of critical graphic details determines retinal image legibility."
              : "图形与符号的关键细节视觉角度决定了其在视网膜上的成像辨识度。此项为通用图形辨识人因参考。",
            ruleTitle: locale === "en" ? `General Graphic Legibility Human Factors Reference (Basic ≥ ${reqMin}′ / Rec ≥ ${reqRec}′)` : `通用图形辨识人因参考 (基本 ≥ ${reqMin}′ / 推荐 ≥ ${reqRec}′)`
          });
          ruleId = isAutomotive ? "REF-NHTSA-ICON-NORMAL" : "REF-HF-GENERIC-GRAPHIC-BASIC";
          ruleLayer = "L3_HUMAN_FACTORS";
          reference = locale === "en" ? `General Graphic Legibility Human Factors Reference (Basic ≥ ${reqMin}′ / Rec ≥ ${reqRec}′)` : `通用图形辨识人因参考 (基本 ≥ ${reqMin}′ / 推荐 ≥ ${reqRec}′)`;
          referenceStatus = "verified_reference";
          claimStrength = "moderate";
        } else if (angleArcmin < reqRec) {
          const diff = formatNumericValue(reqRec - angleArcmin, 1);
          actionableFindings.push({
            id: "graphical_visual_angle",
            metricLabel: locale === "en" ? "Graphic Detail Visual Angle" : "图形辨识视角",
            severity: "below_recommended",
            severityLabel: getConclusionPresentationState("below_recommended", locale).label,
            currentValueDisplay: `${angleArcmin}′`,
            targetThresholdDisplay: `≥ ${reqRec}′`,
            minimumDisplay: `${reqMin}′`,
            recommendedDisplay: `${reqRec}′`,
            marginDisplay: `-${diff}′`,
            summaryText: locale === "en"
              ? `Graphic critical detail visual angle ${angleArcmin}′, meets baseline (≥ ${reqMin}′), but below recommended (≥ ${reqRec}′) by ${diff}′ (general graphic legibility reference)`
              : `图形关键细节视角 ${angleArcmin}′，已达到基本要求 (≥ ${reqMin}′)，但仍低于推荐值 (≥ ${reqRec}′) ${diff}′ (通用图形辨识人因参考，仅适用于关键细节，不代表外框边界要求)`,
            whyItMatters: locale === "en"
              ? "Visual angle of critical graphic details determines retinal image legibility."
              : "图形与符号的关键细节视觉角度决定了其在视网膜上的成像辨识度。此项为通用图形辨识人因参考。",
            ruleTitle: locale === "en" ? `General Graphic Legibility Human Factors Reference (Basic ≥ ${reqMin}′ / Rec ≥ ${reqRec}′)` : `通用图形辨识人因参考 (基本 ≥ ${reqMin}′ / 推荐 ≥ ${reqRec}′)`
          });
          ruleId = isAutomotive ? "REF-NHTSA-ICON-NORMAL" : "REF-HF-GENERIC-GRAPHIC-RECOMMENDED";
          ruleLayer = "L3_HUMAN_FACTORS";
          reference = locale === "en" ? `General Graphic Legibility Human Factors Reference (Basic ≥ ${reqMin}′ / Rec ≥ ${reqRec}′)` : `通用图形辨识人因参考 (基本 ≥ ${reqMin}′ / 推荐 ≥ ${reqRec}′)`;
          referenceStatus = "verified_reference";
          claimStrength = "moderate";
        }
      }
    }
  }

  if (element.element_type === "text") {
    // C. Traditional Logical Font Size Evaluation (Confirmed source font sizes or fallback screenshot estimate)
    if (textSizeEval && textSizeEval.measured_value && textSizeEval.measured_value > 0) {
      const isConfirmed = textSizeEval.evaluation_basis === "confirmed_source" || textSizeEval.source === "user_confirmed" || textSizeEval.source === "design_source";
      const isIos = (logicalMapping?.platform || platform) === "ios";
      const isAndroid = (logicalMapping?.platform || platform) === "android";
      const u = textSizeEval.unit || (isIos ? "pt" : isAndroid ? "sp" : "CSS px");
      const val = textSizeEval.measured_value;
      const minVal = isIos ? 11 : (isAndroid ? 12 : 12);
      const recVal = isIos ? 17 : (isAndroid ? 12 : 16);
      const minText = `≥ ${minVal} ${u}`;
      const recText = `≥ ${recVal} ${u}`;

      const isFallbackRole = element.text_role && element.text_role !== "body";
      const fallbackSuffix = isFallbackRole ? (locale === "en" ? " (body text threshold used as fallback)" : "（暂借用正文文字阈值）") : "";

      if (textSizeEval.status === "below_minimum" || (textSizeEval.status === "attention" && val < minVal)) {
        const diff = formatNumericValue(minVal - val, 1);
        const diffNum = parseFloat(diff);
        const diffRecNum = parseFloat(formatNumericValue(recVal - val, 1));
        const summary = locale === "en"
          ? (isConfirmed
              ? `Current font size ${val} ${u} < Minimum requirement (${minText}) by ${diff} ${u}${fallbackSuffix}.`
              : `Estimated font size ≈ ${val} ${u} < Minimum requirement (${minText}) by ${diff} ${u}${fallbackSuffix}.`)
          : (isConfirmed
              ? `当前字号${val} ${u}，低于基本要求（${minText}）${diff} ${u}${fallbackSuffix}。`
              : `截图估算字号约 ${val} ${u}，低于基本要求（${minText}）${diff} ${u}${fallbackSuffix}。`);

        actionableFindings.push({
          id: "text_size",
          metricLabel: locale === "en" ? "Font Size" : "文字字号",
          severity: "below_threshold",
          severityLabel: getConclusionPresentationState("below_threshold", locale).label + (!isConfirmed ? (locale === "en" ? " (est.)" : "（估算）") : ""),
          currentValue: val,
          currentUnit: u,
          currentValueDisplay: isConfirmed ? `${val} ${u}` : `${val} ${u}${locale === "en" ? " (est.)" : "（估算）"}`,
          minimumValue: minVal,
          minimumLabel: minText,
          minimumDisplay: `${minVal} ${u}`,
          recommendedValue: recVal,
          recommendedLabel: recText,
          recommendedDisplay: `${recVal} ${u}`,
          gapToMinimum: diffNum,
          gapToMinimumDisplay: `${diff} ${u}`,
          gapToRecommended: diffRecNum,
          gapToRecommendedDisplay: `${diffRecNum} ${u}`,
          targetThresholdDisplay: minText,
          marginDisplay: `-${diff} ${u}`,
          summaryText: summary,
          whyItMatters: isFallbackRole
            ? (isConfirmed
                ? (locale === "en" ? "Text role has no dedicated threshold; evaluated against body text standard. Small font sizes increase visual acquisition load." : "当前文字角色暂无独立规范，暂按正文文字参考校验。文字字号过小会增加视觉辨识负荷。")
                : (locale === "en" ? "Estimated from screenshot; does not represent confirmed design source font. Evaluated against body text standard." : "基于截图估算，不代表已确认设计源字号。当前文字角色暂按正文文字参考校验。"))
            : (isConfirmed
                ? (locale === "en" ? "Undersized fonts increase visual acquisition strain, leading to reading fatigue under harsh lighting, low resolution, or small screens." : "文字字号过小会增加视觉辨识负荷，在强光、低分辨率或小屏环境下容易引起阅读疲劳。")
                : (locale === "en" ? "Estimated from screenshot; does not represent confirmed design source font. Undersized fonts may increase visual strain." : "基于截图估算，不代表已确认设计源字号。文字字号偏小可能增加视觉辨识负荷。")),
          ruleTitle: textSizeEval.reference
        });

        ruleId = textSizeEval.rule_id;
        ruleLayer = textSizeEval.rule_layer;
        reference = textSizeEval.reference;
        referenceStatus = textSizeEval.reference_status;
        resultBasis = textSizeEval.result_basis || resultBasis;
      } else if (textSizeEval.status === "meets_minimum" || (textSizeEval.status === "attention" && val >= minVal)) {
        const diff = formatNumericValue(recVal - val, 1);
        const diffNum = parseFloat(diff);
        const summary = locale === "en"
          ? (isConfirmed
              ? `Current font size ${val} ${u}, meets minimum (${minText}), but below recommended (${recText}) by ${diff} ${u}${fallbackSuffix}.`
              : `Estimated font size ≈ ${val} ${u}, meets minimum (${minText}), but below recommended (${recText}) by ${diff} ${u}${fallbackSuffix}.`)
          : (isConfirmed
              ? `当前字号${val} ${u}，已达到基本要求（${minText}），但仍低于推荐值（${recText}）${diff} ${u}${fallbackSuffix}。`
              : `当前截图估算字号约 ${val} ${u}，已达到基本要求（${minText}），但仍低于推荐值（${recText}）${diff} ${u}${fallbackSuffix}。`);

        actionableFindings.push({
          id: "text_size",
          metricLabel: locale === "en" ? "Font Size" : "文字字号",
          severity: "below_recommended",
          severityLabel: getConclusionPresentationState("below_recommended", locale).label + (!isConfirmed ? (locale === "en" ? " (est.)" : "（估算）") : ""),
          currentValue: val,
          currentUnit: u,
          currentValueDisplay: isConfirmed ? `${val} ${u}` : `${val} ${u}${locale === "en" ? " (est.)" : "（估算）"}`,
          minimumValue: minVal,
          minimumLabel: minText,
          minimumDisplay: `${minVal} ${u}`,
          recommendedValue: recVal,
          recommendedLabel: recText,
          recommendedDisplay: `${recVal} ${u}`,
          gapToMinimum: 0,
          gapToMinimumDisplay: `0 ${u}`,
          gapToRecommended: diffNum,
          gapToRecommendedDisplay: `${diff} ${u}`,
          targetThresholdDisplay: recText,
          marginDisplay: `-${diff} ${u}`,
          summaryText: summary,
          whyItMatters: isFallbackRole
            ? (isConfirmed
                ? (locale === "en" ? "Text role has no dedicated threshold; evaluated against body text standard. Meets minimum, but below recommended." : "当前文字角色暂无独立规范，暂按正文文字参考校验。当前字号已达基本要求，但仍低于推荐值。")
                : (locale === "en" ? "Estimated from screenshot; evaluated against body text standard." : "基于截图估算，不代表已确认设计源字号。当前文字角色暂按正文文字参考校验。"))
            : (isConfirmed
                ? (locale === "en" ? "Font size meets basic requirement but is below recommended; recommended sizes are advised in mobile or high-frequency reading scenarios." : "当前字号已达到基本要求，但仍低于推荐值，在移动或高频阅读场景建议采用推荐字号。")
                : (locale === "en" ? "Estimated from screenshot; does not represent confirmed design source font. Estimated font size meets minimum, but is below recommended." : "基于截图估算，不代表已确认设计源字号。当前估算字号已达基本要求，但仍低于推荐值。")),
          ruleTitle: textSizeEval.reference
        });

        ruleId = textSizeEval.rule_id;
        ruleLayer = textSizeEval.rule_layer;
        reference = textSizeEval.reference;
        referenceStatus = textSizeEval.reference_status;
        resultBasis = textSizeEval.result_basis || resultBasis;
      } else if (textSizeEval.status === "meets_default") {
        ruleId = textSizeEval.rule_id;
        ruleLayer = textSizeEval.rule_layer;
        reference = textSizeEval.reference;
        referenceStatus = textSizeEval.reference_status;
        resultBasis = textSizeEval.result_basis || resultBasis;
      }
    }

    // D. Layout Capacity Assessment (Non-normative advisory, does not alter formal conclusion state)
    const layoutAssessed = textLayoutAssessment || assessTextLayoutCapacity(element, imageNaturalWidth, userGroups);
    if (layoutAssessed) {
      if (layoutAssessed.finding === "accessibility_tradeoff") {
        perspectives.push({
          type: "design",
          label: "适老化排版说明",
          content: layoutAssessed.explanation || "针对适老化/低视力用户放大文字，单行字符承载偏低属于可读性优先的排版折衷。"
        });
      } else if (layoutAssessed.finding === "possible_excessive_enlargement" || (layoutAssessed.explanation && layoutAssessed.finding !== "normal")) {
        perspectives.push({
          type: "design",
          label: "排版容量参考 (启发式)",
          content: `${layoutAssessed.explanation} 建议评估是否需要适当平衡字号辨识度与单行信息承载量。`
        });
      }
    }
  }

  // Fallback perspective if empty
  if (perspectives.length === 0) {
    perspectives.push({
      type: "design",
      label: "设计检查",
      content: "可进一步配置设计尺寸基准或补充前背景色采样，以获取更完整的平台规范与无障碍评估结果。"
    });
  }

  // 4. Derive overall conclusionState and primary conclusion by prioritizing actionable findings
  // Priority: below_threshold > below_recommended > needs_info > meets_reference / measurement_only
  const severityOrder: Record<string, number> = {
    below_threshold: 0,
    below_recommended: 1,
    needs_info: 2
  };
  actionableFindings.sort((a, b) => (severityOrder[a.severity] ?? 99) - (severityOrder[b.severity] ?? 99));

  let conclusionState: EvaluationConclusionState = "measurement_only";
  let conclusion = locale === "en" ? "Basic visual and dimension annotations completed." : "元素已完成基础视觉与尺寸标注。";
  let whyItMatters = locale === "en" ? "Appropriate dimensions, contrast, and interactive touch areas are fundamental human factors elements that ensure smooth task completion." : "合理的尺寸、对比度与交互热区是保障用户顺畅完成任务的基础人因要素。";

  const isAutoDrivingScenario =
    scenarioScope?.domain === "automotive" &&
    scenarioScope?.observer_role === "driver" &&
    (scenarioScope?.operation_state === "driving" || scenarioScope?.time_criticality === "time_critical");
  const touchPhysicalThreshold = isAutoDrivingScenario ? 17.5 : 9.0;
  const hasCalibratedTouch = Boolean(
    isInteractive &&
    element.physical_geometry?.is_calibrated &&
    element.physical_geometry.width_mm &&
    element.physical_geometry.height_mm
  );
  const touchMinDim = hasCalibratedTouch
    ? Math.min(element.physical_geometry!.width_mm!, element.physical_geometry!.height_mm!)
    : undefined;

  const meetsTouchPhysical = isInteractive && !targetSizeEval && touchMinDim !== undefined && touchMinDim >= touchPhysicalThreshold;
  const meetsCharVa = element.element_type === "text" && element.character_height_visual_angle && element.character_height_visual_angle.arcmin >= (scenarioScope?.domain === "automotive" ? 12 : 20);

  const hasBelowThreshold = actionableFindings.some((f) => f.severity === "below_threshold");
  const hasBelowRecommended = actionableFindings.some((f) => f.severity === "below_recommended");
  const needsInfoCount = actionableFindings.filter((f) => f.severity === "needs_info").length;

  if (hasBelowThreshold) {
    conclusionState = "below_threshold";
  } else if (hasBelowRecommended) {
    conclusionState = "below_recommended";
  } else if (
    contrastEval?.passed ||
    (isInteractive && (targetSizeEval?.status === "meets_default" || targetSizeEval?.status === "condition_met")) ||
    meetsTouchPhysical ||
    (element.element_type === "text" && textSizeEval?.status === "meets_default") ||
    meetsCharVa
  ) {
    conclusionState = "meets_reference";
    const isIos = (logicalMapping?.platform || platform) === "ios";
    const isAndroid = (logicalMapping?.platform || platform) === "android";
    const recVal = isIos ? 17 : (isAndroid ? 12 : 16);
    const u = textSizeEval?.unit || "pt";
    const val = textSizeEval?.measured_value;
    const isEstimated = textSizeEval?.is_estimated || textSizeEval?.evaluation_basis === "screenshot_estimate" || textSizeEval?.source === "estimated_from_visual_bounds" || textSizeEval?.source === "estimated_from_character_height" || textSizeEval?.source === "estimated_from_single_line_visual_height";

    // Guard: only synthesize a text recommendation conclusion if text size actually evaluated against and reached recommended threshold
    let textConclusion: string | undefined;
    if (element.element_type === "text" && textSizeEval?.status === "meets_default" && val !== undefined && val >= recVal) {
      const isFallbackRole = element.text_role && element.text_role !== "body";
      if (locale === "en") {
        textConclusion = isEstimated
          ? `Estimated font size ≈ ${val} ${u}, meets recommended reference (≥ ${recVal} ${u}${isFallbackRole ? ", evaluated as body text reference" : ""}).`
          : `Font size ${val} ${u} meets recommended reference (≥ ${recVal} ${u}${isFallbackRole ? ", evaluated as body text reference" : ""}).`;
      } else {
        textConclusion = isEstimated
          ? `截图估算字号约 ${val} ${u}，达到推荐值（≥ ${recVal} ${u}${isFallbackRole ? "，暂按正文参考校验" : ""}）。`
          : `当前字号${val} ${u}，已达到推荐值（≥ ${recVal} ${u}${isFallbackRole ? "，暂按正文参考校验" : ""}）。`;
      }
    } else if (element.element_type === "text" && meetsCharVa && element.character_height_visual_angle) {
      textConclusion = locale === "en"
        ? `Representative character vertical visual angle ${formatNumericValue(element.character_height_visual_angle.arcmin, 1)}′, within general human factors recommended range (≥ 20′).`
        : `代表字符垂直视角 ${formatNumericValue(element.character_height_visual_angle.arcmin, 1)}′，达到通用人因推荐范围 (≥ 20′)（通用人因视觉参考，不代表当前平台正式字号规范）。`;
    }

    const targetConclusion = isInteractive && (targetSizeEval?.status === "meets_default" || targetSizeEval?.status === "condition_met")
      ? targetSizeEval?.summary_text
      : meetsTouchPhysical
      ? (locale === "en"
          ? `Physical touch target ≈ ${formatNumericValue(element.physical_geometry!.width_mm!, 1)} × ${formatNumericValue(element.physical_geometry!.height_mm!, 1)} mm, within recommended reference (≥ ${touchPhysicalThreshold} mm).`
          : `触控物理尺寸约 ${formatNumericValue(element.physical_geometry!.width_mm!, 1)} × ${formatNumericValue(element.physical_geometry!.height_mm!, 1)} mm，达到推荐参考（≥ ${touchPhysicalThreshold} mm）。`)
      : undefined;

    const contrastConclusion = contrastEval?.passed
      ? (locale === "en"
          ? `Contrast ${contrastEval.contrast_ratio}:1 meets WCAG 2.2 AA threshold (${contrastEval.threshold}:1).`
          : `对比度 ${contrastEval.contrast_ratio}:1，达到 WCAG 2.2 AA 阈值（${contrastEval.threshold}:1）。`)
      : undefined;

    const baseConclusion = targetConclusion || textConclusion || contrastConclusion || (element.element_type === "text" ? textSizeEval?.summary_text : undefined) || (locale === "en" ? "Meets current platform and human factors references." : "达到当前平台与人因基准参考。");

    if (needsInfoCount > 0) {
      conclusion = locale === "en"
        ? `Evaluated metrics are within recommended range; ${needsInfoCount} item(s) pending additional info.`
        : `已完成评估项达到推荐范围；仍有 ${needsInfoCount} 项待补充信息。`;
    } else {
      conclusion = baseConclusion;
    }
    whyItMatters = locale === "en"
      ? "Standard-compliant touch targets and visual parameters ensure target acquisition accuracy and operational fault tolerance."
      : "符合规范的操作目标与视觉参数能够保障用户的辨识度与操作容错率。";
  } else if (needsInfoCount > 0) {
    conclusionState = "needs_info";
  } else {
    conclusionState = "measurement_only";
    if (element.element_type === "text" && textSizeEval?.summary_text) {
      conclusion = textSizeEval.summary_text;
    } else if (isInteractive && targetSizeEval?.summary_text) {
      conclusion = targetSizeEval.summary_text;
    }
  }

  const failureFindings = actionableFindings.filter((f) => f.severity === "below_threshold" || f.severity === "below_recommended");
  if (failureFindings.length === 1) {
    conclusion = failureFindings[0].summaryText;
    whyItMatters = failureFindings[0].whyItMatters || whyItMatters;
  } else if (failureFindings.length > 1) {
    conclusion = failureFindings.map((f) => f.summaryText).join(locale === "en" ? "; " : "；");
    whyItMatters = failureFindings[0].whyItMatters || whyItMatters;
  } else if (conclusionState === "needs_info" && actionableFindings.length > 0) {
    conclusion = actionableFindings.map((f) => f.summaryText).join(locale === "en" ? "; " : "；");
    whyItMatters = failureFindings[0]?.whyItMatters || whyItMatters;
  }

  const presentationState = getConclusionPresentationState(conclusionState, locale);
  const conclusionStateLabel = presentationState.label;

  technicalDetails.push(locale === "en"
    ? `Image Pixel Dimensions: ${element.image_pixel_bounds.width} × ${element.image_pixel_bounds.height} px`
    : `图像像素尺寸: ${element.image_pixel_bounds.width} × ${element.image_pixel_bounds.height} px`);
  if (element.touch_bounds_pixel && isInteractive) {
    technicalDetails.push(locale === "en"
      ? `Touch Target Pixel Dimensions: ${element.touch_bounds_pixel.width} × ${element.touch_bounds_pixel.height} px`
      : `触控热区像素尺寸: ${element.touch_bounds_pixel.width} × ${element.touch_bounds_pixel.height} px`);
  }
  if (element.element_type === "text" && element.character_height_px) {
    technicalDetails.push(locale === "en"
      ? `Representative Character Pixel Height: ${element.character_height_px} px`
      : `代表字符像素高度: ${element.character_height_px} px`);
    if (logicalMapping && logicalMapping.quality !== "unavailable") {
      const scale = logicalMapping.scale_y || logicalMapping.scale_x || ((logicalMapping as Record<string, any>).scale_factor ? 1 / (logicalMapping as Record<string, any>).scale_factor : 1);
      const designH = element.character_height_design_height ?? (Math.round(element.character_height_px * scale * 10) / 10);
      const u = logicalMapping.unit === "css_px" ? "CSS px" : (logicalMapping.unit || "pt");
      technicalDetails.push(locale === "en"
        ? `Representative Character Design Height: ≈ ${formatNumericValue(designH, 1)} ${u}`
        : `代表字符设计空间高度: 约 ${formatNumericValue(designH, 1)} ${u}`);
    }
  }
  if (element.element_type === "text" && element.character_height_physical_mm) {
    technicalDetails.push(locale === "en"
      ? `Representative Character Physical Height: ≈ ${formatNumericValue(element.character_height_physical_mm, 2)} mm`
      : `代表字符物理高度: 约 ${formatNumericValue(element.character_height_physical_mm, 2)} mm`);
  }
  if (element.element_type === "text" && element.character_height_visual_angle) {
    technicalDetails.push(locale === "en"
      ? `Representative Character Vertical Visual Angle: ${formatNumericValue(element.character_height_visual_angle.arcmin, 1)}′ (${formatNumericValue(element.character_height_visual_angle.deg, 2)}°)`
      : `代表字符垂直视角: ${formatNumericValue(element.character_height_visual_angle.arcmin, 1)}′ (${formatNumericValue(element.character_height_visual_angle.deg, 2)}°)`);
  }
  if (element.element_type === "text" && element.estimated_text_size_value !== undefined) {
    const estU = element.estimated_text_size_unit === "css_px" ? "CSS px" : (element.estimated_text_size_unit || "pt");
    const estSrc = element.estimated_text_size_source === "estimated_from_character_height"
      ? (locale === "en" ? "Estimated from character height" : "代表字符高度粗略估算")
      : (locale === "en" ? "Single-line visual height estimation" : "单行可视高度估算");
    technicalDetails.push(locale === "en"
      ? `Screenshot Font Size Estimate: ≈ ${formatNumericValue(element.estimated_text_size_value, 1)} ${estU} (${estSrc}, for reference only)`
      : `截图字号估算: 约 ${formatNumericValue(element.estimated_text_size_value, 1)} ${estU} (${estSrc}，仅供参考)`);
  }

  return {
    conclusion,
    conclusionState,
    conclusionStateLabel,
    presentationState,
    actionableFindings,
    whyItMatters,
    perspectives,
    measurementAndEvidence: {
      ruleId,
      ruleLayer,
      reference,
      referenceStatus,
      claimStrength,
      resultBasis,
      technicalDetails
    }
  };
}
