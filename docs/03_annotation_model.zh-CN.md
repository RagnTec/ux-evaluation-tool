# 03 空间证据与元素数据模型

[English](./03_annotation_model.md) | **简体中文**

---

## 1. 数据模型定位与三层架构

在 **UX Evaluation Tool** 中，数据模型被清晰划分为三个核心层级：

```
┌───────────────────────────────────────────────────────────────────┐
│ 1. 实时空间测量证据模型: DesignElement                           │
│    (用户框选边界、独立触控热区、前背景色彩采样、代表字符度量)     │
├───────────────────────────────────────────────────────────────────┤
│ 2. 确定性规则比对链与发现: RuleComparisonTrace / ActionableFinding│
│    (单项检查的量化比对、标准阈值、判定状态、归属层级)              │
├───────────────────────────────────────────────────────────────────┤
│ 3. 统一呈现与格式化模型: ElementPresentationModel                 │
│    (支持国际化语言格式化，驱动卡片、抽屉面板及证据报告)          │
├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤
│ [隔离的历史演示模型: Legacy Annotation]                            │
│ (仅供可选的预置演示数据勾选展示，与真实测量数据完全隔离)          │
└───────────────────────────────────────────────────────────────────┘
```

这种分层设计确保了用户手动创建的真实测量证据与演示数据、以及多端呈现逻辑之间保持完全解耦。

---

## 2. 实时空间证据模型（`DesignElement`）

`DesignElement` 代表用户在设计图画布上标注的具备明确空间和物理证据的界面元素。

### 核心概念字段

| 字段类别 | 关键属性 | 核心用途与语义解释 |
| :--- | :--- | :--- |
| **身份与语义** | `element_id`, `label`, `element_type`, `interaction_type` | 唯一标识、显示名称、语义角色（`button`、`text`、`icon`、`card`、`input` 等）以及交互类型（`primary_action`、`navigation`、`none` 等）。 |
| **可视包围盒** | `image_pixel_bounds` ($x, y, w, h$) | 基于原始未缩放图像的绝对像素坐标，并映射至 Canvas 画布上的 $[0, 1]$ 归一化坐标系。 |
| **触控区域** | `touch_bounds`, `touch_source_provenance` | 独立于可视包围盒的触控响应热区矩形，用于评估真实肢体按压容错与热区间距。 |
| **字符排版度量** | `character_height_px`, `character_height_physical_mm`, `text_layout`, `text_role` | 单个代表性文字字符的测量框、渲染字符毫米高度、文本行结构（`single_line` vs `multi_line`）及文字角色。 |
| **色彩证据** | `foreground_color`, `background_color`, `contrast_evaluation` | 采样的前背景色 HEX/RGB 数值以及计算得出的 WCAG 相对亮度对比度。 |
| **物理几何** | `physical_geometry` (`width_mm`, `height_mm`, `calibration_quality`, `is_calibrated`) | 基于屏幕硬件尺寸、分辨率及截图模式校准推导出的毫米物理尺寸。 |
| **平台规范评估** | `target_size_evaluation`, `text_size_evaluation` | 针对平台逻辑尺寸（pt/dp/px）与字号梯度的量化校验结果。 |

---

## 3. 规则评估与追溯契约

### `RuleComparisonTrace`（规则比对追溯记录）
记录单项测量指标与特定标准规范之间的精确数学比对：
- `rule_id`：用于追溯的唯一规则标识（如 `L1-WCAG-SC-1.4.3`、`L2-APPLE-HIG-TARGET-SIZE`）。
- `rule_layer`：规则所属层级（`L1_HARD_CONSTRAINT`、`L2_PLATFORM_GUIDELINE`、`L3_HUMAN_FACTORS`、`L4_DOMAIN_RULE`）。
- `source_title`：人类可读的标准规范名称（如 `Apple Human Interface Guidelines`）。
- `metric_name`：被量化评估的指标属性（如 `touch_target_size`、`contrast_ratio`、`visual_angle`）。
- `measured_value`：从空间或色彩证据中提取出的实测数值。
- `threshold_value`：规范规定的最低要求或推荐基准数值。
- `verdict`：比对判定结论（`meets_reference`、`below_recommended`、`below_threshold`、`needs_info`）。
- `reasoning_type`：认识论基础（`rule_match`、`theory_inference`、`heuristic_risk`、`custom_rule`）。

### `ElementActionableFinding`（行动发现）
将单项或多项规则比对结论汇聚为对设计实践有指导意义的行动项：
- `findingId`：发现项唯一 ID。
- `severity`：风险等级（`critical`、`below_threshold`、`below_recommended`、`advisory`）。
- `summaryText`：单句结论摘要，用于卡片与表格呈现。
- `detailText`：详尽依据阐述，明确指出具体测量事实与标准考量。
- `recommendationText`：针对当前风险的可落地改进建议。

---

## 4. 统一呈现模型（`ElementPresentationModel`）

`ElementPresentationModel` 由纯函数 `buildElementPresentationModel` 实时生成，统一驱动元素卡片、抽屉面板（Inspector）、报告预览模态框及单文件 HTML 报告：
- **可视尺寸呈现**：格式化像素字符串（`visualPxDisplay`）、屏幕面积占比（Area Share）及最短边标签。
- **设计逻辑尺寸**：格式化 pt / dp / CSS px 字符串（`logicalDisplay`）与换算倍率。
- **物理几何尺寸**：格式化毫米尺寸字符串（`physicalDisplay`）与校准来源说明。
- **人因视角呈现**：格式化度数与弧分字符串（`visualAngleDisplay`）与视距上下文。
- **排版与字符视角**：格式化估算字号、代表字符高度视角及可读性状态。
- **触控审查结论**：触控状态徽标（Pass / Risk / Warning）、相邻热区距离及重叠告警。
- **统一结论摘要**：最高生效精度等级标签（`highestTierLabel`）、统一结论状态及行动项集合。

---

## 5. 隔离的演示模型（Legacy `Annotation`）

代码仓库中保留了早期的 `Annotation` 模型，仅供可选的演示开关（`showDemoResults` / `analysisService.analyzeDesign`）使用：
- **演示用途**：在演示模式下加载静态模拟的标注样例，方便探索交互流程。
- **严格数据隔离**：演示标注与用户创建的真实 `DesignElement` 在内存中完全隔离。
- **报告安全隔离**：报告生成与导出逻辑完全忽略演示标注，确保导出的评估报告完全基于真实空间测量证据。
