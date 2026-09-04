# Human Factors Multi-Reference Evidence Qualification

**English** | [简体中文](./human_factors_evidence_qualification.zh-CN.md)

---

## 1. Executive Summary & Qualification Boundaries

Phase 3K.2A established the Rule Transferability Audit and verified that touch target rules (`motor_target_acquisition`) and contrast rules (`visual_discrimination`) are strictly `direct_only`.

This document (**Phase 3K.2B / 3K.2B.1**) qualifies external Human Factors evidence candidates for the **Multi-Reference Evaluation Architecture**.

### Key Governance Principles
- **No Universal Single Threshold**: Human Factors evaluation does not force a single synthetic average threshold. Instead, it presents an explainable **Reference Envelope** representing governing, recommended, optimal, secondary, and adapted design references.
- **Zero Production PASS/FAIL Thresholds Added in this Phase**: Qualified external records are architectural and research candidates. Research qualification does not automatically activate production PASS/FAIL rules or threshold scaling algorithms.
- **Governing Supremacy**: A secondary, external, or adapted reference can provide design context, but can **never** turn a failure of a directly applicable governing constraint into a pass.

---

## 2. Multi-Reference Evaluation Architecture

### 2.1 Independent Semantic Dimensions

| Dimension | Permitted Values | Purpose |
| :--- | :--- | :--- |
| **Rule Layer** | `L1_HARD_CONSTRAINT`, `L2_PLATFORM_GUIDELINE`, `L3_HUMAN_FACTORS`, `L4_DOMAIN_RULE`, `L5_CUSTOM_RULE` | Normative hierarchy of rules in the system |
| **Reasoning Type** | `rule_match`, `theory_inference`, `heuristic_risk`, `custom_rule` | Epistemic foundation of the evaluation finding |
| **Rule Transferability** | `direct_only`, `visual_angle_equivalent`, `non_transferable`, `unknown` | Cross-context and cross-distance adaptability |
| **Applicability Origin** | `direct_domain`, `direct_human_factors`, `context_adapted`, `external_reference`, `descriptive_measurement` | Relationship between reference source and current target domain |
| **Reference Role** | `governing_minimum`, `recommended_minimum`, `optimal_reference`, `secondary_reference`, `adapted_reference`, `conservative_reference`, `descriptive_only` | Operational role of the reference within the scenario envelope |
| **Scenario Criticality** | `safety_critical`, `task_critical`, `normal_interaction`, `non_critical`, `unknown` | Task consequence and interaction risk |
| **Measurement Target** | `element_visual_bounds`, `character_cap_height`, `character_x_height`, `character_height`, `primary_graphical_element`, `touch_bounds`, `unknown` | Concrete physical/visual feature being measured |

### 2.2 Reference Envelope Model

The **Reference Envelope** preserves evidence plurality around a measurable Human Factors dimension:

```
ReferenceEnvelope = { Governing, Recommended, Optimal, Secondary, Adapted, Conservative, Descriptive }
```

> [!NOTE]
> The Reference Envelope is **NOT** a statistical confidence interval, legal tolerance band, or automatic acceptable range. It is an explainable collection of qualified design references with distinct roles and applicability scopes.

---

## 3. External Evidence Qualification Inventory

### 3.1 NHTSA Human Factors Design Guidance (DOT HS 812 360, Dec 2016)
- **Official Source**: National Highway Traffic Safety Administration (NHTSA), *Human Factors Design Guidance for Driver-Vehicle Interfaces*, DOT HS 812 360 (December 2016).
- **Official Section**: *Selecting Character Height for Icons and Text*.
- **Document Nature**: Non-binding **Human Factors Design Guidance** (NOT a statutory Federal Motor Vehicle Safety Standard or mandatory regulation).
- **Target Scope**: In-vehicle electronic interfaces for passenger car drivers under moving vehicle conditions.
- **Viewing-Distance Context**: Document guidance indicates nominal viewing distances of D = 0.5–1.1 m for the equations in this section (treated as source calculation context, NOT a prefilled default in product inputs).
- **Evidence Records**:
  1. **Primary Graphical Elements / Icons**:
     - *Mechanism*: `visual_recognition`
     - *Measurement Target*: `primary_graphical_element` (core graphic symbol stroke, NOT generic outer touch container)
     - *Optimal Visual Angle*: **86 arcminutes** (`optimal_reference`)
     - *Time-Critical Minimum*: **41 arcminutes** (`recommended_minimum`)
     - *Non-Time-Critical Minimum*: **34 arcminutes** (`recommended_minimum`)
     - *Central-Viewing Limitation*: Document discussion notes assumptions regarding angular displacement from the normal central line of vision (central viewing assumption / off-axis limitation for future spatial adapters).
     - *Evidence Strength*: `verified`
  2. **Text / Character Height**:
     - *Mechanism*: `visual_legibility`
     - *Measurement Target*: `character_height` / `character_cap_height` (NOT whole container `element_visual_bounds`)
     - *Optimal Visual Angle*: **20 arcminutes** (`optimal_reference`)
     - *Time-Critical Minimum*: **16 arcminutes** (`recommended_minimum`)
     - *Non-Time-Critical Minimum*: **12 arcminutes** (`recommended_minimum`)
     - *Evidence Strength*: `verified`

### 3.2 ISO 15008:2017 (In-Vehicle Visual Presentation)
- **Official Source**: International Organization for Standardization, *ISO 15008:2017: Road vehicles — Ergonomic aspects of transport information and control systems — Specifications and test procedures for in-vehicle visual presentation*.
- **Current Edition Status**: **ISO 15008:2017** is the published, active standard. (Edition 4 revision **ISO/CD 15008** is under development at stage 30.99 CD and must NOT be treated as a published standard or imported into production evidence).
- **Verified Public Scope**:
  - Direct applicability: Passenger car driver seated in normal driving position.
  - Operation state: Vehicle in motion.
  - Display type: Dynamic / changeable visual displays.
  - Topics: Character legibility, visual angle, contrast, color perception, visual reflections.
- **Numeric Evidence Boundary**: When ISO requirements are cited secondarily in NHTSA discussion, the citation chain remains explicit. Complete normative clause tables remain `pending_verification` until independently verified from an authorized standard text.

### 3.3 W3C CSS Reference Pixel (Visual-Angle Calibration Unit)
- **Official Source**: W3C CSS Values and Units Module Level 3 / Level 4.
- **Definition**: The reference pixel is the visual angle of one pixel on a device with a pixel density of 96 DPI and a distance from the reader of an arm's length (28 inches / 71 cm, physical size ~0.26 mm), yielding a visual angle of approximately **0.0213 degrees** (~1.28 arcminutes).
- **Applicability Origin**: `direct_human_factors` (as a standard geometric unit of visual angle).
- **Role**: `descriptive_only` / calibration evidence.
- **Critical Boundary**: The visual-angle definition of CSS px provides coordinate conversion context, but does **NOT** make WCAG SC 2.5.8 (Target Size 24 × 24 CSS px) visual-angle transferable, because SC 2.5.8 addresses `motor_target_acquisition`.

### 3.4 Apple Human Interface Guidelines & Android Material Guidelines
- **Official Sources**: Apple Human Interface Guidelines (Typography & Touch Targets); Google Material Design (Type System & Touch Targets).
- **Nature**: First-party operating system design guidelines for handheld and desktop consumer devices.
- **Status in Multi-Reference Model**:
  - Primary Domain: Mobile & desktop consumer applications (`direct_domain`).
  - Cross-Domain Role: Eligible as `external_reference` and `secondary_reference` for non-critical, relaxed scenarios (e.g. rear-seat passenger entertainment or parked infotainment), but **never** governing for safety-critical driver interaction.
  - **Adapted Reference Boundary**: Before an explicit, qualified context-adaptation transformation model is applied, platform guidance remains `secondary_reference`. It must NOT be labeled as `adapted_reference`.

---

## 4. Multi-Reference Qualification Matrix

| Reference ID | Source Specification | Mechanism | Measurement Target | Default Role | Applicable Scopes | Evidence Strength | Verification State | Potential Envelope Role |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`REF-NHTSA-TEXT-OPTIMAL`** | NHTSA DOT HS 812 360 | `visual_legibility` | `character_height` | `optimal_reference` (20′) | Driver + Driving (All Tasks) | `verified` | Qualified Candidate | Optimal driver text legibility |
| **`REF-NHTSA-TEXT-CRITICAL`** | NHTSA DOT HS 812 360 | `visual_legibility` | `character_height` | `recommended_minimum` (16′) | Driver + Driving + Task Critical | `verified` | Qualified Candidate | Recommended minimum for time-critical driver text |
| **`REF-NHTSA-TEXT-NORMAL`** | NHTSA DOT HS 812 360 | `visual_legibility` | `character_height` | `recommended_minimum` (12′) | Driver + Driving + Non-Time-Critical | `verified` | Qualified Candidate | Recommended minimum for routine driver text |
| **`REF-NHTSA-ICON-OPTIMAL`** | NHTSA DOT HS 812 360 | `visual_recognition` | `primary_graphical_element` | `optimal_reference` (86′) | Driver + Driving (All Tasks) | `verified` | Qualified Candidate | Optimal driver visual icon recognition |
| **`REF-NHTSA-ICON-CRITICAL`** | NHTSA DOT HS 812 360 | `visual_recognition` | `primary_graphical_element` | `recommended_minimum` (41′) | Driver + Driving + Time Critical | `verified` | Qualified Candidate | Recommended minimum for time-critical icons |
| **`REF-NHTSA-ICON-NORMAL`** | NHTSA DOT HS 812 360 | `visual_recognition` | `primary_graphical_element` | `recommended_minimum` (34′) | Driver + Driving + Non-Time-Critical | `verified` | Qualified Candidate | Recommended minimum for routine icons |
| **`REF-ISO-15008-DRIVER`** | ISO 15008:2017 | `visual_legibility` | `character_height` | `governing_minimum` | Driver + Driving (Passenger Car) | `verified` (Scope) | Pending Verification (Normative Clauses) | Future governing standard for automotive |
| **`REF-W3C-CSS-REF-PX`** | W3C CSS Values & Units | `layout_density` | `element_visual_bounds` | `descriptive_only` (~1.28′ / px) | All Domains | `verified` | Qualified Unit Reference | Calibration context only |
| **`REF-APPLE-BODY-TEXT`** | Apple HIG Dynamic Type | `visual_legibility` | `character_height` | `secondary_reference` (17 pt nominal) | Mobile / Non-Critical Cross-Domain | `verified` (Source) | Qualified Platform Guidance | Secondary design comparison |
| **`REF-ANDROID-BODY-TEXT`** | Material Design | `visual_legibility` | `character_height` | `secondary_reference` (16 sp nominal) | Android / Non-Critical Cross-Domain | `verified` (Source) | Qualified Platform Guidance | Secondary design comparison |

---

## 5. Measurement Target Gating Principles

To prevent invalid evaluations, candidate references must pass strict **Measurement Target Gating**:

### 5.1 Typography Gating: Character Height vs. Element Visual Bounds
- A character-height Human Factors reference (e.g. NHTSA 16 arcminutes for time-critical text) requires `character_height`, `character_cap_height`, or `character_x_height`.
- If the current measurement only provides `element_visual_bounds` (the entire text container bounding box including line padding):
  - `measurement_matched = false`
  - `assigned_role = descriptive_only`
- The reference is retained in the envelope for informational context, but is **omitted from governing compliance evaluation**.

### 5.2 Icon Gating: Primary Graphical Element vs. Outer Container Bounds
- A symbol recognition visual-angle reference (e.g. NHTSA 41 arcminutes minimum) requires `primary_graphical_element`.
- If the annotation bounding box represents the entire icon touch container:
  - `measurement_matched = false`
- The system must not assume that the outer container box represents the perceptually meaningful symbol stroke.

---

## 6. Scenario-Based Precedence Policy

When resolving references in `resolveReferenceEnvelope()`:

1. **Direct Governing Precedence**: If a directly applicable governing reference exists and matches the measurement target, it establishes the primary compliance boundary.
2. **Out-of-Scope Demotion**: If an automotive driver-moving rule is evaluated in a non-driver or parked scenario (e.g., rear-seat entertainment), it is demoted to `conservative_reference` or `secondary_reference`. It does not trigger a false compliance failure.
3. **No Secondary Override**: If the governing requirement fails, a relaxed secondary or adapted reference cannot override or mask the governing failure.
4. **Evidence Plurality**: All matching recommended, optimal, and secondary references are categorized into distinct envelope slots without computing synthetic averages.
