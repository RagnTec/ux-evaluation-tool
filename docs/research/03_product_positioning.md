# 03 Research & Product Positioning

**English** | [简体中文](./03_product_positioning.zh-CN.md)

---

## 1. Executive Summary & Research Positioning

**UX Evaluation Tool** is an open-source, local-first research and evaluation tool designed to assess user interface proposals at the **design-image and screenshot level**.

It provides product managers, interaction designers, UX researchers, and Human Factors specialists with a structured, browser-based environment to evaluate spatial and visual interface evidence against physical display geometry, platform guidelines, and ergonomics research baselines.

---

## 2. The Three-Way Market Gap: Why We Exist

Modern digital product teams face an evaluation dilemma during early design iterations, design reviews, and pre-implementation handoffs:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Existing Tooling Landscape                      │
├──────────────────────────┬─────────────────────────┬───────────────────┤
│ 1. Code-Centric Audits   │ 2. Usability Testing    │ 3. Heavy Ergonomics│
│ (Axe, Lighthouse, Wave)  │ (Maze, UserTesting)     │ (3D CAD, Lab Sims)│
├──────────────────────────┼─────────────────────────┼───────────────────┤
│ • Requires running DOM   │ • Evaluates late in dev │ • Heavy & complex │
│ • Blind to physical mm   │ • High cost & lead time │ • CAD models only │
│ • No static image review │ • Empirical behavior    │ • Disconnected    │
└──────────────────────────┴─────────────────────────┴───────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   UX Evaluation Tool (The Bridge)                      │
│  • Direct design-image spatial evaluation with zero code required      │
│  • Physical display geometry & dual-axis hardware calibration          │
│  • Multi-layer traceable rules (L1 Hard, L2 Platform, L3 Ergonomics)   │
│  • Local-first browser execution with complete data privacy            │
└────────────────────────────────────────────────────────────────────────┘
```

1. **Code-Centric Accessibility Checkers (Axe, Lighthouse)**: Require runtime HTML/DOM environments and cannot evaluate static mockups, automotive screen exports, or embedded touchscreens.
2. **Empirical Usability Testing Platforms (Maze, UserTesting)**: Require interactive prototypes or production code, discovering basic ergonomic or legibility flaws when changes are costly.
3. **Heavyweight Ergonomics & Optical Lab Platforms (RAMSIS, CATIA)**: Require complex 3D CAD environments and physical lab setups, making fast design-stage verification inaccessible for ordinary software teams.

UX Evaluation Tool bridges this gap by bringing **deterministic human factors calculations, platform design conventions, and spatial evidence annotations** directly onto design images in the browser.

---

## 3. Explicit Boundaries: What We Are Not

To maintain clarity of scope:
- **Not a Generic Generative AI UI Reviewer**: Does not rely on ungrounded large language model (LLM) visual intuition or opaque AI scoring. All evaluations are deterministic, rule-based, and traceable to formal standards.
- **Not Automated Computer Vision (CV) / OCR**: Does not guess element boundaries or screen densities automatically. Evaluation is anchored on user-verified spatial annotations and explicit hardware/design parameters.
- **Not a Pure WCAG-Only Checker**: Evaluates color contrast as part of a wider ergonomics framework, extending into physical touch geometry and visual angle legibility.
- **Not a Usability Testing Replacement**: Does not replace empirical user research, eye-tracking studies, or behavioral analytics.
- **Not a Legal Compliance Certification Tool**: Findings serve as **decision-support references** to identify design risks early; they do not constitute statutory or legal certification.
- **Not a Cloud SaaS Platform**: Runs 100% in the user's local browser with local IndexedDB storage (`ux_evaluation_workspace_db`) and zero external telemetry.

---

## 4. Target Users & Research Personas

- **UX & Product Designers**: Verifying touch target sizes, tap clearances, and legibility before design freeze or developer handoff.
- **Human Factors & Ergonomics Specialists**: Evaluating cockpit displays, industrial touchscreens, or medical device interfaces against visual angle and physical size criteria.
- **UX Researchers**: Gathering structured, quantitative spatial evidence during heuristic evaluations and expert reviews.
- **Product Managers**: Assessing early UI feasibility, cross-platform adaptation risks, and interface accessibility baselines.
- **HMI & Embedded Device Teams**: Designing interfaces for automotive center stacks, digital clusters, appliances, and IoT touchscreens.

---

## 5. First-Stage Scenario Domains

1. **Mobile & Handheld UI**: Direct touch ergonomics (evaluated against the general handheld direct-touch reference of ≥ 9 mm), platform-specific guidelines (Apple HIG 44 pt, Android Material 48 dp), and handheld viewing geometry.
2. **Automotive Center Display & Cockpit UI**: In-vehicle display geometry and viewing distance envelopes (without assuming driver distraction or moving-vehicle regulations unless structured context is present).
3. **Desktop & Web Interfaces**: Pointer and touch target sizes (WCAG 2.2 SC 2.5.8), monitor viewing geometry, and typography hierarchies.
4. **Appliance & Embedded Touchscreens**: Direct touch contact area and visual detail recognition on physical display hardware.

---

## 6. Core Product Differentiation

The fundamental differentiation lies in the integration of **Human Factors + UX Platform Guidelines + Explainable Rule Traceability**:
- **Multi-Layer Deterministic Rules**: Decomposing interface risks across hard accessibility constraints (L1), platform design conventions (L2), human factors models (L3), and domain-specific baselines (L4).
- **Capability-Driven Precision**: Dynamically assigning precision tiers (Screenshot Fact, Hardware Assumed, Design Mapped, Source Confirmed) based on available evidence rather than rigid global modes.
- **Epistemic Honesty**: Distinguishing confirmed standards matches (`rule_match`), ergonomics theoretical derivations (`theory_inference`), and heuristic risk indicators (`heuristic_risk`).
