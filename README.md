# UX Evaluation Tool

> **Design-Image Level Human Factors and UX Risk Evaluation Tool**

**English** | [Simplified Chinese](./README.zh-CN.md)

[![Status: v0.1 Open Source Preview](https://img.shields.io/badge/status-v0.1_Open_Source_Preview-blue.svg)](#current-status)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Architecture: Local First](https://img.shields.io/badge/architecture-Local_First-green.svg)](#privacy--security)

UX Evaluation Tool is an open-source, local-first web application designed for UX researchers, Human Factors practitioners, product designers, and engineering teams. It evaluates UI and product screen proposals at the design-image stage against multi-layer human factors, physical viewing and interaction measurements, platform guidelines, and accessibility standards.

---

## Current Status

**v0.1 Open Source Preview**

This repository is an early-stage, browser-based prototype intended for workflow and methodology exploration. It demonstrates how physical viewing context, physical display and interaction measurements, and multi-layer rule hierarchies can be integrated into design reviews before formal usability testing or software implementation.

---

## Positioning & Scope

### Core Positioning
* **Design-Image Level Evaluation**: Operates directly on uploaded design images and UI mockups without requiring live code or complex runtime environments.
* **Human Factors & UX Centric**: Bridges physical display parameters (dimensions, resolution, viewing distance) with visual perception, physical ergonomics, and interaction sizing.
* **Multi-Layer Explainable Rules**: Evaluates risks across hard constraints (L1), platform guidelines (L2), human factors models (L3), domain-specific rules (L4), and custom extension layers (L5).
* **Contextual Findings Presentation**: Explains rule applicability, reference baselines, and risk indicators based on structured domain, target platform, viewing distance, and available measurement evidence.
* **Spatial Evidence Annotation**: Maps findings directly to normalized image coordinates with traceable visual and numerical evidence.

### Supported Domains
* **Mobile Applications** (iOS / Android)
* **Desktop & Web**
* **Automotive HMI** (Digital instrument clusters, center console displays)
* **General / Unspecified** (Default domain fallback when no specialized domain gating applies, utilizing general human factors and physical measurement baselines)

---

## Boundaries & Non-Goals

* **Not a general AI UI generator**: Does not synthesize mockups or generate arbitrary copywriting.
* **Not solely a WCAG checker**: Accessibility is treated as an essential foundational layer (L1), but the tool covers broader human factors, motor control, and domain ergonomics.
* **Not a usability testing platform** (such as Maze or UserTesting).
* **Not an official regulatory compliance certification platform**: Results serve as **decision support and risk screening**, not legal judgments, industry compliance certificates, or official certification conclusions.
* **Not a substitute for professional Human Factors expert reviews or empirical user research**.

---

## First-Use Workflow

1. **Upload Screenshot**: Import the design image or UI screenshot to evaluate (supports full-screen or cropped screenshots with optional 1:1 reference scale).
2. **Configure Known Screen & Evaluation Context**: Set known hardware parameters (display diagonal, resolution, calibration mode) and evaluation context (domain, target platform, typical viewing distance).
3. **Optionally Provide Design Basis**: If design scale mapping (pt / dp / CSS px) is available, supply design width to unlock logical platform rules; **if unavailable, simply leave as unknown**.
4. **Annotate Elements**: Draw bounding boxes on the canvas for target elements (text, buttons, icons, inputs), refining visual bounds, touch bounds, or character height as needed.
5. **Review Findings, Evaluation Coverage, References & Measurements**: Inspect element-level risks, automatically matched active references, covered evaluation dimensions, pending items, and raw measurements in the Inspector or Report Preview.

---

## Configurable Inputs & Evaluation Context

In the current Public version, user-configurable inputs are streamlined into four structured categories:

1. **Screenshot Scope**: Full-screen or cropped screenshot (with optional 1:1 preserved pixel scale reference width).
2. **Screen Hardware**: Display diagonal size, resolution, and physical size estimation with optional letterbox / contain assumptions.
3. **Evaluation Context**:
   * **Domain**: Mobile, Desktop / Web, Automotive, or General / Unspecified.
   * **Target Platform**: Apple iOS, Google Android, Web standards, Custom unit, or Unknown.
   * **Typical Viewing Distance**: Supports mm, cm, m, inch.
4. **Design Basis (Optional)**:
   * **Status**: Unavailable / Unknown, Device-derived profile, or User-confirmed design width.
   * **Logical Mapping**: Scale ratio between design units (pt / dp / CSS px) and screenshot pixels.

### Independence of Target Platform and Design Basis
Target Platform is **strictly independent** of Design Basis:
* **Example**: `Domain = Mobile` + `Target Platform = Android` + `Design Basis = Unknown`.
  * The system clearly recognizes the Android platform identity.
  * Platform-specific logical checks (e.g. 48×48 dp touch targets) report `needs_info` with actionable missing requirements rather than failing or invalidating the element.
  * Contrast checks (WCAG 2.2), physical millimeter measurements, viewing distance visual angles, and qualified Human Factors fallbacks (e.g. 9 mm touch target reference, 20′ character visual angle) continue to operate normally.

### Structured Context Boundaries
* Selecting `Automotive` domain does **not** automatically assume a `Driver` role or `Driving` state.
* Free-text scenario keywords (such as "rapid" or "in-motion") do **not** automatically trigger `time-critical` constraints.
* Fine-grained Driver vs. Passenger roles and operational states are reserved for future structured scenario inputs.

---

## Automated Evaluation Coverage & References

The evaluation engine **automatically matches applicable rules** based on available evidence, target platform, domain, Design Basis status, and viewing distance. Users do not manually toggle rule families or dimensions.

### Actual Evaluation Coverage (Neutral Coverage Semantics)
The summary report clearly partitions evaluated dimensions:
* **Covered Dimensions**: Depicted with neutral bullet `●` (e.g., `● Color Contrast`, `● Representative Character Visual Angle`, `● Physical Touch Target`, `● Screenshot Font Size Estimate`).
  > **Note**: Coverage is a neutral indicator that valid evaluation or estimation took place; **coverage does not imply PASS**. Pass/fail/risk verdicts are strictly indicated on individual findings.
* **Pending Additional Info**: Depicted with neutral amber circle `○` (e.g., `○ Android Platform Touch Target`, `○ Android Design Font Size`), explaining what information is needed to unlock full platform rules. (Hidden if no pending items exist).

### Dynamic Active References
References displayed in the report are dynamically aggregated from rule traces that actively participated in evaluation:
* **Primary Active References**: Standards that performed completed rule comparisons (e.g., `WCAG 2.2`, `Apple HIG`, `Android Accessibility`, `General Human Factors References`).
* **Pending References**: Standards that yielded only `needs_info` are classified as unlockable references rather than active comparisons.

---

## Core Capabilities & Precision Model

### 4-Tier Precision Model
The system uses a capability-driven evaluation strategy ("supply what is known, and the system automatically applies the highest available precision tier"), eliminating rigid global mode toggles. Checks operate with mixed precision within the same workspace:

1. **Screenshot Fact**: Derived directly from pixel dimensions, relative position, screen share, and color sampling.
2. **Hardware Assumed**: Combines display diagonal and resolution to compute physical millimeter (`mm`) dimensions.
3. **Design Mapped**: Applies user-declared design scale mapping (pt / dp / CSS px) to evaluate platform guideline baselines.
4. **Source Confirmed**: Highest confidence tier utilizing verified source font sizes or confirmed interactive touch bounds.

### Capability Boundaries Without Design Basis
When design scale mappings (pt / dp / CSS px) are unavailable, elements **are not invalidated or downgraded entirely**:

* **Capabilities That Continue Operating Normally**:
  * **Contrast Evaluation**: WCAG 2.2 AA thresholds (4.5:1 normal text, 3.0:1 large text, 3.0:1 non-text).
  * **Physical Size Measurement**: Physical width, height, and area calculations in millimeters (`mm`).
  * **Viewing Distance & Visual Angle Evaluation**: Subtended arcminute visual angle calculations against human factors baselines.
  * **Human Factors Fallback References**:
    * Representative character vertical visual angle reference ($\ge 16'$ basic, $\ge 20'$ recommended).
    * Graphical detail vertical visual angle reference ($\ge 16'$ basic, $\ge 22'$ recommended).
    * Physical touch target size reference ($\ge 9.0\,\text{mm}$ where applicable).
    * *Domain-Specific Reference Note*: Specialized automotive references (such as NHTSA driver visual angles or 17.5 mm driving touch targets) exist in the rule architecture, but the current Public UI does not yet expose the structured role/state inputs required to activate them as directly applicable references.
  * **Estimated Font Size Evaluation**: Evaluates single-line text using visual height or character height estimates.
* **Capabilities Requiring Design Basis**:
  * Formal platform guideline checks that depend strictly on logical units (e.g., Apple HIG 44×44 pt, Android 48×48 dp).

> **Human Factors Reference Disclaimer**:
> Human factors references (such as 9 mm touch targets or 20′ character visual angle) represent **decision-support research references** grounded in ergonomics literature. They do not constitute formal Apple HIG / Google Material platform rules or mandatory regulatory minimums.

### Touch Bounds & Typography Boundaries
* **Touch Bounds**: Evaluated against physical dimensions (mm) or logical platform units for motor control error tolerance; **touch target rules are never scaled by viewing distance or visual angle**.
* **Typography Model**:
  * **Source Font Size**: Highest priority, confirmed by design source.
  * **Screenshot Font Size Estimate**: Derived from pixel or character measurements; clearly labeled as an estimate fallback.
  * **Character Height Measurement**: Extracted representative rendered character physical height and visual angle for legibility evaluation.

---

## Quick Start

### Prerequisites
* [Node.js](https://nodejs.org/) (version 18.0.0 or higher recommended)
* npm (bundled with Node.js)

### Installation & Local Run

```bash
# Clone the repository
git clone https://github.com/RagnTec/ux-evaluation-tool.git
cd ux-evaluation-tool

# Install dependencies
npm install

# Run automated contract tests
npm test

# Start local development server
npm run dev

# Build production bundle
npm run build
```

Once started, open `http://localhost:5173` in your browser to explore the local evaluation interface.

---

## Methodology & Rule Architecture

```
┌─────────────────────────────────────────────────────────┐
│ L1: Hard Constraints (Declared Normative Baselines)     │
├─────────────────────────────────────────────────────────┤
│ L2: Platform Guidelines (Apple HIG, Material Design)    │
├─────────────────────────────────────────────────────────┤
│ L3: Human Factors Models (Perceptual & Motor-Control)   │
├─────────────────────────────────────────────────────────┤
│ L4: Domain Rules (Automotive HMI & Domain Guidelines)   │
├─────────────────────────────────────────────────────────┤
│ L5: Custom Extension Layer (Architectural Extension)   │
└─────────────────────────────────────────────────────────┘
```
> *Note: The current Public UI focuses on L1–L4 evaluation workflows and does not expose custom-rule authoring (L5).*

### Evidence & Credibility Status
Evaluation findings explicitly declare evidence credibility:
* `verified_reference`: Formally verified standard or platform rule baseline.
* `example_reference`: Illustrative demonstration or research reference.
* `pending_verification`: Inferred finding requiring further source confirmation.

---

## Current Limitations

* **No Automated CV / OCR**: Uses manual bounding box annotation to prevent speculative computer vision misclassifications.
* **No screenshot-based density inference**: Logical-unit mapping is only established from user-confirmed design dimensions or an explicitly selected device profile with a supported mapping. The tool does not infer pt / dp / CSS-px scale from screenshot pixels alone.
* **Local Browser Storage**: Data is saved locally via IndexedDB with zero cloud synchronization; clearing site data resets the session.
* **No E2E Browser Automation**: Core algorithms, human factors math, and state flows are covered by unit tests (`npm test`), while UI presentation is verified via local interactive workflows.

---

## Documentation

Comprehensive design specifications and methodology references are available in the [`docs/`](docs/) directory:

* [`docs/00_product_definition.md`](docs/00_product_definition.md) — Product scope, core audience, and differentiation.
* [`docs/01_mvp_scope.md`](docs/01_mvp_scope.md) — Scope boundaries and acceptance criteria.
* [`docs/02_evaluation_framework.md`](docs/02_evaluation_framework.md) — Theoretical framework and parameter modeling.
* [`docs/03_annotation_model.md`](docs/03_annotation_model.md) — Annotation, evidence, and measurement schemas.
* [`docs/07_rule_engine_design.md`](docs/07_rule_engine_design.md) — Rule layering, conflict handling, and priority hierarchy.
* [`docs/08_explanation_layer_design.md`](docs/08_explanation_layer_design.md) — Explanation presentation and UI design.
* [`docs/09_rule_reference_policy.md`](docs/09_rule_reference_policy.md) — Reference credibility and claim strength policy.

---

## Privacy & Security

This application is built with a **Local-First** pure frontend architecture. All screenshots, annotations, physical parameters, and evaluation reports are processed and stored exclusively inside your local browser environment. **No design files or image data are uploaded to remote servers.**

For security guidelines, please see [SECURITY.md](SECURITY.md).

---

## Contributing

Contributions, methodology discussions, and rule suggestions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines and review expectations.

---

## License

Copyright 2026 RagnTec

Licensed under the **Apache License, Version 2.0** (the "License"). You may obtain a copy of the License in the [LICENSE](LICENSE) file.
