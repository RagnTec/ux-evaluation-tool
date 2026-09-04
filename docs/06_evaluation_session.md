# 06 Evaluation Session & Workspace Lifecycle

**English** | [简体中文](./06_evaluation_session.zh-CN.md)

---

## 1. Overview & Modern Architecture

In **UX Evaluation Tool**, the evaluation workflow is organized around a **reactive, persistent Workspace and Local Project lifecycle** rather than a single static, ephemeral log record.

While early prototypes structured evaluations as flat, one-off snapshot objects (`EvaluationSession`), the production system treats the workspace as a living state container. Users can incrementally annotate interface features, adjust display calibration parameters, update viewing distances, and immediately observe recomputed rule traces and presentation models.

---

## 2. Core Entities & State Model

```
┌────────────────────────────────────────────────────────────────────────┐
│ LocalProject (Project Identity & Repository Metadata)                  │
│ ├─ project_id, project_name, created_at, updated_at                    │
│ ├─ image_hash (SHA-256), image_name, image_width, image_height         │
│ └─ workspace: WorkspaceSerializedState                                 │
│     │                                                                  │
│     ├── Image Evidence (Raw Blob, natural pixel dimensions)            │
│     ├── Hardware Calibration (Diagonal in, resolution, aspect ratio)  │
│     ├── Evaluation Context (Viewing distance, platform, design basis) │
│     ├── Spatial Elements (Array of user-annotated DesignElement)      │
│     └── Workspace Preferences (Reviewer role, evaluation mode)         │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Project Identity (`LocalProject`, `ProjectSummary`)
- **`project_id`**: Unique client-side identifier (UUID) assigned upon project creation.
- **`project_name`**: User-defined name for organizational and reporting identification.
- **`image_hash`**: SHA-256 cryptographic digest of the source image binary, enabling automatic deduplication and project association.
- **`created_at` / `updated_at`**: ISO-8601 timestamps tracking local project modifications.

### 2.2 Workspace State (`WorkspaceState`, `WorkspaceSerializedState`)
The core operational state of an active evaluation session:
- **Image Evidence**: The raw binary image (`Blob`) and its natural pixel geometry (`image_width`, `image_height`).
- **Display Calibration State**: Screen diagonal size, native pixel resolution, calibration mode (`full_screen` vs `cropped`), and derived horizontal/vertical millimeter-per-pixel ratios (`mmPerPixelX`, `mmPerPixelY`).
- **Context & Design Basis**: Declared target platform (`iOS`, `Android`, `Web`, `Custom`), design reference scale (`pt`, `dp`, `CSS px`, or custom reference width), and nominal viewing distance.
- **Spatial Evidence Collection (`elements`)**: The active array of user-annotated `DesignElement` records, capturing visual bounding boxes, decoupled touch hot zones, representative glyph bounds, and sampled color pairs.
- **Session Preferences**: Active evaluation mode (`quick`, `guided`, `precise`) and reviewer perspective (`design`, `product`, `uxr`, `ops`).

---

## 3. Lifecycle Operations & State Transitions

### 3.1 Project Creation & Same-Image Matching
1. When a user selects or drags an image into the workspace, the client computes its **SHA-256 hash** using the Web Cryptography API (`crypto.subtle.digest`).
2. The application queries IndexedDB for existing projects matching the identical image hash:
   - If matching projects exist, the user can choose to resume a previous workspace or initialize a new project fork.
   - If no match exists, a new `LocalProject` is instantiated with default calibration and empty element collections.

### 3.2 Dynamic Recomputation vs. Stored State
- **Source Evidence is Persisted**: Only primary user inputs and spatial evidence (annotations, calibration parameters, color selections) are serialized to disk.
- **Rule Traces are Derived Dynamically**: Evaluated rule comparisons (`RuleComparisonTrace`), visual angle calculations (θ = 2 arctan(h / 2D)), and presentation models (`ElementPresentationModel`) are **recomputed reactively** from the active context and evidence.
- This ensures that updating a single parameter (such as modifying viewing distance from 400 mm to 600 mm) immediately updates all visual angle evaluations across all elements without requiring manual re-annotation or causing state staleness.

### 3.3 Autosave & IndexedDB Persistence
- State changes are debounced and automatically committed to the browser's local **IndexedDB** database (`ux_evaluation_workspace_db`) with workspace, project, and metadata stores.
- All image binaries and serialized workspace records are preserved across page refreshes, tab closures, and offline sessions.

### 3.4 Project Switching & State Restoration
- The **Project Library** displays saved local project summaries, element counts, thumbnails, and modification timestamps.
- Switching projects serializes the current workspace, unmounts active canvas overlays, and hydrates the newly selected project state into memory.

---

## 4. Clear Epistemic Boundaries & Non-Evaluation State

### 4.1 UI Locale is Not Evaluation Evidence
- **Language Preference (`locale`)**: The application supports dynamic switching between English (`en`) and Simplified Chinese (`zh-CN`).
- **Semantic Neutrality**: Locale selection is strictly a UI presentation preference. It does **not** alter numeric measurements, rule evaluations, physical thresholds, or spatial coordinates.

### 4.2 Demo Mode vs. Primary Spatial Evidence
- **Legacy Analysis Mock (`show_demo_results`)**: An optional toggle that renders pre-packaged mock annotations for feature exploration.
- **Complete Isolation**: Demo data operates on an isolated demo path (`analysisService.ts`) and is **never** mixed with or saved into real user-measured `DesignElement` spatial evidence.

### 4.3 Evaluation Scope vs. Compliance Guarantees
- A saved evaluation session captures a structured snapshot of evidence and rule comparisons at a given moment in the design lifecycle.
- It acts as a **decision-support artifact** for design reviews and engineering handoffs, not a formal statutory compliance certificate.
