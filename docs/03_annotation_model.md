# 03 Annotation, Evidence, and Rule Explanation Model

## Purpose

This model defines the stable data contract for design-image annotations, evidence, and rule explanation. It supports the current mock analysis and leaves room for future rule engines or AI-assisted evaluation without changing the UI contract.

This document does not claim that the project has fully imported any external standard. Examples are example structures only.

## Annotation Interface

```ts
export interface Annotation {
  annotation_id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  issue_type: IssueType;
  severity: Severity;
  description: string;
  recommendation: string;
  rule_id: string;
  rule_layer: RuleLayer;
  reasoning_type: ReasoningType;
  evidence: Evidence[];
  evidence_level: EvidenceLevel;
  measurement: Measurement;
  source_priority: number;
  confidence: number;
  target_user_group: string[];
  applied_context: AppliedContext;
  contextual_findings: ContextualFinding[];
  status: AnnotationStatus;
  conflict_status: ConflictStatus;
  custom_rule_source?: string;
}
```

## Evidence Interface

```ts
export interface Evidence {
  evidence_id: string;
  source_name: string;
  source_type: string;
  rule_id: string;
  guideline_ref: string;
  summary: string;
  evidence_level: EvidenceLevel;
  reasoning_type: ReasoningType;
  reference_status: ReferenceStatus;
  claim_strength: ClaimStrength;
  priority: number;
  url?: string;
  note?: string;
}

export interface Measurement {
  metric_name: string;
  current_value: string | number;
  threshold_value: string | number;
  recommended_value?: string | number;
  unit?: string;
  delta?: string | number;
  interpretation: string;
}

export interface AppliedContext {
  device_type?: string;
  resolution?: string;
  viewing_distance?: string;
  usage_context?: string;
  target_user_groups?: string[];
  rule_sets?: string[];
  evaluation_dimensions?: string[];
  impact_summary: string;
}

export interface ContextualFinding {
  finding_id: string;
  context_type: "user_group" | "usage_context" | "rule_set" | "device_profile";
  context_label: string;
  suitability: "suitable" | "acceptable" | "risk" | "not_suitable" | "unknown";
  severity_adjustment?: "none" | "increase" | "decrease";
  reason: string;
  evidence_refs?: string[];
  recommendation?: string;
}
```

## Annotation Fields

| Field | Purpose |
| --- | --- |
| `annotation_id` | Stable annotation identifier. Equivalent to the user-facing `id` concept. |
| `x`, `y`, `width`, `height` | Normalized bounding box in the uploaded image coordinate space. Values are ratios from 0 to 1, not screen pixels or page viewport coordinates. |
| `issue_type` | Normalized issue category. |
| `severity` | Risk severity. |
| `description` | Human-readable issue explanation. |
| `recommendation` | Suggested improvement. |
| `rule_id` | Primary rule identifier used for traceability. |
| `rule_layer` | L1-L5 rule layer. |
| `reasoning_type` | Whether the issue is a rule match, theory inference, heuristic risk, or custom rule. |
| `evidence` | Structured evidence records that explain the source of the finding. |
| `evidence_level` | Primary evidence strength for the annotation. |
| `measurement` | Mock or computed quantified result used to explain the risk. |
| `source_priority` | Priority of the primary source. Lower number means higher priority. |
| `confidence` | Mock or computed confidence between 0 and 1. |
| `target_user_group` | User groups affected by the risk. |
| `applied_context` | Simulated explanation of which input parameters affected the finding. |
| `contextual_findings` | Simulated differentiated findings for user groups, usage contexts, rule sets, or device profiles. |
| `status` | Review lifecycle status. |
| `conflict_status` | Whether rule conflict exists. |
| `custom_rule_source` | Optional source label for L5 custom rules. |

## Evidence Fields

| Field | Purpose |
| --- | --- |
| `evidence_id` | Stable evidence identifier. |
| `source_name` | Human-readable source name, such as WCAG, Apple HIG, or a project rule set. |
| `source_type` | Source category, such as standard, platform guideline, theory, heuristic, domain rule, or custom rule. |
| `rule_id` | Rule identifier connected to the annotation. |
| `guideline_ref` | Guideline section, rule label, or internal reference. |
| `summary` | Short explanation of why the source matters. Do not quote standards unless the text has been verified. |
| `evidence_level` | Evidence level enum. |
| `reasoning_type` | Reasoning type enum. |
| `reference_status` | Whether the source is verified, example-only, or pending verification. |
| `claim_strength` | Claim strength: strong, moderate, or weak. Non-verified references must not use strong claims. |
| `priority` | Source priority for conflict handling. |
| `url` | Optional reference URL. |
| `note` | Optional implementation or reviewer note. |

## Measurement Fields

| Field | Purpose |
| --- | --- |
| `metric_name` | Name of the measured metric, such as contrast ratio or touch target size. |
| `current_value` | Current simulated or computed value. |
| `threshold_value` | Reference threshold used by the mock rule or future rule engine. |
| `recommended_value` | Suggested target value. |
| `unit` | Optional unit, such as pt, dp, items, or blocks. |
| `delta` | Difference between current value and threshold when useful. |
| `interpretation` | User-readable explanation of what the measurement means. |

Current values may be mock measurements. The UI must label them as simulated or mock measurements unless the project later implements real image parsing and calculation.

## Applied Context

`applied_context` explains how the current input parameters influence a mock finding. It may include device type, resolution, viewing distance, usage context, target user groups, selected rule sets, and evaluation dimensions.

The current MVP generates this as simulated explanation text. It is not a real rule-engine trace.

## Contextual Findings

`contextual_findings` prevents the UI from presenting one average conclusion for all users and contexts. Each finding states whether a design is suitable, acceptable, risky, not suitable, or unknown for a specific user group, usage context, rule set, or device profile.

These values are simulated in the MVP. They do not replace real usability testing, real human factors validation, or a rule-engine audit.

## Rule Reference Boundary

Evidence must declare `reference_status`:

- `verified_reference`: confirmed standard or platform rule summary.
- `example_reference`: mock or example reference for demonstration.
- `pending_verification`: not yet verified and must not support strong conclusions.

Evidence must declare `claim_strength`:

- `strong`
- `moderate`
- `weak`

If `reference_status` is not `verified_reference`, `claim_strength` must not be `strong`.

## Coordinate System

The current MVP uses a normalized image coordinate system:

- `x`: horizontal start position as a ratio of image width.
- `y`: vertical start position as a ratio of image height.
- `width`: annotation box width as a ratio of image width.
- `height`: annotation box height as a ratio of image height.

Example: `x = 0.1` means the annotation starts at 10% of the uploaded image width. This is not a screen coordinate and not a page viewport coordinate. Rendering should convert these values to percentages in the image container.

The displayed image should preserve its original aspect ratio. Annotation boxes are bound to the actual rendered image content area, not to the outer panel or viewport.

## Enums

### `issue_type`

- `touch_target`
- `spacing`
- `contrast`
- `readability`
- `information_hierarchy`
- `cognitive_load`
- `recognition`
- `custom_rule`

### `severity`

- `low`
- `medium`
- `high`
- `critical`

### `rule_layer`

- `L1_HARD_CONSTRAINT`
- `L2_PLATFORM_GUIDELINE`
- `L3_HUMAN_FACTORS`
- `L4_DOMAIN_RULE`
- `L5_CUSTOM_RULE`

### `reasoning_type`

- `rule_match`
- `theory_inference`
- `heuristic_risk`
- `custom_rule`

### `evidence_level`

- `standard`
- `platform_guideline`
- `theory`
- `heuristic`
- `custom`

### `status`

- `OPEN`
- `ACKNOWLEDGED`
- `FIXED`
- `VERIFIED`
- `CLOSED`

### `conflict_status`

- `none`
- `potential_conflict`
- `overridden`
- `blocked_by_higher_priority_rule`

## Example Structure

```json
{
  "annotation_id": "ann-example",
  "x": 0.1,
  "y": 0.2,
  "width": 0.4,
  "height": 0.08,
  "issue_type": "contrast",
  "severity": "high",
  "description": "示例：关键文本与背景的视觉区分不足。",
  "recommendation": "示例：提升前景与背景的对比，并保留足够的状态区分。",
  "rule_id": "L1-WCAG-CONTRAST-EXAMPLE",
  "rule_layer": "L1_HARD_CONSTRAINT",
  "reasoning_type": "rule_match",
  "evidence_level": "standard",
  "measurement": {
    "metric_name": "Contrast ratio",
    "current_value": "2.8:1",
    "threshold_value": "4.5:1",
    "recommended_value": ">=4.5:1",
    "interpretation": "示例：当前模拟对比度低于普通文本可读性建议阈值。"
  },
  "source_priority": 1,
  "confidence": 0.82,
  "target_user_group": ["低视力用户"],
  "status": "OPEN",
  "conflict_status": "none",
  "evidence": [
    {
      "evidence_id": "ev-example",
      "source_name": "WCAG 2.2",
      "source_type": "standard",
      "rule_id": "L1-WCAG-CONTRAST-EXAMPLE",
      "guideline_ref": "Contrast-related guideline reference",
      "summary": "示例结构：说明该来源用于支持颜色对比风险判断。",
      "evidence_level": "standard",
      "reasoning_type": "rule_match",
      "priority": 1
    }
  ]
}
```

## Current Boundary

The current implementation uses mock data. It does not calculate true contrast, parse real standards, perform real AI image recognition, or resolve real rule conflicts.
