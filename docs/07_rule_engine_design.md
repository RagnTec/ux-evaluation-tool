# 07 Rule Engine & Evaluation Architecture

**English** | [简体中文](./07_rule_engine_design.zh-CN.md)

---

## 1. Engine Philosophy & Deterministic Design

The evaluation engine of **UX Evaluation Tool** executes a **deterministic, multi-layer, evidence-driven rule pipeline**.

Unlike heuristic AI models or subjective design scoring algorithms, the engine operates on mathematical derivations and formal standards citations. Every finding originates from user-verified spatial coordinates, sampled color pixel data, or calibrated physical display parameters, producing an inspectable trace record (`RuleComparisonTrace`).

---

## 2. Multi-Layer Rule Architecture & Runtime Scope

```
┌───────────────────────────────────────────────────────────┐
│ L5: Custom Rules (Architecture-only extension layer)      │
├───────────────────────────────────────────────────────────┤
│ L4: Domain Rules (Automotive HMI, Desktop/Web, General)   │
├───────────────────────────────────────────────────────────┤
│ L3: Human Factors Models (Visual angles, 9mm touch, etc.) │
├───────────────────────────────────────────────────────────┤
│ L2: Platform Guidelines (Apple HIG, Android Material)     │
├───────────────────────────────────────────────────────────┤
│ L1: Hard Constraints (WCAG 2.2 Level AA, Touch overlap)   │
└───────────────────────────────────────────────────────────┘
```

### Layer Status in Public v0.1:
- **L1–L3**: Contain the currently exposed, fully operational evaluation paths.
- **L4**: Provides domain-aware applicability and domain-specific rule support with scope-dependent activation.
- **L5**: Remains an architectural extension layer (data structures defined, but authoring UI is not in public v0.1).

---

## 3. Critical Conceptual Distinctions & Boundaries

To ensure rigorous evaluation and avoid false positives, the engine enforces five strict conceptual boundaries:

### 3.1 Target Platform ≠ Design Basis
- **Target Platform** (e.g., `iOS`, `Android`, `Web`) declares the normative design ecosystem and governing platform rules.
- **Design Basis** (e.g., `iPhone 15 Pro (393 pt)`, `Pixel 8 (412 dp)`, custom reference width) provides the numeric scale factor to convert raw rendered pixels to logical units (`pt`, `dp`, `CSS px`).
- *Rule*: Selecting a platform without a confirmed design basis triggers a `needs_info` status for platform-specific rules (e.g., Apple 44 pt), while physical millimeter and contrast evaluations continue unaffected.

### 3.2 Scenario Domain ≠ Observer Role / Operation State
- Selecting the **Automotive Domain** (`automotive`) establishes that the UI resides within an in-vehicle display environment.
- It does **not** automatically imply that the observer is a driver, that the vehicle is in motion, or that the task is safety-critical.
- *Rule*: Specialized automotive driver-state rules require applicable structured context. In the current Public release, general in-vehicle viewing geometry applies, and cockpit role/state inputs are not yet exposed in the UI.

### 3.3 Touch Targets Are Non-Transferable to Visual Angles
- **Biomechanical Reality**: Physical touch interactions depend on direct finger contact and motor targeting accuracy (evaluated against the general handheld direct-touch reference of ≥ 9 mm).
- *Rule*: Touch target rules (e.g., general handheld direct-touch reference of ≥ 9 mm or platform 48 dp bounds) **must never** be converted into visual angle equivalents (arcminutes). Visual angles apply exclusively to optical legibility and visual detail recognition.

### 3.4 Measurement Target Compatibility
- Evaluating typographic legibility against character-height references requires measuring a **representative single glyph** (`character_height_px` / `character_cap_height`).
- *Rule*: If the spatial annotation covers a whole multi-line text container (`element_visual_bounds`), character visual angle rules are not applied as governing benchmarks, preventing container bounds from falsely inflating font legibility.

### 3.5 Registered References ≠ Universal Governing Mandates
- Human Factors models (e.g., ≥ 16′ basic, ≥ 20′ recommended visual angle) represent empirical ergonomics references, not legal statutes.
- Evaluated references are categorized into governing, recommended, optimal, secondary, adapted, conservative, or descriptive roles.

---

## 4. Evaluation Flow & Rule Trace Pipeline

```
[ Spatial & Color Evidence ] ──► [ Capability & Precision Resolver ]
                                              │
                                              ▼
[ Reference Envelope Resolver ] ◄── [ Hardware & Design Calibration ]
               │
               ▼
   [ Comparison Formulation ] ──► [ Verdict & Trace Aggregation ]
                                              │
                                              ▼
                                 [ ElementPresentationModel ]
```

### 4.1 Step 1: Evidence & Precision Tier Resolution
For each `DesignElement`, the engine establishes the highest available precision tier:
1. **Tier 1 (Screenshot Fact)**: Image pixel bounds, area ratios, sampled contrast.
2. **Tier 2 (Hardware Assumed)**: Physical dimensions in millimeters (mm) via calibrated display specs.
3. **Tier 3 (Design Mapped)**: Logical dimensions (`pt` / `dp` / `CSS px`) via design reference widths.
4. **Tier 4 (Source Confirmed)**: Source-confirmed typography or explicit interactive touch bounds.

### 4.2 Step 2: Reference Envelope Resolution (`resolveReferenceEnvelope`)
Candidate references are filtered against:
- **Measurement Target**: Verifying target feature compatibility (e.g., `character_height` vs `element_visual_bounds`).
- **Scenario Scope**: Checking observer role, operation state, and environment compatibility.
- **Reference Role Assignment**: Designating governing minima vs recommended or conservative baselines.

### 4.3 Step 3: Comparison Formulation (`ComparisonDetails`)
Comparisons are structured into typed mathematical payloads:
- `scalar_min`: Minimum threshold checks (e.g., Contrast ≥ 4.5:1, Physical touch ≥ 9.0 mm).
- `scalar_max`: Maximum threshold checks.
- `range`: Target range boundaries (e.g., optimal visual angle ranges).
- `multi_axis`: Dual-axis evaluations (width and height axes with identified limiting dimension).
- `conditional`: Multi-predicate evaluation structures.
- `needs_info`: Identifies missing inputs required to unlock evaluation.
- `measurement_only`: Reports quantitative measurements when no normative threshold applies.

### 4.4 Step 4: Trace Verdict Assignment (`TraceVerdict`)
Every rule check yields an explicit verdict:
- `meets`: Fully satisfies the recommended reference.
- `below_recommended`: Meets the basic threshold, but falls below recommended baseline.
- `attention`: Below the basic or minimum threshold; requires design review.
- `estimated_meets` / `estimated_below_recommended` / `estimated_attention`: Derived from heuristic or single-line typography estimations.
- `measurement_only`: Pure measurement record without compliance verdict.
- `needs_info`: Missing calibration or design basis inputs.
- `not_applicable`: Rule does not apply to this element type or platform.

---

## 5. Precedence & Conflict Boundaries

1. **L1 Takes Precedence**: Hard accessibility constraints (WCAG 2.2 AA) and physical geometry conflicts (touch overlap) take absolute precedence. Platform conventions (L2) or future custom rules (L5) cannot silently override L1 findings.
2. **Epistemic Labeling**: Traces explicitly carry their reasoning origin:
   - `rule_match`: Audited platform or accessibility standard.
   - `theory_inference`: Ergonomics mathematical derivation.
   - `heuristic_risk`: Heuristic or estimated layout indicator.
   - `domain_adapted`: Context-gated domain baseline.
3. **Orthogonal Non-Blocking**: A missing input for one layer (e.g., missing logical scale for L2) produces a clear `needs_info` trace for that check, without blocking physical (L3) or contrast (L1) evaluations.
