# 01 Public v0.1 Scope & Feature Matrix

**English** | [简体中文](./01_mvp_scope.zh-CN.md)

---

## 1. Scope Overview

This document defines the functional scope, input/output specifications, and capability boundaries for the **Public v0.1 Open Source Preview** of UX Evaluation Tool.

The primary objective of v0.1 is to deliver a robust, **local-first browser workspace** where practitioners can perform deterministic, spatial-evidence-based Human Factors and UX risk evaluations on user interface design images.

---

## 2. Implemented Evaluation Workflow

The v0.1 release implements an end-to-end evaluation lifecycle operating entirely in the browser:

```
[ Upload Design Image ]
        │
        ▼
[ Configure Display & Context ] ─── (Screen size, resolution, viewing distance, platform)
        │
        ▼
[ Interactive Spatial Annotation ] ─── (Draw bounding boxes on Canvas, adjust touch bounds)
        │
        ▼
[ Element Inspector & Measurement ] ─── (Sample colors, measure representative characters)
        │
        ▼
[ Deterministic Multi-Layer Evaluation ] ─── (Automatic rule matching, precision tiers)
        │
        ├──► [ In-App Report Preview ]
        ├──► [ Self-Contained HTML Report Export ]
        └──► [ Local Project Library / IndexedDB Auto-Save ]
```

---

## 3. In-Scope Input Specifications

| Input Category | Supported Values & Modalities | Purpose |
| :--- | :--- | :--- |
| **Design Image** | PNG, JPEG, WebP (drag-and-drop or local file selector) | Source image artifact for spatial evaluation |
| **Screen Hardware** | Standard diagonal presets (e.g., 6.1″, 6.7″, 11″, 13.3″, 15.6″, 27″) or custom diagonal + resolution presets (e.g., 2556×1179, 1920×1080, 4K) or custom resolution | Derives exact physical millimeter-per-pixel (`mm/px`) ratio across dual axes |
| **Viewing Distance** | Freeform text with unit parsing (e.g., `500 mm`, `50 cm`, `0.7 m`, `24 in`) | Basis for human factors subtended visual angle calculations ($\theta = 2 \arctan(h / 2D)$) |
| **Target Platform** | `iOS` (Apple pt), `Android` (Material dp/sp), `Web` (CSS px), `Custom` | Selects normative platform guideline rules |
| **Design Basis** | Exact device profile (e.g., iPhone 15 Pro, Pixel 8), custom reference width, or none (`unknown`) | Converts rendered image pixels to logical design coordinates |
| **Screenshot Mode** | `full_screen` (full UI capture) or `cropped` (`preserved_pixel_scale` / `unknown_or_resized`) | Adjusts coordinate scaling and area percentage interpretations |
| **Spatial Elements** | Rectangular visual bounding boxes drawn on Canvas | Defines region of interest for interactive and static UI elements |
| **Touch Boundaries** | Decoupled touch hot zone rectangle | Evaluates independent motor target size and adjacent tap spacing |
| **Character Measurement** | Bounding box of a single representative glyph | Unlocks precise character-level typographic visual angle metrics |
| **Color Sampling** | Canvas 2D color picker sampling foreground and background | Computes WCAG relative luminance contrast ratios |

---

## 4. Implemented Evaluation Capabilities

### 4.1 Visual Bounds & Screen Area Metrics
- Computes pixel dimensions ($W \times H$), bounding box area, and minimum side length.
- Calculates element area share relative to overall screenshot area or calibrated screen surface.

### 4.2 Physical Geometry & Hardware Calibration
- Derives physical width and height in millimeters ($mm$) with dual-axis aspect ratio consistency checking (2% tolerance).
- Flags uncalibrated state when screen resolution aspect ratio mismatches image dimensions.

### 4.3 Human Factors Visual Angle Calculations
- Calculates subtended vertical and horizontal visual angles in degrees ($^\circ$) and arcminutes ($'$).
- **Representative Character Visual Angle**: Evaluates character legibility against general human factors baselines ($\ge 16'$ basic, $\ge 20'$ recommended).
- **Graphical Detail Visual Angle**: Evaluates icon and glyph recognition against visual angle baselines ($\ge 16'$ basic, $\ge 22'$ recommended).

### 4.4 Platform & Physical Touch Target Ergonomics
- **Apple HIG Target Size**: Evaluates iOS interactive targets against $44 \times 44\text{ pt}$.
- **Android Material Target Size**: Evaluates Android interactive targets against $48 \times 48\text{ dp}$.
- **Web Target Size**: Evaluates Web interactive targets against WCAG 2.2 SC 2.5.8 ($24 \times 24\text{ CSS px}$).
- **General Handheld Physical Touch Reference**: Evaluates interactive targets against physical ergonomics reference ($\ge 9.0\text{ mm}$ direct touch target width/height).
- **Touch Spacing & Overlap Detection**: Identifies adjacent touch target clearances and flags overlapping tap hot zones.

### 4.5 Typographic Sizing & Legibility
- **Source-Confirmed Font Size**: Evaluates confirmed design font sizes directly against platform typography hierarchies.
- **Estimated Font Size (Heuristic)**: Computes estimated font size from single-line bounding boxes or character height measurements when logical scale is present.

### 4.6 Color Contrast & Accessibility
- Evaluates WCAG 2.2 SC 1.4.3 Text Contrast (4.5:1 for normal text, 3.0:1 for large text).
- Evaluates WCAG 2.2 SC 1.4.11 Non-text Contrast (3.0:1 for user interface components and graphical icons).
- Automatically assigns WCAG text size category (normal vs large) based on confirmed font size and weight.

### 4.7 Multi-Tier Precision Model
Evaluates each check at the highest available epistemic tier without global mode toggles:
1. **Screenshot Fact**: Pixel bounds, area share, sampled contrast.
2. **Hardware Assumed**: Calibrated physical millimeter dimensions.
3. **Design Mapped**: Logical pt / dp / CSS px platform rule checks.
4. **Source Confirmed**: Verified source typography or verified interactive touch bounds.

### 4.8 Persistence & Project Management
- **Local IndexedDB Repository**: Persists workspace snapshots, manual element annotations, display parameters, and image blobs.
- **Same-Image SHA-256 Deduplication**: Calculates client-side image hash to automatically associate re-uploaded images with existing workspaces.
- **Project Library**: Lists saved local projects with thumbnail previews and timestamps.

### 4.9 Reporting & Presentation
- **In-App Report Preview**: Modal previewing evaluation scope, active standards citations, and finding summaries.
- **Self-Contained HTML Report**: Exports zero-dependency standalone HTML files with embedded base64 canvas evidence screenshots.
- **Bilingual Interface**: Full English and Simplified Chinese runtime language switching.

---

## 5. Conditional & Architecture-Only Capabilities

### Conditional Capabilities
- **Platform Guideline Rules (L2)**: Require declared Design Basis (pt/dp/CSS px scale). When absent, system reports `needs_info` for platform rules while continuing physical and contrast evaluations normally.
- **Visual Angle Evaluation (L3)**: Requires valid viewing distance input and calibrated physical dimensions.
- **Physical Touch Target Evaluation**: Requires hardware display calibration parameters.

### Architecture-Only Capabilities
- **L5 Custom Rule Import**: Schema definitions exist in the data model, but custom rule creation/uploading UI is not in v0.1.
- **Specialized Automotive Evaluation Contexts**: The automotive domain provides domain-aware applicability but does not automatically imply a driver role, moving vehicle state, or time-critical task. Specialized automotive references require applicable structured context, and the current Public UI does not expose all cockpit role/state inputs.

### Isolated Demonstration Mode
- **Legacy Analysis Service (`showDemoResults`)**: An optional checkbox allowing users to view pre-packaged mock annotations. This path is completely isolated from real manually created `DesignElement` evidence.

---

## 6. Explicit Non-Goals for v0.1

1. **No Automated AI / CV Detection**: No computer-vision-based auto-detection of buttons or text boundaries.
2. **No OCR Text Recognition**: No automated font family, weight, or text string extraction.
3. **No Cloud Backend or Database**: Zero cloud servers, user accounts, or team collaboration syncing.
4. **No Figma Plugin Integration**: v0.1 operates strictly as a browser-based web application.
5. **No Regulatory / Statutory Certification**: Results are decision-support references only.
