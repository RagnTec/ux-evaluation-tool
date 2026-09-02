# 02 评估框架

## Evaluation Positioning

本项目的评估框架不是单一可访问性检查，也不是 AI 热力图预测。第一阶段将设计图风险拆成可解释的规则层、评估类型和输出推理类型。

## Rule Layers

### L1 Hard Constraints

- WCAG 2.2。
- EN 301 549。
- Section 508。

L1 是强规则和合规约束。输出时应标记为 `rule_match`，除非当前证据不足以确认。

### L2 Platform

- Apple Human Interface Guidelines。
- Google Material Design / Android Accessibility。
- Microsoft Fluent。

L2 是平台适配规则，关注不同平台和设备生态下的设计期望。

TypeScript enum: `L2_PLATFORM_GUIDELINE`。

### L3 Human Factors

- Fitts's Law。
- Hick-Hyman Law。
- Signal Detection Theory。
- Gestalt principles。
- Cognitive Load Theory。
- NASA-TLX。
- ISO 9241。

L3 是理论推断或启发式风险，不应被表述为硬性合规失败。

TypeScript enum: `L3_HUMAN_FACTORS`。

### L4 Domain

- Automotive HMI。
- ISO 15005。
- ISO 15007。
- 家电 / IoT。
- 公共设备。
- 可穿戴设备。

L4 是行业与场景规则，应与设备、使用距离、任务环境和目标人群一起解释。

TypeScript enum: `L4_DOMAIN_RULE`。

### L5 Custom

- 用户上传的企业内部规范。
- 品牌设计规范。
- 特定项目验收标准。
- 特定国家或市场要求。

L5 是用户自定义规则。自定义规则可以补充或收紧要求，但不能静默覆盖 L1 强规则。

TypeScript enum: `L5_CUSTOM_RULE`。

## Reasoning Types

评估输出必须区分以下类型：

- `rule_match`: 命中明确规范或规则。
- `theory_inference`: 基于人因、认知或人体测量模型的理论推断。
- `heuristic_risk`: 基于 UX 经验法则或场景启发式的风险提示。
- `custom_rule`: 命中用户自定义规则。

## MVP Evaluation Areas

### 1. Touch Target Size

- 触控目标尺寸过小。
- 点击热区与视觉尺寸不一致。
- 特定人群操作命中率下降。

### 2. Target Spacing / Mistouch Risk

- 目标间距不足。
- 高频操作靠近危险操作。
- 边缘手势或车机场景下误触风险增加。

### 3. Color Contrast

- 文本与背景对比不足。
- 关键按钮与次要元素区分不明显。
- 强光、弱光或低视力用户识别风险。

### 4. Information Hierarchy

- 主次关系不清。
- 关键入口缺乏视觉优先级。
- 信息结构与任务路径不匹配。

### 5. Text Readability

- 字号、字重、行距或背景复杂度导致可读性下降。
- 使用距离变化后阅读负担增加。
- 车机或设备屏幕场景下扫视成本偏高。

### 6. Initial Cognitive Load Risk

- 同屏决策点过多。
- 信息密度过高。
- 记忆负担或理解成本偏高。

## Scoring

- 风险等级：`low` / `medium` / `high` / `critical`。
- 置信度：0-1，当前为 mock。
- 证据等级：`standard` / `platform_guideline` / `theory` / `heuristic` / `custom`。
- 输出必须附带 rule layer、rule id、structured evidence、source priority、reasoning type 和 recommendation。
- 输出状态使用 `OPEN` / `ACKNOWLEDGED` / `FIXED` / `VERIFIED` / `CLOSED`。
- 冲突状态使用 `none` / `potential_conflict` / `overridden` / `blocked_by_higher_priority_rule`。
