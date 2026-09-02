# 08 Explanation Layer Design

## Purpose

The explanation layer turns annotation, evidence, and rule metadata into a user-readable issue card. It should help users understand what the risk is, why it exists, where the evidence comes from, how strong the reasoning is, and what to change.

This layer is presentation-focused. It does not calculate rules, parse standards, run AI recognition, or resolve real conflicts.

## Per-Issue Explanation Structure

Each evaluation result should be presented in four levels:

1. Issue identity: issue number, issue type, severity, status, and corresponding image annotation number.
2. Explanation and action: description and recommendation.
3. Reasoning method: rule match, platform guideline, theory inference, heuristic risk, or custom rule.
4. Evidence and measurement: specific guideline reference, evidence summary, mock measurement, rule layer label, confidence, and optional custom/conflict notices.

## User-Visible Fields

- `issue_type`: normalized issue category, displayed as a readable label.
- `severity`: risk level.
- `description`: explanation of the detected risk.
- `recommendation`: suggested improvement.
- `reasoning_type`: how the conclusion was made.
- `evidence.summary`: short source explanation.
- `rule_layer`: L1-L5 source layer label.
- `confidence`: confidence value.
- `status`: lifecycle status.
- `measurement`: mock or computed quantified result.
- `evidence.guideline_ref`: specific rule or guideline reference.

## Folded or Internal Fields

- `rule_id`: traceability identifier, useful for debug or detailed reports.
- `source_priority`: conflict and source ordering.
- `evidence.evidence_id`: raw evidence identifier.
- `conflict_status`: detailed conflict state, shown only as a short human confirmation notice when not `none`.
- `custom_rule_source`: detailed custom source configuration, shown only as a short source label.

## `reasoning_type` Display

- `rule_match`: show as normative or guideline rule match, depending on `evidence_level`.
- `theory_inference`: show as theory inference and avoid compliance wording.
- `heuristic_risk`: show as heuristic risk and avoid strict rule wording.
- `custom_rule`: show as custom rule and include `custom_rule_source` when available.

## `rule_layer` Display

- `L1_HARD_CONSTRAINT`: show as L1 hard constraint.
- `L2_PLATFORM_GUIDELINE`: show as L2 platform guideline.
- `L3_HUMAN_FACTORS`: show as L3 human factors.
- `L4_DOMAIN_RULE`: show as L4 domain rule.
- `L5_CUSTOM_RULE`: show as L5 custom rule.

## `conflict_status` Display

- `none`: show no conflict notice.
- `potential_conflict`: show a short notice that the conclusion may require human confirmation.
- `overridden`: show a short notice that another rule has overridden this conclusion.
- `blocked_by_higher_priority_rule`: show a short notice that a higher-priority rule blocks this conclusion.

Detailed conflict mechanics should remain internal until the project has a real rule engine.

## `custom_rule_source` Display

If `custom_rule_source` exists, show:

`自定义规则：<source>`

Do not expose raw uploaded rule configuration in the main issue card.

## Annotation-to-Card Link

The image annotation and right-side issue card should share the same visible number, such as `#1`. The annotation frame color should match the issue card side bar color so users can quickly connect the spatial mark to the explanation.

The number shown on the image must match the number in the right-side issue card. This mapping is the primary relationship between visual location and explanation.

Clicking an image annotation should set the corresponding issue as active. Clicking an issue summary should activate the matching image annotation. Active items should have a visible highlighted style.

Hovering an image annotation should show a short browser tooltip with:

- Issue number.
- Issue type.
- Severity.
- Short description.

The tooltip should stay brief and avoid duplicating the left-side active detail:

- `#number`.
- Issue type.
- Severity.
- Current value / threshold.
- One-line recommendation.

For the current UI, the tooltip should prefer issue number, type, severity, and one short summary. It should not show full recommendations, full rule evidence, long explanations, or repeated quantitative detail.

## Result Layout

The right-side result panel should avoid expanding every finding at once. It should use:

1. Result overview: total issue count, high-risk count, active issue number.
2. Summary list: one compact row or card per issue.
3. Active detail: full explanation for the currently selected issue only.

The current selected issue detail should sit in the left panel below the run button. The right panel can remain focused on overview, summaries, and compact reference cues.

## Quantified Explanation

Each card should show a clearly labeled simulated measurement:

- Current value.
- Reference threshold.
- Recommended value.
- Unit when available.
- Interpretation.

The UI should use wording such as `模拟测量` so users do not mistake mock values for real automatic image recognition.

## Input Context Impact

The active detail should include an input context impact section that shows:

- Device type.
- Resolution.
- Viewing distance.
- Usage context.
- Target user groups.
- Simulated impact summary.

This section explains how selected inputs influence the mock result. It is not a real rule-engine trace.

## Contextual Findings Display

The active detail should show compact differentiated findings for:

- User groups.
- Usage contexts.
- Rule sets.
- Device profiles.

Each row should include context label, suitability, short reason, and optional recommendation. Wording must avoid absolute claims such as "all users are unsuitable"; instead it should identify where risk is higher or where evidence is still simulated.

## Overall Evaluation Summary

The center panel should include a "综合评估与建议" module below the image. It summarizes all mock annotations from user experience and human factors perspectives. It should include:

- Overall experience judgment.
- UX perspective.
- Human factors perspective.
- User group / usage context hints.
- Priority recommendations.

This module is a simulated summary generated from mock annotations and must not be presented as real AI analysis or real usability testing.

## Current UI Boundary

The current UI displays the explanation layer in a simple issue list. It does not provide advanced filtering, collapsible evidence panels, annotation editing, rule management, custom rule upload, or AI analysis.
