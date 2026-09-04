# 02 Evaluation Framework & Multi-Layer Rule Architecture

**English** | [简体中文](./02_evaluation_framework.zh-CN.md)

---

## 1. Framework Purpose & Philosophy

The evaluation framework of **UX Evaluation Tool** is designed to provide **multi-layer, explainable, and traceable risk analysis** for user interfaces at the design-image stage.

Unlike simple binary accessibility validators or black-box visual AI tools, this framework:
- Decomposes interface risks across **hierarchical rule layers** (from hard accessibility constraints to ergonomics theory).
- Treats **human perceptual and biomechanical mechanisms** (visual acuity, motor target acquisition) as distinct from unit conversion scales.
- Maintains strict **epistemic honesty**: clearly distinguishing confirmed design facts, hardware calculations, heuristic estimates, and unlockable rules.

---

## 2. Multi-Layer Rule Hierarchy (L1–L5)

L1–L3 include currently exposed evaluation paths. L4 provides domain-aware applicability and domain-specific rule support with scope-dependent activation. L5 remains an architectural extension in the current Public version.

```
┌───────────────────────────────────────────────────────────┐
│ L5: Custom Rules (Architecture-only extension layer)      │
├───────────────────────────────────────────────────────────┤
│ L4: Domain Rules (Automotive HMI, Desktop/Web, General)   │
├───────────────────────────────────────────────────────────┤
│ L3: Human Factors Models (Visual angles, 9mm touch, etc.) │
├───────────────────────────────────────────────────────────┤
│ L2: Platform Guidelines (Apple HIG, Android Material)     │
├───────────────────────────────────────────────────────────┤
│ L1: Hard Constraints (WCAG 2.2 Level AA, Touch overlap)   │
└───────────────────────────────────────────────────────────┘
```

### L1 — Hard Constraints
- **Scope**: Universal accessibility standards and non-negotiable physical conflict constraints.
- **Active v0.1 Standards**:
  - `L1-WCAG-SC-1.4.3`: Text Contrast Minimum ($4.5:1$ normal, $3.0:1$ large).
  - `L1-WCAG-SC-1.4.11`: Non-text Contrast Minimum ($3.0:1$ for UI components and graphic icons).
  - `L1-WCAG-SC-2.5.8`: Target Size Minimum ($24 \times 24\text{ CSS px}$ for web targets).
  - `touch_overlap_conflict`: Spatial bounding check flagging overlapping interactive hot zones.
- **Epistemic Classification**: `rule_match`. Hard constraints take precedence and cannot be overridden by lower-priority conventions.

### L2 — Platform Guidelines
- **Scope**: Ecosystem-specific design conventions and interaction guidelines published by platform vendors.
- **Active v0.1 Guidelines**:
  - **Apple HIG**: $44 \times 44\text{ pt}$ touch target minimum; $17\text{ pt}$ body typography ($11\text{ pt}$ minimum threshold).
  - **Android Material / Accessibility**: $48 \times 48\text{ dp}$ touch target minimum; $16\text{ sp}$ body typography ($12\text{ sp}$ minimum threshold).
- **Epistemic Classification**: `rule_match` (when evaluated against confirmed or mapped design units).

### L3 — Human Factors & Ergonomics Models
- **Scope**: Biomechanical motor models, visual perception baselines, and ergonomics research.
- **Active v0.1 Human Factors Baselines**:
  - **Representative Character Visual Angle**: $\theta = 2 \arctan(h / 2D)$, evaluated against $\ge 16'$ (basic threshold) and $\ge 20'$ (recommended threshold).
  - **Graphical Detail Visual Angle**: Evaluated against $\ge 16'$ (basic threshold) and $\ge 22'$ (recommended threshold).
  - **General Handheld Physical Touch Baseline**: Evaluated against $\ge 9.0\text{ mm}$ direct touch contact width/height.
- **Epistemic Classification**: `theory_inference` or `heuristic_risk`. Human factors models represent empirical design references, not legal compliance mandates.

### L4 — Domain-Specific Rules
- **Scope**: Environmental, task, and context constraints specific to specialized domains. L4 rules activate conditionally when applicable structured scenario context is present.
- **Active v0.1 Gating & Applicability**:
  - **Automotive HMI**: Filters applicable visual angle envelope based on in-vehicle viewing contexts. Note: Selecting the automotive domain does not automatically imply a driver role, driving state, or time-critical task; specialized automotive references require applicable structured context, and the current Public UI does not expose all cockpit role/state inputs.
  - **Desktop / Web**: Applies monitor viewing geometry and web pointer/touch interaction baselines.
  - **General / Unknown**: Fallback domain applying universal human factors and physical measurement baselines.
- **Epistemic Classification**: `domain_adapted`.

### L5 — Custom Extension Layer (Architecture-Only)
- **Scope**: Enterprise design systems, brand guidelines, or internal project acceptance criteria.
- **Status in v0.1**: Architectural data contract exists; authoring UI is not in public v0.1.

---

## 3. Epistemic Reasoning Types

Every evaluation trace and finding in the system is tagged with an epistemic reasoning type:

| Reasoning Type | Epistemic Basis | Output Label (EN / ZH) |
| :--- | :--- | :--- |
| `rule_match` | Explicit mapping to an audited standard or platform guideline | Rule Match / 命中规则 |
| `theory_inference` | Mathematical derivation from perceptual or ergonomics models | Theory Inference / 理论推断 |
| `heuristic_risk` | Heuristic signal derived from estimated measurements or layout density | Heuristic Risk / 启发式风险 |
| `custom_rule` | Derived from user-supplied custom rule specification | Custom Rule / 自定义规则 |

---

## 4. Rule Applicability vs. Evaluation Verdicts

### Dynamic Applicability Matching
The engine **automatically matches applicable rules** based on available evidence facts (element type, interaction type, target platform, design basis, viewing distance). Users do not manually toggle rule checkboxes.

### Verdict Categories
For applicable rules, the system generates distinct verdict states:
- `meets_reference`: Meets or exceeds governing and recommended thresholds (PASS).
- `below_recommended`: Meets minimum threshold but falls below recommended target (Advisory Risk).
- `below_threshold`: Fails minimum threshold or violates non-overlapping constraint (High Risk).
- `needs_info`: Rule is applicable, but requires additional parameters (e.g., viewing distance or design reference width) to evaluate.

### Neutral Evaluation Coverage Semantics
In reports and preview modals, coverage is partitioned cleanly:
- **Covered Dimensions (`●`)**: Neutral indicator that valid calculation or estimation took place. **Coverage does not imply PASS**.
- **Pending Additional Info (`○`)**: Explains what missing evidence is required to unlock full platform or physical rules. (Automatically hidden when all evidence is supplied).

---

## 5. Decision-Support Boundary

UX Evaluation Tool is built as an early-stage **decision-support tool**:
1. **Early Risk Surfacing**: Identifies touch crowding, undersized typography, and low-contrast elements during design drafts.
2. **Plurality of Evidence**: Presents governing, recommended, and optimal reference envelopes rather than a single synthetic score.
3. **Non-Certification Disclaimer**: Findings do not replace formal accessibility compliance audits or real-world vehicle cockpit driver distraction evaluations.
