import type { EvaluationTier } from "./capability";
import type { LogicalUnit } from "./designElement";

export type ReportFilter = "all" | "attention_only";

export interface ContextCropResult {
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
  targetRelX: number;
  targetRelY: number;
  targetRelWidth: number;
  targetRelHeight: number;
}

export interface ReportElementItem {
  index: number;
  elementId: string;
  label: string;
  elementType: string;
  elementTypeLabel: string;
  interactionType: string;
  isInteractive: boolean;
  needsAttention: boolean;
  attentionReasons: string[];
  highestTier: EvaluationTier;
  highestTierLabel: string;
  conclusion: string;
  conclusionState: "meets_reference" | "below_threshold" | "below_recommended" | "measurement_only" | "needs_info" | "not_applicable";
  conclusionStateLabel: string;
  whyItMatters?: string;
  designCheckRec?: string;
  experienceImpact?: string;
  uxrValidation?: string;
  priorityTip?: string;
  upgradeRequirement?: string;
  // Key measurements & Trace
  visualDimensionsDisplay: string;
  touchDimensionsDisplay?: string;
  touchProvenance?: string;
  touchStatus?: string;
  nearestSpacingDisplay?: string;
  contrastDisplay?: string;
  physicalDimensionsDisplay?: string;
  visualAngleDisplay?: string;
  visualAngleDetailDisplay?: string;
  visualAngleViewingDistanceDisplay?: string;
  visualAngleTextSemanticNote?: string;
  characterHeightDisplay?: string;
  characterHeightDesignDisplay?: string;
  characterHeightPhysicalDisplay?: string;
  characterHeightVisualAngleDisplay?: string;
  estimatedTextSizeDisplay?: string;
  estimatedTextSizeSourceLabel?: string;
  estimatedTextSizeAdvisory?: string;
  thumbnailDataUrl?: string;
  // Rule Comparison Traces
  ruleTraces?: Array<{
    metricLabel: string;
    currentValueDisplay: string;
    verdictLabel: string;
    verdict: string;
    ruleTitle?: string;
    ruleLayer?: string;
    evidenceStatus?: string;
    marginLabel?: string;
    explanation?: string;
  }>;
  // More measurements without independent reference
  moreMeasurements?: Array<{
    metricLabel: string;
    currentValueDisplay: string;
    verdictLabel?: string;
    verdict?: string;
    explanation?: string;
  }>;
  // Actionable findings breakdown
  actionableFindings?: Array<{
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
  }>;
  // Technical measurements
  technicalDetails?: Array<{ label: string; value: string }>;
}


export interface ReportEvaluationContext {
  domain: string;
  domainLabel: string;
  viewingDistanceDisplay: string;
  screenHardwareDisplay: string;
  screenshotScopeDisplay: string;
  designBasisDisplay: string;
  targetPlatformDisplay: string;
}

export interface ReportSummaryData {
  title: string;
  generatedAt: string;
  imageName: string;
  imageNaturalDimensions: { width: number; height: number };
  screenshotScope: "full_screen" | "cropped";
  screenshotScopeLabel: string;
  totalElementsCount: number;
  attentionCount: number;
  filter: ReportFilter;
  filterCount: number;
  designInfoStatus: "unknown" | "partial" | "source_available";
  targetPlatform: string;
  targetPlatformLabel: string;
  logicalUnit?: LogicalUnit;
  displaySize?: string;
  resolution?: string;
  viewingDistance?: string;
  scenario?: string;
  userGroups?: string[];
  ruleSets?: string[];
  dimensions?: string[];
  contextEnvironment?: string;
  contextOperationState?: string;
  assumptions: string[];
  evaluationContext?: ReportEvaluationContext;
  actualEvaluationScope?: string[];
  completedEvaluationScope?: string[];
  pendingEvaluationScope?: string[];
  actualReferencesUsed?: string[];
  pendingReferences?: string[];
  fullEvidenceScreenshotDataUrl?: string;
  elements: ReportElementItem[];
}
