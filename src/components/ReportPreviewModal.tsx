import React, { useEffect } from "react";
import ReactDOM from "react-dom";
import type { ReportFilter, ReportSummaryData } from "../types/report";
import { groupActionableFindings } from "../utils/impactRecommendation";
import { getElementDisplayName } from "../utils/labels";
import { useI18n } from "../i18n";

interface ReportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportData: ReportSummaryData;
  activeFilter: ReportFilter;
  onFilterChange: (filter: ReportFilter) => void;
  onExportHtml: () => void;
}

export const ReportPreviewModal: React.FC<ReportPreviewModalProps> = ({
  isOpen,
  onClose,
  reportData,
  activeFilter,
  onFilterChange,
  onExportHtml
}) => {
  const { t, locale } = useI18n();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="reportModalOverlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-preview-title"
    >
      <div className="reportModalCard" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="reportModalHeader">
          <div className="reportModalHeaderTitle">
            <h2 id="report-preview-title" className="reportModalTitle">
              {t("report_modal.title")}
            </h2>
            <p className="reportModalSubtitle">
              {t("report_modal.subtitle")}
            </p>
          </div>
          <div className="reportModalHeaderActions">
            <div className="reportFilterGroup">
              <button
                type="button"
                className={`reportFilterBtn ${activeFilter === "all" ? "active" : ""}`}
                onClick={() => onFilterChange("all")}
              >
                {t("report_modal.filter_all", { count: reportData.totalElementsCount })}
              </button>
              <button
                type="button"
                className={`reportFilterBtn ${activeFilter === "attention_only" ? "active" : ""}`}
                onClick={() => onFilterChange("attention_only")}
              >
                {t("report_modal.filter_attention", { count: reportData.attentionCount })}
              </button>
            </div>
            <button className="reportModalCloseBtn" onClick={onClose} aria-label={t("action.close")}>
              ✕
            </button>
          </div>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="reportModalBody">
          {/* Summary Stat Grid */}
          <div className="reportSummaryOverview">
            <div className="reportStatRow">
              <div className="reportStatItem">
                <span className="statLabel">{t("report_modal.stat_screenshot_size")}</span>
                <span className="statVal">
                  {reportData.imageNaturalDimensions.width} × {reportData.imageNaturalDimensions.height} px
                </span>
              </div>
              <div className="reportStatItem">
                <span className="statLabel">{t("report_modal.stat_screenshot_scope")}</span>
                <span className="statVal">{reportData.screenshotScopeLabel}</span>
              </div>
              <div className="reportStatItem">
                <span className="statLabel">{t("report_modal.stat_design_status")}</span>
                <span className="statVal">
                  {reportData.designInfoStatus === "unknown"
                    ? (locale === "en" ? "Unavailable / Screenshot Facts" : "未提供 / 截图事实")
                    : reportData.designInfoStatus === "partial"
                    ? (locale === "en" ? "Partially Provided" : "部分提供")
                    : (locale === "en" ? "Source Basis Known" : "源基准已知")}
                </span>
              </div>
              <div className="reportStatItem">
                <span className="statLabel">{t("report_modal.stat_displayed_elements")}</span>
                <span className="statVal">
                  {locale === "en" ? `${reportData.elements.length} elements` : `${reportData.elements.length} 个`}
                </span>
              </div>
            </div>

            {/* Evaluation Context Grid */}
            {reportData.evaluationContext && (
              <div className="reportContextBox">
                <h4 className="reportContextTitle">{t("report_modal.context_heading")}</h4>
                <div className="reportContextGrid">
                  <div className="reportContextItem">
                    <span className="contextLabel">{t("meta.domain")}</span>
                    <span className="contextVal">{reportData.evaluationContext.domainLabel}</span>
                  </div>
                  <div className="reportContextItem">
                    <span className="contextLabel">{t("meta.viewing_distance")}</span>
                    <span className="contextVal">{reportData.evaluationContext.viewingDistanceDisplay}</span>
                  </div>
                  <div className="reportContextItem">
                    <span className="contextLabel">{t("meta.screen_hardware")}</span>
                    <span className="contextVal">{reportData.evaluationContext.screenHardwareDisplay}</span>
                  </div>
                  <div className="reportContextItem">
                    <span className="contextLabel">{t("report_modal.stat_screenshot_scope")}</span>
                    <span className="contextVal">{reportData.evaluationContext.screenshotScopeDisplay}</span>
                  </div>
                  <div className="reportContextItem">
                    <span className="contextLabel">{t("meta.design_basis")}</span>
                    <span className="contextVal">{reportData.evaluationContext.designBasisDisplay}</span>
                  </div>
                  <div className="reportContextItem">
                    <span className="contextLabel">{t("meta.platform")}</span>
                    <span className="contextVal">{reportData.evaluationContext.targetPlatformDisplay}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Actual Scope & Actual References */}
            {((reportData.completedEvaluationScope && reportData.completedEvaluationScope.length > 0) ||
              (reportData.pendingEvaluationScope && reportData.pendingEvaluationScope.length > 0) ||
              (reportData.actualReferencesUsed && reportData.actualReferencesUsed.length > 0)) && (
              <div className="reportScopeRefGrid">
                {((reportData.completedEvaluationScope && reportData.completedEvaluationScope.length > 0) ||
                  (reportData.pendingEvaluationScope && reportData.pendingEvaluationScope.length > 0)) && (
                  <div className="reportScopeCard">
                    <h4 className="scopeTitle">{t("report_modal.coverage_heading")}</h4>
                    {reportData.completedEvaluationScope && reportData.completedEvaluationScope.length > 0 && (
                      <div className="scopeGroupSection">
                        <span className="scopeGroupLabel">
                          {locale === "en" ? "Covered Dimensions:" : "已覆盖评估维度："}
                        </span>
                        <div className="reportScopePills">
                          {reportData.completedEvaluationScope.map((s, i) => (
                            <span key={i} className="reportScopePill">
                              ● {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {reportData.pendingEvaluationScope && reportData.pendingEvaluationScope.length > 0 && (
                      <div className="scopeGroupSection" style={{ marginTop: "6px" }}>
                        <span className="scopeGroupLabel pending">
                          {locale === "en" ? "Pending Evaluation:" : "待补充后可评估："}
                        </span>
                        <div className="reportScopePills">
                          {reportData.pendingEvaluationScope.map((s, i) => (
                            <span key={i} className="reportScopePill pending">
                              ○ {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {reportData.actualReferencesUsed && reportData.actualReferencesUsed.length > 0 && (
                  <div className="reportScopeCard">
                    <h4 className="scopeTitle">{t("report_modal.references_heading")}</h4>
                    <div className="scopeGroupSection">
                      <span className="scopeGroupLabel">
                        {locale === "en" ? "Active References Used:" : "主要比对参考："}
                      </span>
                      <div className="reportScopePills">
                        {reportData.actualReferencesUsed.map((r, i) => (
                          <span key={i} className="reportRefPill">
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>
                    {reportData.pendingReferences && reportData.pendingReferences.length > 0 && (
                      <div className="scopeGroupSection" style={{ marginTop: "6px" }}>
                        <span className="scopeGroupLabel pending">
                          {locale === "en" ? "Pending References:" : "待解锁参考："}
                        </span>
                        <div className="reportScopePills">
                          {reportData.pendingReferences.map((r, i) => (
                            <span key={i} className="reportRefPill pending">
                              {r}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <small className="reportScopeHelp">{t("report_modal.coverage_disclaimer")}</small>
                  </div>
                )}
              </div>
            )}

            {/* Assumptions */}
            {reportData.assumptions.length > 0 && (
              <div className="reportAssumptionsBox">
                <h4>{locale === "en" ? "📋 Evaluation Baseline & Assumptions" : "📋 评估假设与依据说明"}</h4>
                <ul>
                  {reportData.assumptions.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Full Evidence Screenshot Preview */}
          {reportData.fullEvidenceScreenshotDataUrl && (
            <div className="reportScreenshotSection">
              <h3 className="reportSectionTitle">
                {locale === "en" ? "Screenshot Review Overview (Numbered Index)" : "完整截图标注索引 (编号映射)"}
              </h3>
              <div className="reportScreenshotWrapper">
                <img
                  src={reportData.fullEvidenceScreenshotDataUrl}
                  alt={locale === "en" ? "Full Evidence Screenshot" : "全图编号证据"}
                  className="reportScreenshotImg"
                />
              </div>
            </div>
          )}

          {/* Elements List */}
          <div className="reportElementsSection">
            <h3 className="reportSectionTitle">
              {locale === "en" ? `Element Findings (${reportData.elements.length})` : `元素评估结果 (${reportData.elements.length} 个)`}
            </h3>
            <div className="reportElementsList">
              {reportData.elements.map((el) => (
                <div key={el.elementId} className="reportElementCard">
                  <div className="reportElementHeader">
                    <div className="reportElementTagRow">
                      <span className="reportNumberBadge">#{el.index}</span>
                      <span className="reportElementName">{getElementDisplayName({ label: el.label, element_id: el.elementId }, el.index - 1, locale)}</span>
                      <span className="reportElementType">({el.elementTypeLabel})</span>
                    </div>
                    <span className="reportTierTag">{el.highestTierLabel}</span>
                  </div>

                  <div className="reportElementBody">
                    {/* Thumbnail */}
                    <div className="reportThumbnailBox">
                      {el.thumbnailDataUrl ? (
                        <img
                          src={el.thumbnailDataUrl}
                          alt={locale === "en" ? `#${el.index} Context thumbnail` : `#${el.index} 上下文微缩图`}
                          className="reportThumbnailImg"
                        />
                      ) : (
                        <span className="emptyThumbText">{locale === "en" ? "No thumbnail" : "暂无缩略图"}</span>
                      )}
                      <small className="thumbCaption">#{el.index} {locale === "en" ? "Context thumbnail" : "上下文微缩图"}</small>
                    </div>

                    <div className="reportDetailsCol">
                      {el.actionableFindings && el.actionableFindings.length > 0 ? (() => {
                        const grouped = groupActionableFindings(el.actionableFindings);
                        return (
                          <>
                            {el.conclusionState === "meets_reference" && (
                              <div className={`reportConclusionBox state-${el.conclusionState}`} style={{ marginBottom: "8px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0, flexWrap: "wrap" }}>
                                  <span className={`conclusionBadge badge-${el.conclusionState}`}>{el.conclusionStateLabel}</span>
                                  <b style={{ fontSize: "12px", color: "#1e293b", flexShrink: 0 }}>{locale === "en" ? "Verdict" : "当前结论"}</b>
                                </div>
                                <span className="conclusionText" style={{ marginLeft: "8px" }}>{el.conclusion}</span>
                              </div>
                            )}
                            <div className="problemOverviewBlock" style={{ marginBottom: "8px" }}>
                              <div style={{ fontWeight: 700, fontSize: "12.5px", color: "#0f172a", marginBottom: "6px" }}>
                                {locale === "en" ? `Actionable Findings (${el.actionableFindings.length})` : `需关注的问题清单（${el.actionableFindings.length} 项）`}
                              </div>
                              <div className="groupedFindingsContainer">
                                {grouped.belowThreshold.length > 0 && (
                                  <div className="findingGroup groupBelowThreshold">
                                    <div className="findingGroupHeader">❌ {t("conclusion.below_threshold")}</div>
                                    <ul className="findingGroupList">
                                      {grouped.belowThreshold.map((f) => (
                                        <li key={f.id}><b>{f.metricLabel}：</b>{f.summaryText}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {grouped.belowRecommended.length > 0 && (
                                  <div className="findingGroup groupBelowRecommended">
                                    <div className="findingGroupHeader">⚠️ {t("conclusion.below_recommended")}</div>
                                    <ul className="findingGroupList">
                                      {grouped.belowRecommended.map((f) => (
                                        <li key={f.id}><b>{f.metricLabel}：</b>{f.summaryText}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {grouped.needsInfo.length > 0 && (
                                  <div className="findingGroup groupNeedsInfo">
                                    <div className="findingGroupHeader">ℹ️ {t("conclusion.needs_info")}</div>
                                    <ul className="findingGroupList">
                                      {grouped.needsInfo.map((f) => (
                                        <li key={f.id}><b>{f.metricLabel}：</b>{f.summaryText}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </div>
                          </>
                        );
                      })() : (
                        <div className={`reportConclusionBox state-${el.conclusionState}`}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0, flexWrap: "wrap" }}>
                            <span className={`conclusionBadge badge-${el.conclusionState}`}>{el.conclusionStateLabel}</span>
                            <b style={{ fontSize: "12px", color: "#1e293b", flexShrink: 0 }}>{locale === "en" ? "Verdict" : "当前结论"}</b>
                          </div>
                          <span className="conclusionText" style={{ marginLeft: "8px" }}>{el.conclusion}</span>
                        </div>
                      )}

                      <div className="reportMetricsRow">
                        <span className="reportMetricTag">{locale === "en" ? "Visual Size" : "视觉尺寸"}: <b>{el.visualDimensionsDisplay}</b></span>
                        {el.characterHeightDisplay && (
                          <span className="reportMetricTag">{locale === "en" ? "Glyph Px Height" : "代表字符像素高度"}: <b>{el.characterHeightDisplay}</b></span>
                        )}
                        {el.characterHeightDesignDisplay && (
                          <span className="reportMetricTag">{locale === "en" ? "Glyph Design Height" : "代表字符设计空间高度"}: <b>{el.characterHeightDesignDisplay}</b></span>
                        )}
                        {el.characterHeightPhysicalDisplay && (
                          <span className="reportMetricTag">{locale === "en" ? "Glyph Physical Height" : "代表字符物理高度"}: <b>{el.characterHeightPhysicalDisplay}</b></span>
                        )}
                        {el.characterHeightVisualAngleDisplay && (
                          <span className="reportMetricTag" style={{ background: "#e0f2fe", color: "#0369a1", borderColor: "#bae6fd" }}>{locale === "en" ? "Vertical Visual Angle" : "代表字符垂直视觉角"}: <b>{el.characterHeightVisualAngleDisplay}</b></span>
                        )}
                        {el.estimatedTextSizeDisplay && (
                          <span className="reportMetricTag" style={{ background: "#fef3c7", color: "#92400e", borderColor: "#fde68a" }}>{locale === "en" ? "Screenshot Font Estimate" : "截图字号估算"}: <b>{el.estimatedTextSizeDisplay}</b>{el.estimatedTextSizeSourceLabel ? ` (${el.estimatedTextSizeSourceLabel})` : ""}</span>
                        )}
                        {el.touchDimensionsDisplay && (
                          <span className="reportMetricTag">{locale === "en" ? "Touch Target" : "触控热区"}: <b>{el.touchDimensionsDisplay}</b></span>
                        )}
                        {el.nearestSpacingDisplay && (
                          <span className="reportMetricTag">{locale === "en" ? "Nearest Spacing" : "最近间距"}: <b>{el.nearestSpacingDisplay}</b></span>
                        )}
                        {el.contrastDisplay && (
                          <span className="reportMetricTag">{locale === "en" ? "Contrast" : "对比度"}: <b>{el.contrastDisplay}</b></span>
                        )}
                        {el.physicalDimensionsDisplay && (
                          <span className="reportMetricTag">{locale === "en" ? "Physical Size" : "物理尺寸"}: <b>{el.physicalDimensionsDisplay}</b></span>
                        )}
                      </div>

                      {el.moreMeasurements && el.moreMeasurements.length > 0 && (
                        <details className="moreMeasurementsDetails" style={{ marginTop: "8px" }}>
                          <summary className="moreMeasurementsSummary">
                            <span>📐 {locale === "en" ? `More Measurements (${el.moreMeasurements.length})` : `更多测量结果 (${el.moreMeasurements.length})`}</span>
                          </summary>
                          <div className="moreMeasurementsList">
                            {el.moreMeasurements.map((m, mIdx) => (
                              <div key={mIdx} className="measurementCompactRow">
                                <div className="measurementCompactHeader">
                                  <span className="measurementCompactLabel">{m.metricLabel}：</span>
                                  <span className="measurementCompactValue">{m.currentValueDisplay}</span>
                                  <span className="measurementCompactTag">{locale === "en" ? "Measured" : "测量值"}</span>
                                </div>
                                {m.explanation && (
                                  <div className="measurementCompactHint">{m.explanation}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        </details>
                      )}

                      {el.whyItMatters && (
                        <p className="reportWhyText"><strong>{locale === "en" ? "Why it matters: " : "为什么关注："}</strong>{el.whyItMatters}</p>
                      )}

                      {(el.designCheckRec || el.experienceImpact || el.uxrValidation || el.priorityTip) && (
                        <div className="reportImpactBox">
                          {el.designCheckRec && <p><strong>{locale === "en" ? "Design Recommendation: " : "设计建议："}</strong>{el.designCheckRec}</p>}
                          {el.experienceImpact && <p><strong>{locale === "en" ? "User Experience Impact: " : "体验影响："}</strong>{el.experienceImpact}</p>}
                          {el.uxrValidation && <p><strong>{locale === "en" ? "UX Research & Verification: " : "人因验证："}</strong>{el.uxrValidation}</p>}
                          {el.priorityTip && <p><strong>{locale === "en" ? "Priority: " : "优先级："}</strong>{el.priorityTip}</p>}
                        </div>
                      )}

                      {el.upgradeRequirement && (
                        <div className="reportUpgradeTip">
                          💡 <strong>{locale === "en" ? "To improve confidence: " : "提高精度："}</strong>{el.upgradeRequirement}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="reportModalFooter">
          <button type="button" className="reportModalCancelBtn" onClick={onClose}>
            {t("action.close")}
          </button>
          <button type="button" className="reportModalExportBtn" onClick={onExportHtml}>
            💾 {t("report_modal.btn_export_html")}
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};
