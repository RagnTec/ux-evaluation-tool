# 09 Rule Reference Policy & Evidence Governance

**English** | [简体中文](./09_rule_reference_policy.zh-CN.md)

---

## 1. Purpose & Governance Philosophy

The **Rule Reference Policy** governs how standard specifications, platform guidelines, and ergonomics research baselines are audited, classified, and cited across **UX Evaluation Tool**.

To maintain strict epistemic honesty, the tool enforces explicit distinctions between verified statutory standards, vendor design recommendations, empirical human factors models, and research candidates.

---

## 2. Reference Credibility & Status Tiers

Every reference integrated into the engine is assigned an explicit credibility status:

### 2.1 `verified_reference`
- **Definition**: The source text, scope, and numeric threshold have been directly audited against published standards documentation.
- **Permitted Claims**: Eligible for `strong` or `moderate` claim strength within its verified scope.
- **Citation Requirement**: Must include stable standard citation (e.g., `WCAG 2.2 SC 1.4.3`) and clear applicability boundaries.

### 2.2 `example_reference`
- **Definition**: A demonstration reference used in mock analysis or test fixtures (`analysisService.ts`).
- **Permitted Claims**: Displayed strictly as illustrative guidance; never presented as an audited production rule.

### 2.3 `pending_verification`
- **Definition**: A research candidate, draft guideline, or industry reference that has not undergone full source text verification.
- **Permitted Claims**: Restricted to `weak` or informational status; cannot assert authoritative compliance verdicts.

---

## 3. Claim Strength Framework

Claim strength communicates the epistemic certainty of an evaluation verdict:

| Claim Strength | Permitted Evidence Status | Typical Applications |
| :--- | :--- | :--- |
| **`strong`** | `verified_reference` only | Direct WCAG 2.2 contrast matches, platform target size baselines on confirmed design units. |
| **`moderate`** | `verified_reference`, empirical models | Mathematical visual angle models (θ = 2 arctan(h / 2D)), physical touch contact thresholds (≥ 9.0 mm). |
| **`weak`** | `pending_verification`, heuristics | Estimated typography font size from single-line bounds, layout density indicators. |

*Governance Rule*: If `evidenceStatus` is not `verified_reference`, `claimStrength` must **never** be marked as `strong`.

---

## 4. Rule Reference Inventory & Status Taxonomy (v0.1)

### 4.1 Runtime Evaluated References (L1–L3)

#### Normative Standards (L1 Hard Constraints)

1. **WCAG 2.2 SC 1.4.3 Contrast (Minimum)**
   - **Rule ID**: `L1-WCAG-SC-1.4.3` | **Layer**: `L1_HARD_CONSTRAINT` | **Status**: `verified_reference`
   - **Baseline**: 4.5:1 for normal text, 3.0:1 for large text (18 pt or 14 pt bold).
   - **Claim Strength**: `strong`

2. **WCAG 2.2 SC 1.4.11 Non-text Contrast**
   - **Rule ID**: `L1-WCAG-SC-1.4.11` | **Layer**: `L1_HARD_CONSTRAINT` | **Status**: `verified_reference`
   - **Baseline**: 3.0:1 for user interface components and graphical objects.
   - **Claim Strength**: `strong`

3. **WCAG 2.2 SC 2.5.8 Target Size (Minimum)**
   - **Rule ID**: `L1-WCAG-SC-2.5.8` | **Layer**: `L1_HARD_CONSTRAINT` | **Status**: `verified_reference`
   - **Baseline**: 24 × 24 CSS px for web interactive targets.
   - **Claim Strength**: `strong`
   - **Semantics**: Targets ≥ 24 × 24 CSS px meet the baseline size criterion. Targets < 24 CSS px require spacing checks or exception verification; size alone does not constitute a blanket failure.

#### Platform Guidelines (L2 Conventions)

4. **Apple Human Interface Guidelines (Target Size & Typography)**
   - **Rule ID**: `L2-APPLE-HIG-TARGET-SIZE` | **Layer**: `L2_PLATFORM_GUIDELINE` | **Status**: `verified_reference`
   - **Baseline**: 44 × 44 pt default recommendation; 17 pt body typography (11 pt minimum threshold).
   - **Claim Strength**: `strong` (Platform Guideline)

5. **Android Material / Accessibility Guidelines (Target Size & Typography)**
   - **Rule ID**: `L2-ANDROID-TARGET-SIZE-48DP` | **Layer**: `L2_PLATFORM_GUIDELINE` | **Status**: `verified_reference`
   - **Baseline**: 48 × 48 dp target size; 16 sp body typography (12 sp minimum threshold).
   - **Claim Strength**: `strong` (Platform Guideline)

#### Human Factors Research References (L3 Ergonomics)

6. **Representative Character Legibility Visual Angle**
   - **Layer**: `L3_HUMAN_FACTORS` | **Status**: `verified_reference`
   - **Baseline**: ≥ 16′ basic threshold, ≥ 20′ recommended threshold.
   - **Claim Strength**: `moderate` (Empirical Human Factors model)

7. **Graphical Detail Recognition Visual Angle**
   - **Layer**: `L3_HUMAN_FACTORS` | **Status**: `verified_reference`
   - **Baseline**: ≥ 16′ basic threshold, ≥ 22′ recommended threshold.
   - **Claim Strength**: `moderate` (Empirical Human Factors model)

8. **General Handheld Direct Touch Ergonomics**
   - **Layer**: `L3_HUMAN_FACTORS` | **Status**: `verified_reference`
   - **Baseline**: ≥ 9.0 mm direct touch contact width/height.
   - **Claim Strength**: `moderate` (Biomechanical finger contact model)

### 4.2 Research-Qualified & Domain-Adapted References (L4 Support)

9. **In-Vehicle Display Geometry (Automotive HMI)**
   - **Layer**: `L4_DOMAIN_RULE` | **Status**: `verified_reference`
   - **Scope**: Adjusts applicable viewing distance and geometry for center stack and cluster displays.
   - **Claim Strength**: `moderate`

### 4.3 Research & Pending-Verification Evidence

- **ISO 15008:2017 (In-Vehicle Visual Presentation)**: Scope and reference context are research-qualified; specific normative clauses not independently verified remain pending verification (`pending_verification`) and do not operate as universal production governing rules.

### 4.4 Architectural Extension Layer (L5 Custom Rules)

- **Custom Extension Layer (L5)**: Architectural data structures exist in the data model; custom rule authoring and runtime management are not exposed in the current Public v0.1 release.

---

## 5. Epistemic Guardrails & Conservatism Rules

To prevent overclaiming:
1. **Platform Guidance ≠ Statutory Law**: Apple HIG and Android Material guidelines are platform ecosystem conventions, not statutory legal requirements.
2. **Ergonomics Models ≠ Mandatory Minima**: Human Factors visual angles (≥ 16′/20′) represent empirical design references, not legal compliance mandates.
3. **Automotive Guidelines Require Context**: Selecting the automotive domain establishes in-vehicle display geometry, but does not imply driver distraction or moving-vehicle regulations (e.g., NHTSA guidelines), which require structured cockpit role and vehicle dynamics data.
4. **Coverage Does Not Imply Pass**: A high evaluation coverage metric confirms that elements have been evaluated against applicable rules; it never asserts an overall "pass" verdict.
5. **Decision Support Only**: All findings serve as decision-support references and do not constitute statutory or legal certification.
