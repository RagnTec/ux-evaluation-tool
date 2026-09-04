# 04 Technical Architecture & Local-First Design

**English** | [简体中文](./04_technical_architecture.zh-CN.md)

---

## 1. Architectural Principles

**UX Evaluation Tool** is built as a **pure frontend, local-first web application**.

Its architecture is governed by five foundational design principles:
1. **100% Client-Side Execution**: All image rendering, spatial annotations, color sampling, and human factors evaluations execute strictly inside the user's browser.
2. **Deterministic Computation**: Core calculations (trigonometric visual angles, dual-axis physical millimeter calibration, WCAG relative luminance contrast ratios) are pure, mathematical functions with zero external API dependencies.
3. **Local-First Privacy**: User screenshots, element coordinates, and project settings are stored locally in the browser's IndexedDB. No images or metadata are ever transmitted to cloud servers.
4. **Decoupled Epistemic Layers**: Spatial evidence collection, mathematical rule verification, presentation formatting, and project persistence are segregated into distinct architectural layers.
5. **Zero-Dependency Report Portability**: Generated HTML reports are self-contained artifacts embedding canvas screenshot evidence as base64 data URLs, viewable offline in any modern web browser.

---

## 2. Technology Stack

- **Core Framework**: React 18
- **Language**: TypeScript (strict compiler configuration)
- **Build Tool**: Vite
- **Canvas Rendering**: HTML5 Canvas 2D Context (for pixel-precise spatial rendering, handles, and color sampling)
- **Local Persistence**: Browser IndexedDB (`ux_evaluation_tool_db`)
- **Cryptographic Hashing**: Web Cryptography API (`crypto.subtle.digest("SHA-256", ...)`)
- **Internationalization**: Lightweight custom runtime i18n hook (`useI18n`) with typed language dictionaries (`en`, `zh-CN`)

---

## 3. Layered Architectural Model

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. UI & Interactive Canvas Layer                                       │
│    (Workspace, Canvas 2D Overlay, Inspector Drawer, Modal Dialogs)    │
├────────────────────────────────────────────────────────────────────────┤
│ 2. Calibration & Normalization Layer                                   │
│    (Display mm derivation, [0, 1] coordinate mapping, PPI math)        │
├────────────────────────────────────────────────────────────────────────┤
│ 3. Deterministic Evaluation Engine                                     │
│    (Rule Traces: Contrast, Touch Ergonomics, Visual Angle, Typography)│
├────────────────────────────────────────────────────────────────────────┤
│ 4. Presentation & Localization Layer                                   │
│    (buildElementPresentationModel, Multi-tier badges, i18n strings)    │
├────────────────────────────────────────────────────────────────────────┤
│ 5. Local Persistence & Repository Layer                                │
│    (IndexedDB Store, SHA-256 deduplication, Project Switcher)         │
├────────────────────────────────────────────────────────────────────────┤
│ 6. Self-Contained Report Export Layer                                  │
│    (HTML Generator, Base64 Canvas snapshot embedding, Download flow)   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Detailed Component Breakdown

### 4.1 UI & Interactive Canvas Layer (`src/App.tsx`, `src/components/`)
- **Canvas Overlay**: Renders normalized rectangular bounding boxes, interactive resize handles, decoupled touch zones, and measurement indicators over the source image.
- **Color Sampling**: Uses Canvas 2D pixel reading (`getImageData`) to extract foreground and background RGB values for contrast calculations.
- **Element Inspector Drawer**: Displays live, reactive breakdowns of visual dimensions, logical units, physical mm, visual angles, and actionable findings.

### 4.2 Calibration & Coordinate Normalization (`src/utils/logicalMapping.ts`, `src/utils/capabilityResolver.ts`)
- **Normalized Geometry**: Stores all spatial annotations as relative ratios $[0, 1]$ against the unscaled natural image width and height.
- **Dual-Axis Physical Calibration**: Derives horizontal and vertical millimeters per pixel (`mmPerPixelX`, `mmPerPixelY`) from diagonal size and resolution, enforcing a 2% aspect ratio tolerance check.
- **Logical Unit Mapping**: Maps pixel dimensions to logical design points (pt / dp / CSS px) using device profile presets or custom reference widths.

### 4.3 Deterministic Evaluation Engine (`src/humanFactors/`, `src/utils/`)
- **Human Factors Core (`src/humanFactors/`)**: Computes subtended visual angles ($\theta = 2 \arctan(h / 2D)$) and maintains the multi-reference envelope.
- **Color Contrast (`src/utils/contrastEvaluation.ts`)**: Pure implementation of WCAG 2.2 relative luminance formula ($L = 0.2126 R + 0.7152 G + 0.0722 B$).
- **Touch Ergonomics (`src/utils/interactionGeometry.ts`)**: Calculates adjacent element clearances and flags touch overlap conflicts.
- **Typography & Sizing (`src/utils/textSizeEvaluation.ts`)**: Evaluates platform typography thresholds and derives single-line / character-based font size estimates.
- **Rule Trace Aggregator (`src/utils/ruleTrace.ts`)**: Constructs typed `RuleComparisonTrace` records across exposed L1–L3 rule evaluation paths and domain-adapted L4 checks.

### 4.4 Presentation & Localization (`src/utils/elementPresentation.ts`, `src/i18n/`)
- **`buildElementPresentationModel`**: A pure transformation function mapping raw `DesignElement` state and evaluation context into formatted, human-readable strings.
- **Runtime i18n**: Dynamically supplies English and Simplified Chinese terminology without reloading the page.

### 4.5 Local Persistence & Repository (`src/types/project.ts`, `src/App.tsx`)
- **IndexedDB Database**: Automatically serializes `WorkspaceState` snapshots into object stores, preserving image blobs, calibration inputs, and annotation arrays across browser sessions.
- **SHA-256 Deduplication**: Calculates an image hash on upload to associate re-uploaded assets with existing project history.

### 4.6 Standalone Report Export (`src/utils/reportGenerator.ts`)
- **Self-Contained Artifacts**: Generates single-file HTML reports containing embedded base64 Canvas evidence snapshots, thumbnails, and interactive CSS styling with zero external script or CDN dependencies.

### 4.7 Isolated Demonstration Path (`src/services/analysisService.ts`)
- **Demo Mode**: Houses legacy mock annotations strictly for interactive exploration via the `showDemoResults` toggle. It operates outside the primary spatial evidence pipeline.

---

## 5. Privacy & Security Architecture

Because UX Evaluation Tool runs entirely in the browser:
- **Zero Outbound Data Transmission**: Screenshots, project names, and annotations never leave the client device.
- **No Third-Party Analytics / Tracking**: The application contains no tracking scripts, cookies, or remote analytics endpoints.
- **Offline Capable**: Once loaded (or deployed via static hosting such as GitHub Pages), the entire application functions without an active Internet connection.
