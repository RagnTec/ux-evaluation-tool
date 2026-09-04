# 04 Rule Source Inventory & Evidence Classification

**English** | [简体中文](./04_rule_source_inventory.zh-CN.md)

---

## 1. Research Overview & Inventory Objectives

This document catalogs the normative standards, platform guidelines, ergonomics research models, and domain specifications audited for **UX Evaluation Tool**.

To prevent overclaiming and maintain epistemic rigor, each inventoried source is classified into an explicit operational tier:
1. **Runtime Reference**: Participates in current deterministic evaluation when its applicability conditions are satisfied.
2. **L4 Domain-Aware Support**: Domain-specific references and applicability logic exist, but activation is scope-dependent and requires compatible structured context. The current Public UI does not expose all cockpit role/state inputs needed by specialized automotive references.
3. **Research-Qualified Reference**: Has qualified evidence provenance and mechanism mapping. It does not automatically participate in runtime evaluation; runtime use additionally requires compatible measurement targets, scenario applicability, and an implemented evaluation path.
4. **Pending-Verification**: Academic leads or draft standards whose normative clauses remain pending independent verification.
5. **Architectural Extension**: Data contracts defined in the model, with user-facing authoring workflows planned for future releases.

---

## 2. Multi-Layer Source Inventory

```
┌────────────────────────────────────────────────────────────────────────┐
│ L5: Custom Rules (Architectural Extension Layer)                       │
├────────────────────────────────────────────────────────────────────────┤
│ L4: Domain Rules (Automotive HMI, Desktop/Web, Embedded Systems)       │
├────────────────────────────────────────────────────────────────────────┤
│ L3: Human Factors & Ergonomics Models (Visual Angles, 9 mm Touch)      │
├────────────────────────────────────────────────────────────────────────┤
│ L2: Platform Guidelines (Apple HIG, Android Material Design)           │
├────────────────────────────────────────────────────────────────────────┤
│ L1: Hard Constraints (WCAG 2.2 Level AA, Spatial Touch Overlap)        │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.1 L1 — Hard Constraints & Normative Standards

| Source Specification | Audited Clause / Topic | Operational Status | Claim Strength | Protected Mechanism |
| :--- | :--- | :--- | :--- | :--- |
| **WCAG 2.2 SC 1.4.3** | Text Contrast Minimum (4.5:1 normal, 3.0:1 large) | **Runtime Evaluated** | `strong` | `visual_discrimination` |
| **WCAG 2.2 SC 1.4.11** | Non-text Contrast (3.0:1 UI components & icons) | **Runtime Evaluated** | `strong` | `visual_discrimination` |
| **WCAG 2.2 SC 2.5.8** | Target Size Minimum (24 × 24 CSS px for web) | **Runtime Evaluated** | `strong` | `motor_target_acquisition` |
| **Spatial Geometric Check** | Hot zone overlap & click ambiguity detection | **Runtime Evaluated** | `strong` | `motor_error_prevention` |
| **EN 301 549 / Section 508** | Public sector digital accessibility alignment | Research Context | `moderate` | `accessibility_requirement` |

*Governance Boundary*: L1 hard constraints take absolute precedence. Lower-priority conventions or custom rules cannot silently suppress L1 accessibility findings.

---

### 2.2 L2 — Platform Guidelines & Interaction Conventions

| Source Specification | Audited Recommendation | Operational Status | Claim Strength | Protected Mechanism |
| :--- | :--- | :--- | :--- | :--- |
| **Apple HIG (Touch Targets)** | 44 × 44 pt default recommendation | **Runtime Evaluated** | `strong` (Platform) | `motor_target_acquisition` |
| **Apple HIG (Typography)** | 17 pt body text recommendation (11 pt minimum) | **Runtime Evaluated** | `strong` (Platform) | `visual_legibility` |
| **Android Material (Touch)** | 48 × 48 dp touch target recommendation | **Runtime Evaluated** | `strong` (Platform) | `motor_target_acquisition` |
| **Android Material (Type)** | 16 sp body text recommendation (12 sp minimum) | **Runtime Evaluated** | `strong` (Platform) | `visual_legibility` |
| **Microsoft Fluent** | Desktop pointer & touch adaptation guidelines | Research Context | `moderate` | `platform_convention` |

*Governance Boundary*: Platform guidelines represent vendor conventions. They require a confirmed Design Basis (pt / dp scale) to evaluate, producing `needs_info` when scale factors are undeclared.

---

### 2.3 L3 — Human Factors & Ergonomics Research Models

| Model / Source Reference | Evaluated Baseline | Operational Status | Claim Strength | Protected Mechanism |
| :--- | :--- | :--- | :--- | :--- |
| **Retinal Visual Acuity Models** | Character legibility visual angle (≥ 16′ basic, ≥ 20′ recommended) | **Runtime Evaluated** | `moderate` (Empirical) | `visual_legibility` |
| **Visual Icon Recognition** | Graphical detail visual angle (≥ 16′ basic, ≥ 22′ recommended) | **Runtime Evaluated** | `moderate` (Empirical) | `visual_recognition` |
| **Biomechanical Touch Ergonomics**| General handheld direct touch reference (≥ 9 mm width/height) | **Runtime Evaluated** | `moderate` (Biomechanical) | `motor_target_acquisition` |
| **W3C CSS Reference Pixel** | Visual angle definition of 1 CSS px (~1.28′ at arm's length) | **Runtime Evaluated** (Unit Context) | `moderate` (Descriptive) | `layout_density` |
| **Fitts's Law / Hick-Hyman Law** | Target acquisition time & choice reaction latency | Research Foundation | Informational | `motor_target_acquisition` |
| **ISO 9241 Ergonomics Framework** | General display ergonomics & visual clarity | Research Foundation | Informational | `visual_legibility` |

*Governance Boundary*: Human Factors models represent empirical ergonomics recommendations, not statutory legal mandates.

---

### 2.4 L4 — Domain-Specific & Contextual Rules

| Domain Source | Scope & Application | Operational Status | Claim Strength | Protected Mechanism |
| :--- | :--- | :--- | :--- | :--- |
| **In-Vehicle Display Geometry** | Center stack and digital cluster nominal viewing envelopes | **Domain-Aware Support** (Scope-Gated) | `moderate` | `visual_legibility` |
| **NHTSA DOT HS 812 360** | Driver interface design guidance (text & icon visual angles) | Research-Qualified | `moderate` (Guidance) | `visual_legibility` / `visual_recognition` |
| **ISO 15008:2017** | In-vehicle visual presentation scope and test procedures | Pending-Verification (Clauses) | Informational | `visual_legibility` |

*Governance Boundary*: Selecting the Automotive domain in v0.1 establishes display viewing geometry. It does not automatically imply a driver role, moving vehicle state, or time-critical distraction regulation, which require structured scenario inputs.

---

### 2.5 L5 — Custom Rule Layer (Architectural Extension)

- **Source Types**: User-defined enterprise design systems, brand guidelines, and project-specific acceptance criteria.
- **Operational Status**: **Architectural Extension Layer** (data structures defined in model; authoring and uploading UI not active in Public v0.1).
- **Governance Rule**: Custom rules may introduce stricter thresholds or project-specific checks, but cannot silently suppress or override L1 hard constraint findings.

---

## 3. Epistemic Output Classification

Every evaluation trace in the system is assigned a distinct reasoning type:
- **`rule_match`**: The finding directly maps to an audited standard clause or platform guideline.
- **`theory_inference`**: The finding is derived from a mathematical ergonomics or visual perception model.
- **`heuristic_risk`**: The finding is derived from heuristic estimation or layout density cues.
- **`custom_rule`**: The finding originates from a user-configured custom rule.

---

## 4. Summary of Evidence Governance Rules

1. **Platform Guidance ≠ Statutory Law**: Platform guidelines are ecosystem conventions, not statutory requirements.
2. **Ergonomics References ≠ Mandatory Minima**: Human Factors visual angles (≥ 16′/20′) provide empirical design guidance, not statutory certification.
3. **Touch Targets Are Non-Transferable**: Physical touch targets (≥ 9 mm) depend on biomechanical finger dimensions and must never be converted to optical visual angle arcminutes.
4. **Coverage Does Not Imply Pass**: A high evaluation coverage metric indicates that elements have been successfully audited against applicable rules; it does not indicate zero design risks.
