# 08 Explanation Layer & Presentation Architecture

**English** | [简体中文](./08_explanation_layer_design.zh-CN.md)

---

## 1. Purpose & Architectural Role

The **Explanation Layer** is responsible for transforming raw spatial measurements, calibration data, and evaluated rule traces (`RuleComparisonTrace`) into structured, human-readable explanations.

Operating as a pure presentation transformation layer (`src/utils/elementPresentation.ts`, `src/utils/reportGenerator.ts`), it maps mathematical outcomes into actionable designer feedback without performing raw physics calculations or mutating underlying workspace state.

---

## 2. Core Explanation Responsibilities

Every evaluated element finding in the Inspector Drawer and exported reports fulfills nine essential communication responsibilities:

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. Current Measurement │ Quantified value, units, limiting dimension   │
│ 2. Verdict & Status    │ Meets reference, below recommended, attention │
│ 3. Rule Citation       │ Standard title, rule ID, governing layer       │
│ 4. Comparison Detail   │ Threshold delta, margin, limiting axis        │
│ 5. Active Assumptions  │ Calibrated PPI, design scale, glyph ratio     │
│ 6. Missing Inputs      │ Explicit parameters needed to unlock checks   │
│ 7. Why It Matters      │ Perceptual, motor, or cognitive impact        │
│ 8. Recommendation      │ Concrete, actionable design remediation       │
│ 9. Epistemic Provenance│ Precision tier, evidence status, claim strength│
└────────────────────────────────────────────────────────────────────────┘
```

### Detailed Field Breakdown:
- **Current Measurement (`currentValueDisplay`, `unit`)**: Formatted physical or logical dimensions (e.g., `52 × 40 dp`, `1.16:1`, `18.4'`).
- **Verdict (`verdict`, `verdictLabel`)**: Standardized outcome token (`meets`, `below_recommended`, `attention`, `estimated_meets`, `needs_info`, etc.).
- **Rule Reference (`ruleTitle`, `ruleId`, `ruleLayer`)**: Formal citation to the governing standard (e.g., `WCAG 2.2 SC 1.4.3`, `Apple HIG`, `General Human Factors`).
- **Comparison Breakdown (`comparison`)**: Clear display of target threshold and margin (e.g., `Margin: +4 dp` or `Deficit: -8 dp`).
- **Assumptions (`assumptions`)**: Declared background assumptions (e.g., "Assumes nominal viewing distance of 500 mm", "Estimated from single-line text bounds").
- **Missing Inputs (`missingInputs`)**: Clear list of parameters required to evaluate or upgrade tier (e.g., "Requires screen diagonal for physical mm conversion").
- **Why It Matters (`whyItMatters`)**: Ergonomic rationale explaining the real-world impact (e.g., why touch target spacing prevents motor mis-taps).
- **Recommendation (`recommendation`)**: Concrete advice for the designer or developer (e.g., "Increase touch target padding to at least 48 × 48 dp").
- **Epistemic Basis (`evaluationTier`, `evidenceStatus`, `claimStrength`)**: Communicates whether the result is a direct standard match, theoretical deduction, or heuristic estimate.

---

## 3. Evaluation Coverage vs. Evaluation Verdicts

A fundamental principle of the explanation layer is strict epistemic clarity:

### 3.1 Coverage Does Not Imply Pass
- **Evaluated Coverage**: The proportion of annotated elements that have complete evidence to run applicable rule checks.
- **Verdict Distribution**: The actual distribution of findings (`meets`, `below_recommended`, `attention`).
- *Strict Rule*: High rule coverage simply indicates that elements were successfully evaluated against all available standards; it **must never** be conflated with a "Pass" score.

### 3.2 Distinguishing Active vs. Unlockable Checks
- **Active References**: Rules that are currently executing against available evidence.
- **Unlockable References**: Rules that remain in `needs_info` until additional context is provided (e.g., supplying a design basis unlocks platform typography checks; supplying screen diagonal unlocks physical touch millimeter checks).

---

## 4. UI & Report Presentation Structure

### 4.1 Element Inspector Drawer (`src/components/ElementInspectorDrawer.tsx`)
When a user selects an element on the canvas:
- **Header**: Element label, semantic role (`button`, `text`, `icon`), and precision tier badge.
- **Physical & Visual Dimension Cards**: Rendered pixels, calibrated millimeters, and subtended visual angle arcminutes.
- **Active Rule Comparison Cards**: Collapsible, color-coded trace cards showing verdict, margin, rationale, and recommendations.
- **Context & Gating Warnings**: Explanations of missing parameters or domain applicability notices.

### 4.2 Standalone Export Reports (`src/utils/reportGenerator.ts`)
- Generates a single-file, zero-dependency HTML document.
- Contains executive summaries, active rule matrices, element detail tables, and embedded base64 Canvas evidence snapshots.

---

## 5. Decision-Support Orientation

To maintain legal and technical integrity:
- All findings, tooltips, and report summaries are framed as **decision-support references** to assist designers in discovering ergonomic risks early.
- The explanation layer explicitly avoids statutory compliance certification claims.
