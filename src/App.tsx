import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { analyzeDesign } from "./services/analysisService";
import type { AnalysisInput, Annotation } from "./types/annotation";
import type {
  DesignElement,
  ElementType,
  CalibrationMode,
  LogicalUnit,
  LogicalUnitMapping,
  TargetPlatform,
  TargetSizeEvaluation,
  NormalizedBounds,
  PixelBounds,
  InteractionType,
  SwipeDirection,
  TouchBoundsSource,
  TextLayout,
  TextVisualMeasurementTarget,
  TextRole,
  TextSizeUnit,
  TextSizeSource,
  TextWeightCategory,
  TextSizeEvaluation,
  ColorState
} from "./types/designElement";
import type { EvaluationSession } from "./types/session";
import { initialSession } from "./mocks/sessionMock";
import {
  claimStrengthLabels,
  issueTypeLabels,
  reasoningTypeLabels,
  referenceStatusLabels,
  referenceStatusMessages,
  ruleLayerLabels,
  severityLabels,
  statusLabels,
  suitabilityLabels,
  elementTypeLabels,
  calibrationQualityLabels,
  logicalMappingQualityLabels,
  logicalUnitLabels,
  targetSizeStatusLabels,
  interactionTypeLabels,
  swipeDirectionLabels,
  touchBoundsSourceLabels,
  touchReviewStatusLabels,
  touchSourceProvenanceLabels,
  getRuleLayerLabel,
  getReferenceStatusLabel,
  getIssueTypeLabel,
  getSeverityLabel,
  getStatusLabel,
  getClaimStrengthLabel,
  referenceStatusMessagesEn,
  getReasoningTypeLabel,
  getSuitabilityLabel,
  getElementDisplayName
} from "./utils/labels";
import {
  deviceProfiles,
  deviceTypeOptions,
  dimensionOptions,
  ruleSetOptions,
  userGroupOptions,
  type DeviceProfileKey,
  getDeviceLogicalWidth
} from "./constants/inputOptions";
import {
  calculateNormalizedBounds,
  calculatePhysicalGeometry,
  resolveDisplayParameters,
  getPhysicalCalibrationDiagnostics,
  type PhysicalCalibrationDiagnostic,
  moveBounds,
  resizeBounds,
  mapClientToNaturalPixel
} from "./utils/calibration";
import type {
  CanvasInteraction,
  TouchCanvasInteraction,
  ResizeHandle
} from "./types/canvasInteraction";
import {
  hasExceededDragThreshold,
  calculateMovedNormalizedBounds,
  calculateResizedNormalizedBounds,
  calculateCreatedNormalizedBounds,
  resolvePointerUpIntent
} from "./utils/canvasInteraction";
import { evaluateWcagContrast, evaluateWcagNonTextContrast, rgbToHex } from "./utils/contrast";
import {
  getApplicableEvaluationModules,
  calculateMinimumSide
} from "./utils/evaluationRouting";
import {
  calculateLogicalScale,
  mapPixelBoundsToLogical,
  createLogicalUnitMapping,
  formatScaleRatio,
  evaluateTargetSize
} from "./utils/logicalMapping";
import {
  createManualDesignElement,
  recomputeElementDerivedState,
  calculateAreaMetrics,
  calculateVisualAreaMetrics,
  generateCenteredReferenceTouchBounds,
  calculateNearestTouchTarget,
  calculateEdgeDistances,
  evaluateWcagTargetSpacingCondition,
  deriveTouchReviewStatus,
  resolveTouchSourceProvenance,
  getEffectiveTouchPixelBounds,
  createTouchEditSnapshot,
  applyTouchEditDraftToElement,
  revertTouchEditDraft,
  type NearestTouchTargetResult,
  type WcagSpacingEvaluation,
  type TouchReviewResult,
  type TouchEditSnapshot,
  type DerivedEvaluationContext
} from "./utils/interactionGeometry";
import {
  buildTargetSizeTrace,
  buildTouchPhysicalTrace,
  buildContrastTrace,
  buildTextSizeTrace,
  buildSpacingTrace,
  buildPhysicalGeometryTrace,
  buildCharacterVisualAngleTrace,
  buildGraphicalVisualAngleTrace,
  sortAndPartitionRuleTraces,
  formatRuleTrace
} from "./utils/ruleTrace";

import type { RuleComparisonTrace } from "./types/ruleTrace";
import {
  estimateTextSizeFromVisualBounds,
  deriveAutomaticContrastSizeCategory,
  evaluateTextSize,
  recalculateElementTextSize
} from "./utils/textSizeEvaluation";
import {
  formatSingleDimension,
  formatDimensionPair,
  formatAreaMetric,
  formatNumericValue
} from "./utils/metricFormatting";
import {
  buildElementPresentationModel,
  deriveScenarioScope,
  type ElementPresentationModel
} from "./utils/elementPresentation";
import { parseViewingDistanceMm } from "./humanFactors/viewingDistance";
import { groupActionableFindings } from "./utils/impactRecommendation";
import { DefinitionTerm } from "./components/DefinitionTerm";
import { saveWorkspace, serializeWorkspace, deserializeWorkspace } from "./services/workspaceStorage";
import {
  WORKSPACE_SCHEMA_VERSION,
  type WorkspaceState,
  type EvaluationMode,
  type ReviewerRole,
  type CroppedScaleMode
} from "./types/workspace";
import {
  getEvaluationPresentationPolicy,
  getPrecisionCapabilityStatus,
  formatAreaShare
} from "./utils/presentationPolicy";
import { getUnifiedResultExplanation } from "./utils/impactRecommendation";
import { createCroppedPreservedScaleMapping } from "./utils/logicalMapping";
import {
  resolveAllCapabilities,
  type CapabilityContext
} from "./utils/capabilityResolver";
import {
  EvaluationParametersModal,
  type EvaluationParametersData
} from "./components/EvaluationParametersModal";
import { EVALUATION_TIER_LABELS, EVALUATION_CHECK_LABELS, getEvaluationTierLabel } from "./types/capability";
import { ReportPreviewModal } from "./components/ReportPreviewModal";
import type { ReportSummaryData, ReportFilter, ReportElementItem } from "./types/report";
import {
  generateNumberedEvidenceScreenshotDataUrl,
  generateElementThumbnailDataUrl,
  generateSelfContainedHtmlReport,
  downloadHtmlFile
} from "./utils/reportGenerator";
import { useI18n } from "./i18n";
import type { LocalProject, ProjectSummary } from "./types/project";
import {
  computeImageHash,
  generateProjectId,
  saveProject,
  loadProject,
  listProjects,
  findProjectsByImageHash,
  deleteProject,
  renameProject,
  getActiveProjectId,
  setActiveProjectId,
  migrateLegacyWorkspaceIfNeeded,
  clearAllProjects
} from "./services/projectStorage";
import { ProjectLibraryModal } from "./components/ProjectLibraryModal";
import { SameImageModal } from "./components/SameImageModal";

export function App() {
  const { locale, setLocale, t } = useI18n();
  const [imageUrl, setImageUrl] = useState<string>("");
  const [evaluationMode, setEvaluationMode] = useState<EvaluationMode>("quick");
  const [reviewerRole, setReviewerRole] = useState<ReviewerRole>(null);
  const [showDemoResults, setShowDemoResults] = useState<boolean>(false);
  const [imageBlob, setImageBlob] = useState<Blob | undefined>(undefined);
  const [imageName, setImageName] = useState<string>("");
  const [elementThumbnails, setElementThumbnails] = useState<Record<string, string>>({});
  const [imageNaturalDimensions, setImageNaturalDimensions] = useState<{ width: number; height: number } | null>(null);

  // Precision & Screenshot Scope Sub-states
  const [croppedScaleMode, setCroppedScaleMode] = useState<CroppedScaleMode>("unknown_or_resized");
  const [originalFullImageWidthInput, setOriginalFullImageWidthInput] = useState<string>("");
  const [isPrecisionUpgradeExpanded, setIsPrecisionUpgradeExpanded] = useState<boolean>(false);
  const [isPhysicalParamsExpanded, setIsPhysicalParamsExpanded] = useState<boolean>(false);
  const [isDrawerMeasurementDetailsExpanded, setIsDrawerMeasurementDetailsExpanded] = useState<boolean>(false);

  // Phase 3I: Guided Inputs & Context State
  const [designInfoStatus, setDesignInfoStatus] = useState<"unknown" | "partial" | "source_available">("unknown");
  const [contextEnvironment, setContextEnvironment] = useState<string>("");
  const [contextOperationState, setContextOperationState] = useState<string>("");

  // Phase 3I: Visual Evidence Report State
  const [isReportPreviewOpen, setIsReportPreviewOpen] = useState<boolean>(false);
  const [reportFilter, setReportFilter] = useState<ReportFilter>("all");
  const [reportData, setReportData] = useState<ReportSummaryData | null>(null);

  // Inspector Scrolling Reference for Canvas Selection Sync & Outside Click Detection
  const inspectorScrollContainerRef = useRef<HTMLDivElement>(null);
  const inspectorDrawerRef = useRef<HTMLDivElement>(null);
  const imageStageRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Phase 3H: Parameters Modal State & Lower Tiers Drawer
  const [isParamsModalOpen, setIsParamsModalOpen] = useState<boolean>(false);
  const [paramsModalInitialSection, setParamsModalInitialSection] = useState<
    "screenshot" | "screen" | "user_scenario" | "references" | "design" | "environment"
  >("screenshot");
  const [isLowerTiersExpanded, setIsLowerTiersExpanded] = useState<boolean>(false);

  // Phase 3: Local Project Library State
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentProjectName, setCurrentProjectName] = useState<string>("");
  const [projectCreatedAt, setProjectCreatedAt] = useState<string>("");
  const [currentImageHash, setCurrentImageHash] = useState<string>("");
  const [isProjectLibraryOpen, setIsProjectLibraryOpen] = useState<boolean>(false);
  const [projectSummaries, setProjectSummaries] = useState<ProjectSummary[]>([]);
  const [isSameImageModalOpen, setIsSameImageModalOpen] = useState<boolean>(false);
  const [sameImageMatchingProjects, setSameImageMatchingProjects] = useState<LocalProject[]>([]);
  const [pendingSameImageFile, setPendingSameImageFile] = useState<File | null>(null);

  const currentProjectIdRef = useRef<string | null>(null);
  currentProjectIdRef.current = currentProjectId;
  const currentProjectNameRef = useRef<string>("");
  currentProjectNameRef.current = currentProjectName;
  const projectCreatedAtRef = useRef<string>("");
  projectCreatedAtRef.current = projectCreatedAt;
  const currentImageHashRef = useRef<string>("");
  currentImageHashRef.current = currentImageHash;
  const currentImageUrlRef = useRef<string>("");
  currentImageUrlRef.current = imageUrl;
  const isHydratingRef = useRef<boolean>(false);

  // Phase 3H P0: File Input & Image Replacement Workflow
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isReplaceConfirmOpen, setIsReplaceConfirmOpen] = useState<boolean>(false);
  const [pendingDropFile, setPendingDropFile] = useState<File | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const [imageReplacementNotice, setImageReplacementNotice] = useState<string | null>(null);

  // Real Manual Elements State
  const [manualElements, setManualElements] = useState<DesignElement[]>([]);
  const [activeElementId, setActiveElementId] = useState<string | null>(null);
  const [resultTargetElementId, setResultTargetElementId] = useState<string | null>(null);
  const [isElementInspectorOpen, setIsElementInspectorOpen] = useState<boolean>(false);
  const [isAddingElement, setIsAddingElement] = useState<boolean>(false);
  const [colorSamplingTarget, setColorSamplingTarget] = useState<"foreground" | "background" | null>(null);
  const [samplingHoverPos, setSamplingHoverPos] = useState<{
    clientX: number;
    clientY: number;
    pixelX: number;
    pixelY: number;
    hex: string;
  } | null>(null);
  const magnifierCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [characterMeasuringElementId, setCharacterMeasuringElementId] = useState<string | null>(null);
  const isColorSamplingActiveRef = useRef<boolean>(false);
  const [calibrationMode, setCalibrationMode] = useState<CalibrationMode>("full_screen");

  const [globalAllowEstimation, setGlobalAllowEstimation] = useState<boolean>(false);

  // Touch Edit Mode State with Draft Snapshot
  const [isTouchEditMode, setIsTouchEditMode] = useState<boolean>(false);
  const [touchEditSnapshot, setTouchEditSnapshot] = useState<TouchEditSnapshot | null>(null);
  const [touchInteraction, setTouchInteraction] = useState<TouchCanvasInteraction>({ type: "idle" });
  const [touchToastMessage, setTouchToastMessage] = useState<string | null>(null);
  const touchToastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showTouchToast = (msg: string) => {
    if (touchToastTimeoutRef.current) {
      clearTimeout(touchToastTimeoutRef.current);
    }
    setTouchToastMessage(msg);
    touchToastTimeoutRef.current = setTimeout(() => {
      setTouchToastMessage(null);
    }, 3000);
  };

  // Copy Touch Bounds from another element dropdown state
  const [copyFromElementId, setCopyFromElementId] = useState<string>("");

  // Design Size Basis (Logical Unit Mapping) State
  const [logicalMapping, setLogicalMapping] = useState<LogicalUnitMapping | undefined>(undefined);
  const [isLogicalMappingExpanded, setIsLogicalMappingExpanded] = useState<boolean>(false);
  const [isPhysicalCalibrationExpanded, setIsPhysicalCalibrationExpanded] = useState<boolean>(false);
  const [mappingPlatform, setMappingPlatform] = useState<TargetPlatform>("unknown");
  const [mappingUnit, setMappingUnit] = useState<LogicalUnit>("pt");
  const [imageRefWidthInput, setImageRefWidthInput] = useState<string>("");
  const [logicalRefWidthInput, setLogicalRefWidthInput] = useState<string>("");
  const [imageRefHeightInput, setImageRefHeightInput] = useState<string>("");
  const [logicalRefHeightInput, setLogicalRefHeightInput] = useState<string>("");

  // Storage & Autosave State
  const [storageStatus, setStorageStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [storageErrorMessage, setStorageErrorMessage] = useState<string>("");
  const [showRestoreNotification, setShowRestoreNotification] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  // Mutually Exclusive Canvas Interaction State (Select / Move / Resize / Create)
  const [canvasInteraction, setCanvasInteraction] = useState<CanvasInteraction>({ type: "idle" });

  // Mock Analysis State
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [activeAnnotationId, setActiveAnnotationId] = useState<string>("");
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [currentSession, setCurrentSession] = useState<EvaluationSession>(initialSession);

  // Form Inputs
  const [customDeviceType, setCustomDeviceType] = useState("");
  const [customDisplaySize, setCustomDisplaySize] = useState("");
  const [customResolution, setCustomResolution] = useState("");
  const [customDistance, setCustomDistance] = useState("");
  const [customScenario, setCustomScenario] = useState("");
  const [form, setForm] = useState<AnalysisInput>({
    deviceProfile: "mobile",
    deviceType: "移动端",
    displaySize: "6.1 inch",
    resolution: "390x844",
    distance: "30cm",
    userGroups: ["东亚用户", "女性"],
    scenario: "移动端 App - 室内",
    scenarioDomain: "mobile",
    scenarioDomainUserOverridden: false,
    ruleSets: ["WCAG 2.2", "Apple HIG", "Human Factors"],
    dimensions: ["触控目标", "色彩对比", "认知负荷"]
  });

  useEffect(() => {
    if (evaluationMode === 'quick') {
      setIsLogicalMappingExpanded(false);
      setIsPhysicalCalibrationExpanded(false);
    } else if (evaluationMode === 'guided') {
      setIsLogicalMappingExpanded(true);
      setIsPhysicalCalibrationExpanded(false);
    } else if (evaluationMode === 'precise') {
      setIsLogicalMappingExpanded(true);
      setIsPhysicalCalibrationExpanded(true);
    }
  }, [evaluationMode]);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Resolved Display Parameters ensuring "自定义" is properly unpacked
  const resolvedDisplayParams = useMemo(() => {
    return resolveDisplayParameters(
      form.displaySize,
      form.resolution,
      customDisplaySize,
      customResolution
    );
  }, [form.displaySize, form.resolution, customDisplaySize, customResolution]);

  // Physical Screen Calibration Diagnostics
  const physicalCalibrationDiagnostic = useMemo<PhysicalCalibrationDiagnostic>(() => {
    return getPhysicalCalibrationDiagnostics(
      imageNaturalDimensions?.width || 0,
      imageNaturalDimensions?.height || 0,
      resolvedDisplayParams.displaySize,
      resolvedDisplayParams.resolution,
      calibrationMode,
      globalAllowEstimation,
      resolvedDisplayParams.isCustomDisplay,
      resolvedDisplayParams.isCustomResolution
    );
  }, [
    imageNaturalDimensions,
    resolvedDisplayParams,
    calibrationMode,
    globalAllowEstimation
  ]);

  const mmPerPixel = physicalCalibrationDiagnostic.mmPerPixel;

  const activeAnnotation = annotations.find((item) => item.annotation_id === activeAnnotationId) || annotations[0];
  const activeIndex = activeAnnotation ? annotations.findIndex((item) => item.annotation_id === activeAnnotation.annotation_id) : -1;
  const activeEvidence = activeAnnotation?.evidence[0];
  const currentProfile = deviceProfiles[(form.deviceProfile as DeviceProfileKey) || "mobile"];
  const highRiskCount = annotations.filter((item) => item.severity === "high" || item.severity === "critical").length;

  const activeElement = manualElements.find((el) => el.element_id === activeElementId) || null;
  const activeElementIndex = activeElement ? manualElements.findIndex((el) => el.element_id === activeElement.element_id) : -1;
  const applicableModules = activeElement ? getApplicableEvaluationModules(activeElement.element_type) : [];
  const activeMinSide = activeElement ? calculateMinimumSide(activeElement.image_pixel_bounds, activeElement.physical_geometry) : null;

  const inspectorElement = useMemo(() => {
    if (resultTargetElementId) {
      const found = manualElements.find((el) => el.element_id === resultTargetElementId);
      if (found) return found;
    }
    return activeElement;
  }, [manualElements, resultTargetElementId, activeElement]);

  const inspectorElementIndex = inspectorElement
    ? manualElements.findIndex((el) => el.element_id === inspectorElement.element_id)
    : -1;

  // Ephemeral active element reflecting live Touch Edit draft when in touch edit mode
  const effectiveActiveElement = useMemo<DesignElement | null>(() => {
    if (!activeElement) return null;
    if (isTouchEditMode && touchEditSnapshot) {
      return {
        ...activeElement,
        touch_bounds: touchEditSnapshot.draftNormalizedBounds,
        touch_source_provenance: touchEditSnapshot.sourceProvenance
      };
    }
    return activeElement;
  }, [activeElement, isTouchEditMode, touchEditSnapshot]);

  const effectiveInspectorElement = useMemo<DesignElement | null>(() => {
    if (!inspectorElement) return null;
    if (isTouchEditMode && touchEditSnapshot && inspectorElement.element_id === touchEditSnapshot.elementId) {
      return {
        ...inspectorElement,
        touch_bounds: touchEditSnapshot.draftNormalizedBounds,
        touch_source_provenance: touchEditSnapshot.sourceProvenance
      };
    }
    return inspectorElement;
  }, [inspectorElement, isTouchEditMode, touchEditSnapshot]);

  const inspectorTouchAreaMetrics = useMemo(() => {
    if (!effectiveInspectorElement || !imageNaturalDimensions) return null;
    if (effectiveInspectorElement.interaction_type === "none" || !effectiveInspectorElement.touch_bounds) return null;
    const touchPx = getEffectiveTouchPixelBounds(effectiveInspectorElement, imageNaturalDimensions.width, imageNaturalDimensions.height);
    if (!touchPx) return null;
    return calculateAreaMetrics(
      touchPx,
      imageNaturalDimensions.width,
      imageNaturalDimensions.height,
      logicalMapping,
      effectiveInspectorElement.physical_geometry?.ppi,
      effectiveInspectorElement.physical_geometry?.calibration_quality,
      effectiveInspectorElement.physical_geometry?.is_calibrated
    );
  }, [effectiveInspectorElement, imageNaturalDimensions, logicalMapping]);

  const activeNearestTouchTarget = useMemo<NearestTouchTargetResult | null>(() => {
    if (!effectiveActiveElement || !imageNaturalDimensions) return null;
    if (effectiveActiveElement.interaction_type === "none" || !effectiveActiveElement.touch_bounds) return null;
    const mmPerPx = effectiveActiveElement.physical_geometry?.ppi
      ? 25.4 / effectiveActiveElement.physical_geometry.ppi
      : undefined;
    return calculateNearestTouchTarget(
      effectiveActiveElement,
      manualElements,
      imageNaturalDimensions.width,
      imageNaturalDimensions.height,
      logicalMapping,
      mmPerPx
    );
  }, [effectiveActiveElement, manualElements, imageNaturalDimensions, logicalMapping]);

  const inspectorNearestTouchTarget = useMemo<NearestTouchTargetResult | null>(() => {
    if (!effectiveInspectorElement || !imageNaturalDimensions) return null;
    if (effectiveInspectorElement.interaction_type === "none" || !effectiveInspectorElement.touch_bounds) return null;
    const mmPerPx = effectiveInspectorElement.physical_geometry?.ppi
      ? 25.4 / effectiveInspectorElement.physical_geometry.ppi
      : undefined;
    return calculateNearestTouchTarget(
      effectiveInspectorElement,
      manualElements,
      imageNaturalDimensions.width,
      imageNaturalDimensions.height,
      logicalMapping,
      mmPerPx
    );
  }, [effectiveInspectorElement, manualElements, imageNaturalDimensions, logicalMapping]);

  const activeWcagSpacing = useMemo<WcagSpacingEvaluation | null>(() => {
    if (!effectiveActiveElement || !imageNaturalDimensions || !logicalMapping || logicalMapping.unit !== "css_px") return null;
    if (effectiveActiveElement.interaction_type === "none" || !effectiveActiveElement.touch_bounds) return null;
    return evaluateWcagTargetSpacingCondition(
      effectiveActiveElement,
      manualElements,
      imageNaturalDimensions.width,
      imageNaturalDimensions.height,
      logicalMapping
    );
  }, [effectiveActiveElement, manualElements, imageNaturalDimensions, logicalMapping]);

  const inspectorWcagSpacing = useMemo<WcagSpacingEvaluation | null>(() => {
    if (!effectiveInspectorElement || !imageNaturalDimensions || !logicalMapping || logicalMapping.unit !== "css_px") return null;
    if (effectiveInspectorElement.interaction_type === "none" || !effectiveInspectorElement.touch_bounds) return null;
    return evaluateWcagTargetSpacingCondition(
      effectiveInspectorElement,
      manualElements,
      imageNaturalDimensions.width,
      imageNaturalDimensions.height,
      logicalMapping
    );
  }, [effectiveInspectorElement, manualElements, imageNaturalDimensions, logicalMapping]);

  const inspectorCapabilities = useMemo(() => {
    if (!effectiveInspectorElement || !imageNaturalDimensions) return null;
    return resolveAllCapabilities(
      {
        imageWidth: imageNaturalDimensions.width,
        imageHeight: imageNaturalDimensions.height,
        imageName,
        calibrationMode: effectiveInspectorElement.calibration_mode || calibrationMode,
        croppedScaleMode,
        originalImageReferenceWidth: originalFullImageWidthInput ? parseInt(originalFullImageWidthInput, 10) : undefined,
        displaySize: resolvedDisplayParams.displaySize,
        resolution: resolvedDisplayParams.resolution,
        logicalMapping,
        calibration: effectiveInspectorElement.physical_geometry
      },
      effectiveInspectorElement
    );
  }, [
    effectiveInspectorElement,
    imageNaturalDimensions,
    imageName,
    calibrationMode,
    croppedScaleMode,
    originalFullImageWidthInput,
    resolvedDisplayParams,
    logicalMapping
  ]);

  const currentCapabilityContext: CapabilityContext = useMemo(() => {
    return {
      imageWidth: imageNaturalDimensions?.width,
      imageHeight: imageNaturalDimensions?.height,
      imageName,
      calibrationMode,
      croppedScaleMode,
      originalImageReferenceWidth: originalFullImageWidthInput ? parseInt(originalFullImageWidthInput, 10) : undefined,
      displaySize: resolvedDisplayParams.displaySize,
      resolution: resolvedDisplayParams.resolution,
      logicalMapping,
      calibration: activeElement?.physical_geometry
    };
  }, [
    imageNaturalDimensions,
    imageName,
    calibrationMode,
    croppedScaleMode,
    originalFullImageWidthInput,
    resolvedDisplayParams,
    logicalMapping,
    activeElement?.physical_geometry
  ]);

  const workspaceCapabilities = useMemo(() => {
    return resolveAllCapabilities(currentCapabilityContext, null);
  }, [currentCapabilityContext]);

  const activeElementCapabilities = useMemo(() => {
    if (!activeElement) return null;
    return resolveAllCapabilities(currentCapabilityContext, activeElement);
  }, [currentCapabilityContext, activeElement]);

  const handleOpenParamsModal = (
    section: EvaluationParametersSection = "evaluation_context"
  ) => {
    if (isTouchEditMode) {
      handleCancelTouchEdit();
    }
    setParamsModalInitialSection(section);
    setIsParamsModalOpen(true);
  };

  const paramsModalData: EvaluationParametersData = useMemo(() => {
    return {
      calibrationMode,
      croppedScaleMode,
      originalImageReferenceWidth: originalFullImageWidthInput ? parseInt(originalFullImageWidthInput, 10) : undefined,
      allowEstimation: globalAllowEstimation,
      deviceProfile: form.deviceProfile || "default",
      displaySize: form.displaySize || "6.1 inch",
      resolution: form.resolution || "390x844",
      customDisplaySize,
      customResolution,
      viewingDistance: form.distance || "30cm",
      scenario: form.scenario || "",
      scenarioDomain: form.scenarioDomain,
      scenarioDomainUserOverridden: form.scenarioDomainUserOverridden,
      userGroups: form.userGroups || [],
      ruleSets: form.ruleSets || [],
      dimensions: form.dimensions || [],
      designInfoStatus,
      targetPlatform: mappingPlatform,
      logicalUnit: mappingUnit,
      logicalReferenceWidth: logicalRefWidthInput ? parseInt(logicalRefWidthInput, 10) : 0,
      imageReferenceWidth: imageRefWidthInput ? parseInt(imageRefWidthInput, 10) : (imageNaturalDimensions?.width || 0),
      contextEnvironment,
      contextOperationState
    };
  }, [
    calibrationMode,
    croppedScaleMode,
    originalFullImageWidthInput,
    globalAllowEstimation,
    form.deviceProfile,
    form.displaySize,
    form.resolution,
    customDisplaySize,
    customResolution,
    form.distance,
    form.scenario,
    form.scenarioDomain,
    form.scenarioDomainUserOverridden,
    form.userGroups,
    form.ruleSets,
    form.dimensions,
    designInfoStatus,
    mappingPlatform,
    mappingUnit,
    logicalRefWidthInput,
    imageRefWidthInput,
    imageNaturalDimensions,
    contextEnvironment,
    contextOperationState
  ]);

  const handleSaveParameters = (data: EvaluationParametersData) => {
    setCalibrationMode(data.calibrationMode);
    setCroppedScaleMode(data.croppedScaleMode);
    setOriginalFullImageWidthInput(data.originalImageReferenceWidth ? String(data.originalImageReferenceWidth) : "");
    setGlobalAllowEstimation(data.allowEstimation || false);
    setForm((prev) => ({
      ...prev,
      deviceProfile: data.deviceProfile,
      displaySize: data.displaySize,
      resolution: data.resolution,
      distance: data.viewingDistance,
      scenario: data.scenario,
      scenarioDomain: data.scenarioDomain,
      scenarioDomainUserOverridden: data.scenarioDomainUserOverridden,
      userGroups: data.userGroups,
      ruleSets: data.ruleSets,
      dimensions: data.dimensions
    }));
    setCustomDisplaySize(data.customDisplaySize);
    setCustomResolution(data.customResolution);
    setDesignInfoStatus(data.designInfoStatus);
    setContextEnvironment(data.contextEnvironment || "");
    setContextOperationState(data.contextOperationState || "");
    setMappingPlatform(data.targetPlatform);
    setMappingUnit(data.logicalUnit);
    setLogicalRefWidthInput(data.logicalReferenceWidth ? String(data.logicalReferenceWidth) : "");
    setImageRefWidthInput(data.imageReferenceWidth ? String(data.imageReferenceWidth) : "");

    if (data.designInfoStatus === "unknown") {
      setLogicalMapping(undefined);
    } else if (data.designInfoStatus === "partial") {
      const devLogicalW = getDeviceLogicalWidth(data.deviceProfile, data.targetPlatform);
      if (devLogicalW && devLogicalW > 0) {
        const refImgW = data.imageReferenceWidth || imageNaturalDimensions?.width || devLogicalW;
        const mapping = createLogicalUnitMapping(
          data.targetPlatform,
          data.logicalUnit,
          refImgW,
          devLogicalW,
          undefined,
          undefined,
          "exact_profile"
        );
        setLogicalMapping(mapping || undefined);
      } else {
        setLogicalMapping(undefined);
      }
    } else if (data.logicalReferenceWidth > 0) {
      const refImgW =
        data.calibrationMode === "cropped" &&
        data.croppedScaleMode === "preserved_pixel_scale" &&
        data.originalImageReferenceWidth &&
        data.originalImageReferenceWidth > 0
          ? data.originalImageReferenceWidth
          : data.imageReferenceWidth || imageNaturalDimensions?.width || 0;

      if (refImgW > 0) {
        if (data.calibrationMode === "cropped" && data.croppedScaleMode === "preserved_pixel_scale") {
          const mapping = createCroppedPreservedScaleMapping(
            data.targetPlatform,
            data.logicalUnit,
            refImgW,
            data.logicalReferenceWidth,
            "user_specified"
          );
          setLogicalMapping(mapping || undefined);
        } else {
          const mapping = createLogicalUnitMapping(
            data.targetPlatform,
            data.logicalUnit,
            refImgW,
            data.logicalReferenceWidth,
            undefined,
            undefined,
            "user_specified"
          );
          setLogicalMapping(mapping || undefined);
        }
      } else {
        setLogicalMapping(undefined);
      }
    } else {
      setLogicalMapping(undefined);
    }
  };

  const evaluationContext: DerivedEvaluationContext = useMemo(() => ({
    imageNaturalWidth: imageNaturalDimensions?.width || 0,
    imageNaturalHeight: imageNaturalDimensions?.height || 0,
    calibrationMode,
    croppedScaleMode,
    originalImageReferenceWidth: originalFullImageWidthInput ? parseInt(originalFullImageWidthInput, 10) : undefined,
    allowEstimation: globalAllowEstimation,
    displaySize: resolvedDisplayParams.displaySize,
    resolution: resolvedDisplayParams.resolution,
    viewingDistance: form.distance,
    logicalMapping,
    contextEnvironment,
    contextOperationState,
    userGroups: form.userGroups,
    scenario: form.scenario,
    scenarioDomain: form.scenarioDomain,
    ruleSets: form.ruleSets,
    dimensions: form.dimensions
  }), [
    imageNaturalDimensions,
    calibrationMode,
    croppedScaleMode,
    originalFullImageWidthInput,
    globalAllowEstimation,
    resolvedDisplayParams,
    form.distance,
    logicalMapping,
    contextEnvironment,
    contextOperationState,
    form.userGroups,
    form.scenario,
    form.scenarioDomain,
    form.ruleSets,
    form.dimensions
  ]);

  const buildReportData = useCallback(
    (filter: ReportFilter = "all"): ReportSummaryData | null => {
      const dimensions = imageNaturalDimensions || { width: 0, height: 0 };
      const freshElements = manualElements;

      const activeImg: HTMLImageElement | null = imageRef.current;

      let fullEvidenceScreenshotDataUrl = "";
      if (activeImg) {
        try {
          fullEvidenceScreenshotDataUrl = generateNumberedEvidenceScreenshotDataUrl(
            activeImg,
            freshElements,
            resultTargetElementId || activeElementId
          );
        } catch {}
      }

      const allItems: ReportElementItem[] = freshElements.map((el, index) => {
        const nearest = imageNaturalDimensions
          ? calculateNearestTouchTarget(el, freshElements, imageNaturalDimensions.width, imageNaturalDimensions.height, logicalMapping)
          : null;
        const presentation = buildElementPresentationModel(
          el,
          evaluationContext,
          nearest,
          mappingPlatform,
          freshElements,
          locale
        );
        const scenarioScope = deriveScenarioScope(form.scenario, contextEnvironment, contextOperationState, form.scenarioDomain);
        const targetSizeTrace = el.interaction_type !== "none" ? buildTargetSizeTrace(el, logicalMapping, undefined, mappingPlatform) : null;
        const touchPhysicalTrace = el.interaction_type !== "none" && imageNaturalDimensions ? buildTouchPhysicalTrace(el, scenarioScope, mmPerPixel, el.calibration_mode || calibrationMode, imageNaturalDimensions.width, imageNaturalDimensions.height, locale) : null;
        const contrastTrace = el.contrast_evaluation ? buildContrastTrace(el.contrast_evaluation) : null;
        const textSizeTrace = el.element_type === "text" ? buildTextSizeTrace(el.text_size_evaluation, logicalMapping, mappingPlatform) : null;
        const spacingTrace = el.interaction_type !== "none" && nearest ? buildSpacingTrace(nearest, logicalMapping, el, contextOperationState, locale) : null;
        const physicalTrace = buildPhysicalGeometryTrace(el, el.calibration_mode || calibrationMode, locale);
        const charVaTrace = el.element_type === "text" ? buildCharacterVisualAngleTrace(el, scenarioScope, undefined, form.distance, locale) : null;
        const graphicVaTrace = el.element_type === "icon" ? buildGraphicalVisualAngleTrace(el, scenarioScope, undefined, form.distance, locale) : null;

        const { mainTraces, moreMeasurements } = sortAndPartitionRuleTraces([
          targetSizeTrace,
          touchPhysicalTrace,
          contrastTrace,
          textSizeTrace,
          spacingTrace,
          physicalTrace,
          charVaTrace,
          graphicVaTrace
        ]);

        let thumbnailDataUrl = elementThumbnails[el.element_id] || "";
        if (!thumbnailDataUrl && activeImg && dimensions.width > 0 && dimensions.height > 0) {
          try {
            thumbnailDataUrl = generateElementThumbnailDataUrl(activeImg, el, index, dimensions);
          } catch {}
        }

        return {
          index: index + 1,
          elementId: el.element_id,
          label: el.label || (locale === "en" ? `Element #${index + 1}` : `元素 #${index + 1}`),
          elementType: el.element_type,
          elementTypeLabel: presentation.elementTypeLabel,
          highestTier: presentation.highestTier,
          highestTierLabel: presentation.highestTierLabel,
          conclusion: presentation.conclusion,
          conclusionState: presentation.conclusionState,
          conclusionStateLabel: presentation.conclusionStateLabel,
          actionableFindings: presentation.actionableFindings,
          perspectives: presentation.unifiedExplanation?.perspectives,
          ruleTraces: [...mainTraces, ...moreMeasurements],
          needsAttention: (presentation.actionableFindings || []).some((f) => f.severity === "below_threshold" || f.severity === "below_recommended"),
          visualDimensionsDisplay: presentation.visualPxDisplay,
          characterHeightDisplay: presentation.characterHeightVisualAngleDisplay,
          characterHeightDesignDisplay: presentation.textDesignHeightDisplay,
          characterHeightPhysicalDisplay: presentation.textPhysicalHeightDisplay,
          characterHeightVisualAngleDisplay: presentation.textVisualAngleDisplay,
          estimatedTextSizeDisplay: presentation.estimatedTextSizeDisplay,
          estimatedTextSizeSourceLabel: presentation.estimatedTextSizeSourceLabel,
          touchDimensionsDisplay: presentation.touchDimensionsDisplay,
          touchProvenance: presentation.touchProvenanceLabel,
          nearestSpacingDisplay: presentation.nearestSpacingDisplay,
          contrastDisplay: presentation.contrastRatioDisplay,
          physicalDimensionsDisplay: presentation.physicalDisplay,
          visualAngleDisplay: presentation.visualAngleDisplay,
          visualAngleViewingDistanceDisplay: presentation.visualAngleViewingDistanceDisplay,
          visualAngleTextSemanticNote: presentation.visualAngleTextSemanticNote,
          moreMeasurements,
          thumbnailDataUrl
        };
      });

      // 1. Structured Evaluation Context (Locale-Aware)
      const domainLabelsZh: Record<string, string> = {
        mobile: "移动设备与手持 (Mobile)",
        automotive: "车载界面 (Automotive HMI)",
        web: "桌面与网页 (Desktop / Web)",
        desktop: "桌面与网页 (Desktop / Web)",
        unknown: "通用 / 未指定"
      };
      const domainLabelsEn: Record<string, string> = {
        mobile: "Mobile / Handheld",
        automotive: "Automotive HMI",
        web: "Desktop / Web",
        desktop: "Desktop / Web",
        unknown: "General / Unspecified"
      };
      const currentDomain = form.scenarioDomain || "unknown";
      const domainDisplay = (locale === "en" ? domainLabelsEn : domainLabelsZh)[currentDomain] || (locale === "en" ? "General / Unspecified" : "通用 / 未指定");

      const resolvedDistanceMm = parseViewingDistanceMm(form.distance);
      let viewingDistanceDisplay = locale === "en" ? "Unspecified" : "未指定";
      if (form.distance && form.distance !== "未指定" && form.distance !== "Unspecified") {
        const raw = form.distance.trim();
        if (resolvedDistanceMm) {
          const rawClean = raw.replace(/\s+/g, "").toLowerCase();
          const stdClean = `${resolvedDistanceMm}mm`;
          if (rawClean === stdClean || rawClean === String(resolvedDistanceMm)) {
            viewingDistanceDisplay = `${resolvedDistanceMm} mm`;
          } else {
            viewingDistanceDisplay = `${raw} (${resolvedDistanceMm} mm)`;
          }
        } else {
          viewingDistanceDisplay = raw;
        }
      }

      const screenHardwareDisplay = form.displaySize || form.resolution
        ? `${form.displaySize || (locale === "en" ? "Unspecified Size" : "未指定尺寸")} · ${form.resolution || (locale === "en" ? "Unspecified Resolution" : "未指定分辨率")}`
        : (locale === "en" ? "Unspecified" : "未指定");

      const screenshotScopeDisplay = calibrationMode === "cropped"
        ? (croppedScaleMode === "preserved_pixel_scale" && originalFullImageWidthInput
            ? (locale === "en"
                ? `Cropped (1:1 scale preserved, full-screen ref width ${originalFullImageWidthInput} px)`
                : `局部截图（保持 1:1 比例，全屏参考宽 ${originalFullImageWidthInput} px）`)
            : (locale === "en" ? "Cropped / Partial (Scale unknown)" : "局部截图（比例未知）"))
        : (locale === "en" ? "Full Screen Capture" : "完整屏幕 / 界面");

      const designBasisDisplay = logicalMapping && logicalMapping.scale_x > 0
        ? (locale === "en"
            ? `Provided (${logicalMapping.unit}, scale ratio ${formatScaleRatio(logicalMapping, "en")})`
            : `已提供 (${logicalUnitLabels[logicalMapping.unit]}，换算比例 ${formatScaleRatio(logicalMapping, "zh-CN")})`)
        : (locale === "en" ? "Unavailable" : "未提供");

      let targetPlatformDisplay = locale === "en" ? "Unspecified" : "未指定";
      if (logicalMapping && logicalMapping.scale_x > 0) {
        targetPlatformDisplay = mappingPlatform === "ios"
          ? "Apple iOS (pt)"
          : mappingPlatform === "android"
          ? "Google Android (dp)"
          : mappingPlatform === "web"
          ? (locale === "en" ? "Web Standard (CSS px)" : "Web 标准 (CSS px)")
          : mappingPlatform === "custom"
          ? (locale === "en" ? "Custom Unit" : "自定义单位设计")
          : (locale === "en" ? "Unknown Platform" : "未知平台");
      } else if (mappingPlatform && mappingPlatform !== "unknown") {
        const platLabel = mappingPlatform === "ios"
          ? "Apple iOS (pt)"
          : mappingPlatform === "android"
          ? "Google Android (dp)"
          : mappingPlatform === "web"
          ? (locale === "en" ? "Web Standard (CSS px)" : "Web 标准 (CSS px)")
          : mappingPlatform === "custom"
          ? (locale === "en" ? "Custom Unit" : "自定义单位")
          : mappingPlatform;
        targetPlatformDisplay = locale === "en"
          ? `${platLabel} (Platform identified, design basis unavailable)`
          : `${platLabel}（平台已知，但暂无设计尺寸换算依据）`;
      }

      const evalContextObj: ReportEvaluationContext = {
        domain: currentDomain,
        domainLabel: domainDisplay,
        viewingDistanceDisplay,
        screenHardwareDisplay,
        screenshotScopeDisplay,
        designBasisDisplay,
        targetPlatformDisplay
      };

      // 2. Actual Evaluation Scope & References Aggregation
      const completedScopeSet = new Set<string>();
      const pendingScopeSet = new Set<string>();
      const completedReferencesSet = new Set<string>();
      const pendingReferencesSet = new Set<string>();

      const platPrefix = mappingPlatform === "android"
        ? "Android "
        : mappingPlatform === "ios"
        ? "iOS "
        : mappingPlatform === "web"
        ? "Web "
        : "";

      freshElements.forEach((el) => {
        const isInteractive = el.interaction_type !== "none";
        const nearest = imageNaturalDimensions
          ? calculateNearestTouchTarget(el, freshElements, imageNaturalDimensions.width, imageNaturalDimensions.height, logicalMapping)
          : null;
        const scenarioScope = deriveScenarioScope(form.scenario, contextEnvironment, contextOperationState, form.scenarioDomain);
        const targetSizeTrace = isInteractive ? buildTargetSizeTrace(el, logicalMapping, undefined, mappingPlatform) : null;
        const touchPhysicalTrace = isInteractive && imageNaturalDimensions ? buildTouchPhysicalTrace(el, scenarioScope, mmPerPixel, el.calibration_mode || calibrationMode, imageNaturalDimensions.width, imageNaturalDimensions.height, locale) : null;
        const contrastTrace = el.contrast_evaluation ? buildContrastTrace(el.contrast_evaluation) : null;
        const textSizeTrace = el.element_type === "text" ? buildTextSizeTrace(el.text_size_evaluation, logicalMapping, mappingPlatform) : null;
        const spacingTrace = isInteractive && nearest ? buildSpacingTrace(nearest, logicalMapping, el, contextOperationState, locale) : null;
        const charVaTrace = el.element_type === "text"
          ? buildCharacterVisualAngleTrace(el, scenarioScope, undefined, form.distance, locale)
          : null;
        const graphicVaTrace = el.element_type === "icon" || el.text_visual_measurement_target === "symbol"
          ? buildGraphicalVisualAngleTrace(el, scenarioScope, undefined, form.distance, locale)
          : null;

        const isCompletedVerdict = (verdict?: string) =>
          verdict === "below_threshold" || verdict === "below_recommended" || verdict === "meets_reference";

        // Contrast
        if (contrastTrace) {
          if (isCompletedVerdict(contrastTrace.verdict)) {
            completedScopeSet.add(locale === "en" ? "Color Contrast" : "色彩对比");
          } else if (contrastTrace.verdict === "needs_info") {
            pendingScopeSet.add(locale === "en" ? "Color Contrast (Sample colors required)" : "色彩对比 (需采样前背景色)");
          }
        }

        // Text Size
        if (textSizeTrace) {
          if (isCompletedVerdict(textSizeTrace.verdict)) {
            completedScopeSet.add(locale === "en" ? `${platPrefix}Typography Size` : `${platPrefix}文字字号`);
          } else if (textSizeTrace.verdict === "needs_info") {
            pendingScopeSet.add(locale === "en" ? `${platPrefix || "Platform "}Typography Size` : `${platPrefix || "平台"}文字字号`);
          }
        }

        // Character Visual Angle
        if (charVaTrace) {
          if (isCompletedVerdict(charVaTrace.verdict)) {
            completedScopeSet.add(locale === "en" ? "Visual Angle (Typography)" : "人因视角 (文字)");
          } else if (charVaTrace.verdict === "needs_info") {
            pendingScopeSet.add(locale === "en" ? "Visual Angle (Screen hardware & distance required)" : "人因视角 (需屏幕参数与距离)");
          }
        }

        // Graphical Visual Angle
        if (graphicVaTrace) {
          if (isCompletedVerdict(graphicVaTrace.verdict)) {
            completedScopeSet.add(locale === "en" ? "Visual Angle (Graphics)" : "人因视角 (图形)");
          } else if (graphicVaTrace.verdict === "needs_info") {
            pendingScopeSet.add(locale === "en" ? "Visual Angle (Screen hardware & distance required)" : "人因视角 (需屏幕参数与距离)");
          }
        }

        // Physical Touch Size
        if (touchPhysicalTrace) {
          if (isCompletedVerdict(touchPhysicalTrace.verdict)) {
            completedScopeSet.add(locale === "en" ? "Physical Touch Size" : "物理触控目标");
          } else if (touchPhysicalTrace.verdict === "needs_info") {
            pendingScopeSet.add(locale === "en" ? "Physical Touch Size (Screen hardware specs required)" : "物理触控目标 (需屏幕硬件参数)");
          }
        }

        // Platform Target Size
        if (targetSizeTrace) {
          if (isCompletedVerdict(targetSizeTrace.verdict)) {
            completedScopeSet.add(locale === "en" ? `${platPrefix}Touch Target Size` : `${platPrefix}平台触控目标`);
          } else if (targetSizeTrace.verdict === "needs_info") {
            pendingScopeSet.add(locale === "en" ? `${platPrefix || "Platform "}Touch Target Size` : `${platPrefix || "平台"}触控目标`);
          }
        }

        // Touch Spacing
        if (spacingTrace) {
          if (isCompletedVerdict(spacingTrace.verdict)) {
            completedScopeSet.add(locale === "en" ? "Touch Spacing" : "相邻触控间距");
          }
        }

        // References aggregation
        const allTraces = [targetSizeTrace, touchPhysicalTrace, contrastTrace, textSizeTrace, spacingTrace, charVaTrace, graphicVaTrace];
        allTraces.forEach((t) => {
          if (!t || t.verdict === "not_applicable") return;
          const rId = t.ruleId || "";
          const rTitle = t.ruleTitle || "";
          let refName = "";
          if (rId.includes("WCAG") || rTitle.includes("WCAG")) {
            refName = "WCAG 2.2";
          } else if (rId.includes("APPLE") || rTitle.includes("Apple HIG") || rTitle.includes("Apple")) {
            refName = "Apple HIG (iOS)";
          } else if (rId.includes("ANDROID") || rTitle.includes("Android")) {
            refName = "Android Accessibility";
          } else if (rId.includes("AUTO") || rTitle.includes("NHTSA") || rTitle.includes("车载人因")) {
            refName = locale === "en" ? "Automotive Human Factors" : "车载人因参考";
          } else if (rId.includes("REF-HF") || rTitle.includes("通用人因") || rTitle.includes("Human Factors")) {
            refName = locale === "en" ? "Human Factors Reference" : "通用人因参考";
          } else if (rTitle) {
            refName = rTitle;
          }

          if (refName) {
            if (isCompletedVerdict(t.verdict)) {
              completedReferencesSet.add(refName);
            } else if (t.verdict === "needs_info") {
              pendingReferencesSet.add(refName);
            }
          }
        });
      });

      const completedEvaluationScope = Array.from(completedScopeSet);
      const pendingEvaluationScope = Array.from(pendingScopeSet).filter((s) => !completedScopeSet.has(s));
      const actualReferencesUsed = Array.from(completedReferencesSet);
      const pendingReferences = Array.from(pendingReferencesSet).filter((r) => !completedReferencesSet.has(r));

      // 3. Assumptions summary
      const assumptions: string[] = [];
      if (locale === "en") {
        if (form.displaySize || form.resolution) {
          assumptions.push(`Screen Hardware: ${form.displaySize || "Unspecified size"} · ${form.resolution || "Unspecified resolution"} (Used for physical millimeter calculation)`);
        }
        if (form.distance && form.distance !== "未指定" && form.distance !== "Unspecified") {
          assumptions.push(`Viewing Distance: ${viewingDistanceDisplay} (Used for visual angle calculation)`);
        }
        if (logicalMapping && logicalMapping.scale_x > 0) {
          assumptions.push(`Design Basis: ${logicalMapping.unit} (Scale ratio ${formatScaleRatio(logicalMapping, "en")})`);
        } else {
          assumptions.push("Design Basis: Unavailable (Evaluates screenshot facts and human factors references without platform design scaling)");
        }
        if (calibrationMode === "cropped") {
          assumptions.push("Screenshot Scope: Cropped / Partial (Area metrics presented as share of current screenshot)");
        } else {
          assumptions.push("Screenshot Scope: Full-screen (Area metrics presented as screen share)");
        }
      } else {
        if (form.displaySize || form.resolution) {
          assumptions.push(`屏幕硬件参数：${form.displaySize || "未指定尺寸"} · ${form.resolution || "未指定分辨率"}（用于物理毫米估算）`);
        }
        if (form.distance && form.distance !== "未指定") {
          assumptions.push(`观看距离参数：${viewingDistanceDisplay}（用于人因视觉角估算）`);
        }
        if (logicalMapping && logicalMapping.scale_x > 0) {
          assumptions.push(`设计尺寸基准：${logicalUnitLabels[logicalMapping.unit]}（换算比例 ${formatScaleRatio(logicalMapping, "zh-CN")}）`);
        } else {
          assumptions.push("设计尺寸基准：未提供（仅执行截图事实测量与无设计基准下的人因参考评估）");
        }
        if (calibrationMode === "cropped") {
          assumptions.push("截图模式：局部截图（面积指标按当前截图占比呈现）");
        } else {
          assumptions.push("截图模式：完整屏幕 / 界面（面积指标按屏幕占比呈现）");
        }
      }

      const totalElementsCount = allItems.length;
      const attentionCount = allItems.filter((i) => i.needsAttention).length;
      const filteredElements = filter === "attention_only" ? allItems.filter((i) => i.needsAttention) : allItems;

      return {
        title: locale === "en" ? "UX Evaluation Tool — Visual Evidence Report" : "UX Evaluation Tool 评估报告",
        generatedAt: new Date().toLocaleString(locale === "en" ? "en-US" : "zh-CN"),
        imageName: imageName || (locale === "en" ? "Untitled Design Image" : "未命名设计图"),
        imageNaturalDimensions: dimensions,
        screenshotScope: calibrationMode,
        screenshotScopeLabel: calibrationMode === "cropped" ? (locale === "en" ? "Cropped / Partial" : "局部截图") : (locale === "en" ? "Full-screen" : "完整屏幕 / 界面"),
        totalElementsCount,
        attentionCount,
        filter,
        dimensions: form.dimensions,
        contextEnvironment,
        contextOperationState,
        assumptions,
        evaluationContext: evalContextObj,
        actualEvaluationScope: completedEvaluationScope,
        completedEvaluationScope,
        pendingEvaluationScope,
        actualReferencesUsed,
        pendingReferences,
        fullEvidenceScreenshotDataUrl,
        elements: filteredElements
      };
    },
    [
      manualElements,
      imageNaturalDimensions,
      evaluationContext,
      logicalMapping,
      mappingPlatform,
      calibrationMode,
      croppedScaleMode,
      originalFullImageWidthInput,
      resolvedDisplayParams,
      designInfoStatus,
      form,
      imageName,
      mappingUnit,
      contextEnvironment,
      contextOperationState,
      locale,
      imageUrl,
      resultTargetElementId,
      activeElementId,
      mmPerPixel
    ]
  );


  const runAnalysis = async () => {
    if (!imageUrl || !imageNaturalDimensions) {
      alert(
        locale === "en"
          ? "Upload or restore an image first.\nExample annotations need an image to be displayed."
          : "请先上传或恢复一张图片。\n示例元素框需要基于当前图片显示。"
      );
      return;
    }

    const normalizedForm: AnalysisInput = {
      ...form,
      deviceType: form.deviceType === "自定义" ? customDisplaySize || form.deviceType : form.deviceType,
      displaySize: form.displaySize === "自定义" ? customDisplaySize || form.displaySize : form.displaySize,
      resolution: form.resolution === "自定义" ? customResolution || form.resolution : form.resolution,
      distance: form.distance === "自定义" ? form.distance : form.distance,
      scenario: form.scenario
    };

    const result = await analyzeDesign(normalizedForm);
    setAnnotations(result.annotations);
    setActiveAnnotationId(result.annotations[0]?.annotation_id || "");
    setIsDetailOpen(false);
    setShowDemoResults(true);

    const session: EvaluationSession = {
      session_id: "session-" + Date.now(),
      input: {
        image: imageUrl || "local-upload",
        device: normalizedForm.deviceType + " / " + normalizedForm.displaySize + " / " + normalizedForm.resolution,
        distance: normalizedForm.distance,
        user_group: normalizedForm.userGroups
      },
      rule_set_version: "v0.1-mock",
      annotations: result.annotations,
      summary: locale === "en" ? ("Found " + result.annotations.length + " findings (demo)") : ("共发现 " + result.annotations.length + " 个问题（示例）"),
      created_at: new Date().toISOString()
    };

    setCurrentSession(session);
  };

  const selectedGroups = useMemo(() => form.userGroups.join("、"), [form.userGroups]);

  const onDeviceProfileChange = (deviceProfile: DeviceProfileKey) => {
    const profile = deviceProfiles[deviceProfile];
    setForm({
      ...form,
      deviceProfile,
      displaySize: profile.defaultDisplaySize,
      resolution: profile.defaultResolution,
      distance: profile.defaultViewingDistance,
      scenario: profile.defaultUsageContext
    });
  };

  const toggleListValue = (key: "userGroups" | "ruleSets" | "dimensions", value: string) => {
    const selected = form[key];
    setForm({
      ...form,
      [key]: selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]
    });
  };

  const handleSelectMockFinding = (annotationId: string) => {
    setActiveAnnotationId(annotationId);
    setIsDetailOpen(true);
  };

  const handleSelectManualElement = (elementId: string, source: "canvas" | "inspector" | "creation" = "canvas") => {
    const isSwitchingElement = activeElementId !== elementId;
    if (isTouchEditMode && isSwitchingElement) {
      if (activeElement && touchEditSnapshot) {
        const reverted = revertTouchEditDraft(activeElement, touchEditSnapshot);
        updateManualElement(activeElement.element_id, reverted);
      }
      setIsTouchEditMode(false);
      setTouchEditSnapshot(null);
      setTouchInteraction({ type: "idle" });
    }
    setActiveElementId(elementId);
    setIsElementInspectorOpen(true);
    setIsAddingElement(false);
    setColorSamplingTarget(null);

    if (isSwitchingElement) {
      setTimeout(() => {
        inspectorScrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      }, 50);
    }

    if (source === "inspector") {
      const annEl = document.getElementById("manual-ann-" + elementId);
      if (annEl) {
        annEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
      }
    }
  };

  const handleOpenElementInspector = (elementId: string) => {
    handleSelectManualElement(elementId, "inspector");
  };

  const handleOpenReportPreview = (filter: ReportFilter = reportFilter) => {
    if (isTouchEditMode) {
      if (activeElement && touchEditSnapshot) {
        const reverted = revertTouchEditDraft(activeElement, touchEditSnapshot);
        updateManualElement(activeElement.element_id, reverted);
      }
      setIsTouchEditMode(false);
      setTouchEditSnapshot(null);
      setTouchInteraction({ type: "idle" });
    }
    const data = buildReportData(filter);
    setReportData(data);
    setReportFilter(filter);
    setIsReportPreviewOpen(true);
  };

  const handleFilterReport = (filter: ReportFilter) => {
    setReportFilter(filter);
    const data = buildReportData(filter);
    setReportData(data);
  };

  const handleExportHtmlReport = () => {
    if (!reportData) return;
    const html = generateSelfContainedHtmlReport(reportData, locale);
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const timeStr = new Date().toTimeString().slice(0, 5).replace(/:/g, "");
    const filename = `ux-evaluation-report-${dateStr}-${timeStr}.html`;
    downloadHtmlFile(html, filename);
  };

  const updateManualElement = useCallback(
    (elementId: string, partial: Partial<DesignElement>) => {
      setManualElements((prev) =>
        prev.map((el) => {
          if (el.element_id !== elementId) return el;
          const updated: DesignElement = { ...el, ...partial, last_modified_source: "manual" };

          // If element is text, handle typography defaults, estimation, and user edits
          if (updated.element_type === "text") {
            if (!updated.text_layout) updated.text_layout = "single_line";
            if (!updated.text_role) updated.text_role = "body";
            if (!updated.text_weight_category) updated.text_weight_category = "regular";
            if (!updated.text_visual_measurement_target) {
              updated.text_visual_measurement_target = updated.text_layout === "multi_line" ? "whole_text_bounds" : "single_rendered_line";
            }

            // If user explicitly edited text_size_value, mark as user_confirmed
            if (partial.text_size_value !== undefined && partial.text_size_source === undefined) {
              updated.text_size_source = "user_confirmed";
            }

            // Auto estimation for single line or single rendered line if source is estimated_from_visual_bounds
            const isSingleLine = updated.text_visual_measurement_target === "single_rendered_line" ||
              (updated.text_layout === "single_line" && updated.text_visual_measurement_target !== "whole_text_bounds");

            if (
              (updated.text_size_source === "estimated_from_visual_bounds" || !updated.text_size_source) &&
              isSingleLine
            ) {
              if (partial.image_pixel_bounds || partial.normalized_bounds || updated.text_size_value === undefined) {
                const est = estimateTextSizeFromVisualBounds(updated.image_pixel_bounds, logicalMapping);
                if (est) {
                  updated.text_size_value = est.value;
                  updated.text_size_unit = est.unit;
                  updated.text_size_source = "estimated_from_visual_bounds";
                }
              }
            } else if (!isSingleLine && updated.text_size_source === "estimated_from_visual_bounds") {
              // Invalidate single-line total-box estimate for multi-line whole container
              updated.text_size_value = undefined;
            }
          } else {
            // Clean up text-specific fields when switching away from text
            updated.text_layout = undefined;
            updated.text_role = undefined;
            updated.text_weight_category = undefined;
            updated.text_size_value = undefined;
            updated.text_size_unit = undefined;
            updated.text_size_source = undefined;
            updated.text_size_category = undefined;
            updated.text_size_evaluation = undefined;
            updated.character_height_px = undefined;
            updated.character_height_source = undefined;
            updated.character_height_physical_mm = undefined;
            updated.character_height_visual_angle = undefined;
          }

          // Handle color state transitions
          if (partial.foreground_color !== undefined && !partial.foreground_color_state) {
            updated.foreground_color_state = partial.foreground_color ? "confirmed" : "missing";
          }
          if (partial.background_color !== undefined && !partial.background_color_state) {
            updated.background_color_state = partial.background_color ? "confirmed" : "missing";
          }

          return recomputeElementDerivedState(updated, evaluationContext);
        })
      );
    },
    [evaluationContext, logicalMapping]
  );

  const deleteManualElement = (elementId: string) => {
    setManualElements((prev) => prev.filter((el) => el.element_id !== elementId));
    if (activeElementId === elementId) {
      setActiveElementId(null);
      setIsElementInspectorOpen(false);
      setIsTouchEditMode(false);
      setTouchEditSnapshot(null);
    }
    setCanvasInteraction({ type: "idle" });
    setTouchInteraction({ type: "idle" });
  };

  // Design Size Basis Form Actions
  const handleApplyLogicalMapping = () => {
    if (calibrationMode === "cropped" && croppedScaleMode === "preserved_pixel_scale") {
      const origW = parseFloat(originalFullImageWidthInput);
      const logW = parseFloat(logicalRefWidthInput);
      if (isNaN(origW) || isNaN(logW) || origW <= 0 || logW <= 0) {
        alert("请输入有效的原完整截图宽度与设计稿宽度数值。");
        return;
      }
      const mapping = createCroppedPreservedScaleMapping(
        mappingPlatform,
        mappingUnit,
        origW,
        logW,
        "user_specified"
      );
      if (mapping) {
        setLogicalMapping(mapping);
        setIsLogicalMappingExpanded(false);
      }
      return;
    }

    const imgW = parseFloat(imageRefWidthInput);
    const logW = parseFloat(logicalRefWidthInput);
    const imgH = imageRefHeightInput ? parseFloat(imageRefHeightInput) : undefined;
    const logH = logicalRefHeightInput ? parseFloat(logicalRefHeightInput) : undefined;

    if (isNaN(imgW) || isNaN(logW) || imgW <= 0 || logW <= 0) {
      alert("请输入有效的参考图像像素与设计稿逻辑宽度数值。");
      return;
    }

    const mapping = createLogicalUnitMapping(
      mappingPlatform,
      mappingUnit,
      imgW,
      logW,
      imgH,
      logH,
      "user_specified"
    );

    if (mapping) {
      setLogicalMapping(mapping);
      setIsLogicalMappingExpanded(false);
    }
  };

  const handlePlatformChange = (platform: TargetPlatform) => {
    setMappingPlatform(platform);
    if (platform === "web") setMappingUnit("css_px");
    else if (platform === "ios") setMappingUnit("pt");
    else if (platform === "android") setMappingUnit("dp");
    else if (platform === "custom") setMappingUnit("pt");
  };

  // Touch Bounds Explicit Application Actions for Active Element
  const handleApplyPlatformReferenceTouchBounds = () => {
    if (!activeElement || !imageNaturalDimensions || !logicalMapping) return;
    const refRes = generateCenteredReferenceTouchBounds(
      activeElement.image_pixel_bounds,
      imageNaturalDimensions.width,
      imageNaturalDimensions.height,
      logicalMapping.platform,
      logicalMapping
    );
    if (refRes) {
      updateManualElement(activeElement.element_id, {
        touch_bounds: refRes.normalized_bounds,
        touch_bounds_pixel: refRes.pixel_bounds,
        touch_bounds_source: "platform_reference",
        touch_bounds_reference_clipped: refRes.is_clipped,
        touch_bounds_reference_warning: refRes.clip_warning,
        copied_from_element_id: undefined,
        copied_from_element_label: undefined
      });
    }
  };

  const handleSetTouchBoundsToVisual = () => {
    if (!activeElement) return;
    updateManualElement(activeElement.element_id, {
      touch_bounds: { ...activeElement.normalized_bounds },
      touch_bounds_pixel: { ...activeElement.image_pixel_bounds },
      touch_bounds_source: "visual_copy",
      touch_bounds_reference_clipped: undefined,
      touch_bounds_reference_warning: undefined,
      copied_from_element_id: undefined,
      copied_from_element_label: undefined
    });
  };

  const handleCopyTouchBoundsFromElement = (sourceElementId: string) => {
    if (!activeElement || !sourceElementId) return;
    const sourceEl = manualElements.find((e) => e.element_id === sourceElementId);
    if (!sourceEl) return;

    const boundsToCopy = sourceEl.touch_bounds || sourceEl.normalized_bounds;
    const pixelToCopy = sourceEl.touch_bounds_pixel || sourceEl.image_pixel_bounds;

    updateManualElement(activeElement.element_id, {
      touch_bounds: { ...boundsToCopy },
      touch_bounds_pixel: { ...pixelToCopy },
      touch_bounds_source: "copied_from_element",
      touch_bounds_reference_clipped: undefined,
      touch_bounds_reference_warning: undefined,
      copied_from_element_id: sourceEl.element_id,
      copied_from_element_label: sourceEl.label || `Element #${manualElements.findIndex(e => e.element_id === sourceEl.element_id) + 1}`
    });
    setCopyFromElementId("");
  };

  // Touch Edit Mode Handlers with Draft Snapshot (No silent mutation of formal DesignElement)
  const handleEnterTouchEditMode = () => {
    if (!activeElement || !imageNaturalDimensions) return;
    const snapshot = createTouchEditSnapshot(
      activeElement,
      imageNaturalDimensions.width,
      imageNaturalDimensions.height,
      logicalMapping
    );
    setTouchEditSnapshot(snapshot);
    setIsTouchEditMode(true);
    setIsElementInspectorOpen(true); // Keep inspector open in touch edit mode
  };

  const handleFinishTouchEdit = () => {
    if (activeElement && touchEditSnapshot) {
      const committed = applyTouchEditDraftToElement(activeElement, {
        ...touchEditSnapshot,
        draft_touch_bounds_source: "user_defined",
        is_modified: true
      });
      updateManualElement(activeElement.element_id, committed);
      const finalPixel = touchEditSnapshot.draft_touch_bounds_pixel;
      const w = finalPixel?.width ?? Math.round(touchEditSnapshot.draft_touch_bounds.width * (imageNaturalDimensions?.width || 1));
      const h = finalPixel?.height ?? Math.round(touchEditSnapshot.draft_touch_bounds.height * (imageNaturalDimensions?.height || 1));
      showTouchToast(locale === "en" ? `Touch bounds updated · ${w} × ${h} px` : `触控区域已更新 · ${w} × ${h} px`);
    }
    setIsTouchEditMode(false);
    setTouchEditSnapshot(null);
    setTouchInteraction({ type: "idle" });
    setIsElementInspectorOpen(true);
  };

  const handleCancelTouchEdit = () => {
    setIsTouchEditMode(false);
    setTouchEditSnapshot(null);
    setTouchInteraction({ type: "idle" });
    setIsElementInspectorOpen(true);
    showTouchToast(locale === "en" ? "Adjustment canceled" : "已取消调整");
  };

  const handleDraftResetPlatformReference = () => {
    if (!activeElement || !imageNaturalDimensions || !logicalMapping || !touchEditSnapshot) return;
    const refRes = generateCenteredReferenceTouchBounds(
      activeElement.image_pixel_bounds,
      imageNaturalDimensions.width,
      imageNaturalDimensions.height,
      logicalMapping.platform,
      logicalMapping
    );
    if (refRes) {
      setTouchEditSnapshot({
        ...touchEditSnapshot,
        draft_touch_bounds: refRes.normalized_bounds,
        draft_touch_bounds_pixel: refRes.pixel_bounds,
        draft_touch_bounds_source: "platform_reference",
        draft_touch_bounds_reference_clipped: refRes.is_clipped,
        draft_touch_bounds_reference_warning: refRes.clip_warning,
        is_modified: false
      });
    }
  };

  const handleDraftResetVisualCopy = () => {
    if (!activeElement || !touchEditSnapshot) return;
    setTouchEditSnapshot({
      ...touchEditSnapshot,
      draft_touch_bounds: { ...activeElement.normalized_bounds },
      draft_touch_bounds_pixel: { ...activeElement.image_pixel_bounds },
      draft_touch_bounds_source: "visual_copy",
      draft_touch_bounds_reference_clipped: undefined,
      draft_touch_bounds_reference_warning: undefined,
      is_modified: false
    });
  };

  // Project & Workspace Storage Management
  const refreshProjectsList = useCallback(async () => {
    try {
      const list = await listProjects();
      setProjectSummaries(list);
    } catch {
      // ignore list errors
    }
  }, []);

  const restoreProjectIntoApp = useCallback((project: LocalProject) => {
    isHydratingRef.current = true;
    try {
      currentProjectIdRef.current = project.project_id;
      setCurrentProjectId(project.project_id);
      currentProjectNameRef.current = project.project_name || "";
      setCurrentProjectName(project.project_name || "");
      projectCreatedAtRef.current = project.created_at || new Date().toISOString();
      setProjectCreatedAt(project.created_at || new Date().toISOString());
      currentImageHashRef.current = project.image_hash || "";
      setCurrentImageHash(project.image_hash || "");

      const ws = project.workspace;
      if (ws) {
        if (ws.image_blob instanceof Blob) {
          if (currentImageUrlRef.current) {
            URL.revokeObjectURL(currentImageUrlRef.current);
            currentImageUrlRef.current = "";
          }
          const newUrl = URL.createObjectURL(ws.image_blob);
          currentImageUrlRef.current = newUrl;
          setImageUrl(newUrl);
          setImageBlob(ws.image_blob);
        } else {
          if (currentImageUrlRef.current) {
            URL.revokeObjectURL(currentImageUrlRef.current);
            currentImageUrlRef.current = "";
          }
          setImageUrl("");
          setImageBlob(undefined);
        }

        setImageName(ws.image_name || project.image_name || "");
        if (ws.image_width && ws.image_height) {
          setImageNaturalDimensions({ width: ws.image_width, height: ws.image_height });
        } else {
          setImageNaturalDimensions(null);
        }

        setManualElements(Array.isArray(ws.elements) ? ws.elements : []);
        setCalibrationMode(ws.calibration_mode || "full_screen");
        setGlobalAllowEstimation(Boolean(ws.allow_estimation));
        setLogicalMapping(ws.logical_mapping);
        setEvaluationMode(ws.evaluation_mode || "quick");
        setReviewerRole(ws.reviewer_role || null);
        setShowDemoResults(Boolean(ws.show_demo_results));

        setForm((prev) => ({
          ...prev,
          deviceProfile: ws.device_profile || prev.deviceProfile,
          displaySize: ws.display_size || prev.displaySize,
          resolution: ws.resolution || prev.resolution,
          distance: ws.viewing_distance || prev.distance,
          scenario: ws.scenario || prev.scenario,
          userGroups: ws.user_groups || prev.userGroups,
          ruleSets: ws.rule_sets || prev.ruleSets,
          dimensions: ws.dimensions || prev.dimensions
        }));
      }

      setActiveElementId(null);
      setIsElementInspectorOpen(false);
      setStorageStatus("saved");
    } finally {
      setTimeout(() => {
        isHydratingRef.current = false;
      }, 100);
    }
  }, []);

  const serializeCurrentWorkspace = useCallback((): WorkspaceState => {
    return {
      schema_version: WORKSPACE_SCHEMA_VERSION,
      updated_at: new Date().toISOString(),
      device_profile: form.deviceProfile,
      displaySize: form.displaySize,
      resolution: form.resolution,
      viewing_distance: form.distance,
      scenario: form.scenario,
      user_groups: form.userGroups,
      rule_sets: form.ruleSets,
      dimensions: form.dimensions,
      calibration_mode: calibrationMode,
      cropped_scale_mode: "unknown_or_resized",
      original_image_reference_width: undefined,
      allow_estimation: globalAllowEstimation,
      logical_mapping: logicalMapping,
      design_info_status: undefined,
      context_environment: contextEnvironment,
      context_operation_state: contextOperationState,
      evaluation_mode: evaluationMode,
      reviewer_role: reviewerRole,
      show_demo_results: showDemoResults,
      elements: manualElements,
      image_name: imageName,
      image_width: imageNaturalDimensions?.width,
      image_height: imageNaturalDimensions?.height,
      image_blob: imageBlob instanceof Blob ? imageBlob : undefined
    };
  }, [
    form,
    calibrationMode,
    globalAllowEstimation,
    logicalMapping,
    contextEnvironment,
    contextOperationState,
    evaluationMode,
    reviewerRole,
    showDemoResults,
    manualElements,
    imageName,
    imageNaturalDimensions,
    imageBlob
  ]);

  const flushCurrentProjectSave = useCallback(async (): Promise<boolean> => {
    const projId = currentProjectIdRef.current || currentProjectId;
    if (!projId) return false;

    const ws = serializeCurrentWorkspace();
    const serialized = serializeWorkspace(ws);

    let hash = currentImageHashRef.current;
    if (!hash && imageBlob instanceof Blob) {
      hash = await computeImageHash(imageBlob);
      currentImageHashRef.current = hash;
      setCurrentImageHash(hash);
    }

    const project: LocalProject = {
      project_id: projId,
      project_name: currentProjectNameRef.current || "",
      created_at: projectCreatedAtRef.current || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      image_name: imageName,
      image_width: imageNaturalDimensions?.width,
      image_height: imageNaturalDimensions?.height,
      image_hash: hash || undefined,
      workspace: serialized
    };

    setStorageStatus("saving");
    const res = await saveProject(project);
    if (res.success) {
      setStorageStatus("saved");
      setStorageErrorMessage("");
      return true;
    } else {
      setStorageStatus("error");
      setStorageErrorMessage(res.error || "Failed to save project");
      return false;
    }
  }, [currentProjectId, serializeCurrentWorkspace, imageBlob, imageName, imageNaturalDimensions]);

  // Initial Mount: Load Active Project or latest Project from IndexedDB (Strictly Once)
  useEffect(() => {
    let isMounted = true;
    async function initStorage() {
      try {
        await migrateLegacyWorkspaceIfNeeded();
        const activeId = await getActiveProjectId();
        let loadedProject: LocalProject | null = null;
        if (activeId) {
          loadedProject = await loadProject(activeId);
        }
        if (!loadedProject) {
          const summaries = await listProjects();
          if (summaries.length > 0) {
            loadedProject = await loadProject(summaries[0].project_id);
          }
        }
        if (!isMounted) return;

        if (loadedProject) {
          restoreProjectIntoApp(loadedProject);
        } else {
          const newId = generateProjectId();
          currentProjectIdRef.current = newId;
          setCurrentProjectId(newId);
          await setActiveProjectId(newId);
          setStorageStatus("saved");
        }
        await refreshProjectsList();
      } catch (err) {
        console.error("Failed to initialize project storage:", err);
      } finally {
        if (isMounted) {
          setIsInitialized(true);
        }
      }
    }
    initStorage();
    return () => {
      isMounted = false;
      if (currentImageUrlRef.current) {
        URL.revokeObjectURL(currentImageUrlRef.current);
      }
    };
  }, []);

  // Debounced Autosave Effect
  useEffect(() => {
    if (!isInitialized) return;
    if (isHydratingRef.current) return;
    if (!currentProjectId) return;

    const timer = setTimeout(() => {
      if (!isHydratingRef.current) {
        flushCurrentProjectSave();
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [
    isInitialized,
    currentProjectId,
    currentProjectName,
    imageBlob,
    imageName,
    imageNaturalDimensions,
    manualElements,
    calibrationMode,
    globalAllowEstimation,
    logicalMapping,
    evaluationMode,
    reviewerRole,
    showDemoResults,
    form,
    contextEnvironment,
    contextOperationState,
    flushCurrentProjectSave
  ]);

  // Thumbnail Generation Effect
  useEffect(() => {
    if (!imageRef.current || manualElements.length === 0 || !imageNaturalDimensions) {
      setElementThumbnails({});
      return;
    }
    const img = imageRef.current;
    if (!img.complete || img.naturalWidth === 0) return;

    const newThumbs: Record<string, string> = {};
    manualElements.forEach((el, index) => {
      try {
        const thumb = generateElementThumbnailDataUrl(img, el, index, imageNaturalDimensions);
        if (thumb) newThumbs[el.element_id] = thumb;
      } catch {
        // ignore
      }
    });
    setElementThumbnails(newThumbs);
  }, [manualElements, imageUrl, imageNaturalDimensions]);

  // Non-modal Element Inspector outside click & keyboard escape handler
  useEffect(() => {
    if (!isElementInspectorOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isTouchEditMode) {
          handleCancelTouchEdit();
        } else {
          setIsElementInspectorOpen(false);
        }
      }
    };

    const handleOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      // 1. If clicking inside the inspector itself, keep open
      if (inspectorDrawerRef.current && inspectorDrawerRef.current.contains(target)) {
        return;
      }

      // 2. If clicking on element bounding boxes or element cards (which handle their own selection switch)
      if (
        target.closest(".manualBox") ||
        target.closest(".elementCard") ||
        target.closest(".resizeHandle") ||
        target.closest(".samplingBanner") ||
        target.closest(".drawingHintBanner") ||
        target.closest(".touchEditBanner") ||
        target.closest(".modalContent") ||
        target.closest(".modalOverlay")
      ) {
        return;
      }

      // 3. If in specialized transient canvas modes (color sampling, character measurement)
      if (colorSamplingTarget || characterMeasuringElementId) {
        return;
      }

      // 4. Mode-aware: if in touch bounds editing mode, clicking canvas or touch bounds keeps inspector open
      if (isTouchEditMode) {
        if (
          target.closest(".imageStage") ||
          target.closest(".stageContainer") ||
          target.closest(".touchBox") ||
          target.closest(".touchHandle") ||
          target.closest(".touchEditBanner")
        ) {
          return;
        }
      }

      // 5. Otherwise, clicking outside closes the inspector without blocking any target action
      setIsElementInspectorOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("pointerdown", handleOutsidePointerDown, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("pointerdown", handleOutsidePointerDown, true);
    };
  }, [isElementInspectorOpen, colorSamplingTarget, characterMeasuringElementId, isTouchEditMode, touchEditSnapshot, activeElement, locale]);

  // Dedicated commit helper for robust image attachment
  const commitImageToProject = useCallback((file: File, hash?: string) => {
    if (currentImageUrlRef.current) {
      URL.revokeObjectURL(currentImageUrlRef.current);
      currentImageUrlRef.current = "";
    }
    const nextUrl = URL.createObjectURL(file);
    currentImageUrlRef.current = nextUrl;

    setImageUrl(nextUrl);
    setImageBlob(file);
    setImageName(file.name);
    if (hash) {
      currentImageHashRef.current = hash;
      setCurrentImageHash(hash);
    }

    // Reset element-specific data & transient modes
    setManualElements([]);
    setAnnotations([]);
    setShowDemoResults(false);
    setActiveElementId(null);
    setIsElementInspectorOpen(false);
    setIsAddingElement(false);
    setIsTouchEditMode(false);
    setTouchEditSnapshot(null);
    setColorSamplingTarget(null);
    setShowRestoreNotification(false);
    setCanvasInteraction({ type: "idle" });
    setTouchInteraction({ type: "idle" });

    // Reset image-linked logical mapping & temporary ref inputs
    setLogicalMapping(undefined);
    setImageRefWidthInput("");
    setLogicalRefWidthInput("");
    setImageRefHeightInput("");
    setLogicalRefHeightInput("");
    setOriginalFullImageWidthInput("");
  }, []);

  // Project & Workspace Actions
  const handleNewProject = async () => {
    if (isTouchEditMode) {
      handleCancelTouchEdit();
    }
    if (!isHydratingRef.current && imageBlob) {
      await flushCurrentProjectSave();
    }
    if (currentImageUrlRef.current) {
      URL.revokeObjectURL(currentImageUrlRef.current);
      currentImageUrlRef.current = "";
    }
    setImageUrl("");
    setImageBlob(undefined);
    setImageName("");
    setImageNaturalDimensions(null);
    setAnnotations([]);
    setShowDemoResults(false);
    setManualElements([]);
    setActiveElementId(null);
    setIsElementInspectorOpen(false);
    setIsAddingElement(false);
    setIsTouchEditMode(false);
    setTouchEditSnapshot(null);
    setLogicalMapping(undefined);
    setImageRefWidthInput("");
    setLogicalRefWidthInput("");
    setImageRefHeightInput("");
    setLogicalRefHeightInput("");
    setOriginalFullImageWidthInput("");
    setShowRestoreNotification(false);
    setCanvasInteraction({ type: "idle" });
    setTouchInteraction({ type: "idle" });

    const newId = generateProjectId();
    currentProjectIdRef.current = newId;
    setCurrentProjectId(newId);
    currentProjectNameRef.current = "";
    setCurrentProjectName("");
    const nowIso = new Date().toISOString();
    projectCreatedAtRef.current = nowIso;
    setProjectCreatedAt(nowIso);
    currentImageHashRef.current = "";
    setCurrentImageHash("");
    await setActiveProjectId(newId);
    setIsProjectLibraryOpen(false);
    setStorageStatus("saved");
    await refreshProjectsList();
  };

  const handleSelectProject = async (projectId: string) => {
    if (isTouchEditMode) {
      handleCancelTouchEdit();
    }
    if (!isHydratingRef.current && imageBlob) {
      await flushCurrentProjectSave();
    }
    const proj = await loadProject(projectId);
    if (!proj) return;

    await setActiveProjectId(proj.project_id);
    restoreProjectIntoApp(proj);
    setIsProjectLibraryOpen(false);
    await refreshProjectsList();
  };

  const handleSaveAs = async (sourceProjectId: string) => {
    if (!isHydratingRef.current && imageBlob) {
      await flushCurrentProjectSave();
    }
    const sourceProj = await loadProject(sourceProjectId);
    if (!sourceProj) return;

    const newId = generateProjectId();
    const copySuffix = locale === "en" ? " (Copy)" : " (副本)";
    const newProject: LocalProject = {
      project_id: newId,
      project_name: (sourceProj.project_name || (locale === "en" ? "Untitled Project" : "未命名项目")) + copySuffix,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      image_name: sourceProj.image_name,
      image_width: sourceProj.image_width,
      image_height: sourceProj.image_height,
      image_hash: sourceProj.image_hash,
      workspace: JSON.parse(JSON.stringify(sourceProj.workspace))
    };
    if (sourceProj.workspace.image_blob instanceof Blob) {
      newProject.workspace.image_blob = sourceProj.workspace.image_blob;
    }

    await saveProject(newProject);
    await setActiveProjectId(newId);
    restoreProjectIntoApp(newProject);
    setIsProjectLibraryOpen(false);
    await refreshProjectsList();
  };

  const handleRenameProject = async (projectId: string, newName: string) => {
    const res = await renameProject(projectId, newName);
    if (!res.success) {
      alert(locale === "en" ? "Failed to rename project." : "重命名项目失败。");
      return;
    }
    if (projectId === currentProjectIdRef.current) {
      currentProjectNameRef.current = newName;
      setCurrentProjectName(newName);
    }
    await refreshProjectsList();
  };

  const handleDeleteProject = async (projectId: string) => {
    const res = await deleteProject(projectId);
    if (!res.success) {
      alert(locale === "en" ? "Failed to delete project." : "删除项目失败。");
      return;
    }
    if (projectId === currentProjectIdRef.current) {
      await handleNewProject();
    }
    await refreshProjectsList();
  };

  const handleContinueMatchingProject = async (projectId: string) => {
    setIsSameImageModalOpen(false);
    setPendingSameImageFile(null);
    await handleSelectProject(projectId);
  };

  const handleStartNewWithSameImage = async () => {
    setIsSameImageModalOpen(false);
    const file = pendingSameImageFile;
    setPendingSameImageFile(null);
    if (!file) return;

    await handleProcessImageFile(file, true);
  };

  const handleCancelSameImageModal = () => {
    setIsSameImageModalOpen(false);
    setPendingSameImageFile(null);
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;
    setImageNaturalDimensions({ width: naturalWidth, height: naturalHeight });

    if (!imageRefWidthInput) {
      setImageRefWidthInput(String(naturalWidth));
    }

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = naturalWidth;
      canvas.height = naturalHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, naturalWidth, naturalHeight);
      }
    }
  };

  const handleProcessImageFile = async (file?: File, bypassSameImageCheck = false) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert(locale === "en" ? "Please select an image file." : "请选择图片文件。");
      return;
    }

    let hash = "";
    try {
      hash = await computeImageHash(file);
    } catch {
      // ignore
    }

    // Check same-image hash if not explicitly bypassed
    if (!bypassSameImageCheck && hash) {
      try {
        const matches = await findProjectsByImageHash(hash);
        const match = matches.find((p) => p.project_id !== currentProjectIdRef.current);
        if (match) {
          setPendingSameImageFile(file);
          setSameImageMatchingProjects(matches);
          setIsSameImageModalOpen(true);
          return;
        }
      } catch (_e) {
        // Fallthrough on hash error
      }
    }

    const wasImageAlreadyLoaded = Boolean(currentImageUrlRef.current || imageUrl);

    // Ensure new project id and active project state
    const newId = generateProjectId();
    await setActiveProjectId(newId);
    currentProjectIdRef.current = newId;
    setCurrentProjectId(newId);
    currentProjectNameRef.current = "";
    setCurrentProjectName("");
    const nowIso = new Date().toISOString();
    projectCreatedAtRef.current = nowIso;
    setProjectCreatedAt(nowIso);

    // Commit image atomically
    commitImageToProject(file, hash);

    if (wasImageAlreadyLoaded) {
      setImageReplacementNotice(
        locale === "en"
          ? "New image loaded. Screen hardware parameters preserved. Please verify target device and provide design basis if needed."
          : "新图片已载入。已保留屏幕硬件参数，请确认新图片是否仍来自同一目标设备，并按需补充设计基准。"
      );
      setTimeout(() => {
        setImageReplacementNotice(null);
      }, 6000);
    }
  };

  const handleTriggerImageSelection = () => {
    if (isTouchEditMode) {
      handleCancelTouchEdit();
    }
    if (manualElements.length > 0) {
      setPendingDropFile(null);
      setIsReplaceConfirmOpen(true);
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleConfirmReplacement = () => {
    setIsReplaceConfirmOpen(false);
    if (pendingDropFile) {
      handleProcessImageFile(pendingDropFile);
      setPendingDropFile(null);
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleCancelReplacement = () => {
    setIsReplaceConfirmOpen(false);
    setPendingDropFile(null);
  };

  const handleCanvasDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingOver) {
      setIsDraggingOver(true);
    }
  };

  const handleCanvasDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleCanvasDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert(locale === "en" ? "Please select an image file." : "请选择图片文件。");
      return;
    }

    if (manualElements.length > 0) {
      setPendingDropFile(file);
      setIsReplaceConfirmOpen(true);
    } else {
      handleProcessImageFile(file);
    }
  };

  const handleClearLocalData = async () => {
    const confirmMsg = t("project.clear_confirm");
    if (window.confirm(confirmMsg)) {
      await clearAllProjects();
      await handleNewProject();
      setStorageStatus("idle");
    }
  };

  // Safe Pointer Capture Helpers
  const safeSetPointerCapture = (target: HTMLElement | null, pointerId: number) => {
    if (!target) return;
    try {
      if (typeof target.setPointerCapture === "function") {
        target.setPointerCapture(pointerId);
      }
    } catch (_err) {
      // Ignore in environments where pointer capture is unsupported or invalid
    }
  };

  const safeReleasePointerCapture = (target: HTMLElement | null, pointerId: number) => {
    if (!target) return;
    try {
      if (typeof target.releasePointerCapture === "function" && target.hasPointerCapture?.(pointerId)) {
        target.releasePointerCapture(pointerId);
      }
    } catch (_err) {
      // Ignore
    }
  };

  // P0-COLOR-01: Authoritative Screenshot Color Sampling (Pure Source Image Bitmap without UI Overlays)
  const handleStartColorSampling = (target: "foreground" | "background") => {
    if (isTouchEditMode) {
      handleCancelTouchEdit();
    }
    isColorSamplingActiveRef.current = true;
    setColorSamplingTarget(target);
  };

  // Optional Secondary System EyeDropper (Samples full screen/system pixels including overlays)
  const handleStartSystemEyeDropper = async (target: "foreground" | "background") => {
    if (isTouchEditMode) {
      handleCancelTouchEdit();
    }
    if ("EyeDropper" in window) {
      try {
        isColorSamplingActiveRef.current = true;
        // @ts-expect-error EyeDropper is a modern browser API
        const eyeDropper = new window.EyeDropper();
        const result = await eyeDropper.open();
        if (result?.sRGBHex && activeElement) {
          const hex = result.sRGBHex.toUpperCase();
          const isFg = target === "foreground";
          const newFg = isFg ? hex : activeElement.foreground_color || "#000000";
          const newBg = !isFg ? hex : activeElement.background_color || "#FFFFFF";
          const newFgState: ColorState = isFg
            ? "confirmed"
            : (activeElement.foreground_color_state || (activeElement.foreground_color ? "confirmed" : "provisional"));
          const newBgState: ColorState = !isFg
            ? "confirmed"
            : (activeElement.background_color_state || (activeElement.background_color ? "confirmed" : "provisional"));

          let contrast = undefined;
          if (newFg && newBg) {
            if (activeElement.element_type === "text") {
              const cat = activeElement.text_size_category || activeElement.text_size_evaluation?.contrast_category_auto || "normal";
              contrast = evaluateWcagContrast(newFg, newBg, cat, newFgState, newBgState) || undefined;
            } else if (["button", "icon", "input"].includes(activeElement.element_type)) {
              contrast = evaluateWcagNonTextContrast(newFg, newBg, newFgState, newBgState) || undefined;
            }
          }

          updateManualElement(activeElement.element_id, {
            foreground_color: newFg,
            foreground_color_state: newFgState,
            foreground_color_provenance: isFg ? "eyedropper_sample" : activeElement.foreground_color_provenance,
            background_color: newBg,
            background_color_state: newBgState,
            background_color_provenance: !isFg ? "eyedropper_sample" : activeElement.background_color_provenance,
            contrast_evaluation: contrast
          });
        }
      } catch {
        // User cancelled EyeDropper
      } finally {
        isColorSamplingActiveRef.current = false;
      }
    }
  };


  // Drawing & Interaction Pointer Handlers
  const handleStagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!imageStageRef.current || !imageNaturalDimensions) return;
    const rect = imageStageRef.current.getBoundingClientRect();

    // Color sampling mode
    if (colorSamplingTarget && activeElement && canvasRef.current) {
      e.stopPropagation();
      const { pixelX, pixelY } = mapClientToNaturalPixel(
        e.clientX,
        e.clientY,
        rect,
        imageNaturalDimensions.width,
        imageNaturalDimensions.height
      );

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const pixel = ctx.getImageData(pixelX, pixelY, 1, 1).data;
        const hex = rgbToHex(pixel[0], pixel[1], pixel[2]);

        const isFg = colorSamplingTarget === "foreground";
        const newFg = isFg ? hex : activeElement.foreground_color || "#000000";
        const newBg = !isFg ? hex : activeElement.background_color || "#FFFFFF";
        const newFgState: ColorState = isFg
          ? "confirmed"
          : (activeElement.foreground_color_state || (activeElement.foreground_color ? "confirmed" : "provisional"));
        const newBgState: ColorState = !isFg
          ? "confirmed"
          : (activeElement.background_color_state || (activeElement.background_color ? "confirmed" : "provisional"));

        let contrast = undefined;
        if (newFg && newBg) {
          if (activeElement.element_type === "text") {
            const cat = activeElement.text_size_category || activeElement.text_size_evaluation?.contrast_category_auto || "normal";
            contrast = evaluateWcagContrast(newFg, newBg, cat, newFgState, newBgState) || undefined;
          } else if (["button", "icon", "input"].includes(activeElement.element_type)) {
            contrast = evaluateWcagNonTextContrast(newFg, newBg, newFgState, newBgState) || undefined;
          }
        }

        updateManualElement(activeElement.element_id, {
          foreground_color: newFg,
          foreground_color_state: newFgState,
          foreground_color_provenance: isFg ? "screenshot_sample" : activeElement.foreground_color_provenance,
          background_color: newBg,
          background_color_state: newBgState,
          background_color_provenance: !isFg ? "screenshot_sample" : activeElement.background_color_provenance,
          contrast_evaluation: contrast
        });
      }
      setIsElementInspectorOpen(true);
      setColorSamplingTarget(null);
      setSamplingHoverPos(null);
      setTimeout(() => {
        isColorSamplingActiveRef.current = false;
      }, 50);
      return;
    }

    // Character height measuring mode
    if (characterMeasuringElementId) {
      e.stopPropagation();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      setCanvasInteraction({
        type: "creating",
        pointerId: e.pointerId,
        startPoint: { x: clickX, y: clickY },
        currentPoint: { x: clickX, y: clickY }
      });
      safeSetPointerCapture(e.currentTarget as HTMLElement, e.pointerId);
      return;
    }



    // Add Element creation mode
    if (isAddingElement) {
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      setCanvasInteraction({
        type: "creating",
        pointerId: e.pointerId,
        startPoint: { x: clickX, y: clickY },
        currentPoint: { x: clickX, y: clickY }
      });
      safeSetPointerCapture(e.currentTarget as HTMLElement, e.pointerId);
      return;
    }

    // Default select/edit mode: clicking empty space deselects active element
    if (!isTouchEditMode) {
      setActiveElementId(null);
      setCanvasInteraction({ type: "idle" });
    }
  };

  // Move drag start on manual element box (visual) - active only when not in touch edit mode
  const handleBoxPointerDown = (e: React.PointerEvent<HTMLDivElement>, element: DesignElement) => {
    if (isAddingElement || colorSamplingTarget || isTouchEditMode || characterMeasuringElementId) return;
    e.stopPropagation();
    setActiveElementId(element.element_id);
    setCanvasInteraction({
      type: "pending_move",
      elementId: element.element_id,
      pointerId: e.pointerId,
      startPointer: { x: e.clientX, y: e.clientY },
      originalBounds: element.normalized_bounds
    });
    safeSetPointerCapture(e.currentTarget as HTMLElement, e.pointerId);
  };

  // Resize drag start on corner handle (visual)
  const handleHandlePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    element: DesignElement,
    handle: ResizeHandle
  ) => {
    if (isAddingElement || colorSamplingTarget || isTouchEditMode || characterMeasuringElementId) return;
    e.stopPropagation();
    setActiveElementId(element.element_id);
    setCanvasInteraction({
      type: "resizing",
      elementId: element.element_id,
      pointerId: e.pointerId,
      handle,
      startPointer: { x: e.clientX, y: e.clientY },
      originalBounds: element.normalized_bounds
    });
    safeSetPointerCapture(e.currentTarget as HTMLElement, e.pointerId);
  };

  // Touch Box PointerDown (in touch edit mode on draft)
  const handleTouchBoxPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isTouchEditMode || !touchEditSnapshot || colorSamplingTarget) return;
    e.stopPropagation();
    setTouchInteraction({
      type: "pending_move",
      pointerId: e.pointerId,
      startPointer: { x: e.clientX, y: e.clientY },
      originalBounds: touchEditSnapshot.draft_touch_bounds
    });
    safeSetPointerCapture(e.currentTarget as HTMLElement, e.pointerId);
  };

  // Touch Resize Handle PointerDown (in touch edit mode on draft)
  const handleTouchHandlePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    handle: ResizeHandle
  ) => {
    if (!isTouchEditMode || !touchEditSnapshot || colorSamplingTarget) return;
    e.stopPropagation();
    setTouchInteraction({
      type: "resizing",
      pointerId: e.pointerId,
      handle,
      startPointer: { x: e.clientX, y: e.clientY },
      originalBounds: touchEditSnapshot.draft_touch_bounds
    });
    safeSetPointerCapture(e.currentTarget as HTMLElement, e.pointerId);
  };

  const handleStagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!imageStageRef.current || !imageNaturalDimensions) return;
    const rect = imageStageRef.current.getBoundingClientRect();

    // 0. Update magnifier loupe during color sampling
    if (colorSamplingTarget && canvasRef.current) {
      const { pixelX, pixelY } = mapClientToNaturalPixel(
        e.clientX,
        e.clientY,
        rect,
        imageNaturalDimensions.width,
        imageNaturalDimensions.height
      );
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx && pixelX >= 0 && pixelX < imageNaturalDimensions.width && pixelY >= 0 && pixelY < imageNaturalDimensions.height) {
        const pixel = ctx.getImageData(pixelX, pixelY, 1, 1).data;
        const hex = rgbToHex(pixel[0], pixel[1], pixel[2]);
        setSamplingHoverPos({ clientX: e.clientX, clientY: e.clientY, pixelX, pixelY, hex });

        if (magnifierCanvasRef.current) {
          const magCtx = magnifierCanvasRef.current.getContext("2d");
          if (magCtx) {
            magCtx.imageSmoothingEnabled = false;
            magCtx.clearRect(0, 0, 110, 110);
            const sliceSize = 11;
            const halfSlice = Math.floor(sliceSize / 2);
            const srcX = pixelX - halfSlice;
            const srcY = pixelY - halfSlice;
            magCtx.drawImage(
              canvas,
              srcX,
              srcY,
              sliceSize,
              sliceSize,
              0,
              0,
              110,
              110
            );
          }
        }
      }
      return;
    }

    // 1. Touch Edit Mode Drag / Resize on Draft
    if (isTouchEditMode && touchEditSnapshot && touchInteraction.type !== "idle") {
      if (touchInteraction.type === "pending_move") {
        if (hasExceededDragThreshold(touchInteraction.startPointer, { x: e.clientX, y: e.clientY }, 4)) {
          setTouchInteraction({
            ...touchInteraction,
            type: "moving"
          });
          const deltaNormX = (e.clientX - touchInteraction.startPointer.x) / rect.width;
          const deltaNormY = (e.clientY - touchInteraction.startPointer.y) / rect.height;
          const newBounds = calculateMovedNormalizedBounds(touchInteraction.originalBounds, deltaNormX, deltaNormY);
          const pixelBounds = {
            x: Math.round(newBounds.x * imageNaturalDimensions.width),
            y: Math.round(newBounds.y * imageNaturalDimensions.height),
            width: Math.round(newBounds.width * imageNaturalDimensions.width),
            height: Math.round(newBounds.height * imageNaturalDimensions.height)
          };
          setTouchEditSnapshot({
            ...touchEditSnapshot,
            draft_touch_bounds: newBounds,
            draft_touch_bounds_pixel: pixelBounds,
            draft_touch_bounds_source: "user_defined",
            draft_touch_bounds_reference_clipped: undefined,
            draft_touch_bounds_reference_warning: undefined,
            is_modified: true
          });
        }
        return;
      }

      if (touchInteraction.type === "moving") {
        const deltaNormX = (e.clientX - touchInteraction.startPointer.x) / rect.width;
        const deltaNormY = (e.clientY - touchInteraction.startPointer.y) / rect.height;
        const newBounds = calculateMovedNormalizedBounds(touchInteraction.originalBounds, deltaNormX, deltaNormY);
        const pixelBounds = {
          x: Math.round(newBounds.x * imageNaturalDimensions.width),
          y: Math.round(newBounds.y * imageNaturalDimensions.height),
          width: Math.round(newBounds.width * imageNaturalDimensions.width),
          height: Math.round(newBounds.height * imageNaturalDimensions.height)
        };
        setTouchEditSnapshot({
          ...touchEditSnapshot,
          draft_touch_bounds: newBounds,
          draft_touch_bounds_pixel: pixelBounds,
          draft_touch_bounds_source: "user_defined",
          draft_touch_bounds_reference_clipped: undefined,
          draft_touch_bounds_reference_warning: undefined,
          is_modified: true
        });
        return;
      }

      if (touchInteraction.type === "resizing") {
        const deltaNormX = (e.clientX - touchInteraction.startPointer.x) / rect.width;
        const deltaNormY = (e.clientY - touchInteraction.startPointer.y) / rect.height;
        const newBounds = calculateResizedNormalizedBounds(touchInteraction.originalBounds, touchInteraction.handle, deltaNormX, deltaNormY, 0.01);
        const pixelBounds = {
          x: Math.round(newBounds.x * imageNaturalDimensions.width),
          y: Math.round(newBounds.y * imageNaturalDimensions.height),
          width: Math.round(newBounds.width * imageNaturalDimensions.width),
          height: Math.round(newBounds.height * imageNaturalDimensions.height)
        };
        setTouchEditSnapshot({
          ...touchEditSnapshot,
          draft_touch_bounds: newBounds,
          draft_touch_bounds_pixel: pixelBounds,
          draft_touch_bounds_source: "user_defined",
          draft_touch_bounds_reference_clipped: undefined,
          draft_touch_bounds_reference_warning: undefined,
          is_modified: true
        });
        return;
      }
    }

    // 2. Visual Drag / Resize / Creation
    if (canvasInteraction.type === "idle") return;

    if (canvasInteraction.type === "creating") {
      setCanvasInteraction({
        ...canvasInteraction,
        currentPoint: {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        }
      });
      return;
    }

    if (canvasInteraction.type === "pending_move") {
      if (hasExceededDragThreshold(canvasInteraction.startPointer, { x: e.clientX, y: e.clientY }, 4)) {
        setCanvasInteraction({
          ...canvasInteraction,
          type: "moving"
        });
        const deltaNormX = (e.clientX - canvasInteraction.startPointer.x) / rect.width;
        const deltaNormY = (e.clientY - canvasInteraction.startPointer.y) / rect.height;
        const newBounds = calculateMovedNormalizedBounds(canvasInteraction.originalBounds, deltaNormX, deltaNormY);
        const pixelBounds = {
          x: Math.round(newBounds.x * imageNaturalDimensions.width),
          y: Math.round(newBounds.y * imageNaturalDimensions.height),
          width: Math.round(newBounds.width * imageNaturalDimensions.width),
          height: Math.round(newBounds.height * imageNaturalDimensions.height)
        };
        updateManualElement(canvasInteraction.elementId, {
          normalized_bounds: newBounds,
          image_pixel_bounds: pixelBounds
        });
      }
      return;
    }

    if (canvasInteraction.type === "moving") {
      const deltaNormX = (e.clientX - canvasInteraction.startPointer.x) / rect.width;
      const deltaNormY = (e.clientY - canvasInteraction.startPointer.y) / rect.height;
      const newBounds = calculateMovedNormalizedBounds(canvasInteraction.originalBounds, deltaNormX, deltaNormY);
      const pixelBounds = {
        x: Math.round(newBounds.x * imageNaturalDimensions.width),
        y: Math.round(newBounds.y * imageNaturalDimensions.height),
        width: Math.round(newBounds.width * imageNaturalDimensions.width),
        height: Math.round(newBounds.height * imageNaturalDimensions.height)
      };
      updateManualElement(canvasInteraction.elementId, {
        normalized_bounds: newBounds,
        image_pixel_bounds: pixelBounds
      });
      return;
    }

    if (canvasInteraction.type === "resizing") {
      const deltaNormX = (e.clientX - canvasInteraction.startPointer.x) / rect.width;
      const deltaNormY = (e.clientY - canvasInteraction.startPointer.y) / rect.height;
      const newBounds = calculateResizedNormalizedBounds(canvasInteraction.originalBounds, canvasInteraction.handle, deltaNormX, deltaNormY, 0.01);
      const pixelBounds = {
        x: Math.round(newBounds.x * imageNaturalDimensions.width),
        y: Math.round(newBounds.y * imageNaturalDimensions.height),
        width: Math.round(newBounds.width * imageNaturalDimensions.width),
        height: Math.round(newBounds.height * imageNaturalDimensions.height)
      };
      updateManualElement(canvasInteraction.elementId, {
        normalized_bounds: newBounds,
        image_pixel_bounds: pixelBounds
      });
    }
  };

  const handleStagePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    safeReleasePointerCapture(e.currentTarget as HTMLElement, e.pointerId);

    // End Touch Interaction drag (draft bounds remain preserved in touchEditSnapshot for continuous multi-handle editing)
    if (touchInteraction.type !== "idle") {
      setTouchInteraction({ type: "idle" });
      if (isTouchEditMode) {
        return;
      }
    }

    const intent = resolvePointerUpIntent(canvasInteraction);

    // A. Click Intent Confirmed: pending_move released below threshold -> Open Inspector & Scroll
    if (intent.action === "select_and_open_inspector") {
      handleSelectManualElement(intent.elementId, "canvas");
      setCanvasInteraction({ type: "idle" });
      return;
    }

    // B. Move / Resize Intent Completed: Finished moving or resizing -> Keep Inspector state suppressed
    if (intent.action === "commit_move" || intent.action === "commit_resize") {
      setCanvasInteraction({ type: "idle" });
      return;
    }

    // C. Commit Creation if active
    if (intent.action === "commit_creation" && canvasInteraction.type === "creating") {
      if (characterMeasuringElementId) {
        const targetId = characterMeasuringElementId;
        if (imageStageRef.current && imageNaturalDimensions) {
          const rect = imageStageRef.current.getBoundingClientRect();
          const displayDeltaY = Math.abs(canvasInteraction.currentPoint.y - canvasInteraction.startPoint.y);
          const pixelHeight = rect.height > 0
            ? Math.round((displayDeltaY / rect.height) * imageNaturalDimensions.height)
            : 0;
          if (pixelHeight > 0) {
            updateManualElement(targetId, {
              character_height_px: pixelHeight,
              character_height_source: "measured_rendered_character"
            });
          }
        }
        setCharacterMeasuringElementId(null);
        setCanvasInteraction({ type: "idle" });
        setActiveElementId(targetId);
        setIsElementInspectorOpen(true);
        return;
      }

      if (isAddingElement && imageStageRef.current && imageNaturalDimensions) {

        const rect = imageStageRef.current.getBoundingClientRect();
        const bounds = calculateCreatedNormalizedBounds(
          canvasInteraction.startPoint,
          canvasInteraction.currentPoint,
          rect.width,
          rect.height,
          0.01
        );

        if (bounds) {
          const newElement = createManualDesignElement(
            bounds,
            imageNaturalDimensions.width,
            imageNaturalDimensions.height,
            manualElements.length + 1,
            calibrationMode,
            globalAllowEstimation,
            resolvedDisplayParams.displaySize,
            resolvedDisplayParams.resolution
          );

          setManualElements((prev) => [...prev, newElement]);
          setShowDemoResults(false);
          handleSelectManualElement(newElement.element_id, "creation");
        }
      }
      setIsAddingElement(false);
    }

    // Finish any remaining interaction
    setCanvasInteraction({ type: "idle" });
  };

  const handleStagePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    safeReleasePointerCapture(e.currentTarget as HTMLElement, e.pointerId);

    // Rollback Move / Resize on cancel
    if (canvasInteraction.type === "moving" || canvasInteraction.type === "resizing") {
      if (imageNaturalDimensions) {
        const pixelBounds = {
          x: Math.round(canvasInteraction.originalBounds.x * imageNaturalDimensions.width),
          y: Math.round(canvasInteraction.originalBounds.y * imageNaturalDimensions.height),
          width: Math.round(canvasInteraction.originalBounds.width * imageNaturalDimensions.width),
          height: Math.round(canvasInteraction.originalBounds.height * imageNaturalDimensions.height)
        };
        updateManualElement(canvasInteraction.elementId, {
          normalized_bounds: canvasInteraction.originalBounds,
          image_pixel_bounds: pixelBounds
        });
      }
    }

    // Rollback Touch Move / Resize on cancel
    if (touchInteraction.type === "moving" || touchInteraction.type === "resizing") {
      if (touchEditSnapshot && imageNaturalDimensions) {
        const pixelBounds = {
          x: Math.round(touchInteraction.originalBounds.x * imageNaturalDimensions.width),
          y: Math.round(touchInteraction.originalBounds.y * imageNaturalDimensions.height),
          width: Math.round(touchInteraction.originalBounds.width * imageNaturalDimensions.width),
          height: Math.round(touchInteraction.originalBounds.height * imageNaturalDimensions.height)
        };
        setTouchEditSnapshot({
          ...touchEditSnapshot,
          draft_touch_bounds: touchInteraction.originalBounds,
          draft_touch_bounds_pixel: pixelBounds
        });
      }
    }

    setCanvasInteraction({ type: "idle" });
    setTouchInteraction({ type: "idle" });
  };

  const renderDrawPreview = () => {
    if (canvasInteraction.type !== "creating" || !imageStageRef.current) return null;
    const rect = imageStageRef.current.getBoundingClientRect();
    const bounds = calculateCreatedNormalizedBounds(
      canvasInteraction.startPoint,
      canvasInteraction.currentPoint,
      rect.width,
      rect.height,
      0.0001
    );
    if (!bounds) return null;

    return (
      <div
        className="drawPreviewBox"
        style={{
          left: `${bounds.x * 100}%`,
          top: `${bounds.y * 100}%`,
          width: `${bounds.width * 100}%`,
          height: `${bounds.height * 100}%`
        }}
      />
    );
  };

  // Render Distance Guide Line on Canvas for Active Element (Using True Closest Edge Points)
  const renderDistanceGuideLine = () => {
    if (!activeElement || !imageNaturalDimensions || !activeNearestTouchTarget) return null;
    if (activeNearestTouchTarget.overlap?.is_overlapping) return null; // No distance line if overlapping
    if (!activeNearestTouchTarget.closest_point_a || !activeNearestTouchTarget.closest_point_b) return null;

    const x1 = (activeNearestTouchTarget.closest_point_a.x / imageNaturalDimensions.width) * 100;
    const y1 = (activeNearestTouchTarget.closest_point_a.y / imageNaturalDimensions.height) * 100;
    const x2 = (activeNearestTouchTarget.closest_point_b.x / imageNaturalDimensions.width) * 100;
    const y2 = (activeNearestTouchTarget.closest_point_b.y / imageNaturalDimensions.height) * 100;
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;

    const labelText = activeNearestTouchTarget.distance_logical !== undefined
      ? `${activeNearestTouchTarget.distance_logical} ${activeNearestTouchTarget.logical_unit}`
      : `${activeNearestTouchTarget.distance_px} px`;

    return (
      <svg className="distanceGuideSvg" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 15 }}>
        <line
          x1={`${x1}%`}
          y1={`${y1}%`}
          x2={`${x2}%`}
          y2={`${y2}%`}
          stroke="#4f46e5"
          strokeWidth="2"
          strokeDasharray="4,4"
        />
        <circle cx={`${x1}%`} cy={`${y1}%`} r="4" fill="#4f46e5" />
        <circle cx={`${x2}%`} cy={`${y2}%`} r="4" fill="#4f46e5" />
        <foreignObject x={`calc(${midX}% - 50px)`} y={`calc(${midY}% - 12px)`} width="100" height="24">
          <div className="distanceBadgeTag">
            {labelText}
          </div>
        </foreignObject>
      </svg>
    );
  };

  return (
    <>
      {/* Hidden canvas for pixel color sampling */}
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* Hidden file input for screenshot upload and replacement */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleProcessImageFile(file);
          e.target.value = "";
        }}
      />

      {/* Top Workspace Header with Capability Summary & Action Controls */}
      <header className="topWorkspaceHeader">
        <div className="workspaceTitleArea">
          <h1 className="workspaceLogoText">UX Evaluation Tool</h1>
          <button
            type="button"
            className="projectTriggerBtn"
            onClick={() => {
              if (isTouchEditMode) {
                handleCancelTouchEdit();
              }
              refreshProjectsList();
              setIsProjectLibraryOpen(true);
            }}
            title={t("project.library_title")}
          >
            📁 <span className="projectTriggerName">{currentProjectName || t("project.default_name")}</span>
          </button>
          <div className="storageStatusRow">
            {storageStatus === "saved" ? (
              <span className="storageStatusTag saved">✓ {t("app.saved_locally")}</span>
            ) : storageStatus === "saving" ? (
              <span className="storageStatusTag saving">💾 {t("app.saving")}</span>
            ) : storageStatus === "error" ? (
              <span className="storageStatusTag error" title={storageErrorMessage}>⚠️ {t("app.save_failed")}</span>
            ) : (
              <span className="storageStatusTag idle">{t("app.offline_mode")}</span>
            )}
          </div>
        </div>

        {/* Compact Capability Summary Chips */}
        <div className="topCapabilityBar">
          <span className="topCapabilityLabel">{t("app.capability_title")}</span>
          <span className={`capSummaryChip status-${workspaceCapabilities.visual_geometry.statusLevel}`} title={workspaceCapabilities.visual_geometry.tierDescription}>
            {getEvaluationTierLabel(workspaceCapabilities.visual_geometry.highestAvailableTier, locale)} · {locale === "en" ? "Geometry" : "尺寸与位置"}
          </span>
          <span className={`capSummaryChip status-${workspaceCapabilities.contrast.statusLevel}`} title={workspaceCapabilities.contrast.tierDescription}>
            {getEvaluationTierLabel(workspaceCapabilities.contrast.highestAvailableTier, locale)} · {locale === "en" ? "Contrast" : "对比度"}
          </span>
          <span className={`capSummaryChip status-${workspaceCapabilities.physical_geometry.statusLevel}`} title={workspaceCapabilities.physical_geometry.tierDescription}>
            {getEvaluationTierLabel(workspaceCapabilities.physical_geometry.highestAvailableTier, locale)} · {locale === "en" ? "Physical Size" : "物理尺寸"}
          </span>
          <span className={`capSummaryChip status-${workspaceCapabilities.typography.statusLevel}`} title={workspaceCapabilities.typography.tierDescription}>
            {getEvaluationTierLabel(workspaceCapabilities.typography.highestAvailableTier, locale)} · {locale === "en" ? "Typography" : "字号"}
          </span>
          <span className={`capSummaryChip status-${workspaceCapabilities.platform_target_size.statusLevel}`} title={workspaceCapabilities.platform_target_size.tierDescription}>
            {getEvaluationTierLabel(workspaceCapabilities.platform_target_size.highestAvailableTier, locale)} · {locale === "en" ? "Touch Target" : "平台触控"}
          </span>
        </div>

        {/* Workspace Actions, Language Switcher & Config Button */}
        <div className="topActionBtns">
          {/* Global Language Switcher */}
          <div className="langSwitchGroup" role="group" aria-label="Language selection">
            <button
              type="button"
              className={`langSwitchBtn ${locale === "zh-CN" ? "active" : ""}`}
              onClick={() => setLocale("zh-CN")}
              title="切换为简体中文"
            >
              中文
            </button>
            <span className="langSwitchDivider">/</span>
            <button
              type="button"
              className={`langSwitchBtn ${locale === "en" ? "active" : ""}`}
              onClick={() => setLocale("en")}
              title="Switch to English"
            >
              EN
            </button>
          </div>

          <button
            className="workspaceActionBtn"
            onClick={() => {
              if (isTouchEditMode) {
                handleCancelTouchEdit();
              }
              refreshProjectsList();
              setIsProjectLibraryOpen(true);
            }}
            title={t("project.library_title")}
          >
            📁 {t("project.entry_btn")}
          </button>
          <button
            className="generateReportBtn"
            onClick={() => handleOpenReportPreview()}
            disabled={manualElements.length === 0}
            title={manualElements.length === 0 ? t("toolbar.report_btn_disabled_hint") : t("toolbar.report_btn_hint")}
          >
            📊 {t("toolbar.generate_report")}
          </button>
          <button
            className="paramConfigTriggerBtn"
            onClick={() => handleOpenParamsModal("screenshot")}
            title={t("toolbar.configure_params")}
          >
            ⚙️ {t("toolbar.configure_params")}
          </button>
          <button
            className="workspaceActionBtn"
            onClick={handleNewProject}
            title={t("toolbar.new_workspace")}
          >
            {t("toolbar.new_workspace")}
          </button>
          <button
            className="workspaceActionBtn danger"
            onClick={handleClearLocalData}
            title={t("toolbar.clear_data")}
          >
            {t("toolbar.clear_data")}
          </button>
        </div>
      </header>

      {/* Central Evaluation Parameters Modal */}
      <EvaluationParametersModal
        isOpen={isParamsModalOpen}
        onClose={() => setIsParamsModalOpen(false)}
        onSave={handleSaveParameters}
        initialData={paramsModalData}
        imageWidth={imageNaturalDimensions?.width}
        imageHeight={imageNaturalDimensions?.height}
        imageName={imageName}
        initialSection={paramsModalInitialSection}
        onTriggerImageUpload={handleTriggerImageSelection}
      />

      <div className="layout canvasFirstLayout">
        <main
          className="canvasArea canvasFirst"
          onDragOver={handleCanvasDragOver}
          onDragLeave={handleCanvasDragLeave}
          onDrop={handleCanvasDrop}
        >
        {/* Replacement / Status Toast */}
        {imageReplacementNotice && (
          <div className="imageReplacementToast">
            <span>💡 {imageReplacementNotice}</span>
            <button
              type="button"
              className="toastDismissBtn"
              onClick={() => setImageReplacementNotice(null)}
            >
              ✕
            </button>
          </div>
        )}

        <div className="canvasHeader">
          <div className="canvasHeaderTitle">
            <h2>{t("canvas.title")}</h2>
            {imageName && <span className="canvasImageBadge" title={imageName}>{imageName}</span>}
          </div>
          <div className="canvasControls">
            {imageUrl && !isTouchEditMode ? (
              <>
                <button
                  type="button"
                  className="toolBtn replaceImageBtn"
                  onClick={handleTriggerImageSelection}
                  title={t("canvas.replace_image")}
                >
                  📷 {t("canvas.replace_image")}
                </button>
                <button
                  className={`toolBtn ${isAddingElement ? "active" : ""}`}
                  onClick={() => {
                    if (isTouchEditMode) {
                      handleCancelTouchEdit();
                    }
                    setIsAddingElement(!isAddingElement);
                    setColorSamplingTarget(null);
                  }}
                >
                  {isAddingElement ? `✕ ${t("canvas.cancel_add")}` : `+ ${t("canvas.add_element")}`}
                </button>
              </>
            ) : null}
            {annotations.length === 0 ? (
              <button
                type="button"
                className="toolBtn"
                onClick={runAnalysis}
                title={t("canvas.generate_mock")}
              >
                💡 {t("canvas.generate_mock")}
              </button>
            ) : (
              <div className="demoToolbarGroup" style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                <label className="toggleMockControl" style={{ margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={showDemoResults}
                    onChange={(e) => setShowDemoResults(e.target.checked)}
                  />
                  {t("canvas.show_mock")}
                </label>
              </div>
            )}

          </div>
        </div>

        {/* Touch Edit Mode Banner (Draft based) */}
        {isTouchEditMode && activeElement && touchEditSnapshot ? (
          <div className="touchEditBanner">
            <div className="touchEditBannerTitle">
              <b>✏️ {t("touch_edit.title")}</b>
              <small>{t("touch_edit.desc")}</small>
            </div>
            <div className="touchEditActions">
              <button className="workspaceActionBtn primaryButton" onClick={handleFinishTouchEdit} style={{ fontWeight: 600 }}>
                ✓ {t("touch_edit.apply")}
              </button>
              <button className="workspaceActionBtn" onClick={handleCancelTouchEdit} title="Esc">
                ✕ {t("touch_edit.cancel")} (Esc)
              </button>
              <button className="workspaceActionBtn" onClick={handleDraftResetVisualCopy} title={locale === "en" ? "Match visual bounds" : "与可视区域一致"}>
                {locale === "en" ? "Match Visual Bounds" : "与可视区域一致"}
              </button>
            </div>
          </div>
        ) : null}

        {touchToastMessage && (
          <div className="touchToast">
            <span>{touchToastMessage}</span>
          </div>
        )}

        {showRestoreNotification ? (
          <div className="restoreBanner">
            <span>📁 {locale === "en" ? "Previous local workspace restored (including uploaded screenshot and annotations)." : "已恢复上次本地工作区（包含已上传图片与人工标注）。"}</span>
            <button onClick={() => setShowRestoreNotification(false)}>✕</button>
          </div>
        ) : null}

        <div className="sessionMeta">
          <span>{t("session.current_session", { id: currentSession.session_id })}</span>
          <span>{t("session.rule_version", { version: currentSession.rule_set_version })}</span>
          {imageNaturalDimensions ? (
            <span>{t("session.natural_resolution", { width: imageNaturalDimensions.width, height: imageNaturalDimensions.height })}</span>
          ) : null}
          {logicalMapping ? (
            <span>{t("session.design_basis", { unit: logicalMapping.unit === "css_px" ? "CSS px" : logicalMapping.unit, ratio: formatScaleRatio(logicalMapping, locale) })}</span>
          ) : null}
        </div>

        {colorSamplingTarget ? (
          <div className="samplingBanner">
            <span>
              {locale === "en"
                ? `🎯 Sampling color for "${getElementDisplayName(activeElement, undefined, "en")}": `
                : `🎯 正在为「${getElementDisplayName(activeElement, undefined, "zh-CN")}」取色：`}
              <b>
                {colorSamplingTarget === "foreground"
                  ? activeElement?.element_type === "text"
                    ? (locale === "en" ? "Text Foreground" : "文字前景色")
                    : (locale === "en" ? "Foreground/Component Color" : "前景/组件颜色")
                  : (locale === "en" ? "Background Color" : "背景底色")}
              </b>
              {locale === "en" ? " (Press ESC to cancel)" : "（按 ESC 键取消）"}
            </span>
            <button onClick={() => { setColorSamplingTarget(null); setSamplingHoverPos(null); }}>
              {locale === "en" ? "Cancel Sampling" : "取消取色"}
            </button>
          </div>
        ) : null}

        {characterMeasuringElementId ? (
          <div className="samplingBanner" style={{ background: "#0284c7" }}>
            <span>
              {locale === "en"
                ? `📐 Measuring character height for "${getElementDisplayName(manualElements.find((e) => e.element_id === characterMeasuringElementId), undefined, "en")}": `
                : `📐 正在为「${getElementDisplayName(manualElements.find((e) => e.element_id === characterMeasuringElementId), undefined, "zh-CN")}」测量代表字符高度：`}
              <b>
                {locale === "en"
                  ? "Draw a tight box over a representative character height"
                  : "请在截图中紧密框选代表性字符的高度"}
              </b>
              {locale === "en" ? " (Drag to measure, press ESC to cancel)" : "（拖拽完成，按 ESC 键取消）"}
            </span>
            <button onClick={() => setCharacterMeasuringElementId(null)}>
              {locale === "en" ? "Cancel" : "取消测量"}
            </button>
          </div>
        ) : null}

        {isAddingElement ? (
          <div className="drawingHintBanner">
            <span>
              ✏️ <b>{locale === "en" ? "New Annotation Mode" : "新建圈选模式"}</b>：
              {locale === "en"
                ? "Click and drag anywhere on the canvas to annotate a new element (Press ESC or click Cancel to exit)."
                : "在设计图任意位置按下鼠标左键拖拽以框选新元素（按 ESC 键或点击取消退出）。"}
            </span>
            <button onClick={() => setIsAddingElement(false)}>
              {locale === "en" ? "Cancel" : "取消新建"}
            </button>
          </div>
        ) : null}


        {annotations.length > 0 ? (
          <div className="mockStatusBanner">
            <div className="statusNotice">
              <span className="statusBadge">{locale === "en" ? "Demo Notice" : "示例说明"}</span>
              <div className="statusTexts">
                <b>
                  {locale === "en"
                    ? "Example annotations demonstrate the interaction only. They do not represent detected content in the current image."
                    : "示例标注仅用于展示交互，不代表系统已识别当前图片内容。"}
                </b>
                {showDemoResults ? (
                  <p className="statusSubNotice">
                    {locale === "en"
                      ? "Orange dashed boxes are simulated demo overlays for interaction preview."
                      : "橙色虚线框为示例展示覆盖层，仅用于交互预览。"}
                  </p>
                ) : (
                  <p className="statusSubNotice">
                    {locale === "en"
                      ? "Demo overlays are hidden. Blue solid boxes are real user annotations."
                      : "示例标注已隐藏；蓝色实线框为用户创建的真实标注。"}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : null}

        <div className="imageContainer">
          {imageUrl ? (
            <div
              ref={imageStageRef}
              className={`imageStage ${isAddingElement ? "drawingModeActive crosshairCursor" : ""} ${colorSamplingTarget ? "samplingModeActive" : ""} ${isTouchEditMode ? "touchEditingStage" : ""}`}
              onPointerDown={handleStagePointerDown}
              onPointerMove={handleStagePointerMove}
              onPointerUp={handleStagePointerUp}
              onPointerCancel={handleStagePointerCancel}
            >
              <img
                ref={imageRef}
                src={imageUrl}
                alt="design"
                className="designImage"
                onLoad={onImageLoad}
                draggable={false}
              />

              {/* Distance Guide Line */}
              {renderDistanceGuideLine()}

              {/* Real Manual Elements: Visual Boxes & Touch Overlays */}
              {manualElements.map((el, index) => {
                const isSelected = activeElementId === el.element_id;
                const isEstimated = el.physical_geometry?.calibration_quality === "estimated";
                const isInteractive = el.interaction_type !== "none";

                // In Touch Edit Mode for active element, render the draft bounds
                const touchBounds = (isTouchEditMode && isSelected && touchEditSnapshot)
                  ? touchEditSnapshot.draft_touch_bounds
                  : el.touch_bounds;

                const hasTouchBounds = Boolean(touchBounds);

                // Overlap badge for active element touch box
                const isOverlapping = isSelected && activeNearestTouchTarget?.overlap?.is_overlapping;

                return (
                  <div key={el.element_id}>
                    {/* Visual Bounds Box (Solid Blue) */}
                    <div
                      id={`manual-ann-${el.element_id}`}
                      className={`manualBox ${isSelected ? "active" : ""} ${isEstimated ? "estimatedBox" : ""} ${isTouchEditMode && isSelected ? "touchEditLockedBox" : ""}`}
                      style={{
                        left: `${el.normalized_bounds.x * 100}%`,
                        top: `${el.normalized_bounds.y * 100}%`,
                        width: `${el.normalized_bounds.width * 100}%`,
                        height: `${el.normalized_bounds.height * 100}%`
                      }}
                      onPointerDown={(e) => handleBoxPointerDown(e, el)}
                    >
                      <span className={`manualBadge ${isEstimated ? "badge-estimated" : ""}`}>
                        #{index + 1} {getElementDisplayName(el, index, locale)}
                      </span>

                      {/* 4 Corner Resize Handles - visible when selected and NOT in touch edit or character measuring mode */}
                      {isSelected && !colorSamplingTarget && !isTouchEditMode && !characterMeasuringElementId ? (
                        <>
                          <div
                            className="resizeHandle nw"
                            onPointerDown={(e) => handleHandlePointerDown(e, el, "nw")}
                          />
                          <div
                            className="resizeHandle ne"
                            onPointerDown={(e) => handleHandlePointerDown(e, el, "ne")}
                          />
                          <div
                            className="resizeHandle sw"
                            onPointerDown={(e) => handleHandlePointerDown(e, el, "sw")}
                          />
                          <div
                            className="resizeHandle se"
                            onPointerDown={(e) => handleHandlePointerDown(e, el, "se")}
                          />
                        </>
                      ) : null}
                    </div>

                    {/* Touch Bounds Box (Indigo/Purple Dashed) - visible for selected interactive elements or during edit mode */}
                    {isInteractive && hasTouchBounds && (isSelected || isTouchEditMode) && touchBounds ? (
                      <div
                        className={`touchBox ${isSelected && isTouchEditMode ? "touchBoxActiveEdit" : "touchBoxPreview"} ${isOverlapping ? "touchBoxOverlapHighlight" : ""}`}
                        style={{
                          left: `${touchBounds.x * 100}%`,
                          top: `${touchBounds.y * 100}%`,
                          width: `${touchBounds.width * 100}%`,
                          height: `${touchBounds.height * 100}%`
                        }}
                        onPointerDown={(e) => isTouchEditMode && isSelected ? handleTouchBoxPointerDown(e) : undefined}
                      >
                        <span className={`touchBoundsBadge ${isOverlapping ? "overlapTag" : ""}`}>
                          {isOverlapping
                            ? (locale === "en" ? `⚠️ Touch Overlap (${activeNearestTouchTarget?.overlap?.overlap_area} px²)` : `⚠️ 触控重叠 (${activeNearestTouchTarget?.overlap?.overlap_area} px²)`)
                            : isTouchEditMode && isSelected && touchEditSnapshot?.draft_touch_bounds_pixel
                            ? `${t("touch_edit.preview_badge")} · ${touchEditSnapshot.draft_touch_bounds_pixel.width} × ${touchEditSnapshot.draft_touch_bounds_pixel.height} px`
                            : (locale === "en"
                                ? `Touch Bounds (${touchBoundsSourceLabels[(isTouchEditMode && touchEditSnapshot ? touchEditSnapshot.draft_touch_bounds_source : el.touch_bounds_source) || "visual_copy"]})`
                                : `触控区域 (${touchBoundsSourceLabels[(isTouchEditMode && touchEditSnapshot ? touchEditSnapshot.draft_touch_bounds_source : el.touch_bounds_source) || "visual_copy"]})`)}
                        </span>

                        {/* Touch Resize Handles in Touch Edit Mode */}
                        {isSelected && isTouchEditMode ? (
                          <>
                            <div
                              className="touchHandle nw"
                              onPointerDown={(e) => handleTouchHandlePointerDown(e, "nw")}
                            />
                            <div
                              className="touchHandle ne"
                              onPointerDown={(e) => handleTouchHandlePointerDown(e, "ne")}
                            />
                            <div
                              className="touchHandle sw"
                              onPointerDown={(e) => handleTouchHandlePointerDown(e, "sw")}
                            />
                            <div
                              className="touchHandle se"
                              onPointerDown={(e) => handleTouchHandlePointerDown(e, "se")}
                            />
                          </>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}

              {/* Simulated Mock Annotations (Dashed Orange) */}
              {showDemoResults &&
                annotations.map((a, index) => (
                  <div
                    key={a.annotation_id}
                    className={`ann ${a.severity} ${activeAnnotation?.annotation_id === a.annotation_id ? "active" : ""}`}
                    style={{
                      left: `${a.x * 100}%`,
                      top: `${a.y * 100}%`,
                      width: `${a.width * 100}%`,
                      height: `${a.height * 100}%`
                    }}
                    title={`#${index + 1} ${issueTypeLabels[a.issue_type]} / ${severityLabels[a.severity]}：${a.description}`}
                    onClick={(e) => {
                      if (colorSamplingTarget || isTouchEditMode) return;
                      e.stopPropagation();
                      handleSelectMockFinding(a.annotation_id);
                    }}
                  >
                    <span className="simulatedBadge">模拟 #{index + 1}</span>
                    <div className="annTooltip">
                      <b>#{index + 1} {issueTypeLabels[a.issue_type]} (模拟)</b>
                      <small>{severityLabels[a.severity]}</small>
                      <small>{a.description}</small>
                    </div>
                  </div>
                ))}

              {/* Live drawing box preview */}
              {renderDrawPreview()}

              {/* Magnifier Loupe Pixel Sampling Preview */}
              {colorSamplingTarget && samplingHoverPos ? (
                <div
                  className="magnifierLoupe"
                  style={{
                    left: Math.min(window.innerWidth - 130, Math.max(10, samplingHoverPos.clientX + 16)),
                    top: Math.min(window.innerHeight - 130, Math.max(10, samplingHoverPos.clientY + 16))
                  }}
                >
                  <canvas
                    ref={magnifierCanvasRef}
                    width={110}
                    height={110}
                    className="magnifierCanvas"
                  />
                  <div className="magnifierCrosshair" />
                  <span className="magnifierBadge">
                    {samplingHoverPos.hex.toUpperCase()}
                  </span>
                </div>
              ) : null}
            </div>
          ) : (
            <div
              className={`emptyCanvasContainer ${isDraggingOver ? "draggingOver" : ""}`}
              onDragOver={handleCanvasDragOver}
              onDragLeave={handleCanvasDragLeave}
              onDrop={handleCanvasDrop}
            >
              <div className="emptyCanvasCard">
                <div className="emptyCanvasIcon">🖼️</div>
                <h2 className="emptyCanvasTitle">{t("empty.title")}</h2>
                <p className="emptyCanvasDesc">
                  {t("empty.desc")}
                </p>
                <button
                  type="button"
                  className="emptyCanvasUploadBtn"
                  onClick={handleTriggerImageSelection}
                >
                  {t("empty.upload_btn")}
                </button>
                <div className="emptyCanvasDropHint">
                  <span>{t("empty.drop_hint")}</span>
                  <small className="emptyCanvasFormats">{t("empty.formats")}</small>
                </div>
              </div>
            </div>
          )}
        </div>

        {showDemoResults && annotations.length > 0 ? (
          <section className="overallSummary">
            <h2>综合评估与建议（模拟示例）</h2>
            <small>基于当前 mock analysisService 规则配置汇总生成，非真实 AI 识别。</small>
            <div className="summarySection">
              <h3>整体体验判断</h3>
              <p>
                当前页面整体结构完整，但关键交互目标尺寸、信息密度和对比度存在高优先级风险。
              </p>
            </div>
            <div className="summarySection">
              <h3>人因视角</h3>
              <p>
                在 {form.distance || "当前设定"} 观看距离下，应优先保证触控目标、间距、可读性和低负荷扫视路径。
              </p>
            </div>
          </section>
        ) : null}
      </main>

      <aside className="panel right">
        <h2>{locale === "en" ? "Evaluation & Measurements" : "评估与测量"}</h2>

        {/* Section 1: Real Manual Elements & Measurements */}
        <section className="realSection">
          <div className="sectionHeader">
            <div className="sectionTitleBlock">
              <h3>{locale === "en" ? "Real Annotations & Calculations" : "真实标注与计算"}</h3>
              <span className="badge realBadge">Real / Measured</span>
            </div>
          </div>

          <div className="calibrationControl">
            <label className="inlineLabel">
              <span>{locale === "en" ? "Screenshot Mapping:" : "截图尺寸映射："}</span>
              <select
                value={calibrationMode}
                onChange={(e) => setCalibrationMode(e.target.value as CalibrationMode)}
              >
                <option value="full_screen">{locale === "en" ? "Full-screen Screenshot" : "完整屏幕截图 (Full-screen)"}</option>
                <option value="cropped">{locale === "en" ? "Cropped / Partial Screenshot" : "局部截图 (Cropped / Partial)"}</option>
              </select>
            </label>
          </div>

          {manualElements.length === 0 ? (
            <p className="emptyHint">
              {!imageUrl
                ? (locale === "en" ? "No design image uploaded yet. Please upload a screenshot in the canvas to begin annotation." : "暂未上传设计图。请在中央画布上传截图后开始标注。")
                : (locale === "en" ? "No annotations yet. Click \"+ New Annotation\" in the toolbar to draw bounding boxes." : "暂无人工标注。在上方工具栏点击“+ 新建圈选元素”在图片上圈选真实控件以获取尺寸与规则评估。")}
            </p>
          ) : (
            <>
              <div className="resultOverview">
                <span>{locale === "en" ? "Annotated Elements: " : "已标注元素 "}<b>{manualElements.length}</b></span>
              </div>
              <div className="elementList">
                {manualElements.map((el, index) => {
                  const elModules = getApplicableEvaluationModules(el.element_type);
                  const nearest = imageNaturalDimensions
                    ? calculateNearestTouchTarget(el, manualElements, imageNaturalDimensions.width, imageNaturalDimensions.height, logicalMapping)
                    : null;
                  const presentation = buildElementPresentationModel(el, evaluationContext, nearest, mappingPlatform, manualElements, locale);

                  return (
                    <div
                      key={el.element_id}
                      className={`elementCard ${activeElementId === el.element_id ? "active" : ""}`}
                      onClick={() => handleSelectManualElement(el.element_id, "inspector")}
                    >
                      <div className="elementCardTopRow">
                        {elementThumbnails[el.element_id] ? (
                          <img
                            src={elementThumbnails[el.element_id]}
                            alt={locale === "en" ? `#${index + 1} Thumbnail` : `#${index + 1} 缩略图`}
                            className="elementCardThumbImg"
                          />
                        ) : null}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="elementCardHeader">
                            <b style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>
                              #{index + 1} {getElementDisplayName(el, index, locale)}
                            </b>
                            <span className="typeBadge">
                              {presentation.elementTypeLabel}
                            </span>
                          </div>
                          <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "3px", minWidth: 0, flexWrap: "wrap" }}>
                            <span className={`conclusionBadge ${presentation.conclusionStateBadgeClass}`} style={{ fontSize: "10px" }}>
                              {presentation.conclusionStateLabel}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="elementCardMetrics">
                        <span>{locale === "en" ? "Visual: " : "可视："}<b>{presentation.visualPxDisplay}</b></span>
                        {presentation.isLogicalConfigured && (
                          <span>{locale === "en" ? "Design: " : "设计："}<b>{presentation.logicalDisplay}</b></span>
                        )}
                        {presentation.isPhysicalAvailable ? (
                          <span className="calibratedText">
                            {locale === "en" ? "Physical: " : "物理："}<b>{presentation.physicalDisplay}</b> ({presentation.physicalProvenance})
                          </span>
                        ) : null}
                        {presentation.isVisualAngleAvailable && (
                          <span className="calibratedText" style={{ color: "#0284c7" }}>
                            {locale === "en" ? "Visual Angle: " : "视角："}<b>{presentation.visualAngleDisplay}</b> ({presentation.visualAngleViewingDistanceDisplay})
                          </span>
                        )}
                        <span className="calibratedText">
                          {locale === "en" ? "Area: " : "面积："}{presentation.visualAreaDisplay} · {presentation.screenShareDisplay}
                        </span>
                        {presentation.isText ? (
                          <span className="calibratedText">
                            {locale === "en" ? "Font Size: " : "字号："}{presentation.textSizeDisplay}
                          </span>
                        ) : null}
                        {presentation.isInteractive ? (
                          <span>
                            {locale === "en" ? "Touch: " : "触控："}{presentation.touchDimensionsDisplay ? <b>{presentation.touchDimensionsDisplay}</b> : (locale === "en" ? "Unset" : "未配置")} · {presentation.touchProvenanceLabel}
                          </span>
                        ) : (
                          <span className="hint">{locale === "en" ? "Non-interactive" : "不可交互"}</span>
                        )}
                      </div>

                      {/* Nearest Spacing Row if interactive */}
                      {presentation.isInteractive ? (
                        <div className="elementMetricRow">
                          <span>{locale === "en" ? "Adjacent: " : "相邻："}<b>{presentation.nearestSpacingDisplay}</b></span>
                        </div>
                      ) : null}

                      {/* Contrast status summary */}
                      {presentation.hasContrast ? (
                        <div className="elementContrastSummary">
                          <span>{locale === "en" ? "Contrast: " : "对比度："}<b>{presentation.contrastRatioDisplay}</b></span>
                          <span className={`badge ${presentation.contrastPassed ? "suitability-suitable" : "suitability-risk"}`}>
                            {presentation.contrastStatusLabel}
                          </span>
                        </div>
                      ) : (
                        elModules.includes("text_contrast") || elModules.includes("non_text_contrast") ? (
                          <div className="elementContrastSummary pending">
                            <span className="pendingText">{locale === "en" ? "🎨 Contrast: Sample colors to evaluate" : "🎨 对比度：待取色检查"}</span>
                          </div>
                        ) : null
                      )}

                      {/* Evaluation Conclusion & Actionable Findings */}
                      <div className="elementCardConclusionSection mt-2">
                        {presentation.actionableFindings.length > 0 ? (() => {
                          const grouped = groupActionableFindings(presentation.actionableFindings);
                          return (
                            <>
                              {presentation.conclusionState === "meets_reference" && (
                                <div
                                  className="elementCardConclusionRow state-meets_reference"
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "flex-start",
                                    gap: "6px",
                                    background: presentation.conclusionPresentation.bgHex,
                                    padding: "6px 8px",
                                    borderRadius: "6px",
                                    border: `1px solid ${presentation.conclusionPresentation.borderHex}`,
                                    marginBottom: "4px",
                                    width: "100%",
                                    minWidth: 0
                                  }}
                                >
                                  <span className={`conclusionBadge ${presentation.conclusionPresentation.badgeClass}`} style={{ fontSize: "10.5px" }}>
                                    {presentation.conclusionPresentation.label}
                                  </span>
                                  <span className="elementCardConclusionText" style={{ fontSize: "11.5px", color: "#334155", lineHeight: 1.45, width: "100%", minWidth: 0, wordBreak: "normal", overflowWrap: "break-word" }}>
                                    {presentation.conclusion}
                                  </span>
                                </div>
                              )}
                              <div className="problemOverviewBlock" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                <div style={{ fontWeight: 600, fontSize: "11px", color: "#334155", marginBottom: "2px" }}>
                                  {locale === "en" ? `Issues Requiring Attention (${presentation.actionableFindings.length})` : `需关注的问题清单（${presentation.actionableFindings.length} 项）`}
                                </div>
                                <div className="groupedFindingsContainer" style={{ gap: "4px" }}>
                                  {grouped.belowThreshold.length > 0 && (
                                    <div className="findingGroup groupBelowThreshold" style={{ padding: "4px 8px" }}>
                                      <div className="findingGroupHeader" style={{ fontSize: "11px" }}>❌ {locale === "en" ? "Below the basic requirement" : "不满足基本要求"}</div>
                                      <ul className="findingGroupList" style={{ fontSize: "11px", paddingLeft: "14px" }}>
                                        {grouped.belowThreshold.map((f) => (
                                          <li key={f.id}><b>{f.metricLabel}{locale === "en" ? ": " : "："}</b>{f.summaryText}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {grouped.belowRecommended.length > 0 && (
                                    <div className="findingGroup groupBelowRecommended" style={{ padding: "4px 8px" }}>
                                      <div className="findingGroupHeader" style={{ fontSize: "11px" }}>⚠️ {locale === "en" ? "Meets the basic requirement, but below the recommended range" : "满足基本要求，但未达推荐范围"}</div>
                                      <ul className="findingGroupList" style={{ fontSize: "11px", paddingLeft: "14px" }}>
                                        {grouped.belowRecommended.map((f) => (
                                          <li key={f.id}><b>{f.metricLabel}{locale === "en" ? ": " : "："}</b>{f.summaryText}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {grouped.needsInfo.length > 0 && (
                                    <div className="findingGroup groupNeedsInfo" style={{ padding: "4px 8px" }}>
                                      <div className="findingGroupHeader" style={{ fontSize: "11px" }}>ℹ️ {locale === "en" ? "Additional information required" : "待补充信息"}</div>
                                      <ul className="findingGroupList" style={{ fontSize: "11px", paddingLeft: "14px" }}>
                                        {grouped.needsInfo.map((f) => (
                                          <li key={f.id}><b>{f.metricLabel}{locale === "en" ? ": " : "："}</b>{f.summaryText}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </>
                          );
                        })() : (
                          <div
                            className={`elementCardConclusionRow state-${presentation.conclusionState}`}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "flex-start",
                              gap: "6px",
                              background: presentation.conclusionPresentation.bgHex,
                              padding: "6px 8px",
                              borderRadius: "6px",
                              border: `1px solid ${presentation.conclusionPresentation.borderHex}`,
                              width: "100%",
                              minWidth: 0
                            }}
                          >
                            <span className={`conclusionBadge ${presentation.conclusionPresentation.badgeClass}`} style={{ fontSize: "10.5px" }}>
                              {presentation.conclusionPresentation.label}
                            </span>
                            <span className="elementCardConclusionText" style={{ fontSize: "11.5px", color: "#334155", lineHeight: 1.45, width: "100%", minWidth: 0, wordBreak: "normal", overflowWrap: "break-word" }}>
                              {presentation.conclusion}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="elementCardFooter">
                        <button
                          className="viewDetailBtn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenElementInspector(el.element_id);
                          }}
                        >
                          {locale === "en" ? "View Evaluation / Edit Properties →" : "查看评估 / 编辑属性 →"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>

        {showDemoResults && annotations.length > 0 && (
        /* Section 2: Simulated Preview Findings */
        <section className="simulatedSection">
          <div className="sectionHeader">
            <div className="sectionTitleBlock">
              <h3>模拟评估结果</h3>
              <span className="badge simulatedBadge">Simulated Preview</span>
            </div>
          </div>

          <div className="resultOverview">
            <span>示例问题数 <b>{annotations.length}</b></span>
            <span>示例高风险 <b>{highRiskCount}</b></span>
            <span>当前选中 <b>{activeIndex >= 0 ? `#${activeIndex + 1}` : "无"}</b></span>
          </div>

          <div className="summaryList">
            {annotations.map((a, index) => (
              <button
                key={a.annotation_id}
                className={`summaryItem ${activeAnnotation?.annotation_id === a.annotation_id ? "active" : ""}`}
                onClick={() => handleSelectMockFinding(a.annotation_id)}
              >
                <div className="summaryItemHeader">
                  <b>#{index + 1} {issueTypeLabels[a.issue_type]}</b>
                  <span className={`badge severity-${a.severity}`}>{severityLabels[a.severity]}</span>
                </div>
                <p className="summaryItemDesc">{a.description}</p>
                <div className="summaryItemFooter">
                  <span className="summaryItemCoord">模拟标注 #{index + 1}</span>
                  <span className="viewDetailLink">查看推断 →</span>
                </div>
              </button>
            ))}
          </div>
        </section>
        )}

        {/* Element Inspector Drawer (Multi-Section) */}
        {isElementInspectorOpen && (effectiveInspectorElement || inspectorElement) ? (() => {
          const targetElement = (effectiveInspectorElement || inspectorElement)!;
          const targetIndex = inspectorElementIndex >= 0 ? inspectorElementIndex : activeElementIndex;
          const presentationPolicy = getEvaluationPresentationPolicy(evaluationMode);
          const presentation = buildElementPresentationModel(
            targetElement,
            evaluationContext,
            inspectorNearestTouchTarget,
            mappingPlatform,
            manualElements,
            locale
          );
          const unifiedExplanation = presentation.unifiedExplanation;

          const isInteractive = targetElement.interaction_type !== "none";

          const primaryCapability =
            targetElement.element_type === "text"
              ? inspectorCapabilities?.typography
              : targetElement.interaction_type !== "none"
              ? inspectorCapabilities?.platform_target_size
              : targetElement.physical_geometry?.is_calibrated
              ? inspectorCapabilities?.physical_geometry
              : inspectorCapabilities?.visual_geometry;

          const primaryTier = primaryCapability?.highestAvailableTier || "screenshot_fact";

          // Rule Comparison Traces
          const inspectorScenarioScope = deriveScenarioScope(form.scenario, contextEnvironment, contextOperationState, form.scenarioDomain);
          const targetSizeTrace = isInteractive ? buildTargetSizeTrace(targetElement, logicalMapping, inspectorWcagSpacing || undefined, mappingPlatform) : null;
          const touchPhysicalTrace = isInteractive && imageNaturalDimensions ? buildTouchPhysicalTrace(targetElement, inspectorScenarioScope, mmPerPixel, targetElement.calibration_mode || calibrationMode, imageNaturalDimensions.width, imageNaturalDimensions.height, locale) : null;
          const contrastTrace = targetElement.contrast_evaluation ? buildContrastTrace(targetElement.contrast_evaluation) : null;
          const textSizeTrace = targetElement.element_type === "text" ? buildTextSizeTrace(targetElement.text_size_evaluation, logicalMapping, mappingPlatform) : null;
          const spacingTrace = isInteractive && inspectorNearestTouchTarget ? buildSpacingTrace(inspectorNearestTouchTarget, logicalMapping, targetElement, contextOperationState, locale) : null;
          const physicalTrace = buildPhysicalGeometryTrace(targetElement, targetElement.calibration_mode || calibrationMode, locale);
          const charVaTrace = targetElement.element_type === "text"
            ? buildCharacterVisualAngleTrace(targetElement, inspectorScenarioScope, undefined, form.distance, locale)
            : null;
          const graphicVaTrace = targetElement.element_type === "icon" || targetElement.text_visual_measurement_target === "symbol"
            ? buildGraphicalVisualAngleTrace(targetElement, inspectorScenarioScope, undefined, form.distance, locale)
            : null;

          const { mainTraces: inspectorMainTraces, moreMeasurements: inspectorMoreMeasurements } = sortAndPartitionRuleTraces([
            targetSizeTrace,
            touchPhysicalTrace,
            contrastTrace,
            textSizeTrace,
            spacingTrace,
            physicalTrace,
            charVaTrace,
            graphicVaTrace
          ]);


          return (
            <div
              className={`detailDrawerOverlay ${colorSamplingTarget ? "samplingActiveOverlay" : ""}`}
            >
              <div className="detailDrawer" ref={inspectorDrawerRef} onClick={(e) => e.stopPropagation()}>
                <div className="drawerHeader">
                  <div style={{ display: "flex", gap: "10px", alignItems: "center", width: "100%" }}>
                    {elementThumbnails[targetElement.element_id] ? (
                      <div className="inspectorHeaderThumbBox">
                        <img
                          src={elementThumbnails[targetElement.element_id]}
                          alt={locale === "en" ? `#${targetIndex + 1} Context thumbnail` : `#${targetIndex + 1} 上下文微缩图`}
                          className="inspectorHeaderThumbImg"
                        />
                      </div>
                    ) : null}
                    <div className="drawerTitleBlock" style={{ flex: 1, minWidth: 0 }}>
                      <div className="headerWithBadge">
                        <h3 style={{ margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {getElementDisplayName(targetElement, targetIndex, locale)}
                        </h3>
                        <span className={`inspectorTierBadge tier-${primaryTier}`}>
                          ✓ {getEvaluationTierLabel(primaryTier, locale)}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "3px", minWidth: 0, flexWrap: "wrap" }}>
                        <span className="typeBadge">
                          {presentation.elementTypeLabel} · {presentation.interactionTypeLabel}
                        </span>
                        <span className={`conclusionBadge ${presentation.conclusionStateBadgeClass}`} style={{ fontSize: "10px" }}>
                          {presentation.conclusionStateLabel}
                        </span>
                      </div>
                    </div>
                    <button className="closeDrawerBtn" onClick={() => setIsElementInspectorOpen(false)}>✕</button>
                  </div>
                </div>

                <div className="drawerBody" ref={inspectorScrollContainerRef}>
                  {/* SECTION 1: 元素与标注信息 (Editable Element & Annotation Controls) */}
                  <div className="drawerSection">
                    <h4>{t("inspector.section_element_info")}</h4>
                    <label>
                      {locale === "en" ? "Element Name: " : "元素名称："}
                      <input
                        value={targetElement.label || ""}
                        placeholder={locale === "en" ? "e.g. Purchase Button, Price Text" : "如：购买按钮、价格文字"}
                        onChange={(e) => updateManualElement(targetElement.element_id, { label: e.target.value })}
                      />
                    </label>
                    <label>
                      {locale === "en" ? "Element Type: " : "元素类型："}
                      <select
                        value={targetElement.element_type}
                        onChange={(e) => {
                          const nextType = e.target.value as ElementType;
                          updateManualElement(targetElement.element_id, {
                            element_type: nextType
                          });
                        }}
                      >
                        {Object.entries(elementTypeLabels).map(([key, label]) => (
                          <option key={key} value={key}>{locale === "en" ? (key.charAt(0).toUpperCase() + key.slice(1)) : label}</option>
                        ))}
                      </select>
                    </label>

                    {/* Screenshot mode override for this element */}
                    <label className="mt-2">
                      {locale === "en" ? "Screenshot Mapping: " : "截图映射模式："}
                      <select
                        value={targetElement.calibration_mode || calibrationMode}
                        onChange={(e) => updateManualElement(targetElement.element_id, { calibration_mode: e.target.value as CalibrationMode })}
                      >
                        <option value="full_screen">{locale === "en" ? "Full Screen (Full Screen)" : "完整界面 / 屏幕 (Full Screen)"}</option>
                        <option value="cropped">{locale === "en" ? "Cropped Area (Cropped / Partial)" : "局部截图 (Cropped / Partial)"}</option>
                      </select>
                    </label>

                    {/* Text specific controls: Unified "文字测量与字号" */}
                    {targetElement.element_type === "text" && (
                      <div className="typographyForm mt-2" style={{ padding: "10px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "6px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                          <b style={{ color: "#0f172a", fontSize: "12px" }}>{locale === "en" ? "Typography & Character Height" : "文字测量与字号"}</b>
                          {targetElement.text_size_source === "user_confirmed" ? (
                            <span className="badge status" style={{ fontSize: "10px" }}>{locale === "en" ? "Font Confirmed" : "字号人工确认"}</span>
                          ) : targetElement.character_height_px ? (
                            <span className="badge status" style={{ fontSize: "10px", background: "#dcfce7", color: "#15803d" }}>{locale === "en" ? "Character Measured" : "字符已测量"}</span>
                          ) : targetElement.text_layout === "single_line" || targetElement.text_visual_measurement_target === "single_rendered_line" ? (
                            <span className="badge" style={{ fontSize: "10px", background: "#e0e7ff", color: "#3730a3" }}>{locale === "en" ? "Single Line" : "单行已测量"}</span>
                          ) : (
                            <span className="badge" style={{ fontSize: "10px", background: "#f1f5f9", color: "#64748b" }}>{locale === "en" ? "Pending Measurement" : "待确认/待测量"}</span>
                          )}
                        </div>

                        {/* Text Role & Layout */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
                          <div>
                            <label style={{ margin: "0 0 2px 0", fontSize: "11px" }}>
                              <DefinitionTerm termId="text_role">{locale === "en" ? "Text Role: " : "文字角色："}</DefinitionTerm>
                            </label>
                            <select
                              value={targetElement.text_role || "body"}
                              onChange={(e) => updateManualElement(targetElement.element_id, { text_role: e.target.value as TextRole })}
                            >
                              <option value="body">{locale === "en" ? "Body (Body)" : "正文 (Body)"}</option>
                              <option value="caption">{locale === "en" ? "Caption (Caption)" : "说明/注脚 (Caption)"}</option>
                              <option value="label">{locale === "en" ? "Label (Label)" : "标签/表单 (Label)"}</option>
                              <option value="heading">{locale === "en" ? "Heading (Heading)" : "标题 (Heading)"}</option>
                            </select>
                          </div>
                          <div>
                            <label style={{ margin: "0 0 2px 0", fontSize: "11px" }}>
                              <DefinitionTerm termId="text_layout">{locale === "en" ? "Text Layout: " : "文字排版："}</DefinitionTerm>
                            </label>
                            <select
                              value={targetElement.text_layout || "single_line"}
                              onChange={(e) => {
                                const layout = e.target.value as TextLayout;
                                updateManualElement(targetElement.element_id, {
                                  text_layout: layout,
                                  text_visual_measurement_target: layout === "multi_line"
                                    ? (targetElement.text_visual_measurement_target || "whole_text_bounds")
                                    : "single_rendered_line"
                                });
                              }}
                            >
                              <option value="single_line">{locale === "en" ? "Single-line" : "单行排版 (Single-line)"}</option>
                              <option value="multi_line">{locale === "en" ? "Multi-line" : "多行段落 (Multi-line)"}</option>
                            </select>
                          </div>
                        </div>

                        {/* Measurement Target selector for Multi-line text */}
                        {targetElement.text_layout === "multi_line" && (
                          <div style={{ marginBottom: "8px" }}>
                            <label style={{ margin: "0 0 2px 0", fontSize: "11px", display: "flex", justifyContent: "space-between" }}>
                              <span>{locale === "en" ? "Visual Target:" : "当前框选区域："}</span>
                              <span style={{ color: "#64748b", fontSize: "10px" }}>
                                {targetElement.text_visual_measurement_target === "single_rendered_line"
                                  ? (locale === "en" ? "Single Line Area" : "已指定为单行区域")
                                  : (locale === "en" ? "Whole Text Box" : "整段多行外框")}
                              </span>
                            </label>
                            <select
                              value={targetElement.text_visual_measurement_target || "whole_text_bounds"}
                              onChange={(e) => {
                                const target = e.target.value as TextVisualMeasurementTarget;
                                updateManualElement(targetElement.element_id, {
                                  text_visual_measurement_target: target
                                });
                              }}
                            >
                              <option value="whole_text_bounds">{locale === "en" ? "Whole Text Box (Whole Text Box)" : "完整多行文本框 (Whole Text Box)"}</option>
                              <option value="single_rendered_line">{locale === "en" ? "Single Line Area (Single Rendered Line)" : "单行文字区域 (Single Rendered Line)"}</option>
                            </select>
                          </div>
                        )}

                        {/* Visual Bounds & Single Line Measurements */}
                        <div className="textVisualHeightRow mb-2" style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "4px", padding: "6px 8px", fontSize: "11px" }}>
                          {targetElement.text_layout === "single_line" || targetElement.text_visual_measurement_target === "single_rendered_line" ? (
                            <div>
                              <div style={{ color: "#0f172a", fontWeight: 600 }}>
                                {locale === "en" ? "Single-line Visual Height: " : "单行可视高度："}<b>{targetElement.image_pixel_bounds.height} px</b>
                              </div>
                              <div style={{ color: "#475569", marginTop: "2px", lineHeight: "1.4" }}>
                                {presentation.textDesignHeightDisplay && (
                                  <div>{locale === "en" ? "Design Height: " : "设计空间高度："}<b>{presentation.textDesignHeightDisplay}</b></div>
                                )}
                                {presentation.textPhysicalHeightDisplay && (
                                  <div>{locale === "en" ? "Physical Height: " : "物理高度："}<b>{presentation.textPhysicalHeightDisplay}</b></div>
                                )}
                                {presentation.textVisualAngleDisplay && (
                                  <div>{locale === "en" ? "Vertical Visual Angle: " : "单行垂直视觉角："}<b>{presentation.textVisualAngleDisplay}</b></div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div style={{ color: "#0f172a", fontWeight: 600 }}>
                                {locale === "en" ? "Multi-line Visual Bounds Height: " : "完整文本可视框高："}<b>{targetElement.image_pixel_bounds.height} px</b>
                              </div>
                              <div style={{ color: "#64748b", fontSize: "10.5px", marginTop: "2px" }}>
                                {locale === "en"
                                  ? "Multi-line bounding box includes line height and breaks. For single-line metrics, switch to Single Line Area."
                                  : "多行完整文本框高度包含行高与折行，不代表单行文字高度。若框选为单行，请切换为“单行文字区域”。"}
                              </div>
                            </div>
                          )}
                          {presentation.textVisualShareDisplay && (
                            <div style={{ marginTop: "4px", color: "#64748b", fontSize: "10.5px" }}>
                              {locale === "en" ? "Screen Height Share: " : "屏幕高度占比："}{presentation.textVisualShareDisplay}
                              {presentation.relativeTypographyDisplay && (
                                <span style={{ marginLeft: "6px", color: "#2563eb", background: "#eff6ff", padding: "1px 6px", borderRadius: "4px" }}>
                                  {presentation.relativeTypographyDisplay}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Font Size row */}
                        <div style={{ borderTop: "1px dashed #e2e8f0", paddingTop: "8px", marginBottom: "8px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <label style={{ margin: 0, fontSize: "11px", fontWeight: 600 }}>
                              <DefinitionTerm termId="font_size">{locale === "en" ? "Source Font Size: " : "源设计字号："}</DefinitionTerm>
                              <span style={{ fontWeight: "normal", color: targetElement.text_size_source === "user_confirmed" ? "#0f172a" : "#64748b", marginLeft: "4px" }}>
                                {presentation.textSizeDisplay}
                              </span>
                            </label>
                            {targetElement.text_size_source === "user_confirmed" && (
                              <button
                                type="button"
                                className="smallAddBtn"
                                style={{ fontSize: "10px", padding: "1px 6px" }}
                                onClick={() => {
                                  updateManualElement(targetElement.element_id, {
                                    text_size_value: undefined,
                                    text_size_source: "estimated_from_visual_bounds"
                                  });
                                }}
                              >
                                {locale === "en" ? "Clear Confirmation" : "清除人工确认"}
                              </button>
                            )}
                          </div>
                          <div className="textSizeInputRow mt-1">
                            <div className="textSizeInputGroup">
                              <input
                                type="number"
                                step="0.5"
                                placeholder={locale === "en" ? "Enter font size (e.g. 16)" : "输入或修改确认字号 (如 16)"}
                                value={targetElement.text_size_value !== undefined && targetElement.text_size_source === "user_confirmed" ? targetElement.text_size_value : ""}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  if (!isNaN(val) && val > 0) {
                                    updateManualElement(targetElement.element_id, {
                                      text_size_value: val,
                                      text_size_unit: (targetElement.text_size_unit || (mappingPlatform === "ios" ? "pt" : mappingPlatform === "android" ? "sp" : mappingPlatform === "web" ? "CSS px" : "pt")) as TextSizeUnit,
                                      text_size_source: "user_confirmed"
                                    });
                                  } else if (e.target.value === "") {
                                    updateManualElement(targetElement.element_id, {
                                      text_size_value: undefined,
                                      text_size_source: "estimated_from_visual_bounds"
                                    });
                                  }
                                }}
                              />
                              <span>{targetElement.text_size_unit || (mappingPlatform === "ios" ? "pt" : mappingPlatform === "android" ? "sp" : mappingPlatform === "web" ? "CSS px" : "pt")}</span>
                            </div>
                          </div>
                        </div>

                        {/* Screenshot Font Size Estimate (Heuristic) */}
                        <div style={{ borderTop: "1px dashed #e2e8f0", paddingTop: "8px", marginBottom: "8px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <label style={{ margin: 0, fontSize: "11px", fontWeight: 600 }}>
                              {locale === "en" ? "Screenshot Font Estimate: " : "截图字号估算："}
                              <span style={{ fontWeight: "normal", color: presentation.estimatedTextSizeStatus === "available" ? "#0f172a" : "#64748b", marginLeft: "4px" }}>
                                {presentation.estimatedTextSizeDisplay}
                              </span>
                            </label>
                            {presentation.estimatedTextSizeSourceLabel && (
                              <span className="badge" style={{ fontSize: "9.5px", background: "#fef3c7", color: "#92400e" }}>
                                {presentation.estimatedTextSizeSourceLabel}
                              </span>
                            )}
                          </div>
                          {presentation.estimatedTextSizeGuidance && (
                            <div style={{ fontSize: "10.5px", color: "#64748b", marginTop: "3px" }}>
                              {presentation.estimatedTextSizeGuidance}
                            </div>
                          )}
                          {presentation.estimatedTextSizeAdvisory && (
                            <div style={{ fontSize: "10.5px", color: "#0369a1", background: "#f0f9ff", padding: "4px 6px", borderRadius: "4px", marginTop: "4px", border: "1px solid #e0f2fe" }}>
                              💡 {presentation.estimatedTextSizeAdvisory}
                            </div>
                          )}
                        </div>

                        {/* Representative Character Measurement */}
                        <div style={{ borderTop: "1px dashed #e2e8f0", paddingTop: "8px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "11px", fontWeight: 600, color: "#334155" }}>
                              {locale === "en" ? "Representative Character Height:" : "代表字符测量（渲染事实）："}
                            </span>
                            {targetElement.character_height_px ? (
                              <span className="badge status" style={{ fontSize: "9.5px", background: "#dcfce7", color: "#15803d" }}>{locale === "en" ? "Measured" : "已测量"}</span>
                            ) : (
                              <span className="badge" style={{ fontSize: "9.5px", background: "#f1f5f9", color: "#64748b" }}>{locale === "en" ? "Unmeasured" : "未测量"}</span>
                            )}
                          </div>

                          {targetElement.character_height_px ? (
                            <div className="mt-1" style={{ fontSize: "11.5px", color: "#334155", background: "#ffffff", padding: "6px 8px", borderRadius: "4px", border: "1px solid #e2e8f0" }}>
                              <div>
                                <span>{locale === "en" ? "Pixel Height: " : "像素高度："}<b>{targetElement.character_height_px} px</b></span>
                                {targetElement.image_pixel_bounds.height > 0 && targetElement.character_height_px > targetElement.image_pixel_bounds.height + 0.01 ? (
                                  <span className="ml-2" style={{ color: "#b91c1c", fontWeight: 600 }}>{locale === "en" ? "⚠️ Measurement invalid, please re-draw" : "⚠️ 代表字符测量异常，请重新框选"}</span>
                                ) : (
                                  <>
                                    {presentation.characterHeightDesignDisplay && (
                                      <span className="ml-2">{locale === "en" ? " · Design Height: " : " · 代表字符设计空间高度："}<b>{presentation.characterHeightDesignDisplay}</b></span>
                                    )}
                                    {targetElement.character_height_physical_mm ? (
                                      <span className="ml-2">{locale === "en" ? " · Physical Height: ≈ " : " · 物理高度：约 "}<b>{formatNumericValue(targetElement.character_height_physical_mm, 2)} mm</b></span>
                                    ) : null}
                                    {targetElement.character_height_visual_angle ? (
                                      <span className="ml-2">{locale === "en" ? " · Visual Angle: " : " · 垂直视角："}<b>{formatNumericValue(targetElement.character_height_visual_angle.arcmin, 1)}′ ({formatNumericValue(targetElement.character_height_visual_angle.deg, 2)}°)</b></span>
                                    ) : null}
                                  </>
                                )}
                              </div>
                              <div className="mt-2" style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                                <button
                                  type="button"
                                  className="smallAddBtn"
                                  style={{ fontSize: "11px", padding: "2px 8px" }}
                                  onClick={() => setCharacterMeasuringElementId(targetElement.element_id)}
                                >
                                  {locale === "en" ? "📐 Re-measure Box" : "📐 重新框选测量"}
                                </button>
                                <button
                                  type="button"
                                  className="toolBtn smallBtn"
                                  style={{ fontSize: "11px", padding: "2px 8px" }}
                                  onClick={() => {
                                    const inputVal = prompt(
                                      locale === "en" ? "Enter representative character pixel height (px):" : "请输入代表字符像素高度 (px)：",
                                      String(targetElement.character_height_px || "")
                                    );
                                    if (inputVal !== null) {
                                      const num = parseFloat(inputVal);
                                      if (!isNaN(num) && num > 0) {
                                        updateManualElement(targetElement.element_id, {
                                          character_height_px: num,
                                          character_height_source: "measured_rendered_character"
                                        });
                                      }
                                    }
                                  }}
                                >
                                  {locale === "en" ? "Manual Input" : "手动输入"}
                                </button>
                                <button
                                  type="button"
                                  className="toolBtn smallBtn"
                                  style={{ fontSize: "11px", padding: "2px 8px" }}
                                  onClick={() => {
                                    updateManualElement(targetElement.element_id, {
                                      character_height_px: undefined,
                                      character_height_source: "unmeasured",
                                      character_height_physical_mm: undefined,
                                      character_height_visual_angle: undefined
                                    });
                                  }}
                                >
                                  {locale === "en" ? "Clear Measurement" : "清除测量"}
                                </button>
                              </div>
                            </div>
                          ) : (() => {
                            const isSingleLineCandidate = targetElement.element_type === "text" && (
                              targetElement.text_layout === "single_line" ||
                              targetElement.text_visual_measurement_target === "single_rendered_line"
                            );
                            const hasConfirmedCharacterMeasurement = Boolean(
                              targetElement.character_height_px &&
                              ["measured_rendered_character", "confirmed_element_bounds"].includes(targetElement.character_height_source || "")
                            );
                            const showSingleLineRecommendation = isSingleLineCandidate && !hasConfirmedCharacterMeasurement;

                            if (showSingleLineRecommendation) {
                              return (
                                <div className="mt-2" style={{ background: "#f8fafc", padding: "8px 10px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                                  <div style={{ fontSize: "11px", color: "#475569", lineHeight: "1.5", marginBottom: "8px" }}>
                                    {locale === "en" ? (
                                      <>
                                        Basic measurements currently use the rendered single-line height.<br />
                                        If the current bounds closely fit the text vertically, you can confirm <b>{targetElement.image_pixel_bounds.height} px</b> as the representative character height.
                                      </>
                                    ) : (
                                      <>
                                        当前基于单行可视高度进行基础估算。<br />
                                        若当前框已贴合文字上下边界，可直接将 <b>{targetElement.image_pixel_bounds.height} px</b> 确认为代表字符高度。
                                      </>
                                    )}
                                  </div>

                                  <div style={{ marginBottom: "10px" }}>
                                    <button
                                      type="button"
                                      className="workspaceActionBtn primaryButton"
                                      style={{ fontSize: "12px", padding: "5px 12px", fontWeight: 600, width: "100%", justifyContent: "center" }}
                                      onClick={() => {
                                        updateManualElement(targetElement.element_id, {
                                          character_height_px: targetElement.image_pixel_bounds.height,
                                          character_height_source: "confirmed_element_bounds"
                                        });
                                      }}
                                    >
                                      {locale === "en"
                                        ? `✓ Use Current Bounds · ${targetElement.image_pixel_bounds.height} px`
                                        : `✓ 使用当前框高 ${targetElement.image_pixel_bounds.height} px`}
                                    </button>
                                  </div>

                                  <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "6px" }}>
                                    {locale === "en" ? "Other measurement options:" : "其他测量方式："}
                                  </div>

                                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                                    <button
                                      type="button"
                                      className="workspaceActionBtn"
                                      style={{
                                        fontSize: "11px",
                                        padding: "3px 8px",
                                        background: characterMeasuringElementId === targetElement.element_id ? "#dbeafe" : undefined,
                                        borderColor: characterMeasuringElementId === targetElement.element_id ? "#3b82f6" : undefined
                                      }}
                                      onClick={() => {
                                        if (isTouchEditMode) handleCancelTouchEdit();
                                        if (characterMeasuringElementId === targetElement.element_id) {
                                          setCharacterMeasuringElementId(null);
                                        } else {
                                          setCharacterMeasuringElementId(targetElement.element_id);
                                        }
                                      }}
                                    >
                                      {characterMeasuringElementId === targetElement.element_id
                                        ? (locale === "en" ? "⏳ Drawing (drag on canvas)" : "⏳ 正在框选（在图上拖拽）")
                                        : (locale === "en" ? "📐 Measure a Character" : "📐 框选代表字符")}
                                    </button>
                                    <button
                                      type="button"
                                      className="workspaceActionBtn"
                                      style={{ fontSize: "11px", padding: "3px 8px" }}
                                      onClick={() => {
                                        const inputVal = prompt(
                                          locale === "en" ? "Enter representative character pixel height (px):" : "请输入代表字符像素高度 (px)：",
                                          String(targetElement.image_pixel_bounds.height)
                                        );
                                        if (inputVal !== null) {
                                          const num = parseFloat(inputVal);
                                          if (!isNaN(num) && num > 0) {
                                            updateManualElement(targetElement.element_id, {
                                              character_height_px: num,
                                              character_height_source: "measured_rendered_character"
                                            });
                                          }
                                        }
                                      }}
                                    >
                                      {locale === "en" ? "📏 Enter Manually" : "📏 手动输入"}
                                    </button>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div className="mt-1" style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                                <button
                                  type="button"
                                  className="workspaceActionBtn"
                                  style={{
                                    fontSize: "11px",
                                    padding: "3px 8px",
                                    background: characterMeasuringElementId === targetElement.element_id ? "#dbeafe" : undefined,
                                    borderColor: characterMeasuringElementId === targetElement.element_id ? "#3b82f6" : undefined
                                  }}
                                  onClick={() => {
                                    if (isTouchEditMode) handleCancelTouchEdit();
                                    if (characterMeasuringElementId === targetElement.element_id) {
                                      setCharacterMeasuringElementId(null);
                                    } else {
                                      setCharacterMeasuringElementId(targetElement.element_id);
                                    }
                                  }}
                                >
                                  {characterMeasuringElementId === targetElement.element_id
                                    ? (locale === "en" ? "⏳ Drawing (drag on canvas)" : "⏳ 正在框选（在图上拖拽）")
                                    : (locale === "en" ? "📐 Measure a Character" : "📐 框选代表字符")}
                                </button>
                                <button
                                  type="button"
                                  className="workspaceActionBtn"
                                  style={{ fontSize: "11px", padding: "3px 8px" }}
                                  onClick={() => {
                                    const inputVal = prompt(
                                      locale === "en" ? "Enter representative character pixel height (px):" : "请输入代表字符像素高度 (px)：",
                                      String(targetElement.image_pixel_bounds.height)
                                    );
                                    if (inputVal !== null) {
                                      const num = parseFloat(inputVal);
                                      if (!isNaN(num) && num > 0) {
                                        updateManualElement(targetElement.element_id, {
                                          character_height_px: num,
                                          character_height_source: "measured_rendered_character"
                                        });
                                      }
                                    }
                                  }}
                                >
                                  {locale === "en" ? "📏 Enter Manually" : "📏 手动输入"}
                                </button>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    )}


                    {/* Interaction controls */}
                    <div className="mt-2">
                      <label>
                        {locale === "en" ? "Interaction Type: " : "选择交互类型："}
                        <select
                          value={targetElement.interaction_type || "none"}
                          onChange={(e) => {
                            const nextType = e.target.value as InteractionType;
                            updateManualElement(targetElement.element_id, {
                              interaction_type: nextType
                            });
                          }}
                        >
                          <option value="none">{locale === "en" ? "Non-interactive (None)" : "不可交互 (None)"}</option>
                          <option value="tap">{locale === "en" ? "Tap (Tap)" : "单击 (Tap)"}</option>
                          <option value="swipe">{locale === "en" ? "Swipe (Swipe)" : "滑动 (Swipe)"}</option>
                          <option value="tap_swipe">{locale === "en" ? "Tap & Swipe" : "单击 + 滑动 (Tap & Swipe)"}</option>
                        </select>
                      </label>

                      {isInteractive && (
                        <div className="touchBoundsControls mt-2" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          {/* 1. 触控区域来源 */}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "11px", color: "#64748b" }}>
                              {locale === "en" ? "Touch Bounds Source:" : "触控区域来源："}
                            </span>
                            <span className="badge" style={{ fontSize: "10.5px", background: targetElement.touch_bounds_source === "visual_copy" ? "#fef3c7" : "#dcfce7", color: targetElement.touch_bounds_source === "visual_copy" ? "#b45309" : "#15803d" }}>
                              {presentation.touchProvenanceLabel}
                            </span>
                          </div>

                          {/* 2. 快速设置 */}
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                              {locale === "en" ? "Quick Setup" : "快速设置"}
                            </span>
                            <button
                              type="button"
                              className="workspaceActionBtn"
                              style={{ width: "100%", justifyContent: "center" }}
                              onClick={handleSetTouchBoundsToVisual}
                            >
                              {locale === "en" ? "Match Visual Bounds" : "与可视区域一致"}
                            </button>
                          </div>

                          {/* 3. 手动调整 */}
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                              {locale === "en" ? "Manual Adjustment" : "手动调整"}
                            </span>
                            {!isTouchEditMode ? (
                              <button
                                type="button"
                                className="workspaceActionBtn primaryButton"
                                style={{ width: "100%", justifyContent: "center" }}
                                onClick={handleEnterTouchEditMode}
                              >
                                {locale === "en" ? "Adjust Touch Bounds ✏️" : "在画布中调整触控区域 ✏️"}
                              </button>
                            ) : (
                              <div style={{ background: "#f8fafc", border: "1px solid #c7d2fe", borderRadius: "6px", padding: "8px 10px", display: "flex", flexDirection: "column", gap: "6px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <span style={{ fontSize: "11.5px", fontWeight: 600, color: "#4338ca" }}>
                                    ⏳ {t("touch_edit.title")}
                                  </span>
                                  {touchEditSnapshot?.draft_touch_bounds_pixel ? (
                                    <span style={{ fontSize: "11px", color: "#334155" }}>
                                      {t("touch_edit.current_preview")}：<b>{touchEditSnapshot.draft_touch_bounds_pixel.width} × {touchEditSnapshot.draft_touch_bounds_pixel.height} px</b>
                                    </span>
                                  ) : null}
                                </div>
                                <div style={{ fontSize: "11px", color: "#64748b", lineHeight: "1.4" }}>
                                  {t("touch_edit.desc")}
                                </div>
                                <div style={{ display: "flex", gap: "6px", marginTop: "2px" }}>
                                  <button
                                    type="button"
                                    className="workspaceActionBtn primaryButton"
                                    style={{ flex: 1, justifyContent: "center", fontWeight: 600 }}
                                    onClick={handleFinishTouchEdit}
                                  >
                                    ✓ {t("touch_edit.apply")}
                                  </button>
                                  <button
                                    type="button"
                                    className="workspaceActionBtn"
                                    style={{ flex: 1, justifyContent: "center" }}
                                    onClick={handleCancelTouchEdit}
                                  >
                                    ✕ {t("touch_edit.cancel")}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* 4. 复制 */}
                          {manualElements.filter((e) => e.element_id !== targetElement.element_id).length > 0 && (
                            <div className="copyBoundsRow" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                              <label style={{ fontSize: "11px", color: "#94a3b8", display: "flex", flexDirection: "column", gap: "4px" }}>
                                {locale === "en" ? "Copy bounds from element:" : "从已有元素复制范围："}
                                <select
                                  style={{ width: "100%" }}
                                  value={copyFromElementId}
                                  onChange={(e) => {
                                    const id = e.target.value;
                                    setCopyFromElementId(id);
                                    if (id) handleCopyTouchBoundsFromElement(id);
                                  }}
                                >
                                  <option value="">{locale === "en" ? "-- Select an element to copy bounds from --" : "-- 选择要复制的元素 --"}</option>
                                  {manualElements
                                    .filter((e) => e.element_id !== targetElement.element_id)
                                    .map((e) => {
                                      const origIndex = manualElements.findIndex((m) => m.element_id === e.element_id);
                                      return (
                                        <option key={e.element_id} value={e.element_id}>
                                          #{origIndex + 1} {getElementDisplayName(e, origIndex, locale)}
                                        </option>
                                      );
                                    })}
                                </select>
                              </label>
                            </div>
                          )}

                          {/* Reference Preview Recommendation */}
                          {logicalMapping && logicalMapping.platform !== "custom" && (() => {
                            const refPreview = imageNaturalDimensions
                              ? generateCenteredReferenceTouchBounds(
                                  targetElement.image_pixel_bounds,
                                  imageNaturalDimensions.width,
                                  imageNaturalDimensions.height,
                                  logicalMapping.platform,
                                  logicalMapping
                                )
                              : null;
                            return (
                              <div className="referencePreviewBox mt-1">
                                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                  <div>
                                    <span className="previewTitle">
                                      {logicalMapping.platform === "web"
                                        ? (locale === "en" ? "WCAG Minimum Target (SC 2.5.8): " : "WCAG 最小尺寸参考区域 (SC 2.5.8)：")
                                        : (locale === "en" ? "Platform Recommended Target: " : "平台推荐触控区域：")}
                                    </span>
                                    <b>
                                      {logicalMapping.platform === "android" ? "48 × 48 dp" : logicalMapping.platform === "web" ? "24 × 24 CSS px (最小参考)" : "44 × 44 pt"}
                                    </b>
                                  </div>
                                  {refPreview?.is_clipped && (
                                    <small style={{ color: "#b91c1c", fontSize: "11px" }}>
                                      {locale === "en" ? "(Note: reference bounds exceed screenshot boundary)" : "（注意：参考区域会超出当前截图边界）"}
                                    </small>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  className="smallAddBtn ml-2"
                                  onClick={handleApplyPlatformReferenceTouchBounds}
                                >
                                  {targetElement.touch_bounds
                                    ? (locale === "en" ? "Reset to Reference" : "重设为参考区域")
                                    : (locale === "en" ? "Apply Reference" : "使用该参考区域")}
                                </button>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>

                    {/* Color Sampling controls */}
                    {(applicableModules.includes("text_contrast") || applicableModules.includes("non_text_contrast")) && (
                      <div className="colorPickers mt-2" data-inspector-owned-interaction="true">
                        <div className="colorRow">
                          <span className="colorLabel">
                            {locale === "en"
                              ? (targetElement.element_type === "text" ? "Text Foreground:" : "Icon/Element Color:")
                              : (targetElement.element_type === "text" ? "文字前景色：" : "控件/图标色：")}
                            {targetElement.foreground_color_provenance === "screenshot_sample" ? (
                              <span className="badge" style={{ fontSize: "9.5px", background: "#e0f2fe", color: "#0369a1", marginLeft: "4px" }}>
                                {locale === "en" ? "Screenshot Sample" : "截图取色"}
                              </span>
                            ) : targetElement.foreground_color_provenance === "eyedropper_sample" ? (
                              <span className="badge" style={{ fontSize: "9.5px", background: "#f1f5f9", color: "#475569", marginLeft: "4px" }}>
                                {locale === "en" ? "Eyedropper" : "系统吸管"}
                              </span>
                            ) : targetElement.foreground_color_state === "confirmed" ? (
                              <span className="badge status" style={{ fontSize: "10px", marginLeft: "4px" }}>
                                {locale === "en" ? "Confirmed" : "已确认"}
                              </span>
                            ) : targetElement.foreground_color_state === "provisional" ? (
                              <span className="contrastProvisionalBadge">
                                {locale === "en" ? "Provisional" : "临时预设"}
                              </span>
                            ) : null}
                          </span>
                          <div className="colorInputGroup">
                            <span className="colorSwatch" style={{ backgroundColor: targetElement.foreground_color || "transparent" }} />
                            <input
                              value={targetElement.foreground_color || ""}
                              onChange={(e) => updateManualElement(targetElement.element_id, {
                                foreground_color: e.target.value,
                                foreground_color_state: e.target.value.trim() ? "confirmed" : "missing",
                                foreground_color_provenance: e.target.value.trim() ? "manual_input" : undefined
                              })}
                              placeholder="#000000"
                            />
                            <button
                              type="button"
                              className="pickBtn"
                              title={locale === "en" ? "Sample color from screenshot (picks original pixel, ignores overlays)" : "从截图取色（采样原始图片像素，忽略标注与UI遮罩）"}
                              aria-label={locale === "en" ? "Sample color from screenshot" : "从截图取色"}
                              data-inspector-owned-interaction="true"
                              onClick={() => handleStartColorSampling("foreground")}
                            >
                              🔍
                            </button>
                          </div>
                        </div>
                        <div className="colorRow">
                          <span className="colorLabel">
                            {locale === "en" ? "Background Color:" : "背景底色："}
                            {targetElement.background_color_provenance === "screenshot_sample" ? (
                              <span className="badge" style={{ fontSize: "9.5px", background: "#e0f2fe", color: "#0369a1", marginLeft: "4px" }}>
                                {locale === "en" ? "Screenshot Sample" : "截图取色"}
                              </span>
                            ) : targetElement.background_color_provenance === "eyedropper_sample" ? (
                              <span className="badge" style={{ fontSize: "9.5px", background: "#f1f5f9", color: "#475569", marginLeft: "4px" }}>
                                {locale === "en" ? "Eyedropper" : "系统吸管"}
                              </span>
                            ) : targetElement.background_color_state === "confirmed" ? (
                              <span className="badge status" style={{ fontSize: "10px", marginLeft: "4px" }}>
                                {locale === "en" ? "Confirmed" : "已确认"}
                              </span>
                            ) : targetElement.background_color_state === "provisional" ? (
                              <span className="contrastProvisionalBadge">
                                {locale === "en" ? "Provisional" : "临时预设"}
                              </span>
                            ) : null}
                          </span>
                          <div className="colorInputGroup">
                            <span className="colorSwatch" style={{ backgroundColor: targetElement.background_color || "transparent" }} />
                            <input
                              value={targetElement.background_color || ""}
                              onChange={(e) => updateManualElement(targetElement.element_id, {
                                background_color: e.target.value,
                                background_color_state: e.target.value.trim() ? "confirmed" : "missing",
                                background_color_provenance: e.target.value.trim() ? "manual_input" : undefined
                              })}
                              placeholder="#FFFFFF"
                            />
                            <button
                              type="button"
                              className="pickBtn"
                              title={locale === "en" ? "Sample color from screenshot (picks original pixel, ignores overlays)" : "从截图取色（采样原始图片像素，忽略标注与UI遮罩）"}
                              aria-label={locale === "en" ? "Sample color from screenshot" : "从截图取色"}
                              data-inspector-owned-interaction="true"
                              onClick={() => handleStartColorSampling("background")}
                            >
                              🔍
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                  </div>

                  {/* SECTION 2: 当前评估 (Conclusion & Observable Facts) */}
                  <div className="drawerSection">
                    <div className="sectionTitleRow">
                      <h4 style={{ margin: 0 }}>{t("inspector.section_findings")}</h4>
                      <small className="hint" style={{ margin: 0 }}>{locale === "en" ? "Core findings & baseline measurements" : "核心结论与基准度量"}</small>
                    </div>
                    <div className="plainSummaryCard mt-1">
                      {unifiedExplanation.actionableFindings.length > 0 ? (() => {
                        const grouped = groupActionableFindings(unifiedExplanation.actionableFindings);
                        return (
                          <div className="problemOverviewBlock">
                            <div style={{ fontWeight: 600, fontSize: "12px", color: "#334155", marginBottom: "6px" }}>
                              {locale === "en" ? `Issues Requiring Attention (${unifiedExplanation.actionableFindings.length})` : `需关注的问题清单（${unifiedExplanation.actionableFindings.length} 项）`}
                            </div>
                            <div className="groupedFindingsContainer" style={{ gap: "6px" }}>
                              {grouped.belowThreshold.length > 0 && (
                                <div className="findingGroup groupBelowThreshold">
                                  <div className="findingGroupHeader">❌ {locale === "en" ? "Below the basic requirement" : "不满足基本要求"}</div>
                                  <ul className="findingGroupList">
                                    {grouped.belowThreshold.map((f) => (
                                      <li key={f.id}><b>{f.metricLabel}{locale === "en" ? ": " : "："}</b>{f.summaryText}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {grouped.belowRecommended.length > 0 && (
                                <div className="findingGroup groupBelowRecommended">
                                  <div className="findingGroupHeader">⚠️ {locale === "en" ? "Meets the basic requirement, but below the recommended range" : "满足基本要求，但未达推荐范围"}</div>
                                  <ul className="findingGroupList">
                                    {grouped.belowRecommended.map((f) => (
                                      <li key={f.id}><b>{f.metricLabel}{locale === "en" ? ": " : "："}</b>{f.summaryText}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {grouped.needsInfo.length > 0 && (
                                <div className="findingGroup groupNeedsInfo">
                                  <div className="findingGroupHeader">ℹ️ {locale === "en" ? "Additional information required" : "待补充信息"}</div>
                                  <ul className="findingGroupList">
                                    {grouped.needsInfo.map((f) => (
                                      <li key={f.id}><b>{f.metricLabel}{locale === "en" ? ": " : "："}</b>{f.summaryText}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })() : (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "6px", width: "100%", minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0, flexWrap: "wrap" }}>
                            <span className={`conclusionBadge ${presentation.conclusionStateBadgeClass}`}>
                              {presentation.conclusionStateLabel}
                            </span>
                            <b style={{ color: "#1e293b", fontSize: "12px", flexShrink: 0 }}>{locale === "en" ? "Verdict" : "当前结论"}</b>
                          </div>
                          <p style={{ margin: "2px 0 0 0", color: "#334155", fontSize: "12px", lineHeight: 1.45, wordBreak: "normal", overflowWrap: "break-word", width: "100%" }}>
                            {presentation.conclusion}
                          </p>
                        </div>
                      )}

                      {/* Observable Facts Grid */}
                      <div className="metricGrid mt-2" style={{ borderTop: "1px dashed #e2e8f0", paddingTop: "8px" }}>
                        <span>{locale === "en" ? "Visual Size" : "视觉尺寸"}</span>
                        <b>{presentation.visualPxDisplay}</b>

                        <span>{locale === "en" ? "Visual Area & Share" : "截图像素面积与占比"}</span>
                        <b>{presentation.visualAreaDisplay} · {presentation.screenShareDisplay}</b>

                        {presentation.isPhysicalAvailable ? (
                          <>
                            <span>{locale === "en" ? "Physical Visual Size" : "物理视觉尺寸"}</span>
                            <b>{locale === "en" ? "≈ " : "约 "}{presentation.physicalDisplay} ({presentation.physicalProvenance})</b>
                          </>
                        ) : null}

                        {presentation.isLogicalConfigured && (
                          <>
                            <span>{locale === "en" ? "Logical Design Size" : "设计逻辑尺寸"}</span>
                            <b>
                              {presentation.logicalDisplay} ({locale === "en" ? "Scale ratio: " : "换算比："}{presentation.scaleRatioDisplay})
                            </b>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* SECTION: 人因视觉测量 (Human Factors Visual Angle) */}
                  <div className="drawerSection">
                    <div className="sectionTitleRow">
                      <h4 style={{ margin: 0 }}>{locale === "en" ? "Human Factors Visual Measurement" : "人因视觉测量"}</h4>
                      <small className="hint" style={{ margin: 0 }}>{locale === "en" ? "Physical dimensions & visual angle (measurement only)" : "物理尺寸与视距视角（仅测量）"}</small>
                    </div>
                    {presentation.isVisualAngleAvailable ? (
                      <div className="plainSummaryCard mt-1" style={{ background: "#f8fafc" }}>
                        <div className="metricGrid">
                          <span>{locale === "en" ? "Viewing Distance" : "观看距离"}</span>
                          <b>{presentation.visualAngleViewingDistanceDisplay} {locale === "en" ? "(User Input)" : "(人工输入)"}</b>

                          <span>{locale === "en" ? "Physical Visual Size" : "物理视觉大小"}</span>
                          <b>{presentation.physicalDisplay} ({presentation.physicalProvenance})</b>

                          <span>{locale === "en" ? "Element Visual Angle" : "元素视觉角"}</span>
                          <b style={{ color: "#0284c7" }}>
                            {presentation.visualAngleDetailDisplay}
                          </b>

                          <span>{locale === "en" ? "Measurement Type" : "测量性质"}</span>
                          <b>{locale === "en" ? "Measurement Only" : "仅测量 (Measurement Only)"}</b>
                        </div>

                        {presentation.visualAngleAssumptions && presentation.visualAngleAssumptions.length > 0 && (
                          <div className="mt-1" style={{ fontSize: "11px", color: "#64748b" }}>
                            {presentation.visualAngleAssumptions.map((asm, aIdx) => (
                              <div key={aIdx}>ℹ️ {asm}</div>
                            ))}
                          </div>
                        )}

                        {presentation.visualAngleTextSemanticNote && (
                          <div className="mt-1" style={{ fontSize: "11px", color: "#64748b", background: "#f1f5f9", padding: "6px 8px", borderRadius: "4px" }}>
                            ℹ️ {presentation.visualAngleTextSemanticNote}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="missingMetricGuidance mt-1" style={{ padding: "10px", background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: "6px" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
                          <div>
                            <b style={{ color: "#0f172a", fontSize: "12px" }}>{locale === "en" ? "Element Visual Angle: Unavailable" : "元素视觉角：暂不可估算"}</b>
                            <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "11px" }}>
                              {presentation.visualAngleUnavailableGuidance || (locale === "en" ? "Configure screen hardware and viewing distance to calculate visual angle." : "配置屏幕硬件与观看距离后可计算人因视角大小。")}
                            </p>
                          </div>
                          <button
                            type="button"
                            className="smallAddBtn"
                            style={{ whiteSpace: "nowrap", fontSize: "11px", padding: "4px 8px" }}
                            onClick={() => handleOpenParamsModal("environment")}
                          >
                            {locale === "en" ? "Configure Viewing Distance →" : "配置观看距离 →"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* SECTION 3: 规则比对与阈值追踪 */}
                  {(inspectorMainTraces.length > 0 || inspectorMoreMeasurements.length > 0) && (
                    <div className="drawerSection">
                      <div className="sectionTitleRow">
                        <h4 style={{ margin: 0 }}>{locale === "en" ? "Rule Traces & Threshold Tracking" : "规则比对与阈值追踪"}</h4>
                        <small className="hint" style={{ margin: 0 }}>{locale === "en" ? "Standard references & margin tracking" : "标准依据与数值余量"}</small>
                      </div>
                      {inspectorMainTraces.length > 0 && (
                        <div className="ruleTracesInspectorList mt-1">
                          {inspectorMainTraces.map((trace, idx) => (
                            <div key={idx} className={`ruleTraceInspectorCard trace-${trace.verdict}`}>
                              <div className="ruleTraceHeader">
                                <span className="ruleTraceTitle">
                                  {trace.metricLabel}：<b>{trace.currentValueDisplay}</b>
                                </span>
                                <span className={`ruleTraceVerdict badge-${trace.verdict}`}>
                                  {trace.verdictLabel}
                                </span>
                              </div>

                              {/* Multi-axis breakdown */}
                              {trace.comparison.kind === "multi_axis" && (
                                <div className="multiAxisTraceBox mt-1">
                                  <div className="traceSubHeader">
                                    <span>{locale === "en" ? "Reference Standard: " : "参考标准："}<b>{trace.comparison.thresholdDisplay}</b></span>
                                    {trace.comparison.limitingAxis && (
                                      <span className="limitingAxisTag">{locale === "en" ? "Limiting Axis: " : "限制维度："}{trace.comparison.limitingAxis}</span>
                                    )}
                                  </div>
                                  <table className="axisComparisonTable">
                                    <thead>
                                      <tr>
                                        <th>{locale === "en" ? "Axis" : "维度"}</th>
                                        <th>{locale === "en" ? "Current" : "当前值"}</th>
                                        <th>{locale === "en" ? "Reference" : "参考值"}</th>
                                        <th>{locale === "en" ? "Margin" : "阈值余量"}</th>
                                        <th>{locale === "en" ? "Status" : "状态"}</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {trace.comparison.axes.map((ax) => (
                                        <tr key={ax.axis}>
                                          <td>{ax.label}</td>
                                          <td>{ax.current} {ax.unit}</td>
                                          <td>≥ {ax.threshold} {ax.unit}</td>
                                          <td style={{ color: ax.margin >= 0 ? "#15803d" : "#b91c1c", fontWeight: 600 }}>
                                            {ax.marginFormatted}
                                          </td>
                                          <td>{ax.meets ? (locale === "en" ? "✓ Pass" : "✓ 达标") : (locale === "en" ? "✕ Below" : "✕ 偏小")}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}

                              {/* Scalar Min / Max */}
                              {(trace.comparison.kind === "scalar_min" || trace.comparison.kind === "scalar_max") && (
                                <div className="scalarTraceBox mt-1">
                                  <span>{locale === "en" ? "Reference Threshold: " : "参考阈值："}<b>{trace.comparison.thresholdDisplay}</b></span>
                                  <span style={{ marginLeft: "12px", fontWeight: 600, color: trace.comparison.margin >= 0 ? "#15803d" : "#b91c1c" }}>
                                    {trace.comparison.marginLabel}
                                  </span>
                                </div>
                              )}

                              {/* Conditional (e.g. WCAG 2.5.8) */}
                              {trace.comparison.kind === "conditional" && (
                                <div className="conditionalTraceBox mt-1">
                                  <p className="conditionalSummary">{trace.comparison.summary}</p>
                                  <ul className="conditionItemsList">
                                    {trace.comparison.conditions.map((cond, cIdx) => (
                                      <li key={cIdx} className={cond.isMet ? "condMet" : "condUnmet"}>
                                        {cond.isMet ? "✓" : "✕"} {cond.name}：{cond.factDescription}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Needs info */}
                              {trace.comparison.kind === "needs_info" && (
                                <div className="needsInfoTraceBox mt-1">
                                  <span className="hint">{locale === "en" ? "Pending: " : "待补充："}{trace.comparison.missingFields.join(locale === "en" ? ", " : "、")}（{trace.comparison.explanation}）</span>
                                </div>
                              )}

                              {/* Rule basis & evidence status */}
                              {trace.ruleTitle && (
                                <div className="ruleTraceFooter mt-1">
                                  <span className="ruleBasisText">
                                    {locale === "en" ? "Reference: " : "规范依据："}{trace.ruleTitle}
                                    {trace.ruleLayer ? ` · ${getRuleLayerLabel(trace.ruleLayer as any, locale)}` : ""}
                                    {trace.evidenceStatus ? ` · ${getReferenceStatusLabel(trace.evidenceStatus as any, locale)}` : ""}
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* More Measurements Collapsible Area */}
                      {inspectorMoreMeasurements.length > 0 && (
                        <details className="moreMeasurementsDetails mt-2">
                          <summary className="moreMeasurementsSummary">
                            <span>📐 {locale === "en" ? `More Measurements (${inspectorMoreMeasurements.length})` : `更多测量结果 (${inspectorMoreMeasurements.length})`}</span>
                          </summary>
                          <div className="moreMeasurementsList">
                            {inspectorMoreMeasurements.map((m, mIdx) => (
                              <div key={mIdx} className="measurementCompactRow">
                                <div className="measurementCompactHeader">
                                  <span className="measurementCompactLabel">{m.metricLabel}：</span>
                                  <span className="measurementCompactValue">{m.currentValueDisplay}</span>
                                  <span className="measurementCompactTag">{locale === "en" ? "Measured" : "测量值"}</span>
                                </div>
                                {m.comparison.kind === "measurement_only" && m.comparison.explanation && (
                                  <div className="measurementCompactHint">{m.comparison.explanation}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  )}

                  {/* SECTION 4: 影响与建议 (Impact & Recommendations) */}
                  <div className="drawerSection">
                    <div className="sectionTitleRow">
                      <h4 style={{ margin: 0 }}>{t("inspector.section_perspectives")}</h4>
                      <small className="hint" style={{ margin: 0 }}>{locale === "en" ? "Multi-perspective design & human factors advice" : "多视角设计与人因建议"}</small>
                    </div>
                    <div className="impactPerspectivesContainer mt-1">
                      {unifiedExplanation.perspectives.map((p, idx) => (
                        <div key={idx} className={`impactPerspectiveCard type-${p.type}`}>
                          <span className="impactLabel">{p.label}</span>
                          <p className="impactContent">{p.content}</p>
                        </div>
                      ))}
                    </div>

                    {/* Upgrade Precision Guidance */}
                    {primaryCapability && primaryCapability.nextTier && primaryCapability.missingRequirementsForNextTier.length > 0 && (
                      <div className="upgradePrecisionCard mt-2">
                        <div className="upgradePrecisionHeader">
                          <span className="upgradePrecisionTitle">
                            {locale === "en" ? `Upgrade Precision: Add "${getEvaluationTierLabel(primaryCapability.nextTier, "en")}"` : `提升精度：补充「${getEvaluationTierLabel(primaryCapability.nextTier, "zh-CN")}」`}
                          </span>
                        </div>
                        <p className="hint" style={{ margin: 0, fontSize: "11px" }}>
                          {locale === "en" ? `Currently using [${getEvaluationTierLabel(primaryCapability.highestAvailableTier, "en")}]. For higher certainty, provide:` : `当前使用的是【${getEvaluationTierLabel(primaryCapability.highestAvailableTier, "zh-CN")}】。若需获得更确定的结果，可补充：`}
                        </p>
                        <ul className="upgradeMissingList">
                          {primaryCapability.missingRequirementsForNextTier.map((req, i) => (
                            <li key={i}>{req}</li>
                          ))}
                        </ul>
                        <button
                          type="button"
                          className="upgradeParamActionBtn"
                          onClick={() => {
                            const target = primaryCapability.missingFactIdsForNextTier.includes("logical_mapping")
                              ? "design"
                              : primaryCapability.missingFactIdsForNextTier.includes("screen_resolution") || primaryCapability.missingFactIdsForNextTier.includes("screen_diagonal")
                              ? "screen"
                              : "screenshot";
                            handleOpenParamsModal(target);
                          }}
                        >
                          {locale === "en" ? "Add Evaluation Parameters →" : "补充评估参数 →"}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* SECTION 5: 详细度量与依据 (Lower Tiers Drawer & Technical Details) */}
                  <div className="drawerSection">
                    {/* Lower tiers drawer */}
                    <div className="lowerTiersDrawer">
                      <button
                        type="button"
                        className="lowerTiersToggleBtn"
                        onClick={() => setIsLowerTiersExpanded(!isLowerTiersExpanded)}
                      >
                        <span>{locale === "en" ? "View Lower-tier Metrics & Underlying Facts" : "查看各层级度量与底层事实"}</span>
                        <span>{isLowerTiersExpanded ? (locale === "en" ? "▲ Collapse" : "▲ 收起") : (locale === "en" ? "▼ Expand" : "▼ 展开")}</span>
                      </button>
                      {isLowerTiersExpanded && (
                        <div className="lowerTiersContent">
                          <div>
                            <b>{locale === "en" ? "Screenshot Fact (Image Px): " : "截图事实 (Image Px)："}</b> {presentation.visualPxDisplay} ({presentation.screenShareLabel}: {presentation.screenShareDisplay})
                          </div>
                          {presentation.isPhysicalAvailable ? (
                            <div>
                              <b>{locale === "en" ? "Hardware Estimation (Hardware mm): " : "硬件参数估算 (Hardware mm)："}</b> {locale === "en" ? "≈ " : "约 "}{presentation.physicalDisplay}（{presentation.physicalProvenance}）
                            </div>
                          ) : presentation.physicalUnavailableReason ? (
                            <div>
                              <b>{locale === "en" ? "Hardware Estimation (Hardware mm): " : "硬件参数估算 (Hardware mm)："}</b> {locale === "en" ? `Unavailable (${presentation.physicalUnavailableReason})` : `暂不可换算（${presentation.physicalUnavailableReason}）`}
                            </div>
                          ) : null}
                          {presentation.isLogicalConfigured && (
                            <div>
                              <b>{locale === "en" ? "Design Basis (Design Unit): " : "设计基准校验 (Design Unit)："}</b> {presentation.logicalDisplay}（{locale === "en" ? "Ratio: " : "换算比："}{presentation.scaleRatioDisplay}）
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Detailed Measurements */}
                    {evaluationMode === "quick" && !isDrawerMeasurementDetailsExpanded ? (
                      <button
                        type="button"
                        className="viewDetailBtn mt-2"
                        style={{ width: "100%", textAlign: "center", padding: "8px" }}
                        onClick={() => setIsDrawerMeasurementDetailsExpanded(true)}
                      >
                        {locale === "en" ? "View Detailed Measurements & Rationale ▾" : "查看详细度量与依据 ▾"}
                      </button>
                    ) : (
                      <div className="mt-2">
                        <div className="sectionTitleRow">
                          <h4 style={{ margin: 0 }}>{locale === "en" ? "Detailed Measurements & Platform Rationale" : "详细度量与平台依据"}</h4>
                          {evaluationMode === "quick" && (
                            <button
                              type="button"
                              className="viewDetailBtn"
                              onClick={() => setIsDrawerMeasurementDetailsExpanded(false)}
                            >
                              {locale === "en" ? "Collapse Detailed Measurements ▲" : "收起详细度量 ▲"}
                            </button>
                          )}
                        </div>

                        {/* Visual Bounds Metrics */}
                        <div className="metricGrid mt-2">
                          <span>{locale === "en" ? "Visual Size" : "可视尺寸"}</span>
                          <b>
                            {presentation.visualPxDisplay}
                            {presentation.isLogicalConfigured ? ` (${presentation.logicalDisplay})` : ""}
                            {presentationPolicy.showPhysicalMeasurements && presentation.isPhysicalAvailable ? ` (${locale === "en" ? "≈ " : "约 "}${presentation.physicalDisplay})` : ""}
                          </b>
                          <span>{locale === "en" ? "Visual Area" : "可视面积"}</span>
                          <b>{presentation.visualAreaDisplay}</b>
                          <span>{presentation.screenShareLabel}</span>
                          <b>{presentation.screenShareDisplay}</b>
                          <span>{locale === "en" ? "Minimum Side" : "短边尺寸"}</span>
                          <b>{presentation.minSideDisplay}</b>
                        </div>

                        {/* Touch target metrics */}
                        {isInteractive && targetElement.touch_bounds && (
                          <div className="metricGrid mt-2">
                            <span>{locale === "en" ? "Touch Target Size" : "触控尺寸"}</span>
                            <b>
                              {inspectorTouchAreaMetrics?.pixel_width} × {inspectorTouchAreaMetrics?.pixel_height} px
                              {inspectorTouchAreaMetrics?.logical_width ? ` (${inspectorTouchAreaMetrics.logical_width} × ${inspectorTouchAreaMetrics.logical_height} ${inspectorTouchAreaMetrics.logical_unit})` : ""}
                            </b>
                            {inspectorNearestTouchTarget && (
                              <>
                                <span>{locale === "en" ? "Adjacent Spacing" : "相邻触控间距"}</span>
                                <b>
                                  {inspectorNearestTouchTarget.distance_logical !== undefined
                                    ? `${inspectorNearestTouchTarget.distance_logical} ${inspectorNearestTouchTarget.logical_unit}`
                                    : `${inspectorNearestTouchTarget.distance_px} px`}
                                </b>
                              </>
                            )}
                          </div>
                        )}

                        {/* Platform rule & evidence details */}
                        {targetElement.target_size_evaluation && (
                          <div className={`contrastResultCard targetSizeCard mt-2 ${targetElement.target_size_evaluation.status}`}>
                            <p className="summaryText"><b>{targetElement.target_size_evaluation.summary_text}</b></p>
                            <p className="detailText">{targetElement.target_size_evaluation.detail_text}</p>
                            {presentationPolicy.showEvidenceDetails && (
                              <div className="evidenceBlock mt-1">
                                <p className="evidenceTitle">{targetElement.target_size_evaluation.reference}</p>
                                <div className="evidenceBadges">
                                  <span className="badge ref-verified_reference">{locale === "en" ? "Verified Standard" : "已核验标准"}</span>
                                  <span className="badge status">{locale === "en" ? "Strong Finding" : "强结论"}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Contrast Evaluation Card */}
                        {targetElement.contrast_evaluation && (
                          <div className="contrastResultCard mt-2">
                            <div className="contrastRatioHeader">
                              <span>{locale === "en" ? "Calculated Contrast: " : "计算对比度："}</span>
                              <b className="ratioVal">{targetElement.contrast_evaluation.contrast_ratio} : 1</b>
                              <span className={`badge ${targetElement.contrast_evaluation.passed ? "suitability-suitable" : "suitability-risk"}`}>
                                {targetElement.contrast_evaluation.passed ? (locale === "en" ? "Pass ✓" : "达标 ✓") : (locale === "en" ? "Below ✕" : "未达标 ✕")}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Delete Annotation Button */}
                    <div className="drawerActions mt-3">
                      <button className="deleteBtn" onClick={() => deleteManualElement(targetElement.element_id)}>
                        {locale === "en" ? "🗑️ Delete Annotation" : "🗑️ 删除此标注"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })() : null}

        {/* Mock Finding Detail Drawer */}
        {isDetailOpen && activeAnnotation ? (
          <div className="detailDrawerOverlay" onClick={() => setIsDetailOpen(false)}>
            <div className="detailDrawer" onClick={(e) => e.stopPropagation()}>
              <div className="drawerHeader">
                <div className="drawerTitleBlock">
                  <div className="headerWithBadge">
                    <h3>{locale === "en" ? `Demo Finding Details #${activeIndex + 1}` : `模拟问题详情 #${activeIndex + 1}`}</h3>
                    <span className="badge simulatedBadge">Simulated</span>
                  </div>
                  <div className="issueHeader">
                    <b>{getIssueTypeLabel(activeAnnotation.issue_type, locale)}</b>
                    <span className={`badge severity-${activeAnnotation.severity}`}>
                      {getSeverityLabel(activeAnnotation.severity, locale)}
                    </span>
                    <span className="badge status">{getStatusLabel(activeAnnotation.status, locale)}</span>
                  </div>
                </div>
                <button className="closeDrawerBtn" onClick={() => setIsDetailOpen(false)}>✕</button>
              </div>

              <div className="drawerBody">
                <div className="drawerSection">
                  <h4>{locale === "en" ? "Description" : "问题描述"}</h4>
                  <p className="findingDesc">{activeAnnotation.description}</p>
                </div>

                <div className="drawerSection">
                  <h4>{locale === "en" ? "Metrics & Thresholds (Demo)" : "度量与阈值（模拟）"}</h4>
                  <div className="metricGrid">
                    <span>{locale === "en" ? "Current Value" : "当前值"}</span>
                    <b>
                      {activeAnnotation.measurement.current_value}
                      {activeAnnotation.measurement.unit ? ` ${activeAnnotation.measurement.unit}` : ""}
                    </b>
                    <span>{locale === "en" ? "Threshold" : "阈值"}</span>
                    <b>
                      {activeAnnotation.measurement.threshold_value}
                      {activeAnnotation.measurement.unit ? ` ${activeAnnotation.measurement.unit}` : ""}
                    </b>
                    <span>{locale === "en" ? "Recommendation" : "建议"}</span>
                    <b>{activeAnnotation.measurement.recommended_value}</b>
                    <span>{locale === "en" ? "Interpretation" : "解释"}</span>
                    <b>{activeAnnotation.measurement.interpretation}</b>
                  </div>
                </div>

                <div className="drawerSection">
                  <h4>{locale === "en" ? "Actionable Recommendations" : "改进建议"}</h4>
                  <div className="recommendationBox">
                    {activeAnnotation.recommendation}
                  </div>
                </div>

                <div className="drawerSection">
                  <h4>{locale === "en" ? "Reference & Rule Layer" : "关联依据与规则层级"}</h4>
                  <div className="evidenceBlock">
                    <p className="evidenceTitle">{activeEvidence?.source_name} - {activeEvidence?.guideline_ref}</p>
                    <div className="evidenceBadges">
                      {activeEvidence ? (
                        <span className={`badge ref-${activeEvidence.reference_status}`}>
                          {getReferenceStatusLabel(activeEvidence.reference_status, locale)}
                        </span>
                      ) : null}
                      {activeEvidence ? (
                        <span className="badge status">{getClaimStrengthLabel(activeEvidence.claim_strength, locale)}</span>
                      ) : null}
                    </div>
                    <small>
                      {activeEvidence ? (locale === "en" ? referenceStatusMessagesEn[activeEvidence.reference_status] : referenceStatusMessages[activeEvidence.reference_status]) : (locale === "en" ? "No reference" : "无依据")} ·{" "}
                      {getReasoningTypeLabel(activeAnnotation.reasoning_type, locale)} ·{" "}
                      {getRuleLayerLabel(activeAnnotation.rule_layer, locale)}
                    </small>
                  </div>
                </div>

                <div className="drawerSection">
                  <h4>{locale === "en" ? "Contextual Impact Analysis" : "情境影响分析"}</h4>
                  <p className="impactText">{activeAnnotation.applied_context.impact_summary}</p>
                </div>

                <div className="drawerSection">
                  <h4>{locale === "en" ? "User Groups / Scenario Differences" : "分人群 / 场景差异"}</h4>
                  <div className="contextList">
                    {activeAnnotation.contextual_findings.map((finding) => (
                      <div key={finding.finding_id} className="contextItem">
                        <div className="contextItemHeader">
                          <span className={`badge suitability-${finding.suitability}`}>
                            {getSuitabilityLabel(finding.suitability, locale)}
                          </span>
                          <b>{finding.context_label}</b>
                        </div>
                        <small>{finding.reason}</small>
                        {finding.recommendation ? (
                          <small className="findingSubRec">{locale === "en" ? "Rec: " : "建议："}{finding.recommendation}</small>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </aside>
    </div>

    {/* Safe Image Replacement Confirmation Modal */}
    {isReplaceConfirmOpen && (
      <div
        className="replacementConfirmOverlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="replacement-confirm-title"
        onClick={handleCancelReplacement}
      >
        <div className="replacementConfirmCard" onClick={(e) => e.stopPropagation()}>
          <div className="replacementConfirmHeader">
            <h3 id="replacement-confirm-title">{locale === "en" ? "Replace Current Screenshot?" : "更换当前图片？"}</h3>
          </div>
          <div className="replacementConfirmBody">
            <p>
              {locale === "en"
                ? `The current image has ${manualElements.length} manual annotation(s). Replacing the image will clear these annotations and their element-level evaluation results to avoid applying old coordinates to the new image.`
                : `当前图片已有 ${manualElements.length} 个真实标注。更换图片后，这些标注及其元素级评估结果将被清除，避免旧坐标错误应用到新图片。`}
            </p>
            <p className="replacementConfirmSub">
              {locale === "en"
                ? "Configured screen hardware parameters (dimensions, resolution, etc.) will be preserved."
                : "已填写的屏幕硬件参数（尺寸、分辨率等）将自动保留。"}
            </p>
          </div>
          <div className="replacementConfirmFooter">
            <button
              type="button"
              className="replacementConfirmCancelBtn"
              onClick={handleCancelReplacement}
              autoFocus
            >
              {t("action.cancel")}
            </button>
            <button
              type="button"
              className="replacementConfirmProceedBtn"
              onClick={handleConfirmReplacement}
            >
              {locale === "en" ? "Replace & Clear Annotations" : "更换并清除标注"}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Visual Evidence Report Preview Modal */}
    {isReportPreviewOpen && reportData && (
      <ReportPreviewModal
        isOpen={isReportPreviewOpen}
        onClose={() => setIsReportPreviewOpen(false)}
        reportData={reportData}
        activeFilter={reportFilter}
        onFilterChange={handleFilterReport}
        onExportHtml={handleExportHtmlReport}
      />
    )}

    {/* Local Project Library Modal */}
    <ProjectLibraryModal
      isOpen={isProjectLibraryOpen}
      onClose={() => setIsProjectLibraryOpen(false)}
      currentProjectId={currentProjectId}
      currentProjectName={currentProjectName || t("project.default_name")}
      projects={projectSummaries}
      onSelectProject={handleSelectProject}
      onNewProject={handleNewProject}
      onSaveAs={handleSaveAs}
      onRenameProject={handleRenameProject}
      onDeleteProject={handleDeleteProject}
    />

    {/* Same-Image History Recovery Modal */}
    <SameImageModal
      isOpen={isSameImageModalOpen}
      matchingProjects={sameImageMatchingProjects}
      onContinueProject={handleContinueMatchingProject}
      onStartNewWithImage={handleStartNewWithSameImage}
      onCancel={handleCancelSameImageModal}
    />
    </>
  );
}
