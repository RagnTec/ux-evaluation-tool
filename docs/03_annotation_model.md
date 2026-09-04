# 03 Spatial Evidence & Element Data Models

**English** | [简体中文](./03_annotation_model.zh-CN.md)

---

## 1. Data Model Purpose & Architecture

In **UX Evaluation Tool**, data modeling is divided into three distinct operational tiers:

```
┌───────────────────────────────────────────────────────────────────┐
│ 1. Production Spatial Evidence: DesignElement                     │
│    (User-drawn bounds, touch zones, color samples, measurements)  │
├───────────────────────────────────────────────────────────────────┤
│ 2. Deterministic Rule Traces & Findings: RuleComparisonTrace      │
│    (Per-check quantitative comparison, thresholds, references)    │
├───────────────────────────────────────────────────────────────────┤
│ 3. Unified Presentation Model: ElementPresentationModel           │
│    (Locale-aware formatting for Cards, Inspector, and Reports)    │
├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤
│ [Isolated Demonstration Model: Legacy Annotation]                 │
│ (Optional pre-packaged mock annotations, segregated from manual) │
└───────────────────────────────────────────────────────────────────┘
```

This separation ensures that user-created spatial measurements remain strictly isolated from mock data and presentation formatting.

---

## 2. Production Spatial Evidence Model (`DesignElement`)

`DesignElement` represents a user-annotated UI feature on the design canvas with concrete spatial and physical evidence.

### Core Conceptual Fields

| Field Category | Key Fields | Purpose & Interpretation |
| :--- | :--- | :--- |
| **Identity & Semantics** | `element_id`, `label`, `element_type`, `interaction_type` | Unique identifier, display name, semantic role (`button`, `text`, `icon`, `card`, `input`, etc.), and interaction modality (`primary_action`, `navigation`, `none`, etc.). |
| **Visual Bounding Box** | `image_pixel_bounds` ($x, y, w, h$) | Absolute pixel coordinates on the unscaled source image, with normalized $[0, 1]$ canvas mappings. |
| **Touch Boundaries** | `touch_bounds`, `touch_source_provenance` | Independent touch hot zone rectangle, decoupled from visual bounds to evaluate actual tap clearances. |
| **Typographic Measurement**| `character_height_px`, `character_height_physical_mm`, `text_layout`, `text_role` | Bounding box of a single representative glyph, rendered character height in millimeters, text layout classification (`single_line` vs `multi_line`), and typographic role. |
| **Color Evidence** | `foreground_color`, `background_color`, `contrast_evaluation` | Sampled HEX/RGB color values and calculated WCAG luminance contrast ratio. |
| **Physical Geometry** | `physical_geometry` (`width_mm`, `height_mm`, `calibration_quality`, `is_calibrated`) | Calibrated millimeter dimensions derived from screen diagonal, resolution, and screenshot scope. |
| **Platform Evaluations** | `target_size_evaluation`, `text_size_evaluation` | Quantitative results evaluating touch sizes (pt/dp/px) and font sizes against platform guidelines. |

---

## 3. Rule Evaluation & Trace Contracts

### `RuleComparisonTrace`
Represents the granular mathematical comparison between a measured element dimension and a specific rule reference:
- `rule_id`: Stable identifier for traceability (e.g., `L1-WCAG-SC-1.4.3`, `L2-APPLE-HIG-TARGET-SIZE`).
- `rule_layer`: Hierarchy layer (`L1_HARD_CONSTRAINT`, `L2_PLATFORM_GUIDELINE`, `L3_HUMAN_FACTORS`, `L4_DOMAIN_RULE`).
- `source_title`: Human-readable reference standard name (e.g., `Apple Human Interface Guidelines`).
- `metric_name`: Quantified property being evaluated (e.g., `touch_target_size`, `contrast_ratio`, `visual_angle`).
- `measured_value`: Numeric value extracted from spatial or color evidence.
- `threshold_value`: Benchmark or threshold from the governing standard.
- `verdict`: State of comparison (`meets_reference`, `below_recommended`, `below_threshold`, `needs_info`).
- `reasoning_type`: Epistemic basis (`rule_match`, `theory_inference`, `heuristic_risk`, `custom_rule`).

### `ElementActionableFinding`
Consolidates rule trace outcomes into actionable practitioner guidance:
- `findingId`: Unique finding identifier.
- `severity`: Risk classification (`critical`, `below_threshold`, `below_recommended`, `advisory`).
- `summaryText`: Single-sentence conclusion for summary tables and cards.
- `detailText`: Comprehensive explanation citing the underlying measurement and reference rationale.
- `recommendationText`: Actionable guidance for improving the interface.

---

## 4. Unified Presentation Model (`ElementPresentationModel`)

`ElementPresentationModel` is dynamically constructed by `buildElementPresentationModel` to feed the UI Card, Element Inspector Drawer, Report Preview, and HTML Report Generator:
- **Visual Dimensions**: Formatted pixel strings (`visualPxDisplay`), area share percentage, and min-side labels.
- **Logical Dimensions**: Formatted pt / dp / CSS px strings (`logicalDisplay`) with scale factor ratios.
- **Physical Geometry**: Formatted millimeter strings (`physicalDisplay`) with calibration provenance notices.
- **Visual Angle**: Formatted degree and arcminute strings (`visualAngleDisplay`, `visualAngleDetailDisplay`) with viewing distance context.
- **Typography & Character Height**: Formatted font size estimates, glyph height visual angles, and legibility status.
- **Touch Review**: Touch verdict badges, adjacent element clearance distances, and overlap conflict alerts.
- **Unified Conclusion**: Highest active evaluation tier badge (`highestTierLabel`), unified conclusion state, and consolidated findings.

---

## 5. Isolated Demonstration Model (Legacy `Annotation`)

The repository retains a legacy `Annotation` model used strictly by the optional demonstration toggle (`showDemoResults` / `analysisService.analyzeDesign`):
- **Demonstration Scope**: Displays hardcoded or simulated issue annotations on sample UI mockups.
- **Strict Isolation**: Legacy mock annotations are completely segregated from live user-created `DesignElement` objects.
- **Report Protection**: Report generation and export routines ignore demo annotations, ensuring exported artifacts reflect only verified, measured spatial evidence.
