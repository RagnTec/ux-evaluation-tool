import { describe, it, expect } from "vitest";
import {
  escapeHtml,
  calculateContextCrop,
  generateSelfContainedHtmlReport
} from "../../src/utils/reportGenerator";
import type { ReportSummaryData } from "../../src/types/report";

describe("Visual Evidence Report Generator (Phase 3I)", () => {
  describe("escapeHtml", () => {
    it("should escape unsafe HTML characters to prevent XSS", () => {
      expect(escapeHtml("<script>alert('xss')</script>")).toBe(
        "&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;"
      );
      expect(escapeHtml('Hello "World" & <Friends>')).toBe(
        "Hello &quot;World&quot; &amp; &lt;Friends&gt;"
      );
    });

    it("should handle null and undefined safely", () => {
      expect(escapeHtml(null)).toBe("");
      expect(escapeHtml(undefined)).toBe("");
      expect(escapeHtml(123)).toBe("123");
    });
  });

  describe("calculateContextCrop", () => {
    it("should calculate padded crop around center element within image boundaries", () => {
      const bounds = { x: 200, y: 300, width: 100, height: 50 };
      const imageDimensions = { width: 1000, height: 1000 };
      const crop = calculateContextCrop(bounds, imageDimensions, {
        paddingRatio: 0.5,
        minPaddingPx: 30
      });

      // Target bounds: width 100 * 0.5 = 50px padding -> crop X ~ 150, crop width ~ 200
      expect(crop.cropX).toBeLessThanOrEqual(bounds.x);
      expect(crop.cropY).toBeLessThanOrEqual(bounds.y);
      expect(crop.cropX + crop.cropWidth).toBeGreaterThanOrEqual(bounds.x + bounds.width);
      expect(crop.cropY + crop.cropHeight).toBeGreaterThanOrEqual(bounds.y + bounds.height);

      // Relative coordinates
      expect(crop.targetRelX).toBe(bounds.x - crop.cropX);
      expect(crop.targetRelY).toBe(bounds.y - crop.cropY);
      expect(crop.targetRelWidth).toBe(bounds.width);
      expect(crop.targetRelHeight).toBe(bounds.height);
    });

    it("should clamp crop rectangle safely when element is at top-left corner", () => {
      const bounds = { x: 5, y: 10, width: 40, height: 40 };
      const imageDimensions = { width: 800, height: 600 };
      const crop = calculateContextCrop(bounds, imageDimensions, {
        paddingRatio: 0.5,
        minPaddingPx: 30
      });

      expect(crop.cropX).toBe(0);
      expect(crop.cropY).toBe(0);
      expect(crop.cropWidth).toBeGreaterThanOrEqual(70);
      expect(crop.targetRelX).toBe(5);
      expect(crop.targetRelY).toBe(10);
    });

    it("should clamp crop rectangle safely when element is at bottom-right corner", () => {
      const bounds = { x: 750, y: 550, width: 45, height: 45 };
      const imageDimensions = { width: 800, height: 600 };
      const crop = calculateContextCrop(bounds, imageDimensions, {
        paddingRatio: 0.5,
        minPaddingPx: 30
      });

      expect(crop.cropX + crop.cropWidth).toBeLessThanOrEqual(800);
      expect(crop.cropY + crop.cropHeight).toBeLessThanOrEqual(600);
      expect(crop.targetRelX + crop.targetRelWidth).toBeLessThanOrEqual(crop.cropWidth);
      expect(crop.targetRelY + crop.targetRelHeight).toBeLessThanOrEqual(crop.cropHeight);
    });
  });

  describe("generateSelfContainedHtmlReport", () => {
    const mockReportData: ReportSummaryData = {
      title: "UX Evaluation Tool 评估报告",
      generatedAt: "2026/8/24 10:00:00",
      imageName: "login_screen.png",
      imageNaturalDimensions: { width: 1170, height: 2532 },
      screenshotScope: "full_screen",
      screenshotScopeLabel: "完整屏幕 / 界面",
      totalElementsCount: 2,
      attentionCount: 1,
      filter: "all",
      filterCount: 2,
      designInfoStatus: "source_available",
      targetPlatform: "ios",
      targetPlatformLabel: "Apple iOS (pt)",
      logicalUnit: "pt",
      displaySize: "6.1 inch",
      resolution: "1170x2532",
      assumptions: [
        "屏幕硬件参数：6.1 inch · 1170x2532（用于物理毫米估算）",
        "设计尺寸基准：pt（换算比例 1 pt = 3.00 px）"
      ],
      fullEvidenceScreenshotDataUrl: "data:image/jpeg;base64,mockFullScreenshot",
      elements: [
        {
          index: 1,
          elementId: "el_1",
          label: "登录主按钮",
          elementType: "button",
          elementTypeLabel: "按钮",
          interactionType: "tap",
          isInteractive: true,
          needsAttention: false,
          attentionReasons: [],
          highestTier: "source_confirmed",
          highestTierLabel: "源数据确认",
          conclusion: "触控区域符合 Apple HIG 44×44 pt 规范。",
          whyItMatters: "按钮热区充足，不易发生误触。",
          designCheckRec: "保持当前 48×48 pt 尺寸设计。",
          visualDimensionsDisplay: "144 × 144 px (48 × 48 pt)",
          touchDimensionsDisplay: "48 × 48 pt",
          nearestSpacingDisplay: "24 pt",
          contrastDisplay: "4.8:1 (通过 WCAG AA)",
          thumbnailDataUrl: "data:image/jpeg;base64,mockThumb1",
          technicalDetails: [
            { label: "像素边界", value: "100, 200 (144 × 144 px)" },
            { label: "归一化坐标", value: "8.5%, 7.9%" }
          ]
        },
        {
          index: 2,
          elementId: "el_2",
          label: "忘记密码文本",
          elementType: "text",
          elementTypeLabel: "文本",
          interactionType: "none",
          isInteractive: false,
          needsAttention: true,
          attentionReasons: ["色彩对比度未达标"],
          highestTier: "design_mapped",
          highestTierLabel: "设计基准校验",
          conclusion: "文字对比度 2.8:1，低于 WCAG AA 4.5:1 要求。",
          whyItMatters: "低视力或弱光环境下阅读困难。",
          designCheckRec: "建议将文本颜色调深至 #475569 以上。",
          upgradeRequirement: "由设计者确认真实字号",
          visualDimensionsDisplay: "180 × 36 px (60 × 12 pt)",
          contrastDisplay: "2.8:1 (对比度偏低)",
          thumbnailDataUrl: "data:image/jpeg;base64,mockThumb2"
        }
      ]
    };

    it("should produce valid standalone HTML document string", () => {
      const html = generateSelfContainedHtmlReport(mockReportData);

      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("<html lang=\"zh-CN\">");
      expect(html).toContain("UX Evaluation Tool — 视觉证据报告");
      expect(html).toContain("login_screen.png");
      expect(html).toContain("1170 × 2532 px");
      expect(html).toContain("完整屏幕 / 界面");
    });

    it("should include all elements with numbers, conclusions, and metrics", () => {
      const html = generateSelfContainedHtmlReport(mockReportData);

      expect(html).toContain("#1");
      expect(html).toContain("登录主按钮");
      expect(html).toContain("触控区域符合 Apple HIG 44×44 pt 规范。");
      expect(html).toContain("144 × 144 px (48 × 48 pt)");

      expect(html).toContain("#2");
      expect(html).toContain("忘记密码文本");
      expect(html).toContain("文字对比度 2.8:1，低于 WCAG AA 4.5:1 要求。");
      expect(html).toContain("提高精度：");
      expect(html).toContain("由设计者确认真实字号");
    });

    it("should contain collapsible details for technical measurements", () => {
      const html = generateSelfContainedHtmlReport(mockReportData);

      expect(html).toContain("<details class=\"techDetails\">");
      expect(html).toContain("<summary>查看详细测量与规则依据</summary>");
      expect(html).toContain("像素边界");
      expect(html).toContain("归一化坐标");
    });

    it("should render rule comparison traces and signed margins in the HTML report", () => {
      const dataWithTraces: ReportSummaryData = {
        ...mockReportData,
        elements: [
          {
            ...mockReportData.elements[0],
            touchProvenance: "已确认触控范围",
            touchStatus: "meets",
            ruleTraces: [
              {
                metricLabel: "触控目标尺寸",
                currentValueDisplay: "48 × 48 pt",
                verdict: "meets",
                verdictLabel: "达标",
                ruleTitle: "Apple HIG 触控区域规范 (≥ 44×44 pt)",
                marginLabel: "阈值余量 +4 pt"
              }
            ]
          }
        ]
      };

      const html = generateSelfContainedHtmlReport(dataWithTraces);
      expect(html).toContain("规则比对与阈值追踪");
      expect(html).toContain("Apple HIG 触控区域规范");
      expect(html).toContain("+4 pt");
      expect(html).toContain("达标");
      expect(html).toContain("已确认触控范围");
    });
  });
});
