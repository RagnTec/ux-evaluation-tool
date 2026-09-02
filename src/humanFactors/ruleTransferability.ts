import type { RuleTransferability, RuleTransferabilityAuditRecord } from "./types";

/**
 * Registry of known rule transferability classifications.
 * In Phase 3K.2A, all unclassified rules default safely to "unknown" or "direct_only".
 * No existing mobile or desktop rule is inferred to be "visual_angle_equivalent".
 */
const RULE_TRANSFERABILITY_REGISTRY: Record<string, RuleTransferability> = {
  // Motor interaction & touch target rules (direct_only)
  "L1-WCAG-SC-2.5.8": "direct_only",
  "L2-ANDROID-TARGET-SIZE-48DP": "direct_only",
  "L2-APPLE-MIN-TARGET-44PT": "direct_only",
  "L2-APPLE-HIG-TARGET-SIZE": "direct_only",
  "touch_overlap_conflict": "direct_only",
  "touch_spacing": "direct_only",

  // Contrast & photometric rules (direct_only)
  "L1-WCAG-SC-1.4.3": "direct_only",
  "L1-WCAG-SC-1.4.11": "direct_only",
  "wcag_1_4_3": "direct_only",
  "wcag_1_4_11": "direct_only",

  // Platform typography guidelines (direct_only)
  "L2-APPLE-BODY-TEXT": "direct_only",
  "L2-ANDROID-BODY-TEXT": "direct_only",
  "typography_legibility": "direct_only"
};

/**
 * Comprehensive Rule Transferability Audit Inventory.
 * Evaluates the Human Factors mechanisms and scientific transferability boundaries
 * across all existing evaluation rules in the repository.
 */
export const RULE_TRANSFERABILITY_AUDIT_INVENTORY: RuleTransferabilityAuditRecord[] = [
  {
    rule_id: "L1-WCAG-SC-2.5.8",
    rule_layer: "L1_HARD_CONSTRAINT",
    rule_title: "WCAG 2.2 SC 2.5.8 目标尺寸 (最小 24×24 CSS px)",
    mechanism: "motor_target_acquisition",
    native_unit: "CSS px",
    direct_applicability: "Web / 浏览器交互界面",
    physical_interpretability: "via_hardware_calibration",
    reference_viewing_distance: "missing",
    audit_status: "direct_only",
    evidence_strength: "verified",
    confounding_variables: ["手指/输入媒介接触面与按压精度", "运动控制精度", "指针设备类型", "间距边界"],
    transferability_assessment: "核心保护肢体触控/点击目标获取，非单纯视觉识别。人类手指与交互精度不会随视距成比例放大，严禁按视距比例换算放大或缩小触控阈值。"
  },
  {
    rule_id: "L2-ANDROID-TARGET-SIZE-48DP",
    rule_layer: "L2_PLATFORM_GUIDELINE",
    rule_title: "Android Material Design 触控目标推荐 (48×48 dp)",
    mechanism: "motor_target_acquisition",
    native_unit: "dp",
    direct_applicability: "Android 移动与平板设备",
    physical_interpretability: "via_hardware_calibration",
    reference_viewing_distance: "missing",
    audit_status: "direct_only",
    evidence_strength: "verified",
    confounding_variables: ["移动握持姿势", "指腹接触面积", "单手大拇指扫掠半径", "触控传感器抖动"],
    transferability_assessment: "针对手持移动设备指腹触控人体工学制定，属于直接触控物理阈值，不可移植至非手持远视距场景作为触控标准。"
  },
  {
    rule_id: "L2-APPLE-HIG-TARGET-SIZE",
    rule_layer: "L2_PLATFORM_GUIDELINE",
    rule_title: "Apple HIG 触控目标推荐 (44×44 pt)",
    mechanism: "motor_target_acquisition",
    native_unit: "pt",
    direct_applicability: "iOS / iPadOS 设备",
    physical_interpretability: "via_hardware_calibration",
    reference_viewing_distance: "missing",
    audit_status: "direct_only",
    evidence_strength: "verified",
    confounding_variables: ["手指尺寸", "触控响应区", "按压精度", "平台手势冲突"],
    transferability_assessment: "属于 iOS 平台交互人体工学规范，保护手部触控操作成功率，严禁进行视角等效跨域移植。"
  },
  {
    rule_id: "touch_overlap_conflict",
    rule_layer: "L1_HARD_CONSTRAINT",
    rule_title: "触控热区无重叠约束",
    mechanism: "motor_error_prevention",
    native_unit: "px",
    direct_applicability: "全平台触控交互",
    physical_interpretability: "direct",
    reference_viewing_distance: "missing",
    audit_status: "direct_only",
    evidence_strength: "verified",
    confounding_variables: ["点击歧义", "事件冒泡", "手势识别器冲突"],
    transferability_assessment: "保护系统确定性交互与防误触，为硬性几何不相交约束，不随视距变化。"
  },
  {
    rule_id: "L1-WCAG-SC-1.4.3",
    rule_layer: "L1_HARD_CONSTRAINT",
    rule_title: "WCAG 2.2 SC 1.4.3 文本色彩对比度 (≥ 4.5:1 / 3.0:1)",
    mechanism: "visual_discrimination",
    native_unit: ":1",
    direct_applicability: "全平台图形界面文本",
    physical_interpretability: "uninterpretable",
    reference_viewing_distance: "missing",
    audit_status: "direct_only",
    evidence_strength: "verified",
    confounding_variables: ["环境照度", "屏幕发光亮度", "眩光反射", "空间频率 (字号/字重)"],
    transferability_assessment: "对比度为纯光度学明度比值，视距增加虽然影响对比敏感度函数 (CSF)，但 4.5:1 标准本身不接受线性视距比例乘数换算。"
  },
  {
    rule_id: "L1-WCAG-SC-1.4.11",
    rule_layer: "L1_HARD_CONSTRAINT",
    rule_title: "WCAG 2.2 SC 1.4.11 非文本对比度 (≥ 3.0:1)",
    mechanism: "visual_discrimination",
    native_unit: ":1",
    direct_applicability: "用户界面组件与图形对象",
    physical_interpretability: "uninterpretable",
    reference_viewing_distance: "missing",
    audit_status: "direct_only",
    evidence_strength: "verified",
    confounding_variables: ["图形线条粗细", "图标视觉复杂度", "环境光照"],
    transferability_assessment: "保护图形边缘与状态辨识度，不具备直接按视距缩放的科学依据。"
  },
  {
    rule_id: "L2-APPLE-BODY-TEXT",
    rule_layer: "L2_PLATFORM_GUIDELINE",
    rule_title: "Apple HIG Dynamic Type 正文字号参考 (Body 17pt, Min 11pt)",
    mechanism: "visual_legibility",
    native_unit: "pt",
    direct_applicability: "iOS / iPadOS 界面排版",
    physical_interpretability: "via_hardware_calibration",
    reference_viewing_distance: "missing",
    audit_status: "insufficient_evidence",
    evidence_strength: "moderate",
    confounding_variables: ["字偶间距", "x-height / 大写字高比", "笔画粗细 (字重)", "排版行距", "单双行段落"],
    transferability_assessment: "Apple HIG 字号基于手持视距设计，但 HIG 官方规范未提供具名明确的参考视距数值，且截图包围盒包含行高空白，当前缺乏足够字形证据进行视角移植。"
  },
  {
    rule_id: "L2-ANDROID-BODY-TEXT",
    rule_layer: "L2_PLATFORM_GUIDELINE",
    rule_title: "Android Material Design 正文字号参考 (Body 16sp, Min 12sp)",
    mechanism: "visual_legibility",
    native_unit: "sp",
    direct_applicability: "Android 界面排版",
    physical_interpretability: "via_hardware_calibration",
    reference_viewing_distance: "missing",
    audit_status: "insufficient_evidence",
    evidence_strength: "moderate",
    confounding_variables: ["Roboto/Noto 字体度量", "中西文字符密度", "显示缩放比率"],
    transferability_assessment: "Material Design sp 单位以 160 DPI 为基准，未绑定具名视距元数据，需补充字形级度量与视距实证后方可进入视角审查。"
  }
];

/**
 * Returns the transferability classification for a given rule ID.
 * Defaults safely to "unknown" for unmapped rules to prevent unauthorized threshold scaling.
 */
export function getRuleTransferability(ruleId?: string): RuleTransferability {
  if (!ruleId) return "unknown";
  return RULE_TRANSFERABILITY_REGISTRY[ruleId] || "unknown";
}
