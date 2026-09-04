# 人因工程多参考依据准入与资格审计

[English](./human_factors_evidence_qualification.md) | **简体中文**

---

## 1. 概述与准入治理原则

在 3K.2A 阶段中，规则可移植性审计确立了触控目标规则（`motor_target_acquisition`）与色彩对比度规则（`visual_discrimination`）严格属于 `direct_only`（仅直接适用）。

本文档（**Phase 3K.2B / 3K.2B.1**）对外部人因工程候选依据在**多参考评估架构（Multi-Reference Evaluation Architecture）**中的准入资格进行系统化定义与审计。

### 核心治理原则
- **拒绝人为合成单一平均阈值**：人机工效评估不强行计算单一的人工合成阈值，而是构建可解释的**参考包络（Reference Envelope）**，清晰呈现基准底线（Governing）、推荐值（Recommended）、最优参考（Optimal）、次级参考（Secondary）及适配参考（Adapted）。
- **本阶段不直接新增生产级判定阈值**：所有准入的外部记录属于架构与研究候选依据。研究准入并不自动激活运行态的 PASS/FAIL 判定规则或阈值缩放算法。
- **基准底线绝对优先（Governing Supremacy）**：次级、外部或适配参考仅提供设计决策背景，**绝不能**将直接适用的基准底线未达标结果反转为合格。

---

## 2. 多参考评估架构模型

### 2.1 相互独立的语义维度

| 语义维度 | 允许取值 | 维度目的 |
| :--- | :--- | :--- |
| **规则所属层级 (Rule Layer)** | `L1_HARD_CONSTRAINT`, `L2_PLATFORM_GUIDELINE`, `L3_HUMAN_FACTORS`, `L4_DOMAIN_RULE`, `L5_CUSTOM_RULE` | 系统内的规则规范层级 |
| **认识论推理类型 (Reasoning Type)** | `rule_match`, `theory_inference`, `heuristic_risk`, `custom_rule` | 评估结论的认识论依据 |
| **规则可移植性 (Rule Transferability)** | `direct_only`, `visual_angle_equivalent`, `non_transferable`, `unknown` | 跨上下文与跨视距的可移植能力 |
| **适用性来源 (Applicability Origin)** | `direct_domain`, `direct_human_factors`, `context_adapted`, `external_reference`, `descriptive_measurement` | 依据来源与当前目标领域的关系 |
| **参考角色 (Reference Role)** | `governing_minimum`, `recommended_minimum`, `optimal_reference`, `secondary_reference`, `adapted_reference`, `conservative_reference`, `descriptive_only` | 该参考在场景包络中的具体角色 |
| **场景关键性 (Scenario Criticality)** | `safety_critical`, `task_critical`, `normal_interaction`, `non_critical`, `unknown` | 任务后果与交互风险等级 |
| **测量目标 (Measurement Target)** | `element_visual_bounds`, `character_cap_height`, `character_x_height`, `character_height`, `primary_graphical_element`, `touch_bounds`, `unknown` | 实际测量的具体物理/视觉特征 |

### 2.2 参考包络模型（Reference Envelope）

**参考包络（Reference Envelope）**在可测量的某一维度上完整保留证据的多元性：

```
ReferenceEnvelope = { Governing, Recommended, Optimal, Secondary, Adapted, Conservative, Descriptive }
```

> [!NOTE]
> 参考包络**不是**统计置信区间，不是法定容差带，亦非自动合规区间。它是一个包含明确角色分工与适用范围的合格设计参考集合。

---

## 3. 外部证据准入清单与审计分析

### 3.1 NHTSA 驾驶员界面人因设计指南 (DOT HS 812 360, 2016)
- **官方出处**：美国国家公路交通安全管理局 (NHTSA), *Human Factors Design Guidance for Driver-Vehicle Interfaces*, DOT HS 812 360 (2016年12月)。
- **章节条款**：*Selecting Character Height for Icons and Text*。
- **文件性质**：非强制性**人因设计指南**（并非强制性联邦机动车安全标准 FMVSS 或法规）。
- **目标范围**：车辆在行驶动态下的乘用车驾驶员电子界面交互。
- **视距上下文**：指南中给出的公式基于标称视距 D = 0.5–1.1 m（作为来源计算上下文，不作为产品界面的强制预填默认值）。
- **核验证据记录**：
  1. **主要图形符号 / 图标**：
     - *保护机制*：`visual_recognition`（视觉辨识）
     - *测量目标*：`primary_graphical_element`（核心图形符号笔画，非外层触控容器框）
     - *最优视角*：**86 弧分**（`optimal_reference`）
     - *时间紧迫任务最低要求*：**41 弧分**（`recommended_minimum`）
     - *非时间紧迫任务最低要求*：**34 弧分**（`recommended_minimum`）
     - *证据强度*：`verified`（已核验）
  2. **文本 / 字符高度**：
     - *保护机制*：`visual_legibility`（视觉可读性）
     - *测量目标*：`character_height` / `character_cap_height`（单字高度，非外层多行容器框 `element_visual_bounds`）
     - *最优视角*：**20 弧分**（`optimal_reference`）
     - *时间紧迫任务最低要求*：**16 弧分**（`recommended_minimum`）
     - *非时间紧迫任务最低要求*：**12 弧分**（`recommended_minimum`）
     - *证据强度*：`verified`（已核验）

### 3.2 ISO 15008:2017（车载视觉显示工效规范）
- **官方出处**：国际标准化组织, *ISO 15008:2017: Road vehicles — Ergonomic aspects of transport information and control systems — Specifications and test procedures for in-vehicle visual presentation*。
- **版本状态**：**ISO 15008:2017** 是当前现行有效的正式发布版本。（正在修订中的第4版 ISO/CD 15008 仍处于草案阶段，不得作为正式标准引用）。
- **已核验证据范围**：
  - 直接适用性：处于正常驾驶坐姿的乘用车驾驶员。
  - 运行状态：车辆行驶中。
  - 显示类型：动态/可变视觉显示器。
  - 涵盖议题：字符可读性、视角、对比度、色彩感知、反射抑制。
- **数值证据边界**：未经官方标准文本独立核验的具体条款数据保持 `pending_verification`（待核验）状态，不作为通用生产基准。

### 3.3 W3C CSS Reference Pixel（参考像素视角基准）
- **官方出处**：W3C CSS Values and Units Module Level 3 / Level 4。
- **标准定义**：参考像素定义为一臂之长（28 英寸 / 71 cm）视距下、像素密度为 96 DPI 的设备上 1 像素所张开的视角，标称视角约为 **0.0213 度**（约 1.28 弧分）。
- **适用性来源**：`direct_human_factors`（作为视角的标准几何换算单位）。
- **角色定位**：`descriptive_only`（仅作为描述性校准背景）。
- **关键边界**：CSS px 的视角定义仅提供坐标换算参考，**绝不代表** WCAG SC 2.5.8（目标尺寸 24 × 24 CSS px）可按视角跨视距缩放，因为 SC 2.5.8 保护的是肢体触控（`motor_target_acquisition`）。

### 3.4 Apple HIG 与 Android Material 平台规范
- **官方出处**：Apple Human Interface Guidelines；Google Material Design。
- **文件性质**：第一方操作系统面向手持与桌面消费设备的设计指南。
- **多参考模型中的角色**：
  - 主领域：移动手持与桌面应用（`direct_domain`）。
  - 跨领域角色：在非关键场景（如后排乘客娱乐或驻车信息娱乐）中可作为 `secondary_reference`（次级参考），但**绝不能**作为驾驶员安全关键交互的基准底线。
  - **适配边界**：在具备经过验证的跨域适配转换模型前，平台指南保持为次级参考，不得被标注为 `adapted_reference`。

---

## 4. 多参考依据准入矩阵（Qualification Matrix）

| 依据标识 | 来源规范 | 保护机制 | 测量目标 | 默认角色 | 适用范围 | 证据强度 | 核验状态 | 包络中潜在角色 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`REF-NHTSA-TEXT-OPTIMAL`** | NHTSA DOT HS 812 360 | `visual_legibility` | `character_height` | `optimal_reference` (20′) | 驾驶员 + 行驶中 (全部任务) | `verified` | 调研合格候选 | 驾驶员文字最优可读性 |
| **`REF-NHTSA-TEXT-CRITICAL`** | NHTSA DOT HS 812 360 | `visual_legibility` | `character_height` | `recommended_minimum` (16′) | 驾驶员 + 行驶中 + 关键任务 | `verified` | 调研合格候选 | 时间紧迫任务推荐最低视角 |
| **`REF-NHTSA-TEXT-NORMAL`** | NHTSA DOT HS 812 360 | `visual_legibility` | `character_height` | `recommended_minimum` (12′) | 驾驶员 + 行驶中 + 常规任务 | `verified` | 调研合格候选 | 常规非紧迫任务推荐最低视角 |
| **`REF-NHTSA-ICON-OPTIMAL`** | NHTSA DOT HS 812 360 | `visual_recognition` | `primary_graphical_element` | `optimal_reference` (86′) | 驾驶员 + 行驶中 (全部任务) | `verified` | 调研合格候选 | 驾驶员图形最优辨识视角 |
| **`REF-NHTSA-ICON-CRITICAL`** | NHTSA DOT HS 812 360 | `visual_recognition` | `primary_graphical_element` | `recommended_minimum` (41′) | 驾驶员 + 行驶中 + 关键任务 | `verified` | 调研合格候选 | 关键图标推荐最低视角 |
| **`REF-NHTSA-ICON-NORMAL`** | NHTSA DOT HS 812 360 | `visual_recognition` | `primary_graphical_element` | `recommended_minimum` (34′) | 驾驶员 + 行驶中 + 常规任务 | `verified` | 调研合格候选 | 常规图标推荐最低视角 |
| **`REF-ISO-15008-DRIVER`** | ISO 15008:2017 | `visual_legibility` | `character_height` | `governing_minimum` | 驾驶员 + 行驶中 (乘用车) | `verified` (范围) | 待核验条款数据 | 未来车载强制标准候选 |
| **`REF-W3C-CSS-REF-PX`** | W3C CSS Values & Units | `layout_density` | `element_visual_bounds` | `descriptive_only` (~1.28′ / px) | 全部领域 | `verified` | 合格单位依据 | 仅用于校准上下文 |
| **`REF-APPLE-BODY-TEXT`** | Apple HIG Dynamic Type | `visual_legibility` | `character_height` | `secondary_reference` (标称 17 pt) | 移动手持 / 非关键跨领域 | `verified` (源) | 合格平台规范 | 次级设计参考比对 |
| **`REF-ANDROID-BODY-TEXT`** | Material Design | `visual_legibility` | `character_height` | `secondary_reference` (标称 16 sp) | Android / 非关键跨领域 | `verified` (源) | 合格平台规范 | 次级设计参考比对 |

---

## 5. 测量目标语义门控原则（Measurement Target Gating）

为杜绝无效或失真的规则判定，候选依据必须通过严格的**测量目标门控**：

### 5.1 排版文字门控：单字字符高度 vs 元素整体包围盒
- 字符级人因参考（如 NHTSA 时间紧迫文字 16 弧分）要求测量目标为 `character_height`、`character_cap_height` 或 `character_x_height`。
- 若当前测量数据仅提供 `element_visual_bounds`（包含行距与内边距的整体文本框）：
  - `measurement_matched = false`
  - `assigned_role = descriptive_only`
- 该参考保留在包络中作为背景参考，但**不参与强制判定**。

### 5.2 图标门控：主要图形元素 vs 外层触控容器
- 符号辨识视角参考（如 NHTSA 41 弧分最低值）要求测量目标为 `primary_graphical_element`。
- 若标注框框选的是包含外边距的整体触控热区：
  - `measurement_matched = false`
- 系统绝不假设外层热区包围盒能够代表核心图形笔画的实际尺寸。

---

## 6. 基于场景的优先级与包络解析机制

在 `resolveReferenceEnvelope()` 中执行解析时：

1. **直接基准绝对优先**：若存在直接适用的基准底线（governing）且匹配测量目标，它确立最主要的比对底线。
2. **脱离范围降级（Out-of-Scope Demotion）**：若车载驾驶员行驶规则在非驾驶员或静止场景（如后排乘客娱乐）中被触发，它自动降级为 `conservative_reference` 或 `secondary_reference`，绝不造成误报。
3. **次级参考不可逆转结论**：基准底线未达标时，宽松的次级或外部参考不能消除基准缺陷。
4. **保持证据多元性**：所有匹配的推荐值、最优参考及次级参考分别填入包络的专属槽位，不进行人工加权平均。
