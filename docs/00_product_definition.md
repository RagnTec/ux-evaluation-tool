# 00 Product Definition

**English** | [简体中文](./00_product_definition.zh-CN.md)

---

## 1. Product Name & Summary

**UX Evaluation Tool** is an open-source, local-first, browser-based evaluation tool designed for Human Factors practitioners, UX researchers, product designers, and engineering teams.

It evaluates user interface and product screen proposals at the **design-image / screenshot level** against multi-layer human factors baselines, physical viewing geometry, platform guidelines, and accessibility standards.

---

## 2. Core Problem Solved

During early design reviews, design handoffs, and pre-implementation evaluations, teams face recurring challenges:
- **Visual-only reviews miss ergonomic realities**: A visual mockup looks balanced on a designer's monitor, but touch targets may be physically undersized on handheld devices or unreadable at nominal cockpit viewing distances.
- **Traditional usability testing happens late**: Formal lab or remote testing requires working prototypes or production code, discovering basic ergonomic or legibility flaws when changes are costly.
- **Generic accessibility tools focus only on DOM/code**: Existing web audit tools require live HTML/DOM elements and cannot evaluate static mockups, automotive screen exports, or embedded hardware UI images.
- **Specialized ergonomics platforms are heavy and disconnected**: Professional human factors tools require complex 3D CAD models or optical lab setups, making lightweight, everyday design-stage verification inaccessible to ordinary product teams.

UX Evaluation Tool bridges this gap by bringing **deterministic human factors calculations, platform design conventions, and spatial evidence annotations** directly onto design images in the browser.

---

## 3. Product Positioning

- **Design-Image Stage Evaluation**: Operates directly on uploaded UI mockups, screen exports, or interface screenshots without requiring live code, runtime frameworks, or Figma plugin dependencies.
- **Human Factors & UX Centric**: Bridges physical display hardware facts (screen diagonal, resolution, aspect ratio, viewing distance) with perceptual legibility, motor interaction accuracy, and cognitive scanning workload.
- **Deterministic & Traceable Rule Evaluation**: Generates transparent, verifiable rule traces across hard accessibility constraints (L1), platform design conventions (L2), and human factors models (L3), with domain-aware applicability support (L4).
- **Capability-Driven Precision**: Dynamically applies the highest possible evaluation tier based on available evidence rather than forcing rigid global modes.
- **Local-First & Privacy-Preserving**: Runs 100% in the user's browser; images, measurements, and project state remain in local browser memory and IndexedDB storage with zero cloud telemetry.

---

## 4. What We Are Not (Explicit Boundaries)

To avoid ambiguity in product scope and expectations:
- **Not a Generic Generative AI UI Reviewer**: Does not rely on ungrounded large language model (LLM) visual intuition or opaque AI opinions. Evaluation is deterministic, rule-based, and traceable to formal standards.
- **Not Automated Computer Vision (CV) / OCR**: Does not guess element boundaries or screen densities automatically. Evaluation is anchored on user-verified spatial bounding boxes and explicit hardware/design parameters.
- **Not a Pure WCAG-Only Checker**: Evaluates color contrast as part of a wider human factors framework, but extends beyond web accessibility into physical touch ergonomics and visual angle legibility.
- **Not a Usability Testing Platform**: Does not replace empirical user research, eye-tracking studies, or behavioral analytics platforms (e.g., Maze, UserTesting).
- **Not a Legal Compliance Certification Tool**: Findings and evidence reports serve as **decision-support references** to identify design risks early; they do not constitute statutory or legal certification.
- **Not a Cloud SaaS Platform**: Does not require user accounts, team collaboration servers, or cloud synchronization.

---

## 5. Target Users

- **UX & Product Designers**: Verifying touch target sizes, tap clearances, and legibility before design freeze or developer handoff.
- **Human Factors & Ergonomics Specialists**: Evaluating cockpit displays, industrial touchscreens, or medical device interfaces against visual angle and physical size criteria.
- **UX Researchers**: Gathering structured, quantitative spatial evidence during heuristic evaluations and expert reviews.
- **Product Managers**: Assessing early UI feasibility, cross-platform adaptation risks, and interface accessibility baselines.
- **HMI & Embedded Device Teams**: Designing interfaces for automotive center stacks, digital clusters, appliances, and IoT touchscreens.

---

## 6. Primary Inputs & Outputs

### Primary Inputs
1. **Design Image**: UI screenshot or mockup export (PNG, JPEG, WebP).
2. **Screen Hardware Context**: Physical screen diagonal and display resolution (used to derive exact millimeter-per-pixel calibration).
3. **Viewing Distance**: User-specified nominal viewing distance (e.g., `500 mm`, `50 cm`, `0.7 m`).
4. **Target Platform & Design Basis**: Declared target platform (`iOS`, `Android`, `Web`, `Custom`) and optional design reference width (pt / dp / CSS px scaling).
5. **Spatial Evidence Annotations**: User-defined element bounding boxes, optional decoupled touch bounds, representative character measurements, and sampled colors.

### Primary Outputs
1. **Spatial Evidence Overlay**: Interactive normalized canvas annotations with visual bounds, touch target hot zones, and measurement indicators.
2. **Structured Findings & Verdicts**: Per-element actionable findings categorized by severity, rule layer, and epistemic basis.
3. **Multi-Section Element Inspector**: Detailed breakdown of visual pixels, logical units, physical millimeters, visual angles, and color contrast ratios.
4. **Self-Contained Visual Evidence Report**: Zero-dependency standalone HTML report containing embedded canvas evidence screenshots, item cards, active reference citations, and evaluation coverage status.

---

## 7. Core Differentiation

| Dimension | UX Evaluation Tool | Generic AI UI Reviewers | Web Accessibility Checkers | Usability Testing Tools |
| :--- | :--- | :--- | :--- | :--- |
| **Input Basis** | Static design images + explicit physical context | Design image + freeform text prompt | Live HTML / DOM | Interactive prototypes + user sessions |
| **Evaluation Method** | Deterministic human factors math & multi-layer rule tracing | Opaque generative LLM visual heuristics | DOM property scanning & CSS contrast check | User task completion metrics & feedback |
| **Physical Geometry** | Full dual-axis mm calibration & arcminute visual angle | None (pixel-only intuition) | None (CSS pixels only) | Empirical observation |
| **Data Privacy** | 100% Local-first (IndexedDB, zero cloud sync) | Cloud upload to third-party AI APIs | Varies by vendor | Cloud recording & analytics |
| **Traceability** | Exact rule IDs, formulas, references, and evidence tiers | Subjective AI commentary | Standards SC citations | Qualitative user quotes & heatmaps |
