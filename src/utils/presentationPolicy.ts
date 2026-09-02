import type { EvaluationMode } from "../types/workspace";
import type { LogicalUnitMapping, PhysicalGeometry, CalibrationMode, PixelBounds } from "../types/designElement";

export interface EvaluationPresentationPolicy {
  mode: EvaluationMode;
  // Parameter panel disclosure
  showParametersDirectly: boolean; // false for Quick (collapsed under "提高评估精度"), true for Guided/Precise
  showPhysicalParametersDirectly: boolean; // false for Quick/Guided (collapsed), true for Precise

  // Element Inspector & Results Density
  leadWithObservableFacts: boolean; // true for Quick (emphasize what needs attention & plain summary before engineering tables)
  showAdvancedMeasurements: boolean; // false for Quick by default, true for Guided/Precise
  showPhysicalMeasurements: boolean; // false for Quick, secondary for Guided, direct for Precise
  showTechnicalMapping: boolean; // false for Quick, true for Guided/Precise
  showEvidenceDetails: boolean; // false for Quick, concise for Guided, full rule ID/evidence status for Precise
  showImpactAndRecommendations: boolean; // true for all modes
  defaultExpandedSections: {
    overview: boolean;
    measurements: boolean;
    rulesAndEvidence: boolean;
    impactAndRecommendations: boolean;
  };
}

/**
 * Returns the presentation policy for the specified evaluation mode.
 * Quick: low information density, prioritizes observable facts, collapses engineering details.
 * Guided: medium density, prioritizes design unit basis and platform guidance.
 * Precise: full technical layer, all technical measurements and evidence references visible.
 */
export function getEvaluationPresentationPolicy(mode: EvaluationMode): EvaluationPresentationPolicy {
  switch (mode) {
    case "quick":
      return {
        mode: "quick",
        showParametersDirectly: false,
        showPhysicalParametersDirectly: false,
        leadWithObservableFacts: true,
        showAdvancedMeasurements: false,
        showPhysicalMeasurements: false,
        showTechnicalMapping: false,
        showEvidenceDetails: false,
        showImpactAndRecommendations: true,
        defaultExpandedSections: {
          overview: true,
          measurements: false,
          rulesAndEvidence: false,
          impactAndRecommendations: true
        }
      };

    case "guided":
      return {
        mode: "guided",
        showParametersDirectly: true,
        showPhysicalParametersDirectly: false,
        leadWithObservableFacts: false,
        showAdvancedMeasurements: true,
        showPhysicalMeasurements: false,
        showTechnicalMapping: true,
        showEvidenceDetails: true,
        showImpactAndRecommendations: true,
        defaultExpandedSections: {
          overview: true,
          measurements: true,
          rulesAndEvidence: true,
          impactAndRecommendations: true
        }
      };

    case "precise":
      return {
        mode: "precise",
        showParametersDirectly: true,
        showPhysicalParametersDirectly: true,
        leadWithObservableFacts: false,
        showAdvancedMeasurements: true,
        showPhysicalMeasurements: true,
        showTechnicalMapping: true,
        showEvidenceDetails: true,
        showImpactAndRecommendations: true,
        defaultExpandedSections: {
          overview: true,
          measurements: true,
          rulesAndEvidence: true,
          impactAndRecommendations: true
        }
      };

    default:
      return getEvaluationPresentationPolicy("quick");
  }
}

export interface PrecisionCapabilityStatus {
  level: "relative" | "design_unit" | "physical";
  badgeText: string;
  description: string;
  canRelativeEvaluate: boolean;
  canDesignUnitEvaluate: boolean;
  canPhysicalEvaluate: boolean;
}

/**
 * Determines current evaluation precision capability status based on active data completeness.
 * Level 1: Relative only (Screenshot facts)
 * Level 2: Design-unit mapping active (pt / dp / CSS px)
 * Level 3: Physical calibration active (mm)
 */
import type { Locale } from "../i18n/types";

export function getPrecisionCapabilityStatus(
  logicalMapping?: LogicalUnitMapping | null,
  calibration?: PhysicalGeometry | null,
  locale: Locale = "zh-CN"
): PrecisionCapabilityStatus {
  const hasPhysical = Boolean(
    calibration &&
    (calibration.is_calibrated || calibration.calibration_quality === "exact" || calibration.calibration_quality === "estimated") &&
    calibration.calibration_quality !== "relative_only"
  );

  const hasLogical = Boolean(
    logicalMapping &&
    logicalMapping.quality !== "unavailable" &&
    logicalMapping.scale_x > 0
  );

  if (hasPhysical) {
    return {
      level: "physical",
      badgeText: locale === "en" ? "✓ Physical Dimension Mapping Active" : "✓ 物理尺寸换算已启用",
      description: locale === "en" ? "Millimeter dimensions and physical human factors metrics are available." : "当前可进一步查看毫米尺寸和物理人因指标。",
      canRelativeEvaluate: true,
      canDesignUnitEvaluate: hasLogical,
      canPhysicalEvaluate: true
    };
  }

  if (hasLogical) {
    return {
      level: "design_unit",
      badgeText: locale === "en" ? "✓ Design Unit Mapping Active" : "✓ 设计单位换算已启用",
      description: locale === "en" ? "Evaluate pt / dp / CSS px, font sizes, touch targets, and design spacing." : "当前可进一步评估 pt / dp / CSS px、字号、触控目标和设计间距。",
      canRelativeEvaluate: true,
      canDesignUnitEvaluate: true,
      canPhysicalEvaluate: false
    };
  }

  return {
    level: "relative",
    badgeText: locale === "en" ? "✓ Screenshot Evaluation Active" : "✓ 截图评估可用",
    description: locale === "en" ? "Evaluate relative metrics based on pixels, proportions, contrast, and layout." : "当前可基于像素、比例、颜色和空间关系进行相对评估。",
    canRelativeEvaluate: true,
    canDesignUnitEvaluate: false,
    canPhysicalEvaluate: false
  };
}

/**
 * Computes area share metric and selects appropriate terminology based on screenshot scope.
 * Full screen: "屏幕占比" / "Screen Share"
 * Cropped: "当前截图占比" / "Crop Share"
 */
export function formatAreaShare(
  pixelBounds: PixelBounds,
  imageWidth: number,
  imageHeight: number,
  calibrationMode: CalibrationMode = "full_screen",
  locale: Locale = "zh-CN"
): { label: string; percentageText: string; percentage: number } {
  if (imageWidth <= 0 || imageHeight <= 0) {
    const label = calibrationMode === "cropped"
      ? (locale === "en" ? "Crop Share" : "当前截图占比")
      : (locale === "en" ? "Screen Share" : "屏幕占比");
    return {
      label,
      percentageText: "0%",
      percentage: 0
    };
  }

  const elementArea = pixelBounds.width * pixelBounds.height;
  const totalImageArea = imageWidth * imageHeight;
  const rawRatio = Math.min(1, Math.max(0, elementArea / totalImageArea));
  const percentage = Number((rawRatio * 100).toFixed(1));
  const label = calibrationMode === "cropped"
    ? (locale === "en" ? "Crop Share" : "当前截图占比")
    : (locale === "en" ? "Screen Share" : "屏幕占比");

  return {
    label,
    percentageText: `${percentage}%`,
    percentage
  };
}
