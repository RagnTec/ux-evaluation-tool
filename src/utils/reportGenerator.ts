import type {
  ContextCropResult,
  ReportElementItem,
  ReportSummaryData
} from "../types/report";
import type { DesignElement } from "../types/designElement";
import type { Locale } from "../i18n/types";
import { groupActionableFindings } from "./impactRecommendation";
import { getElementDisplayName } from "./labels";


/**
 * Escapes unsafe characters for HTML injection to prevent XSS.
 */
export function escapeHtml(str?: string | number | null): string {
  if (str === undefined || str === null) return "";
  const s = String(str);
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface ContextCropOptions {
  paddingRatio?: number; // default 0.4 (40% of element size)
  minPaddingPx?: number; // default 32px
}

/**
 * Computes bounding rectangle for context thumbnail around a target element.
 * Clamps safely to source image boundaries and ensures the element is visible with surrounding context.
 */
export function calculateContextCrop(
  bounds: { x: number; y: number; width: number; height: number },
  imageDimensions: { width: number; height: number },
  options: ContextCropOptions = {}
): ContextCropResult {
  const { paddingRatio = 0.4, minPaddingPx = 32 } = options;
  const imgW = Math.max(1, imageDimensions.width);
  const imgH = Math.max(1, imageDimensions.height);

  // Calculate padding based on element size
  const padX = Math.max(minPaddingPx, bounds.width * paddingRatio);
  const padY = Math.max(minPaddingPx, bounds.height * paddingRatio);

  // Desired raw crop bounds
  let rawX = bounds.x - padX;
  let rawY = bounds.y - padY;
  let rawW = bounds.width + padX * 2;
  let rawH = bounds.height + padY * 2;

  // Clamp crop rectangle to image boundaries
  const cropX = Math.max(0, Math.min(imgW - 1, Math.round(rawX)));
  const cropY = Math.max(0, Math.min(imgH - 1, Math.round(rawY)));
  const cropWidth = Math.max(1, Math.min(imgW - cropX, Math.round(rawW)));
  const cropHeight = Math.max(1, Math.min(imgH - cropY, Math.round(rawH)));

  // Relative coordinates of target inside cropped area
  const targetRelX = bounds.x - cropX;
  const targetRelY = bounds.y - cropY;
  const targetRelWidth = Math.min(bounds.width, cropWidth - targetRelX);
  const targetRelHeight = Math.min(bounds.height, cropHeight - targetRelY);

  return {
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    targetRelX: Math.max(0, targetRelX),
    targetRelY: Math.max(0, targetRelY),
    targetRelWidth: Math.max(1, targetRelWidth),
    targetRelHeight: Math.max(1, targetRelHeight)
  };
}

/**
 * Draws numbered annotation boxes over the source image and returns Data URL.
 */
export function generateNumberedEvidenceScreenshotDataUrl(
  imageSource: HTMLImageElement | HTMLCanvasElement,
  elements: DesignElement[],
  highlightedElementId?: string | null
): string {
  const canvas = document.createElement("canvas");
  const imgW = imageSource.width;
  const imgH = imageSource.height;
  canvas.width = imgW;
  canvas.height = imgH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // 1. Draw source image
  ctx.drawImage(imageSource, 0, 0, imgW, imgH);

  // 2. Draw element rectangles & numbered badges
  elements.forEach((el, index) => {
    const isHighlighted = highlightedElementId ? el.element_id === highlightedElementId : true;
    const pxBounds = {
      x: el.normalized_bounds.x * imgW,
      y: el.normalized_bounds.y * imgH,
      width: el.normalized_bounds.width * imgW,
      height: el.normalized_bounds.height * imgH
    };

    ctx.save();
    ctx.lineWidth = isHighlighted ? 3 : 2;
    ctx.strokeStyle = isHighlighted ? "#2563eb" : "#94a3b8";
    ctx.fillStyle = isHighlighted ? "rgba(37, 99, 235, 0.12)" : "rgba(148, 163, 184, 0.08)";

    ctx.fillRect(pxBounds.x, pxBounds.y, pxBounds.width, pxBounds.height);
    ctx.strokeRect(pxBounds.x, pxBounds.y, pxBounds.width, pxBounds.height);

    // Number tag badge
    const tagText = `#${index + 1}`;
    ctx.font = "bold 14px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    const textMetrics = ctx.measureText(tagText);
    const tagPadding = 4;
    const tagW = textMetrics.width + tagPadding * 2 + 4;
    const tagH = 20;

    let tagX = pxBounds.x;
    let tagY = pxBounds.y - tagH - 2;
    if (tagY < 0) {
      tagY = pxBounds.y + 2;
    }

    ctx.fillStyle = isHighlighted ? "#2563eb" : "#64748b";
    ctx.beginPath();
    ctx.roundRect(tagX, tagY, tagW, tagH, 4);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.fillText(tagText, tagX + tagPadding + 2, tagY + 14);
    ctx.restore();
  });

  return canvas.toDataURL("image/jpeg", 0.88);
}

/**
 * Draws contextual thumbnail around a specific element and returns Data URL.
 */
export function generateElementThumbnailDataUrl(
  imageSource: HTMLImageElement | HTMLCanvasElement,
  element: DesignElement,
  elementIndex: number,
  imageDimensions: { width: number; height: number }
): string {
  const crop = calculateContextCrop(
    {
      x: element.normalized_bounds.x * imageDimensions.width,
      y: element.normalized_bounds.y * imageDimensions.height,
      width: element.normalized_bounds.width * imageDimensions.width,
      height: element.normalized_bounds.height * imageDimensions.height
    },
    imageDimensions,
    { paddingRatio: 0.45, minPaddingPx: 36 }
  );

  const canvas = document.createElement("canvas");
  // Target max thumbnail dimensions for clean layout and compact file size
  const maxThumbWidth = 360;
  const scale = crop.cropWidth > maxThumbWidth ? maxThumbWidth / crop.cropWidth : 1;
  canvas.width = Math.round(crop.cropWidth * scale);
  canvas.height = Math.round(crop.cropHeight * scale);

  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // 1. Draw cropped slice of image
  ctx.drawImage(
    imageSource,
    crop.cropX,
    crop.cropY,
    crop.cropWidth,
    crop.cropHeight,
    0,
    0,
    canvas.width,
    canvas.height
  );

  // 2. Draw element outline in thumbnail
  const scaledRelX = crop.targetRelX * scale;
  const scaledRelY = crop.targetRelY * scale;
  const scaledRelW = crop.targetRelWidth * scale;
  const scaledRelH = crop.targetRelHeight * scale;

  ctx.save();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = "#2563eb";
  ctx.fillStyle = "rgba(37, 99, 235, 0.15)";
  ctx.fillRect(scaledRelX, scaledRelY, scaledRelW, scaledRelH);
  ctx.strokeRect(scaledRelX, scaledRelY, scaledRelW, scaledRelH);

  // Badge inside thumbnail
  const tagText = `#${elementIndex + 1}`;
  ctx.font = "bold 11px sans-serif";
  const tagMetrics = ctx.measureText(tagText);
  const tagW = tagMetrics.width + 8;
  const tagH = 16;
  const tagX = Math.max(2, scaledRelX);
  const tagY = scaledRelY >= 18 ? scaledRelY - 18 : scaledRelY + 2;

  ctx.fillStyle = "#2563eb";
  ctx.beginPath();
  ctx.roundRect(tagX, tagY, tagW, tagH, 3);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.fillText(tagText, tagX + 4, tagY + 12);
  ctx.restore();

  return canvas.toDataURL("image/jpeg", 0.85);
}

/**
 * Builds a completely self-contained HTML document string with embedded styles and images.
 */
export function generateSelfContainedHtmlReport(data: ReportSummaryData, locale: Locale = "zh-CN"): string {
  const timestamp = data.generatedAt || (locale === "en" ? new Date().toLocaleString("en-US") : new Date().toLocaleString("zh-CN"));
  const langAttr = locale === "en" ? "en" : "zh-CN";

  return `<!DOCTYPE html>
<html lang="${langAttr}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(data.title)} - ${escapeHtml(data.imageName)}</title>
  <style>
    :root {
      --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      --bg-color: #f8fafc;
      --card-bg: #ffffff;
      --text-main: #0f172a;
      --text-muted: #64748b;
      --primary: #2563eb;
      --primary-light: #eff6ff;
      --border-color: #e2e8f0;
      --badge-tier: #0369a1;
      --badge-tier-bg: #f0f9ff;
      --attention-bg: #fffbeb;
      --attention-border: #fef3c7;
      --attention-text: #b45309;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--font-family);
      background: var(--bg-color);
      color: var(--text-main);
      line-height: 1.5;
      padding: 32px 16px;
    }
    .reportContainer {
      max-width: 1040px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .reportHeader {
      background: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 24px 28px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .reportHeaderTop {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 16px;
    }
    .reportTitle {
      font-size: 22px;
      font-weight: 700;
      color: var(--text-main);
    }
    .reportMetaTime {
      font-size: 12px;
      color: var(--text-muted);
    }
    .statGrid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 12px;
    }
    .statCard {
      background: #f8fafc;
      border: 1px solid #f1f5f9;
      border-radius: 8px;
      padding: 12px 16px;
    }
    .statCard .statLabel { font-size: 11px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; }
    .statCard .statVal { font-size: 18px; font-weight: 700; color: var(--text-main); margin-top: 4px; }

    .contextBox {
      background: #f8fafc;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 14px 18px;
    }
    .contextTitle {
      margin: 0 0 10px 0;
      font-size: 13px;
      font-weight: 700;
      color: var(--text-main);
    }
    .contextGrid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 10px 16px;
    }
    .contextItem {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .contextItem .contextLabel {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
    }
    .contextItem .contextVal {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-main);
    }

    .scopeRefGrid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 12px;
    }
    .scopeCard {
      background: #ffffff;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .scopeCard .scopeTitle {
      margin: 0;
      font-size: 13px;
      font-weight: 700;
      color: var(--text-main);
    }
    .scopeGroupSection {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .scopeGroupLabel {
      font-size: 11px;
      font-weight: 600;
      color: #475569;
    }
    .scopeGroupLabel.pending {
      color: #92400e;
    }
    .scopePills {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .scopePill {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      color: #1e293b;
      font-size: 11.5px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 4px;
    }
    .scopePill.pending {
      background: #fffbeb;
      border-color: #fde68a;
      color: #b45309;
    }
    .refPill {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #1d4ed8;
      font-size: 11.5px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 4px;
    }
    .refPill.pending {
      background: #f8fafc;
      border-color: #cbd5e1;
      color: #64748b;
    }
    .scopeHelp {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 2px;
    }

    .assumptionsBox {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      padding: 14px 18px;
      font-size: 13px;
      color: #166534;
    }
    .assumptionsBox h4 { font-size: 13px; font-weight: 700; margin-bottom: 6px; }
    .assumptionsBox ul { padding-left: 18px; }
    .assumptionsBox li { margin-bottom: 4px; }

    .evidenceSection {
      background: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .sectionTitle { font-size: 17px; font-weight: 700; color: var(--text-main); }
    .fullScreenshotWrapper {
      text-align: center;
      background: #0f172a;
      border-radius: 8px;
      padding: 12px;
      overflow: auto;
    }
    .fullScreenshotImg {
      max-width: 100%;
      height: auto;
      border-radius: 4px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.25);
    }

    .elementListSection {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .elementCard {
      background: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .elementCardHeader {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 12px;
    }
    .elementNumberLabel {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .elementNumberTag {
      background: var(--primary);
      color: #ffffff;
      font-size: 13px;
      font-weight: 700;
      padding: 2px 10px;
      border-radius: 6px;
    }
    .elementName { font-size: 16px; font-weight: 700; color: var(--text-main); }
    .tierBadge {
      font-size: 12px;
      font-weight: 600;
      background: var(--badge-tier-bg);
      color: var(--badge-tier);
      border: 1px solid #bae6fd;
      padding: 3px 10px;
      border-radius: 6px;
    }
    .elementCardBody {
      display: grid;
      grid-template-columns: minmax(240px, 320px) 1fr;
      gap: 20px;
    }
    @media (max-width: 768px) {
      .elementCardBody { grid-template-columns: 1fr; }
    }
    .thumbnailContainer {
      background: #f1f5f9;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 10px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .thumbnailImg {
      max-width: 100%;
      max-height: 240px;
      height: auto;
      border-radius: 4px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.08);
    }
    .elementDetailsCol {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .conclusionBlock {
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 8px;
    }
    .conclusionBlock.state-meets_reference {
      background: #f0fdf4;
      border: 1px solid #86efac;
    }
    .conclusionBlock.state-below_threshold {
      background: #fef2f2;
      border: 1px solid #fca5a5;
    }
    .conclusionBlock.state-below_recommended {
      background: #fffbeb;
      border: 1px solid #fcd34d;
    }
    .conclusionBlock.state-measurement_only {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
    }
    .conclusionBlock.state-needs_info {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
    }
    .conclusionBlock.state-not_applicable {
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
    }
    .conclusionStateBadge {
      display: inline-flex;
      align-items: center;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      margin-right: 8px;
      width: fit-content;
      max-width: 100%;
      min-width: 0;
      white-space: normal;
      line-height: 1.25;
      text-align: left;
      overflow-wrap: break-word;
      word-break: normal;
      box-sizing: border-box;
    }
    .badge-meets_reference { background: #dcfce7; color: #15803d; }
    .badge-below_threshold { background: #fee2e2; color: #b91c1c; }
    .badge-below_recommended { background: #fef3c7; color: #b45309; }
    .badge-measurement_only { background: #e2e8f0; color: #475569; }
    .badge-needs_info { background: #dbeafe; color: #1e40af; }
    .badge-not_applicable { background: #e2e8f0; color: #64748b; }
    .conclusionTitle { font-size: 13px; font-weight: 700; color: #0f172a; display: flex; align-items: center; }
    .conclusionText { font-size: 13px; color: #1e293b; }

    .groupedFindingsContainer {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 8px;
    }
    .findingGroup {
      border-radius: 6px;
      padding: 8px 12px;
      font-size: 13px;
    }
    .findingGroup.groupBelowThreshold {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-left: 4px solid #dc2626;
    }
    .findingGroup.groupBelowRecommended {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-left: 4px solid #d97706;
    }
    .findingGroup.groupNeedsInfo {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-left: 4px solid #64748b;
    }
    .findingGroupHeader {
      font-weight: 700;
      font-size: 12px;
      margin-bottom: 4px;
      line-height: 1.35;
      max-width: 100%;
      min-width: 0;
      overflow-wrap: break-word;
      word-break: normal;
    }
    .groupBelowThreshold .findingGroupHeader { color: #991b1b; }
    .groupBelowRecommended .findingGroupHeader { color: #92400e; }
    .groupNeedsInfo .findingGroupHeader { color: #334155; }
    .findingGroupList {
      margin: 0;
      padding-left: 18px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      color: #1e293b;
    }
    .findingGroupList li {
      line-height: 1.4;
    }

    .keyMetricsRow {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .metricPill {
      background: #f8fafc;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: 6px 12px;
      font-size: 12px;
    }
    .metricPill b { color: var(--text-main); margin-left: 4px; }

    .ruleTracesContainer {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 4px;
      margin-bottom: 4px;
    }
    .ruleTraceCard {
      background: #f8fafc;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: 8px 12px;
      font-size: 12px;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .ruleTraceHeader {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .ruleTraceTitle { color: #0f172a; font-weight: 500; }
    .ruleTraceVerdict {
      display: inline-flex;
      align-items: center;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 4px;
      width: fit-content;
      max-width: 100%;
      min-width: 0;
      white-space: normal;
      line-height: 1.25;
      text-align: left;
      overflow-wrap: break-word;
      word-break: normal;
      box-sizing: border-box;
    }
    .badge-meets, .badge-estimated_meets { background: #dcfce7; color: #15803d; }
    .badge-below_recommended, .badge-estimated_below_recommended { background: #fef3c7; color: #b45309; }
    .badge-attention, .badge-estimated_attention { background: #fee2e2; color: #b91c1c; }
    .badge-measurement_only { background: #f1f5f9; color: #475569; }
    .badge-needs_info { background: #f3e8ff; color: #7e22ce; }
    .badge-not_applicable { background: #f1f5f9; color: #94a3b8; }
    .ruleTraceCard.trace-meets, .ruleTraceCard.trace-estimated_meets { border-color: #bbf7d0; background: #f0fdf4; }
    .ruleTraceCard.trace-below_recommended, .ruleTraceCard.trace-estimated_below_recommended { border-color: #fde68a; background: #fffbeb; }
    .ruleTraceCard.trace-attention, .ruleTraceCard.trace-estimated_attention { border-color: #fca5a5; background: #fef2f2; }
    .ruleTraceMargin { font-size: 11.5px; font-weight: 600; color: #334155; }
    .ruleTraceExplanation { font-size: 11.5px; color: #64748b; }
    .ruleTraceBasis { font-size: 10.5px; color: #94a3b8; margin-top: 2px; }

    .moreMeasurementsDetails {
      margin-top: 6px;
      margin-bottom: 6px;
      background: #f8fafc;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: 6px 10px;
    }
    .moreMeasurementsSummary {
      font-size: 12px;
      font-weight: 600;
      color: #475569;
      cursor: pointer;
      user-select: none;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .moreMeasurementsList {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-top: 6px;
      border-top: 1px dashed var(--border-color);
      padding-top: 6px;
    }
    .measurementCompactRow {
      display: flex;
      flex-direction: column;
      gap: 2px;
      font-size: 11.5px;
      padding: 3px 0;
      border-bottom: 1px dotted #f1f5f9;
    }
    .measurementCompactRow:last-child {
      border-bottom: none;
    }
    .measurementCompactHeader {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .measurementCompactLabel {
      font-weight: 500;
      color: #475569;
    }
    .measurementCompactValue {
      font-weight: 600;
      color: #0f172a;
    }
    .measurementCompactTag {
      font-size: 10px;
      background: #f1f5f9;
      color: #64748b;
      padding: 1px 5px;
      border-radius: 3px;
      border: 1px solid #e2e8f0;
    }
    .measurementCompactHint {
      font-size: 11px;
      color: #64748b;
      line-height: 1.35;
    }

    .whyMattersText { font-size: 13px; color: var(--text-muted); line-height: 1.5; }

    .impactBox {
      background: #f8fafc;
      border-left: 4px solid var(--primary);
      padding: 10px 14px;
      border-radius: 0 6px 6px 0;
      font-size: 12px;
      color: #334155;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    details.techDetails {
      margin-top: 6px;
      font-size: 12px;
      color: var(--text-muted);
      border-top: 1px solid #f1f5f9;
      padding-top: 8px;
    }
    details.techDetails summary {
      cursor: pointer;
      font-weight: 600;
      color: var(--primary);
    }
    .techDetailsTable {
      width: 100%;
      margin-top: 8px;
      border-collapse: collapse;
    }
    .techDetailsTable td {
      padding: 4px 8px;
      border-bottom: 1px solid #f1f5f9;
    }
    .techDetailsTable td:first-child { font-weight: 600; width: 140px; color: var(--text-main); }

    .reportFooter {
      text-align: center;
      font-size: 12px;
      color: var(--text-muted);
      padding: 20px 0;
    }
  </style>
</head>
<body>
  <div class="reportContainer">
    <!-- Header -->
    <header class="reportHeader">
      <div class="reportHeaderTop">
        <div>
          <h1 class="reportTitle">${locale === "en" ? "UX Evaluation Tool — Visual Evidence Report" : "UX Evaluation Tool — 视觉证据报告"}</h1>
          <p style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">
            ${locale === "en" ? `Element-level human factors and UX risk evaluation report for "${escapeHtml(data.imageName)}"` : `针对设计图「${escapeHtml(data.imageName)}」的元素级人因与交互风险评估报告`}
          </p>
        </div>
        <span class="reportMetaTime">${locale === "en" ? "Generated: " : "生成时间："}${escapeHtml(timestamp)}</span>
      </div>

      <!-- Stat Overview -->
      <div class="statGrid">
        <div class="statCard">
          <div class="statLabel">${locale === "en" ? "SCREENSHOT SIZE" : "截图尺寸"}</div>
          <div class="statVal">${data.imageNaturalDimensions.width} × ${data.imageNaturalDimensions.height} px</div>
        </div>
        <div class="statCard">
          <div class="statLabel">${locale === "en" ? "SCREENSHOT SCOPE" : "截图范围"}</div>
          <div class="statVal">${escapeHtml(data.screenshotScopeLabel)}</div>
        </div>
        <div class="statCard">
          <div class="statLabel">${locale === "en" ? "TOTAL ELEMENTS" : "评估元素总数"}</div>
          <div class="statVal">${locale === "en" ? `${data.totalElementsCount} items` : `${data.totalElementsCount} 个`}</div>
        </div>
        <div class="statCard">
          <div class="statLabel">${locale === "en" ? "NEEDS ATTENTION" : "需关注元素"}</div>
          <div class="statVal" style="color: ${data.attentionCount > 0 ? '#b45309' : '#166534'};">
            ${locale === "en" ? `${data.attentionCount} items` : `${data.attentionCount} 个`}
          </div>
        </div>
      </div>

      <!-- Evaluation Context Grid -->
      ${
        data.evaluationContext
          ? `<div class="contextBox">
              <h4 class="contextTitle">${locale === "en" ? "🧭 Evaluation Context" : "🧭 评估上下文"}</h4>
              <div class="contextGrid">
                <div class="contextItem"><span class="contextLabel">${locale === "en" ? "Application Domain" : "使用领域"}</span><span class="contextVal">${escapeHtml(data.evaluationContext.domainLabel)}</span></div>
                <div class="contextItem"><span class="contextLabel">${locale === "en" ? "Viewing Distance" : "观看距离"}</span><span class="contextVal">${escapeHtml(data.evaluationContext.viewingDistanceDisplay)}</span></div>
                <div class="contextItem"><span class="contextLabel">${locale === "en" ? "Screen Hardware" : "屏幕硬件"}</span><span class="contextVal">${escapeHtml(data.evaluationContext.screenHardwareDisplay)}</span></div>
                <div class="contextItem"><span class="contextLabel">${locale === "en" ? "Screenshot Scope" : "截图范围"}</span><span class="contextVal">${escapeHtml(data.evaluationContext.screenshotScopeDisplay)}</span></div>
                <div class="contextItem"><span class="contextLabel">${locale === "en" ? "Design Basis" : "设计尺寸基准"}</span><span class="contextVal">${escapeHtml(data.evaluationContext.designBasisDisplay)}</span></div>
                <div class="contextItem"><span class="contextLabel">${locale === "en" ? "Target Platform" : "目标平台"}</span><span class="contextVal">${escapeHtml(data.evaluationContext.targetPlatformDisplay)}</span></div>
              </div>
            </div>`
          : ""
      }

      <!-- Actual Scope & References -->
      ${
        ((data.completedEvaluationScope && data.completedEvaluationScope.length > 0) ||
         (data.pendingEvaluationScope && data.pendingEvaluationScope.length > 0) ||
         (data.actualReferencesUsed && data.actualReferencesUsed.length > 0))
          ? `<div class="scopeRefGrid">
              ${
                ((data.completedEvaluationScope && data.completedEvaluationScope.length > 0) ||
                 (data.pendingEvaluationScope && data.pendingEvaluationScope.length > 0))
                  ? `<div class="scopeCard">
                      <h4 class="scopeTitle">${locale === "en" ? "🎯 Actual Evaluation Coverage" : "🎯 实际评估范围"}</h4>
                      ${
                        data.completedEvaluationScope && data.completedEvaluationScope.length > 0
                          ? `<div class="scopeGroupSection">
                              <span class="scopeGroupLabel">${locale === "en" ? "Covered Dimensions:" : "已覆盖评估维度："}</span>
                              <div class="scopePills">
                                ${data.completedEvaluationScope.map((s) => `<span class="scopePill">● ${escapeHtml(s)}</span>`).join("")}
                              </div>
                            </div>`
                          : ""
                      }
                      ${
                        data.pendingEvaluationScope && data.pendingEvaluationScope.length > 0
                          ? `<div class="scopeGroupSection" style="margin-top: 6px;">
                              <span class="scopeGroupLabel pending">${locale === "en" ? "Pending Evaluation:" : "待补充后可评估："}</span>
                              <div class="scopePills">
                                ${data.pendingEvaluationScope.map((s) => `<span class="scopePill pending">○ ${escapeHtml(s)}</span>`).join("")}
                              </div>
                            </div>`
                          : ""
                      }
                    </div>`
                  : ""
              }
              ${
                data.actualReferencesUsed && data.actualReferencesUsed.length > 0
                  ? `<div class="scopeCard">
                      <h4 class="scopeTitle">${locale === "en" ? "📚 Active References Used" : "📚 实际使用参考"}</h4>
                      <div class="scopeGroupSection">
                        <span class="scopeGroupLabel">${locale === "en" ? "Main References:" : "主要比对参考："}</span>
                        <div class="scopePills">
                          ${data.actualReferencesUsed.map((r) => `<span class="refPill">${escapeHtml(r)}</span>`).join("")}
                        </div>
                      </div>
                      ${
                        data.pendingReferences && data.pendingReferences.length > 0
                          ? `<div class="scopeGroupSection" style="margin-top: 6px;">
                              <span class="scopeGroupLabel pending">${locale === "en" ? "Pending References:" : "待解锁参考："}</span>
                              <div class="scopePills">
                                ${data.pendingReferences.map((r) => `<span class="refPill pending">${escapeHtml(r)}</span>`).join("")}
                              </div>
                            </div>`
                          : ""
                      }
                      <small class="scopeHelp">${locale === "en" ? "* Rules are automatically matched based on input facts and scope" : "* 规则根据当前输入事实与适用范围自动匹配"}</small>
                    </div>`
                  : ""
              }
            </div>`
          : ""
      }

      <!-- Assumptions summary -->
      ${
        data.assumptions && data.assumptions.length > 0
          ? `<div class="assumptionsBox">
              <h4>${locale === "en" ? "📋 Evaluation Baseline & Assumptions" : "📋 评估假设与来源说明"}</h4>
              <ul>
                ${data.assumptions.map((a) => `<li>${escapeHtml(a)}</li>`).join("")}
              </ul>
            </div>`
          : ""
      }
    </header>

    <!-- Full Evidence Screenshot with Numbered Annotations -->
    ${
      data.fullEvidenceScreenshotDataUrl
        ? `<section class="evidenceSection">
            <h2 class="sectionTitle">${locale === "en" ? "Screenshot Review Overview (Numbered Index)" : "完整截图标注证据 (编号索引)"}</h2>
            <div class="fullScreenshotWrapper">
              <img
                src="${data.fullEvidenceScreenshotDataUrl}"
                alt="全图编号证据"
                class="fullScreenshotImg"
              />
            </div>
          </section>`
        : ""
    }

    <!-- Elements Evaluation List -->
    <section class="elementListSection">
      <h2 class="sectionTitle">
        ${locale === "en" ? `Element Findings List (${data.elements.length}${data.filter === "attention_only" ? " · Needs Attention Only" : ""})` : `元素评估结果清单 (${data.elements.length} 个${data.filter === "attention_only" ? " · 仅需关注" : ""})`}
      </h2>
      ${data.elements
        .map(
          (el) => `
      <article class="elementCard" id="element-${el.index}">
        <div class="elementCardHeader">
          <div class="elementNumberLabel">
            <span class="elementNumberTag">#${el.index}</span>
            <span class="elementName">${escapeHtml(getElementDisplayName({ label: el.label, element_id: el.elementId }, el.index - 1, locale))}</span>
            <span style="font-size: 13px; color: var(--text-muted);">(${escapeHtml(el.elementTypeLabel)})</span>
          </div>
          <span class="tierBadge">${escapeHtml(el.highestTierLabel)}</span>
        </div>

        <div class="elementCardBody">
          <!-- Thumbnail with context -->
          <div class="thumbnailContainer">
            ${
              el.thumbnailDataUrl
                ? `<img src="${el.thumbnailDataUrl}" alt="#${el.index} thumbnail" class="thumbnailImg" />`
                : `<span style="font-size: 12px; color: var(--text-muted);">${locale === "en" ? "No thumbnail" : "暂无缩略图"}</span>`
            }
            <small style="margin-top: 6px; font-size: 11px; color: var(--text-muted);">#${el.index} ${locale === "en" ? "Context thumbnail" : "上下文截图"}</small>
          </div>

          <!-- Evaluation Details -->
          <div class="elementDetailsCol">
            ${(() => {
              if (!el.actionableFindings || el.actionableFindings.length === 0) {
                return `
                  <div class="conclusionBlock state-${escapeHtml(el.conclusionState || 'measurement_only')}">
                    <div class="conclusionTitle">
                      <span class="conclusionStateBadge badge-${escapeHtml(el.conclusionState || 'measurement_only')}">
                        ${escapeHtml(el.conclusionStateLabel || (locale === 'en' ? 'Measurement only' : '仅测量'))}
                      </span>
                      ${locale === "en" ? "Verdict" : "当前结论"}
                    </div>
                    <p class="conclusionText" style="margin: 4px 0 0 0; font-size: 13px; color: #1e293b;">${escapeHtml(el.conclusion)}</p>
                  </div>
                `;
              }
              const grouped = groupActionableFindings(el.actionableFindings);
              const conclusionBlock = el.conclusionState === "meets_reference"
                ? `
                  <div class="conclusionBlock state-meets_reference" style="margin-bottom: 8px;">
                    <div class="conclusionTitle">
                      <span class="conclusionStateBadge badge-meets_reference">
                        ${escapeHtml(el.conclusionStateLabel || (locale === 'en' ? 'Within recommended range' : '达到推荐范围'))}
                      </span>
                      ${locale === "en" ? "Verdict" : "当前结论"}
                    </div>
                    <p class="conclusionText" style="margin: 4px 0 0 0; font-size: 13px; color: #1e293b;">${escapeHtml(el.conclusion)}</p>
                  </div>
                `
                : "";
              return `
                ${conclusionBlock}
                <div class="problemOverviewBlock" style="margin-bottom: 8px;">
                  <div class="problemOverviewTitle" style="font-weight: 700; font-size: 13px; color: #0f172a; margin-bottom: 6px;">
                    ${locale === "en" ? `Actionable Findings (${el.actionableFindings.length})` : `需关注的问题清单（${el.actionableFindings.length} 项）`}
                  </div>
                  <div class="groupedFindingsContainer">
                    ${grouped.belowThreshold.length > 0 ? `
                      <div class="findingGroup groupBelowThreshold">
                        <div class="findingGroupHeader">❌ ${locale === "en" ? "Below the basic requirement" : "不满足基本要求"}</div>
                        <ul class="findingGroupList">
                          ${grouped.belowThreshold.map(f => `<li><b>${escapeHtml(f.metricLabel)}：</b>${escapeHtml(f.summaryText)}</li>`).join("")}
                        </ul>
                      </div>
                    ` : ""}
                    ${grouped.belowRecommended.length > 0 ? `
                      <div class="findingGroup groupBelowRecommended">
                        <div class="findingGroupHeader">⚠️ ${locale === "en" ? "Meets the basic requirement, but below the recommended range" : "满足基本要求，但未达推荐范围"}</div>
                        <ul class="findingGroupList">
                          ${grouped.belowRecommended.map(f => `<li><b>${escapeHtml(f.metricLabel)}：</b>${escapeHtml(f.summaryText)}</li>`).join("")}
                        </ul>
                      </div>
                    ` : ""}
                    ${grouped.needsInfo.length > 0 ? `
                      <div class="findingGroup groupNeedsInfo">
                        <div class="findingGroupHeader">ℹ️ ${locale === "en" ? "Additional information required" : "待补充信息"}</div>
                        <ul class="findingGroupList">
                          ${grouped.needsInfo.map(f => `<li><b>${escapeHtml(f.metricLabel)}：</b>${escapeHtml(f.summaryText)}</li>`).join("")}
                        </ul>
                      </div>
                    ` : ""}
                  </div>
                </div>
              `;
            })()}

            <!-- Key metrics -->
            <div class="keyMetricsRow">
              <div class="metricPill">${locale === "en" ? "Visual Size" : "视觉尺寸"}:<b>${escapeHtml(el.visualDimensionsDisplay)}</b></div>
              ${el.characterHeightDisplay ? `<div class="metricPill">${locale === "en" ? "Glyph Px Height" : "代表字符像素高度"}:<b>${escapeHtml(el.characterHeightDisplay)}</b></div>` : ""}
              ${el.characterHeightDesignDisplay ? `<div class="metricPill">${locale === "en" ? "Glyph Design Height" : "代表字符设计空间高度"}:<b>${escapeHtml(el.characterHeightDesignDisplay)}</b></div>` : ""}
              ${el.characterHeightPhysicalDisplay ? `<div class="metricPill">${locale === "en" ? "Glyph Physical Height" : "代表字符物理高度"}:<b>${escapeHtml(el.characterHeightPhysicalDisplay)}</b></div>` : ""}
              ${el.characterHeightVisualAngleDisplay ? `<div class="metricPill" style="background:#e0f2fe; color:#0369a1; border-color:#bae6fd;">${locale === "en" ? "Vertical Visual Angle" : "代表字符垂直视觉角"}:<b>${escapeHtml(el.characterHeightVisualAngleDisplay)}</b></div>` : ""}
              ${el.estimatedTextSizeDisplay ? `<div class="metricPill" style="background:#fef3c7; color:#92400e; border-color:#fde68a;">${locale === "en" ? "Screenshot Font Estimate" : "截图字号估算"}:<b>${escapeHtml(el.estimatedTextSizeDisplay)}</b>${el.estimatedTextSizeSourceLabel ? ` (${escapeHtml(el.estimatedTextSizeSourceLabel)})` : ""}</div>` : ""}
              ${el.touchDimensionsDisplay ? `<div class="metricPill">${locale === "en" ? "Touch Target" : "触控热区"}:<b>${escapeHtml(el.touchDimensionsDisplay)}</b></div>` : ""}
              ${el.touchProvenance ? `<div class="metricPill">${locale === "en" ? "Touch Source" : "热区来源"}:<b>${escapeHtml(el.touchProvenance)}</b></div>` : ""}
              ${el.nearestSpacingDisplay ? `<div class="metricPill">${locale === "en" ? "Nearest Spacing" : "最近间距"}:<b>${escapeHtml(el.nearestSpacingDisplay)}</b></div>` : ""}
              ${el.physicalDimensionsDisplay ? `<div class="metricPill">${locale === "en" ? "Physical Size" : "物理尺寸"}:<b>${escapeHtml(el.physicalDimensionsDisplay)}</b></div>` : ""}
              ${el.visualAngleDisplay ? `<div class="metricPill" style="background:#e0f2fe; color:#0369a1; border-color:#bae6fd;">${locale === "en" ? "Visual Angle" : "视觉角"}:<b>${escapeHtml(el.visualAngleDisplay)}</b> (${escapeHtml(el.visualAngleViewingDistanceDisplay || "")})</div>` : ""}
            </div>
            ${el.visualAngleTextSemanticNote ? `<div style="font-size: 11.5px; color: #64748b; margin-top: 4px;">ℹ️ ${escapeHtml(el.visualAngleTextSemanticNote)}</div>` : ""}

            <!-- Rule Comparison Traces -->
            ${
              el.ruleTraces && el.ruleTraces.length > 0
                ? `<div class="ruleTracesContainer">
                    <div style="font-weight: 600; font-size: 12px; color: #475569; margin-top: 6px; margin-bottom: 2px;">
                      📏 ${locale === "en" ? "Rule Traces & Baselines:" : "规则比对与阈值追踪："}
                    </div>
                    ${el.ruleTraces
                      .map(
                        (rt) => `
                      <div class="ruleTraceCard trace-${escapeHtml(rt.verdict)}">
                        <div class="ruleTraceHeader">
                          <span class="ruleTraceTitle">${escapeHtml(rt.metricLabel)}: <b>${escapeHtml(rt.currentValueDisplay)}</b></span>
                          <span class="ruleTraceVerdict badge-${escapeHtml(rt.verdict)}">${escapeHtml(rt.verdictLabel)}</span>
                        </div>
                        ${rt.marginLabel ? `<div class="ruleTraceMargin">${escapeHtml(rt.marginLabel)}</div>` : ""}
                        ${rt.explanation ? `<div class="ruleTraceExplanation">${escapeHtml(rt.explanation)}</div>` : ""}
                        ${rt.ruleTitle ? `<div class="ruleTraceBasis">${locale === "en" ? "Reference: " : "依据："}${escapeHtml(rt.ruleTitle)}${rt.evidenceStatus ? ` · ${escapeHtml(rt.evidenceStatus)}` : ""}</div>` : ""}
                      </div>
                    `
                      )
                      .join("")}
                  </div>`
                : ""
            }

            <!-- More Measurements Collapsible Area -->
            ${
              el.moreMeasurements && el.moreMeasurements.length > 0
                ? `<details class="moreMeasurementsDetails">
                    <summary class="moreMeasurementsSummary">
                      <span>📐 ${locale === "en" ? `More Measurements (${el.moreMeasurements.length})` : `更多测量结果 (${el.moreMeasurements.length})`}</span>
                    </summary>
                    <div class="moreMeasurementsList">
                      ${el.moreMeasurements
                        .map(
                          (m) => `
                        <div class="measurementCompactRow">
                          <div class="measurementCompactHeader">
                            <span class="measurementCompactLabel">${escapeHtml(m.metricLabel)}：</span>
                            <span class="measurementCompactValue">${escapeHtml(m.currentValueDisplay)}</span>
                            <span class="measurementCompactTag">${locale === "en" ? "Measured" : "测量值"}</span>
                          </div>
                          ${m.explanation ? `<div class="measurementCompactHint">${escapeHtml(m.explanation)}</div>` : ""}
                        </div>
                      `
                        )
                        .join("")}
                    </div>
                  </details>`
                : ""
            }

            ${el.whyItMatters ? `<p class="whyMattersText"><strong>${locale === "en" ? "Why it matters: " : "为什么关注："}</strong>${escapeHtml(el.whyItMatters)}</p>` : ""}

            ${
              el.designCheckRec || el.experienceImpact || el.uxrValidation || el.priorityTip
                ? `<div class="impactBox">
                    ${el.designCheckRec ? `<p><strong>${locale === "en" ? "Design Recommendation: " : "设计建议："}</strong>${escapeHtml(el.designCheckRec)}</p>` : ""}
                    ${el.experienceImpact ? `<p><strong>${locale === "en" ? "User Experience Impact: " : "体验影响："}</strong>${escapeHtml(el.experienceImpact)}</p>` : ""}
                    ${el.uxrValidation ? `<p><strong>${locale === "en" ? "UX Research & Verification: " : "人因验证："}</strong>${escapeHtml(el.uxrValidation)}</p>` : ""}
                    ${el.priorityTip ? `<p><strong>${locale === "en" ? "Priority: " : "优先级："}</strong>${escapeHtml(el.priorityTip)}</p>` : ""}
                  </div>`
                : ""
            }

            ${
              el.upgradeRequirement
                ? `<p style="font-size: 12px; color: #0284c7; background: #f0f9ff; padding: 6px 10px; border-radius: 4px;">
                    💡 <strong>${locale === "en" ? "To improve confidence: " : "提高精度："}</strong>${escapeHtml(el.upgradeRequirement)}
                  </p>`
                : ""
            }

            ${
              el.technicalDetails && el.technicalDetails.length > 0
                ? `<details class="techDetails">
                    <summary>${locale === "en" ? "View detailed measurements & evidence" : "查看详细测量与规则依据"}</summary>
                    <table class="techDetailsTable">
                      ${el.technicalDetails
                        .map(
                          (t) => `
                        <tr>
                          <td>${escapeHtml(t.label)}</td>
                          <td>${escapeHtml(t.value)}</td>
                        </tr>
                      `
                        )
                        .join("")}
                    </table>
                  </details>`
                : ""
            }
          </div>
        </div>
      </article>
      `
        )
        .join("")}
    </section>

    <!-- Footer -->
    <footer class="reportFooter">
      <p>${locale === "en" ? "Generated locally by UX Evaluation Tool · Local First Offline Report · Zero Remote Dependency" : "由 UX Evaluation Tool 本地生成 · Local First 离线报告 · 无需远程依赖"}</p>
    </footer>
  </div>
</body>
</html>`;
}

/**
 * Triggers local file download in browser for exported HTML report.
 */
export function downloadHtmlFile(htmlContent: string, defaultFilename: string) {
  const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = defaultFilename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}
