import React, { useState, useEffect, useMemo } from "react";
import ReactDOM from "react-dom";
import type {
  TargetPlatform,
  LogicalUnit,
  CalibrationMode,
  LogicalUnitMapping
} from "../types/designElement";
import type { ScenarioDomain } from "../types/context";
import type {
  CroppedScaleMode,
  DesignInfoStatus,
  DeviceProfileId
} from "../types/workspace";
import {
  createLogicalUnitMapping,
  createCroppedPreservedScaleMapping,
  formatScaleRatio
} from "../utils/logicalMapping";
import { getDeviceLogicalWidth } from "../constants/inputOptions";
import { resolveAllCapabilities, type CapabilityContext } from "../utils/capabilityResolver";
import { EVALUATION_TIER_LABELS, EVALUATION_TIER_LABELS_EN } from "../types/capability";
import { parseResolution, resolveDisplayParameters } from "../utils/calibration";
import { useI18n } from "../i18n";
import type { Locale } from "../i18n/types";

export type ScenarioDomainOption = ScenarioDomain;

export type EvaluationParametersSection =
  | "screenshot"
  | "screen"
  | "user_scenario"
  | "references"
  | "design"
  | "environment";

export interface EvaluationParametersData {
  calibrationMode: CalibrationMode;
  croppedScaleMode?: CroppedScaleMode;
  originalImageReferenceWidth?: number;
  displaySize: string;
  resolution: string;
  customDisplaySize?: string;
  customResolution?: string;
  allowEstimation?: boolean;
  scenario?: string;
  viewingDistance: string;
  targetPlatform: TargetPlatform;
  deviceProfile?: DeviceProfileId;
  designInfoStatus?: DesignInfoStatus;
  logicalUnit: LogicalUnit;
  logicalReferenceWidth: number;
  imageReferenceWidth?: number;
  userGroups?: string[];
  ruleSets?: string[];
  dimensions?: string[];
  scenarioDomain?: ScenarioDomain;
  scenarioDomainUserOverridden?: boolean;
  contextEnvironment?: string;
  contextOperationState?: string;
}

export type ParameterTab = "screenshot" | "screen" | "user_scenario" | "references" | "design";

interface EvaluationParametersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: EvaluationParametersData) => void;
  initialData: EvaluationParametersData;
  imageWidth?: number;
  imageHeight?: number;
  imageName?: string;
  initialSection?: EvaluationParametersSection;
  onTriggerImageUpload?: () => void;
}

export const getScreenDiagonalPresets = (locale: Locale = "zh-CN") => [
  { value: "5.4 inch", label: locale === "en" ? "5.4 inch (Compact Phone)" : "5.4 英寸 (小屏手机)" },
  { value: "6.1 inch", label: locale === "en" ? "6.1 inch (Standard Phone)" : "6.1 英寸 (标准手机)" },
  { value: "6.7 inch", label: locale === "en" ? "6.7 inch (Large Phone)" : "6.7 英寸 (大屏手机)" },
  { value: "8.3 inch", label: locale === "en" ? "8.3 inch (Compact Tablet)" : "8.3 英寸 (小平板)" },
  { value: "10.9 inch", label: locale === "en" ? "10.9 inch (Standard Tablet)" : "10.9 英寸 (标准平板)" },
  { value: "12.3 inch", label: locale === "en" ? "12.3 inch (Automotive Central)" : "12.3 英寸 (车机中控)" },
  { value: "13.3 inch", label: locale === "en" ? "13.3 inch (Laptop)" : "13.3 英寸 (便携笔记本)" },
  { value: "15.6 inch", label: locale === "en" ? "15.6 inch (Standard Laptop/Monitor)" : "15.6 英寸 (常规笔记本/显示器)" },
  { value: "24 inch", label: locale === "en" ? "24.0 inch (Desktop Monitor)" : "24.0 英寸 (桌面显示器)" },
  { value: "27 inch", label: locale === "en" ? "27.0 inch (Desktop Monitor)" : "27.0 英寸 (桌面显示器)" },
  { value: "custom", label: locale === "en" ? "Custom…" : "自定义…" }
];

export const getScreenResolutionPresets = (locale: Locale = "zh-CN") => [
  { value: "1170x2532", label: locale === "en" ? "1170 × 2532 (Standard Phone)" : "1170 × 2532 (常见手机)" },
  { value: "1284x2778", label: locale === "en" ? "1284 × 2778 (Large Phone)" : "1284 × 2778 (常见大屏手机)" },
  { value: "1290x2796", label: locale === "en" ? "1290 × 2796 (Large Phone)" : "1290 × 2796 (大屏手机)" },
  { value: "1080x2400", label: locale === "en" ? "1080 × 2400 (FHD+ Phone)" : "1080 × 2400 (FHD+ 手机)" },
  { value: "834x1194", label: locale === "en" ? "834 × 1194 (Tablet)" : "834 × 1194 (平板)" },
  { value: "1920x720", label: locale === "en" ? "1920 × 720 (Automotive Wide)" : "1920 × 720 (车机宽屏)" },
  { value: "1920x1080", label: locale === "en" ? "1920 × 1080 (1080p FHD)" : "1920 × 1080 (1080p FHD)" },
  { value: "1920x1200", label: locale === "en" ? "1920 × 1200 (16:10 FHD)" : "1920 × 1200 (16:10 FHD)" },
  { value: "2560x1440", label: locale === "en" ? "2560 × 1440 (2K QHD)" : "2560 × 1440 (2K QHD)" },
  { value: "2560x1600", label: locale === "en" ? "2560 × 1600 (2.5K 16:10)" : "2560 × 1600 (2.5K 16:10)" },
  { value: "3840x2160", label: locale === "en" ? "3840 × 2160 (4K UHD)" : "3840 × 2160 (4K UHD)" },
  { value: "custom", label: locale === "en" ? "Custom…" : "自定义…" }
];

export const getHardwareQuickPairs = (locale: Locale = "zh-CN") => [
  { id: "none", label: locale === "en" ? "Select common device combination…" : "选择常用屏幕组合快速填入…", displaySize: "", resolution: "" },
  { id: "mobile_std", label: locale === "en" ? "Standard Phone · 6.1 inch (1170 × 2532)" : "标准手机 · 6.1 英寸 (1170 × 2532)", displaySize: "6.1 inch", resolution: "1170x2532" },
  { id: "mobile_large", label: locale === "en" ? "Large Phone · 6.7 inch (1290 × 2796)" : "大屏手机 · 6.7 英寸 (1290 × 2796)", displaySize: "6.7 inch", resolution: "1290x2796" },
  { id: "tablet_11", label: locale === "en" ? "Portable Tablet · 10.9 inch (834 × 1194)" : "便携平板 · 10.9 英寸 (834 × 1194)", displaySize: "10.9 inch", resolution: "834x1194" },
  { id: "laptop_13", label: locale === "en" ? "Laptop · 13.3 inch (2560 × 1600)" : "轻薄笔记本 · 13.3 英寸 (2560 × 1600)", displaySize: "13.3 inch", resolution: "2560x1600" },
  { id: "laptop_15", label: locale === "en" ? "FHD Laptop · 15.6 inch (1920 × 1080)" : "全高清笔记本 · 15.6 英寸 (1920 × 1080)", displaySize: "15.6 inch", resolution: "1920x1080" },
  { id: "monitor_27_2k", label: locale === "en" ? "Desktop 2K · 27.0 inch (2560 × 1440)" : "桌面 2K 屏 · 27.0 英寸 (2560 × 1440)", displaySize: "27 inch", resolution: "2560x1440" },
  { id: "monitor_27_4k", label: locale === "en" ? "Desktop 4K · 27.0 inch (3840 × 2160)" : "桌面 4K 屏 · 27.0 英寸 (3840 × 2160)", displaySize: "27 inch", resolution: "3840x2160" },
  { id: "vehicle_center", label: locale === "en" ? "Automotive Central · 12.3 inch (1920 × 720)" : "车机中控 · 12.3 英寸 (1920 × 720)", displaySize: "12.3 inch", resolution: "1920x720" }
];

export const getScenarioDomainOptions = (locale: Locale = "zh-CN"): Array<{ value: ScenarioDomain; label: string }> => [
  { value: "unknown", label: locale === "en" ? "Unspecified / General Screen" : "未指定 / 通用屏幕 (常规评估)" },
  { value: "mobile", label: locale === "en" ? "Mobile Devices (iOS / Android Apps)" : "移动设备 (手机 / 平板 App)" },
  { value: "automotive", label: locale === "en" ? "Automotive HMI (Center Console / Cluster)" : "车载 HMI (中控屏 / 仪表 / 驾驶环境)" },
  { value: "desktop", label: locale === "en" ? "Web & Desktop (PC Browser / Dashboard)" : "Web 网页 / 桌面端 (桌面浏览器 / 运营后台)" }
];

export const EvaluationParametersModal: React.FC<EvaluationParametersModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  imageWidth,
  imageHeight,
  imageName,
  initialSection = "screenshot",
  onTriggerImageUpload
}) => {
  const { t, locale } = useI18n();
  const resolvedInitialTab: ParameterTab =
    initialSection === "environment" ? "user_scenario" : (initialSection as ParameterTab) || "screenshot";

  const [activeTab, setActiveTab] = useState<ParameterTab>(resolvedInitialTab);
  const [draft, setDraft] = useState<EvaluationParametersData>(initialData);
  const [useAutoRules, setUseAutoRules] = useState<boolean>(
    !initialData.ruleSets || initialData.ruleSets.length === 0
  );

  const screenDiagonalPresets = useMemo(() => getScreenDiagonalPresets(locale), [locale]);
  const screenResolutionPresets = useMemo(() => getScreenResolutionPresets(locale), [locale]);
  const hardwareQuickPairs = useMemo(() => getHardwareQuickPairs(locale), [locale]);
  const scenarioDomainOptions = useMemo(() => getScenarioDomainOptions(locale), [locale]);

  useEffect(() => {
    if (isOpen) {
      setDraft(initialData);
      setUseAutoRules(!initialData.ruleSets || initialData.ruleSets.length === 0);
      if (initialSection) {
        setActiveTab(initialSection === "environment" ? "user_scenario" : (initialSection as ParameterTab));
      }
    }
  }, [isOpen, initialData, initialSection]);

  const hasUnsavedChanges = useMemo(() => {
    return JSON.stringify(draft) !== JSON.stringify(initialData);
  }, [draft, initialData]);

  const handleAttemptClose = () => {
    if (hasUnsavedChanges) {
      const confirmDiscard = window.confirm(
        locale === "en"
          ? "You have unsaved changes. Discard and close?"
          : "当前有未保存的参数修改，确定要放弃修改并关闭吗？"
      );
      if (!confirmDiscard) {
        return;
      }
    }
    onClose();
  };

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        handleAttemptClose();
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, hasUnsavedChanges, onClose]);

  const activeLogicalMapping: LogicalUnitMapping | null = useMemo(() => {
    if (draft.designInfoStatus === "unknown") return null;

    if (draft.designInfoStatus === "partial") {
      const devLogicalW = draft.deviceProfile
        ? getDeviceLogicalWidth(draft.deviceProfile, draft.targetPlatform)
        : undefined;
      if (!devLogicalW || devLogicalW <= 0) return null;
      const refImgW = draft.imageReferenceWidth || imageWidth || devLogicalW;
      return createLogicalUnitMapping(
        draft.targetPlatform,
        draft.logicalUnit,
        refImgW,
        devLogicalW,
        undefined,
        undefined,
        "exact_profile"
      );
    }

    if (draft.logicalReferenceWidth <= 0) return null;
    const refImgW =
      draft.calibrationMode === "cropped" &&
      draft.croppedScaleMode === "preserved_pixel_scale" &&
      draft.originalImageReferenceWidth &&
      draft.originalImageReferenceWidth > 0
        ? draft.originalImageReferenceWidth
        : draft.imageReferenceWidth || imageWidth || 0;

    if (refImgW <= 0) return null;

    if (draft.calibrationMode === "cropped" && draft.croppedScaleMode === "preserved_pixel_scale") {
      return createCroppedPreservedScaleMapping(
        draft.targetPlatform,
        draft.logicalUnit,
        refImgW,
        draft.logicalReferenceWidth,
        "user_specified"
      );
    }

    return createLogicalUnitMapping(
      draft.targetPlatform,
      draft.logicalUnit,
      refImgW,
      draft.logicalReferenceWidth,
      undefined,
      undefined,
      "user_specified"
    );
  }, [
    draft.designInfoStatus,
    draft.deviceProfile,
    draft.targetPlatform,
    draft.logicalUnit,
    draft.logicalReferenceWidth,
    draft.imageReferenceWidth,
    draft.calibrationMode,
    draft.croppedScaleMode,
    draft.originalImageReferenceWidth,
    imageWidth
  ]);

  const capabilityPreview = useMemo(() => {
    const rawDisp = resolveDisplayParameters(
      draft.displaySize,
      draft.resolution,
      draft.customDisplaySize ?? "",
      draft.customResolution ?? ""
    );

    const capContext: CapabilityContext = {
      imageWidth: imageWidth || 1000,
      imageHeight: imageHeight || 1000,
      imageName: imageName || "preview",
      calibrationMode: draft.calibrationMode,
      croppedScaleMode: draft.croppedScaleMode,
      originalImageReferenceWidth: draft.originalImageReferenceWidth,
      displaySize: rawDisp.displaySize,
      resolution: rawDisp.resolution,
      logicalMapping: activeLogicalMapping
    };

    return resolveAllCapabilities(capContext);
  }, [
    draft.calibrationMode,
    draft.croppedScaleMode,
    draft.originalImageReferenceWidth,
    draft.displaySize,
    draft.resolution,
    draft.customDisplaySize,
    draft.customResolution,
    activeLogicalMapping,
    imageWidth,
    imageHeight,
    imageName
  ]);

  if (!isOpen) return null;

  const handleSaveAndClose = () => {
    const finalData: EvaluationParametersData = {
      ...draft,
      ruleSets: useAutoRules ? [] : draft.ruleSets
    };
    onSave(finalData);
    onClose();
  };

  const isDiagonalPreset = screenDiagonalPresets.some((p) => p.value === draft.displaySize && p.value !== "custom");
  const isResolutionPreset = screenResolutionPresets.some((p) => p.value === draft.resolution && p.value !== "custom");

  const deriveDomainFromDevice = (pairId: string): ScenarioDomainOption => {
    if (pairId.startsWith("mobile_") || pairId === "tablet_11") return "mobile";
    if (pairId === "vehicle_center") return "automotive";
    if (pairId.startsWith("laptop_") || pairId.startsWith("monitor_")) return "desktop";
    return "unknown";
  };

  const tierLabels = locale === "en" ? EVALUATION_TIER_LABELS_EN : EVALUATION_TIER_LABELS;

  const modalContent = (
    <div
      className="parametersModalOverlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="parameters-dialog-title"
    >
      <div className="parametersModalCard" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="parametersModalHeader">
          <div>
            <h2 id="parameters-dialog-title" className="parametersModalTitle">
              {t("params_modal.title")}
            </h2>
            <p className="parametersModalSubtitle">
              {t("params_modal.subtitle")}
            </p>
          </div>
          <button className="parametersModalCloseBtn" onClick={handleAttemptClose} aria-label={t("action.close")}>
            ✕
          </button>
        </div>

        {/* Live capability summary banner */}
        <div className="parametersCapabilityBanner">
          <div className="parametersCapabilityBannerHeader">
            <span className="bannerTitle">
              {locale === "en" ? "Supported precision based on current inputs:" : "当前输入支持评估精度："}
            </span>
          </div>
          <div className="parametersCapabilityChips">
            <span className={`paramCapChip ${capabilityPreview.physical_geometry.highestAvailableTier !== "screenshot_fact" ? "active" : ""}`}>
              {locale === "en" ? "Physical Dimensions" : "物理尺寸"}: {tierLabels[capabilityPreview.physical_geometry.highestAvailableTier]}
            </span>
            <span className={`paramCapChip ${capabilityPreview.typography.highestAvailableTier !== "screenshot_fact" ? "active" : ""}`}>
              {locale === "en" ? "Typography" : "字号校验"}: {tierLabels[capabilityPreview.typography.highestAvailableTier]}
            </span>
            <span className={`paramCapChip ${capabilityPreview.platform_target_size.highestAvailableTier !== "screenshot_fact" ? "active" : ""}`}>
              {locale === "en" ? "Platform Touch" : "平台触控"}: {tierLabels[capabilityPreview.platform_target_size.highestAvailableTier]}
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="parametersTabNav">
          <button
            type="button"
            className={`paramTabBtn ${activeTab === "screenshot" ? "active" : ""}`}
            onClick={() => setActiveTab("screenshot")}
          >
            {t("params_modal.tab_screenshot")}
          </button>
          <button
            type="button"
            className={`paramTabBtn ${activeTab === "screen" ? "active" : ""}`}
            onClick={() => setActiveTab("screen")}
          >
            {t("params_modal.tab_screen")}
          </button>
          <button
            type="button"
            className={`paramTabBtn ${activeTab === "user_scenario" ? "active" : ""}`}
            onClick={() => setActiveTab("user_scenario")}
          >
            {t("params_modal.tab_context")}
          </button>
          <button
            type="button"
            className={`paramTabBtn ${activeTab === "design" ? "active" : ""}`}
            onClick={() => setActiveTab("design")}
          >
            {t("params_modal.tab_design")}
          </button>
        </div>

        {/* Body content */}
        <div className="parametersModalBody">
          {/* TAB 1: Screenshot & Scope */}
          {activeTab === "screenshot" && (
            <div className="paramTabContent">
              <div className="paramField">
                <label className="paramLabel">{locale === "en" ? "Uploaded Screenshot Resolution" : "上传图片自然尺寸"}</label>
                <div className="readOnlyInfoBox" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  {imageWidth && imageHeight ? (
                    <span>
                      {imageWidth} × {imageHeight} {locale === "en" ? "pixels (px)" : "像素 (px)"} {imageName ? `— ${imageName}` : ""}
                    </span>
                  ) : (
                    <span className="mutedText">
                      {locale === "en" ? "No screenshot uploaded yet (pixel dimensions auto-detected upon upload)" : "尚未上传图片（上传后自动读取像素尺寸）"}
                    </span>
                  )}
                  {onTriggerImageUpload && (
                    <button
                      type="button"
                      className="paramReplaceImgBtn"
                      onClick={() => {
                        onTriggerImageUpload();
                        onClose();
                      }}
                    >
                      {locale === "en" ? "Replace Screenshot" : "更换截图"}
                    </button>
                  )}
                </div>
              </div>

              <div className="paramField">
                <label className="paramLabel">{locale === "en" ? "Screenshot Scope Type" : "截图范围类型"}</label>
                <div className="radioGroup">
                  <label className="radioOption">
                    <input
                      type="radio"
                      name="modalCalibrationMode"
                      value="full_screen"
                      checked={draft.calibrationMode === "full_screen"}
                      onChange={() => setDraft((p) => ({ ...p, calibrationMode: "full_screen" }))}
                    />
                    <div>
                      <strong>{locale === "en" ? "Full Screen / Window (Full Screen)" : "完整屏幕 / 界面（Full Screen）"}</strong>
                      <p className="optionDesc">
                        {locale === "en"
                          ? "Screenshot covers entire display (not cropped), allowing physical dimensions to be derived from screen diagonal."
                          : "截图包含完整设备显示屏或界面（非局部裁切），可按屏幕对角线比例估算物理尺寸。"}
                      </p>
                    </div>
                  </label>

                  <label className="radioOption">
                    <input
                      type="radio"
                      name="modalCalibrationMode"
                      value="cropped"
                      checked={draft.calibrationMode === "cropped"}
                      onChange={() => setDraft((p) => ({ ...p, calibrationMode: "cropped" }))}
                    />
                    <div>
                      <strong>{locale === "en" ? "Cropped Area / Partial Screen (Cropped Area)" : "局部截图 / 局部区域（Cropped Area）"}</strong>
                      <p className="optionDesc">
                        {locale === "en"
                          ? "Screenshot is a cropped sub-region. Specify whether original 1:1 pixel scale is preserved."
                          : "截图仅为界面某个局部（非全屏）。需明确是否保持原始像素比例。"}
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {draft.calibrationMode === "cropped" && (
                <div className="paramField subField">
                  <label className="paramLabel">{locale === "en" ? "Cropped Scale & Original Reference" : "局部截图比例与原图参考"}</label>
                  <div className="radioGroup">
                    <label className="radioOption">
                      <input
                        type="radio"
                        name="modalCroppedScaleMode"
                        value="unknown_or_resized"
                        checked={draft.croppedScaleMode === "unknown_or_resized"}
                        onChange={() => setDraft((p) => ({ ...p, croppedScaleMode: "unknown_or_resized" }))}
                      />
                      <div>
                        <strong>{locale === "en" ? "Scale Unknown / Resized (Screenshot Facts only)" : "比例未知 / 经过缩放（降级为截图事实测量）"}</strong>
                        <p className="optionDesc">
                          {locale === "en"
                            ? "Original scale cannot be determined. Fallback to pixel measurements and contrast check without physical/logical mapping."
                            : "无法确认原图比例，仅进行像素测量与对比度检查，不建立物理尺寸与逻辑尺寸映射。"}
                        </p>
                      </div>
                    </label>

                    <label className="radioOption">
                      <input
                        type="radio"
                        name="modalCroppedScaleMode"
                        value="preserved_pixel_scale"
                        checked={draft.croppedScaleMode === "preserved_pixel_scale"}
                        onChange={() => setDraft((p) => ({ ...p, croppedScaleMode: "preserved_pixel_scale" }))}
                      />
                      <div>
                        <strong>{locale === "en" ? "Preserved 1:1 Pixel Scale (Provide full screen width)" : "保持原图 1:1 像素比例（提供原始全图宽度）"}</strong>
                        <p className="optionDesc">
                          {locale === "en"
                            ? "1:1 crop from original. Provide original full image reference width to restore physical and logical mapping."
                            : "截图为 1:1 原始裁切。输入原始全屏参考宽后可恢复物理与逻辑换算。"}
                        </p>
                      </div>
                    </label>
                  </div>

                  {draft.croppedScaleMode === "preserved_pixel_scale" && (
                    <div className="paramField" style={{ marginTop: "10px" }}>
                      <label className="paramSubLabel">{locale === "en" ? "Original Full Image Reference Width (px)" : "原始全图物理参考宽 (px)"}</label>
                      <input
                        type="number"
                        className="paramInput"
                        placeholder={locale === "en" ? "e.g. 1170, 1290, 1080" : "例如：1170, 1290, 1080"}
                        value={draft.originalImageReferenceWidth || ""}
                        onChange={(e) =>
                          setDraft((p) => ({
                            ...p,
                            originalImageReferenceWidth: e.target.value ? parseInt(e.target.value, 10) : undefined
                          }))
                        }
                      />
                      <p className="paramHelp">
                        {locale === "en"
                          ? "Pixel width of full screen before cropping, used to calculate scale relationship."
                          : "裁剪前完整屏幕界面的物理像素宽度，用于计算局部截图与全屏硬件的对应关系。"}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Screen / Device Info */}
          {activeTab === "screen" && (
            <div className="paramTabContent">
              <div className="paramField">
                <label className="paramLabel">{locale === "en" ? "Quick Screen Hardware Preset" : "常用屏幕组合快捷填入"}</label>
                <select
                  className="paramSelect"
                  onChange={(e) => {
                    const pair = hardwareQuickPairs.find((p) => p.id === e.target.value);
                    if (pair && pair.id !== "none") {
                      setDraft((prev) => {
                        const nextDomain = prev.scenarioDomainUserOverridden
                          ? prev.scenarioDomain
                          : deriveDomainFromDevice(pair.id);
                        return {
                          ...prev,
                          displaySize: pair.displaySize,
                          resolution: pair.resolution,
                          customDisplaySize: "",
                          customResolution: "",
                          scenarioDomain: nextDomain
                        };
                      });
                    }
                  }}
                  defaultValue="none"
                >
                  {hardwareQuickPairs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <p className="paramHelp">
                  {locale === "en"
                    ? "Select a common profile to auto-fill diagonal size and resolution, or customize below."
                    : "选择常用机型组合可一键填入尺寸与分辨率，也可在下方单独修改。"}
                </p>
              </div>

              <div className="paramGridRow">
                <div className="paramField">
                  <label className="paramLabel">{locale === "en" ? "Screen Diagonal Size" : "屏幕对角线尺寸"}</label>
                  <select
                    className="paramSelect"
                    value={isDiagonalPreset ? draft.displaySize : "custom"}
                    onChange={(e) => {
                      if (e.target.value === "custom") {
                        setDraft((p) => ({ ...p, displaySize: "custom" }));
                      } else {
                        setDraft((p) => ({ ...p, displaySize: e.target.value }));
                      }
                    }}
                  >
                    {screenDiagonalPresets.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {(!isDiagonalPreset || draft.displaySize === "custom") && (
                    <input
                      type="text"
                      className="paramInput"
                      style={{ marginTop: "6px" }}
                      placeholder={locale === "en" ? "e.g. 6.1 inch, 15.6 inch" : "例如：6.1 inch, 15.6 英寸"}
                      value={draft.customDisplaySize || (draft.displaySize !== "custom" ? draft.displaySize : "")}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          customDisplaySize: e.target.value,
                          displaySize: "custom"
                        }))
                      }
                    />
                  )}
                </div>

                <div className="paramField">
                  <label className="paramLabel">{locale === "en" ? "Hardware Display Resolution" : "硬件显示分辨率"}</label>
                  <select
                    className="paramSelect"
                    value={isResolutionPreset ? draft.resolution : "custom"}
                    onChange={(e) => {
                      if (e.target.value === "custom") {
                        setDraft((p) => ({ ...p, resolution: "custom" }));
                      } else {
                        setDraft((p) => ({ ...p, resolution: e.target.value }));
                      }
                    }}
                  >
                    {screenResolutionPresets.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {(!isResolutionPreset || draft.resolution === "custom") && (
                    <input
                      type="text"
                      className="paramInput"
                      style={{ marginTop: "6px" }}
                      placeholder={locale === "en" ? "e.g. 1170x2532, 1920x1080" : "例如：1170x2532, 1920x1080"}
                      value={draft.customResolution || (draft.resolution !== "custom" ? draft.resolution : "")}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          customResolution: e.target.value,
                          resolution: "custom"
                        }))
                      }
                    />
                  )}
                </div>
              </div>

              {/* Aspect ratio mismatch contain estimation toggle */}
              {imageWidth && imageHeight && parseResolution(draft.customResolution || draft.resolution) && (
                <div className="paramField" style={{ marginTop: "8px" }}>
                  <label className="checkboxOptionItem" style={{ background: "#f8fafc" }}>
                    <input
                      type="checkbox"
                      checked={!!draft.allowEstimation}
                      onChange={(e) => setDraft((p) => ({ ...p, allowEstimation: e.target.checked }))}
                    />
                    <span>
                      {locale === "en"
                        ? "Allow Letterbox estimation when screenshot aspect ratio does not strictly match hardware screen"
                        : "在截图比例与屏幕硬件不完全一致时，允许等比贴合（Letterbox）估算物理尺寸"}
                    </span>
                  </label>
                  <p className="paramHelp" style={{ paddingLeft: "4px" }}>
                    {locale === "en"
                      ? "Strict mode is enabled by default (no physical conversion on ratio mismatch). Enabling this estimates rough mm under a letterbox assumption."
                      : "默认保持严格模式（不一致时不建立物理换算）。启用后将在留黑边假定下计算内容区粗略毫米尺寸（明确标为粗略估算，供人因参考）。"}
                  </p>
                </div>
              )}

              <div className="paramNoteBox">
                <p>
                  💡 <strong>{locale === "en" ? "Hardware Role: " : "硬件参数作用："}</strong>
                  {locale === "en"
                    ? "Establishes physical mapping between screenshot and physical screen area to derive approximate mm dimensions. If unsure, leave empty to stay in screenshot-fact mode."
                    : "用于建立截图与真实屏幕显示区域之间的粗略物理映射，从而估算元素毫米尺寸。如不确定可留空，系统将保持截图事实精度。"}
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: Evaluation Context */}
          {activeTab === "user_scenario" && (
            <div className="paramTabContent">
              {/* Structured Scenario Domain */}
              <div className="paramField">
                <label className="paramLabel">{t("meta.domain")}</label>
                <select
                  className="paramSelect"
                  value={draft.scenarioDomain || "unknown"}
                  onChange={(e) => {
                    const val = e.target.value as ScenarioDomainOption;
                    setDraft((p) => ({
                      ...p,
                      scenarioDomain: val,
                      scenarioDomainUserOverridden: true
                    }));
                  }}
                >
                  {scenarioDomainOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="paramHelp">
                  {locale === "en"
                    ? "Specifies application domain (Mobile, Automotive HMI, Web/Desktop, Smart Display), determining human factors and rule applicability."
                    : "指定界面的应用领域（如移动设备、车载 HMI、桌面网页或智能通用屏），直接决定人因与领域规范的适用性。"}
                </p>
              </div>

              {/* Target Platform */}
              <div className="paramField">
                <label className="paramLabel">{t("meta.platform")}</label>
                <select
                  className="paramSelect"
                  value={draft.targetPlatform}
                  onChange={(e) => {
                    const plat = e.target.value as TargetPlatform;
                    let defaultUnit: LogicalUnit = "pt";
                    if (plat === "ios") {
                      defaultUnit = "pt";
                    } else if (plat === "android") {
                      defaultUnit = "dp";
                    } else if (plat === "web") {
                      defaultUnit = "css_px";
                    } else if (plat === "custom") {
                      defaultUnit = "pt";
                    } else {
                      defaultUnit = "pt";
                    }
                    setDraft((p) => ({
                      ...p,
                      targetPlatform: plat,
                      logicalUnit: defaultUnit
                    }));
                  }}
                >
                  <option value="unknown">{locale === "en" ? "Unspecified / Screenshot Only" : "未知 / 仅有截图 (暂不指定平台)"}</option>
                  <option value="ios">Apple iOS (pt)</option>
                  <option value="android">Google Android (dp / sp)</option>
                  <option value="web">{locale === "en" ? "Web Browser (CSS px)" : "Web 网页端 (CSS px)"}</option>
                  <option value="custom">{locale === "en" ? "Custom Unit Platform" : "自定义单位平台 (需指定单位与缩放)"}</option>
                </select>
                <p className="paramHelp">
                  {locale === "en"
                    ? "Specifies target OS platform. Enables guideline matching and identifies required design basis."
                    : "指定界面的目标操作系统平台。即使未提供设计尺寸，系统也能识别平台身份并在需要逻辑尺寸时给出待补充提示。"}
                </p>
              </div>

              {/* Viewing Distance */}
              <div className="paramField">
                <label className="paramLabel">{locale === "en" ? "Typical Viewing Distance (Optional)" : "典型观看距离（可选）"}</label>
                <input
                  type="text"
                  className="paramInput"
                  placeholder={locale === "en" ? "e.g. 300 mm, 700 mm, 70 cm, 0.7 m" : "例如：300 mm, 700 mm, 70 cm, 0.7 m"}
                  value={draft.viewingDistance}
                  onChange={(e) => setDraft((p) => ({ ...p, viewingDistance: e.target.value }))}
                />
                <p className="paramHelp">
                  {locale === "en"
                    ? "Estimated eye-to-screen distance for Visual Angle and legibility evaluation. Supports mm, cm, m, inch."
                    : "填写眼睛到当前屏幕界面的估计视距。用于人因视角（Visual Angle）大小与可读性评估。支持 mm、cm、m、inch 等单位。"}
                </p>
              </div>

              <div className="paramNoteBox">
                <p>
                  💡 <strong>{locale === "en" ? "Automatic Rule Matching: " : "自动匹配规则："}</strong>
                  {locale === "en"
                    ? "The system automatically matches authoritative standards and human factors references based on input facts, hardware parameters, and domain."
                    : "系统统一根据当前输入事实、硬件参数与适用领域自动匹配权威标准与人因参考。"}
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: Design Information (Optional) */}
          {activeTab === "design" && (
            <div className="paramTabContent">
              <div className="paramNoteBox" style={{ marginBottom: "16px", background: "#f8fafc", borderColor: "#cbd5e1" }}>
                <p>
                  💡 <strong>{locale === "en" ? "Design Dimensions (Optional): " : "设计稿尺寸信息（可选）："}</strong>
                  {locale === "en"
                    ? "Skip this step if you only have a competitor screenshot. Adding design basis enables pt / dp / CSS px conversion and platform guidelines."
                    : "如果你只有竞品截图，可以跳过此步骤。补充设计稿尺寸信息后，可进一步换算 pt / dp / CSS px 逻辑单位并执行对应平台规范校验。"}
                </p>
              </div>

              <div className="paramField">
                <label className="paramLabel">{locale === "en" ? "Design Dimensions Status" : "设计尺寸信息"}</label>
                <div className="radioGroup">
                  <label className="radioOption">
                    <input
                      type="radio"
                      name="modalDesignInfoStatus"
                      value="unknown"
                      checked={draft.designInfoStatus === "unknown"}
                      onChange={() => setDraft((p) => ({ ...p, designInfoStatus: "unknown" }))}
                    />
                    <div>
                      <strong>{locale === "en" ? "Not Provided" : "未提供设计尺寸"}</strong>
                      <p className="optionDesc">
                        {locale === "en"
                          ? "Logical conversion skipped. Pixel measurements, physical dimensions, and visual angles remain fully supported."
                          : "暂不进行 pt / dp / CSS px 换算。截图测量、物理尺寸和视觉角评估不受影响。"}
                      </p>
                    </div>
                  </label>

                  <label className="radioOption">
                    <input
                      type="radio"
                      name="modalDesignInfoStatus"
                      value="partial"
                      checked={draft.designInfoStatus === "partial"}
                      onChange={() => setDraft((p) => ({ ...p, designInfoStatus: "partial" }))}
                    />
                    <div>
                      <strong>{locale === "en" ? "Derived from Device Profile" : "根据设备信息确定"}</strong>
                      <p className="optionDesc">
                        {locale === "en"
                          ? "Automatically derives logical viewport based on standard device profile."
                          : "根据当前设备 Profile 的可信标准视口与逻辑尺寸自动建立换算关系。"}
                      </p>
                    </div>
                  </label>

                  <label className="radioOption">
                    <input
                      type="radio"
                      name="modalDesignInfoStatus"
                      value="source_available"
                      checked={draft.designInfoStatus === "source_available"}
                      onChange={() => setDraft((p) => ({ ...p, designInfoStatus: "source_available" }))}
                    />
                    <div>
                      <strong>{locale === "en" ? "User Confirmed Design Dimensions" : "用户确认设计尺寸"}</strong>
                      <p className="optionDesc">
                        {locale === "en"
                          ? "Specify exact design width and screenshot reference width."
                          : "用户明确填写设计宽度与截图参考宽度以建立换算。"}
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {draft.designInfoStatus !== "unknown" && (
                <>
                  {draft.designInfoStatus === "partial" && (
                    <div className="paramNoteBox" style={{ marginTop: "12px", background: "#f0fdf4", borderColor: "#bbf7d0" }}>
                      <p>
                        📱 <strong>{locale === "en" ? "Device Profile Mapping: " : "设备 Profile 换算："}</strong>
                        {locale === "en" ? "Logical viewport established based on device configuration." : "已根据当前设备配置建立逻辑视口换算。"}
                        {activeLogicalMapping && activeLogicalMapping.scale_x > 0 ? (
                          <span style={{ color: "#16a34a", fontWeight: 600, display: "block", marginTop: "4px" }}>
                            {locale === "en" ? `Current scale: ${formatScaleRatio(activeLogicalMapping, "en")}` : `当前换算：${formatScaleRatio(activeLogicalMapping, "zh-CN")}`}
                          </span>
                        ) : (
                          <span style={{ color: "#ca8a04", display: "block", marginTop: "4px" }}>
                            {locale === "en" ? "No preset viewport found for device. Switch to 'User Confirmed' below." : "当前设备 Profile 无预设逻辑视口，需在下方切换为“用户确认设计尺寸”手动填写。"}
                          </span>
                        )}
                      </p>
                    </div>
                  )}

                  {draft.designInfoStatus === "source_available" && (
                    <div className="paramGridRow">
                      <div className="paramField">
                        <label className="paramLabel">{locale === "en" ? `Design Width (${draft.logicalUnit})` : `设计宽度 (${draft.logicalUnit})`}</label>
                        <input
                          type="number"
                          className="paramInput"
                          placeholder={locale === "en" ? "e.g. 390, 360, 1440" : "例如：390, 360, 1440"}
                          value={draft.logicalReferenceWidth || ""}
                          onChange={(e) =>
                            setDraft((p) => ({
                              ...p,
                              logicalReferenceWidth: e.target.value ? parseFloat(e.target.value) : 0
                            }))
                          }
                        />
                        <p className="paramHelp">{locale === "en" ? "Logical width in design file or interface." : "设计宽度：设计稿或系统界面的逻辑宽度。"}</p>
                      </div>

                      <div className="paramField">
                        <label className="paramLabel">{locale === "en" ? "Screenshot Reference Width (px)" : "截图参考宽度 (px)"}</label>
                        <input
                          type="number"
                          className="paramInput"
                          placeholder={locale === "en" ? "e.g. 1170, 1080" : "例如：1170, 1080"}
                          value={draft.imageReferenceWidth || ""}
                          onChange={(e) =>
                            setDraft((p) => ({
                              ...p,
                              imageReferenceWidth: e.target.value ? parseFloat(e.target.value) : 0
                            }))
                          }
                        />
                        <p className="paramHelp">
                          {locale === "en" ? "Corresponding pixel width in current screenshot." : "截图参考宽度：上述设计宽度在当前截图中对应的像素宽度。"}
                          {activeLogicalMapping && activeLogicalMapping.scale_x > 0 ? (
                            <span style={{ color: "#16a34a", fontWeight: 600, display: "block", marginTop: "4px" }}>
                              {locale === "en" ? `Current scale: ${formatScaleRatio(activeLogicalMapping, "en")}` : `当前换算：${formatScaleRatio(activeLogicalMapping, "zh-CN")}`}
                            </span>
                          ) : null}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="parametersModalFooter">
          <button className="parametersModalCancelBtn" onClick={handleAttemptClose}>
            {t("action.cancel")}
          </button>
          <button className="parametersModalSaveBtn" onClick={handleSaveAndClose}>
            {locale === "en" ? "Save & Return" : "保存并返回"}
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};
