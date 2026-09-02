# Rule Transferability Evidence Audit

## 1. Executive Summary & Core Scientific Question

Phase 3K.0 established the pure Human Factors calculation core, and Phase 3K.1 integrated visual-angle measurement into `ux-evaluation-tool`.

This audit (**Phase 3K.2A**) evaluates which existing or future rule categories could scientifically support cross-context adaptation (e.g., adapting mobile UI recommendations to desktop or automotive cockpit displays).

### The Core Scientific Question
The governing question for transferability is **NOT**:
> *"Can the mathematical threshold be multiplied by the viewing distance ratio?"*

The governing question is:
> **"Does preserving visual angle ($\theta = 2 \cdot \arctan(\text{size}/(2 \cdot \text{distance}))$) preserve the underlying Human Factors mechanism that the original rule was intended to protect?"**

### Primary Audit Verdict
- **No production threshold is scaled, modified, or adapted in this phase.**
- **Zero production rules are assigned to `visual_angle_equivalent`.**
- All existing production rules remain classified strictly as `direct_only` or `unknown`.

---

## 2. Methodology & Human Factors Mechanism Categories

To prevent invalid cross-domain threshold scaling, every rule must be decomposed into its underlying human biological/perceptual mechanism:

| Mechanism Category | Biological / Perceptual Basis | Examples |
| :--- | :--- | :--- |
| `motor_target_acquisition` | Biomechanical motor target acquisition, Fitts' Law, hand-eye coordination, touch contact area | Touch target size (44pt, 48dp, 24px) |
| `motor_error_prevention` | Motor control variability, hand tremor, vehicle vibration, inadvertent touch | Touch spacing, touch overlap constraints |
| `visual_legibility` | Retinal spatial resolution, character stroke recognition, visual acuity | Typography, font size, glyph x-height |
| `visual_recognition` | Shape identification, icon semantic parsing, visual salience | Icon size, badge visibility |
| `visual_discrimination` | Photoreceptor luminance contrast sensitivity (CSF), edge detection | Text contrast (4.5:1), non-text contrast (3.0:1) |
| `layout_density` | Visual clutter, peripheral crowding, cognitive scanning workload | Information density, whitespace margins |
| `platform_convention` | Ecosystem style guidelines, brand consistency, OS ergonomics | Platform specific UI components |
| `accessibility_requirement` | Accessibility conformance criteria (e.g. WCAG Level AA success criteria) | WCAG 2.2 criteria |
| `unknown` | Unclassified, compound, or unverified heuristic checks | Generic heuristic suggestions |

---

## 3. Comprehensive Rule Inventory Audit

| Rule ID | Layer | Rule Title | Protected Mechanism | Native Unit | Direct Applicability | Physical Interpretability | Reference Viewing Distance | Audit Status | Evidence Strength | Confounding Variables | Transferability Assessment |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`L1-WCAG-SC-2.5.8`** | L1 | WCAG 2.2 SC 2.5.8 目标尺寸 (最小 24×24 CSS px) | `motor_target_acquisition` | CSS px | Web / 浏览器交互 | 硬件校准后可解释 | Missing (未指定) | `direct_only` | Verified | 手指/输入媒介接触面与按压精度、指针输入设备类型、间距边界 | 保护手指/光标物理点击与目标激活成功率。触控激活属于肢体运动控制，严禁按视距比例换算放大或缩小触控阈值。 |
| **`L2-ANDROID-TARGET-SIZE-48DP`** | L2 | Android Material 触控目标 (48×48 dp) | `motor_target_acquisition` | dp | Android 移动设备 | 硬件校准后可解释 | Missing (未指定) | `direct_only` | Verified | 移动握持姿态、指腹接触面积、单手大拇指扫掠半径、触控屏采样抖动 | 针对手持近距触控人体工学制定，属于直接触控物理阈值，不可移植至非手持远视距场景作为触控标准。 |
| **`L2-APPLE-HIG-TARGET-SIZE`** | L2 | Apple HIG 触控目标 (44×44 pt) | `motor_target_acquisition` | pt | iOS / iPadOS | 硬件校准后可解释 | Missing (未指定) | `direct_only` | Verified | 手指尺寸、触控响应区、按压精度、平台手势冲突 | 属于平台触控人体工学规范，保护手部触控操作成功率，严禁进行视角等效跨域移植。 |
| **`touch_overlap_conflict`** | L1 | 触控热区无重叠约束 | `motor_error_prevention` | px | 全平台触控交互 | 直接物理/像素解释 | Missing (不相关) | `direct_only` | Verified | 点击歧义、事件冒泡、手势冲突 | 硬性几何不相交约束，与视距完全无关。 |
| **`L1-WCAG-SC-1.4.3`** | L1 | WCAG 2.2 SC 1.4.3 文本对比度 (≥ 4.5:1 / 3.0:1) | `visual_discrimination` | :1 | 全平台图形文本 | 不可物理尺寸解释 (纯光度比值) | Missing (不相关) | `direct_only` | Verified | 环境光照度、屏幕峰值发光亮度、眩光、字重与字号 | 对比度为光度学相对比值，不接受视距比例线性换算。 |
| **`L1-WCAG-SC-1.4.11`** | L1 | WCAG 2.2 SC 1.4.11 非文本对比度 (≥ 3.0:1) | `visual_discrimination` | :1 | UI 组件与图形对象 | 不可物理尺寸解释 (纯光度比值) | Missing (不相关) | `direct_only` | Verified | 图标线条粗细、填充形态、环境光照 | 保护图形边缘可见性，无视距线性缩放依据。 |
| **`L2-APPLE-BODY-TEXT`** | L2 | Apple HIG Dynamic Type 正文字号 (17pt / 11pt) | `visual_legibility` | pt | iOS 界面排版 | 硬件校准后可解释 | Missing (官方规范未标称) | `insufficient_evidence` | Moderate | 字偶间距、x-height、字重、单多行行高包围盒 | HIG 规范未提供具名明确的参考视距数值，且截图包围盒包含字偶行高空白，缺乏字形级证据。 |
| **`L2-ANDROID-BODY-TEXT`** | L2 | Android Material 正文字号 (16sp / 12sp) | `visual_legibility` | sp | Android 界面排版 | 硬件校准后可解释 | Missing (官方规范未标称) | `insufficient_evidence` | Moderate | Roboto/Noto 字体度量、字符密度、显示缩放比率 | Material sp 单位以 160 DPI 为基准，未绑定具名视距元数据，需补充字形级度量实证。 |

---

## 4. Category Findings & Mechanism Review

### 4.1 Touch Target Size & Spacing (Motor Interaction)
- **Protected Mechanism**: `motor_target_acquisition` & `motor_error_prevention`.
- **Finding**: Touch target rules concern motor target acquisition and activation accuracy, affected by input modality, motor precision, posture, motion, and touch surface interaction.
- **Scientific Implication**: When viewing distance changes, human hand mechanics, finger dimensions, and motor pointing precision do not scale with viewing distance. Scaling touch targets solely by visual angle would conflate visual detection with motor pointing ergonomics.
- **Rule Governance**: **Strictly `direct_only` / Non-transferable via Visual Angle**.

### 4.2 Color Contrast (Photometric Discrimination)
- **Protected Mechanism**: `visual_discrimination`.
- **Finding**: Contrast ratio is a unitless ratio of relative luminances ($L_1 + 0.05 / L_2 + 0.05$). While human Contrast Sensitivity Function (CSF) varies with spatial frequency, the regulatory standard itself (4.5:1) is an absolute photometric criterion.
- **Rule Governance**: **Strictly `direct_only`**. No distance multiplier can be applied to contrast ratios.

### 4.3 Typography & Text Size (Visual Legibility)
- **Protected Mechanism**: `visual_legibility`.
- **Finding**: Text legibility depends on character stroke width, x-height, and typographic complexity (e.g. Latin alphabets vs. dense CJK ideographs), rather than the outer Visual Bounds of a text box.
- **Evidence Gap**:
  1. Platform guidelines (iOS HIG, Material Design) specify font sizes in typographic points (`pt`) or scale-independent pixels (`sp`), but do **not** document authoritative reference viewing distances in their official standard texts.
  2. Bounding boxes in 2D screenshot annotations include font ascent, descent, and line-height spacing.
- **Rule Governance**: **`insufficient_evidence`**. A font-size rule must not be converted to a visual-angle requirement without character-level stroke and reference-distance provenance.

### 4.4 Visual Icon / Graphic Symbol Recognition (Visual Target)
- **Protected Mechanism**: `visual_recognition`.
- **Finding**: For non-interactive graphical symbols (e.g., status icons, warnings, battery indicators), angular size on the retina directly affects visual detection and recognition.
- **Rule Governance**: **`candidate_for_visual_angle_review` (Audit Status Only)**.
- **Prerequisite**: Cannot be operationalized in production until a qualified Human Factors reference context is formally documented.

---

## 5. Candidate Requirements for Future Visual Angle Adaptation

Before any future rule may be transitioned from `insufficient_evidence` / `candidate_for_visual_angle_review` to `visual_angle_equivalent`, it must satisfy all **9 Minimum Evidence Requirements**:

1. **Identifiable Source Standard**: Clear reference specification (e.g., ISO 9241-303, ISO 15008, MIL-STD-1472H).
2. **Supported Human Factors Mechanism**: Confirmed to protect visual recognition or legibility (NOT motor touch target acquisition).
3. **Reference Physical Visual Metric**: Quantified in physical millimeters or calibrated stroke width (NOT abstract point sizes).
4. **Authoritative Reference Viewing Distance**: Explicitly documented in the source specification (NOT inferred or assumed).
5. **Target Viewing Distance**: Verified user-confirmed or spatially derived distance.
6. **Target Physical Display Mapping**: Valid physical screen calibration.
7. **No Incompatible Confounding Mechanism**: Target element is non-interactive or has separate independent touch evaluation.
8. **Explicit Assumption Trace**: All environmental assumptions (glance duration, vibration, ambient lighting) are logged.
9. **Evidence Strength $\ge$ Verified**: Backed by formal human factors literature.

---

## 6. Multi-Source Evidence Chain Governance

When evaluating future adapted thresholds, multiple independent sources must never be conflated:

```
[Rule Standard Source]        -> Defines nominal threshold & intended mechanism
[Reference Distance Source]   -> Human Factors literature / empirical studies
[Display Hardware Spec]       -> Target device DPI & screen diagonal
[Usage Context Evidence]      -> Observer viewing distance & posture
```

Each link in the chain retains its own independent `provenance` and `evidence_level`.

---

## 7. Semantic Distinction: Direct Rule vs. Context-Adapted Guidance

| Aspect | Direct Rule (`rule_match`) | Context-Adapted Guidance (`theory_inference`) |
| :--- | :--- | :--- |
| **Nature** | Direct verification against an applicable standard threshold | Scientific estimate projected to a different usage context |
| **Claim Strength** | Formal Constraint (`L1` / `L2`) | Informational Inference (`L3`) |
| **Verdict Label** | 达标 (Meets) / 偏小 (Attention) / 不达标 | 人因参考视角 (Contextual Reference Only) |
| **Compliance Claim** | May cite standard conformance (e.g. WCAG 2.2 AA) | **Must NEVER claim compliance with or violation of the original standard** |

---

## 8. External Evidence Leads Pending Qualification

The following external evidence leads have been identified during this audit and remain queued for formal evidence qualification:

### 8.1 W3C CSS Reference Pixel
- **Source Specification**: W3C CSS Values and Units Module.
- **Definition**: The reference pixel is defined in relation to visual angle (the visual angle of one pixel on a device with a pixel density of 96 DPI and a distance from the reader of an arm's length, nominal angle ~0.0213 degrees / ~1.28 arcmin).
- **Potential Significance**: Provides an authoritative, formal basis for understanding CSS visual-unit scaling geometry.
- **Important Boundary**: This definition does **NOT** make WCAG SC 2.5.8 (Target Size Minimum 24×24 CSS px) visual-angle transferable, because SC 2.5.8 primarily addresses motor target acquisition / activation accuracy rather than visual perception.

### 8.2 Apple Official Platform Guidance
- **Source Specification**: Apple Human Interface Guidelines (Typography & Touch Targets).
- **Definition**: Explicit platform-native point size tables (Dynamic Type) and 44×44 pt minimum control targets.
- **Potential Significance**: Source evidence metadata for Apple platform checks may be eligible for a formal source-verification upgrade.
- **Important Boundary**: Official platform numeric guidance alone does **NOT** provide sufficient reference viewing context or character stroke evidence for cross-domain visual-angle adaptation.

---

## 9. Separation of Source Verification and Transferability Qualification

To ensure scientific integrity, the evaluation model distinguishes two independent axes:

1. **`source_rule_verified`**: Whether the rule's original threshold and platform text are verified against an official standard or manufacturer guideline.
2. **`transferability_qualified`**: Whether the rule possesses the necessary mechanism, reference physical metrics, and reference viewing distance to be validly adapted to other viewing contexts.

A rule can be **verified official source** while simultaneously remaining **`direct_only`** or **`insufficient_evidence`** for cross-context adaptation.

---

## 11. Multi-Reference Architecture & Rule Selection Policy (Phase 3K.2B)

1. **Target-Domain Priority**: Target-domain evidence (e.g. automotive standards for in-vehicle displays) is the preferred governing reference when directly applicable to the scenario.
2. **Secondary/Fallback References**: Qualified Human Factors recommendations and cross-context references provide design guidance, conservative benchmarks, or gap-filling references when direct domain rules are missing or out of scope.
3. **Scenario Applicability, Not Arbitrary Standards Relaxation**: Less-critical or out-of-scope scenarios (e.g. rear-seat entertainment vs. driver in motion) legitimately alter which reference is governing. This is a scientific applicability change, not standards relaxation.
4. **Governing Supremacy**: A secondary, external, or adapted reference can **never** override or turn a failure of a directly applicable governing constraint into a pass.
