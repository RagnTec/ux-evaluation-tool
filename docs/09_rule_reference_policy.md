# 09 Rule Reference Policy

## Purpose

The MVP may show rule evidence, but it does not fully import real standards or platform guidelines. This policy defines how the UI and mock data should communicate reference credibility.

## Reference Status

### `verified_reference`

A confirmed standard or platform rule summary. It may support a stronger conclusion, but the UI should still avoid copying long standard text.

### `example_reference`

A demonstration reference used for mock output. It does not represent complete rule ingestion and should be displayed as an example or mock reference.

### `pending_verification`

A source or rule that still needs review. It must not be used for strong conclusions.

## Claim Strength

- `strong`: allowed only for `verified_reference`.
- `moderate`: appropriate for example references, theory inference, platform summaries that still need precise audit, and custom rules.
- `weak`: appropriate for pending verification or low-confidence heuristic signals.

If `reference_status` is not `verified_reference`, `claim_strength` must not be `strong`.

## UI Rules

- `verified_reference` + `strong`: display as "命中规则风险".
- `example_reference`: display as "示例依据提示".
- `pending_verification`: display as "待核验依据，不作为强结论".
- `theory_inference`: display as "理论推断风险".
- `heuristic_risk`: display as "启发式风险提示".
- `custom_rule`: display as "自定义规则提示".

## Verified Standards Inventory (v0.1)

The following standards have been audited and verified for deterministic evaluation:

1. **WCAG 2.2 Success Criterion 1.4.3 Contrast (Minimum)**
   - Rule ID: `L1-WCAG-SC-1.4.3`
   - Level: AA
   - Thresholds: 4.5:1 for normal text, 3.0:1 for large text
   - Status: `verified_reference`
   - Claim Strength: `strong`

2. **WCAG 2.2 Success Criterion 1.4.11 Non-text Contrast**
   - Rule ID: `L1-WCAG-SC-1.4.11`
   - Level: AA
   - Threshold: 3.0:1 for user interface components and graphical objects
   - Status: `verified_reference`
   - Claim Strength: `strong`

3. **WCAG 2.2 Success Criterion 2.5.8 Target Size (Minimum)**
   - Rule ID: `L1-WCAG-SC-2.5.8`
   - Level: AA
   - Baseline: 24 × 24 CSS px
   - Status: `verified_reference`
   - Claim Strength: `strong`
   - Semantics: >= 24×24 CSS px indicates size baseline met ("达到 SC 2.5.8 的尺寸条件"). < 24 CSS px indicates further review needed for spacing or exceptions ("低于 24 CSS px 尺寸条件，需继续检查 spacing / exception 才能确定 SC 2.5.8 结果"). Never declare blanket WCAG compliance or failure from size alone.

4. **Android Accessibility Guidelines — Target size (48x48 dp)**
   - Rule ID: `L2-ANDROID-TARGET-SIZE-48DP`
   - Source: Google Android Developers Accessibility Guidance
   - Baseline: 48 × 48 dp
   - Status: `verified_reference`
   - Claim Strength: `strong` (Platform Guideline)

5. **Apple Human Interface Guidelines — Accessibility — Control Target Size**
   - Rule ID: `L2-APPLE-HIG-TARGET-SIZE`
   - Source: Apple Developer Documentation (HIG Accessibility)
   - Baseline: 44 × 44 pt default recommendation, 28 × 28 pt minimum control size
   - Status: `verified_reference`
   - Claim Strength: `strong` (Platform Guideline)
