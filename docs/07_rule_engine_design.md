# 07 Rule Engine Design

## Purpose

The first-stage product does not implement a full rule engine. This document defines the boundary and data model direction for the explainable rule layer so mock annotations and future rule outputs stay compatible.

## Core Principle

Every issue should explain:

- What risk was found.
- Where it appears on the design image.
- Which rule layer or source supports the finding.
- Whether the finding is a strict rule match, theory inference, heuristic risk, or custom rule.
- How conflicts between hard constraints and custom rules are handled.

## Rule Layers

- `L1_HARD_CONSTRAINT`: WCAG 2.2, EN 301 549, Section 508.
- `L2_PLATFORM_GUIDELINE`: Apple HIG, Material Design / Android Accessibility, Microsoft Fluent.
- `L3_HUMAN_FACTORS`: Fitts's Law, Hick-Hyman Law, Signal Detection Theory, Gestalt, Cognitive Load Theory, NASA-TLX, ISO 9241.
- `L4_DOMAIN_RULE`: Automotive HMI, ISO 15005, ISO 15007, appliance / IoT, public device, wearable rules.
- `L5_CUSTOM_RULE`: enterprise guidelines, brand rules, project acceptance criteria, market-specific rules.

## Annotation Fields

Future annotations should support:

- `issue_type`: normalized issue category.
- `severity`: low / medium / high / critical.
- `description`: human-readable issue explanation.
- `evidence_level`: strength of evidence behind the finding.
- `evidence`: structured evidence records.
- `source_priority`: priority of the primary rule source.
- `rule_id`: stable identifier for traceability.
- `rule_layer`: L1-L5 layer.
- `reasoning_type`: rule_match / theory_inference / heuristic_risk / custom_rule.
- `recommendation`: suggested action.
- `confidence`: 0-1 confidence value.
- `status`: OPEN / ACKNOWLEDGED / FIXED / VERIFIED / CLOSED.
- `custom_rule_source`: optional custom rule origin.
- `conflict_status`: whether this finding conflicts with another rule or custom rule.

## Evidence Fields

- `evidence_id`: stable evidence identifier.
- `source_name`: human-readable source name.
- `source_type`: standard / platform guideline / theory / heuristic / domain rule / custom rule.
- `rule_id`: traceable rule identifier.
- `guideline_ref`: guideline or internal rule reference.
- `summary`: short explanation of relevance.
- `evidence_level`: standard / platform_guideline / theory / heuristic / custom.
- `reasoning_type`: rule_match / theory_inference / heuristic_risk / custom_rule.
- `priority`: numeric source priority.
- `url`: optional reference URL.
- `note`: optional reviewer or implementation note.

## `reasoning_type`

- `rule_match`: the finding maps to an explicit rule or standard.
- `theory_inference`: the finding is inferred from human factors or cognitive theory.
- `heuristic_risk`: the finding comes from practical UX heuristics.
- `custom_rule`: the finding comes from a user-defined rule.

## `source_priority`

Recommended priority order:

1. L1 hard constraints.
2. L4 safety or domain-critical rules.
3. L2 platform rules.
4. L3 human factors theory and UX heuristics.
5. L5 custom rules.

Custom rules can be high priority for a project, but they cannot silently suppress L1 findings.

## `conflict_handling`

When two rules conflict:

- Preserve both findings if they represent different risk types.
- Mark the lower-priority finding as conflicted if it recommends a different action.
- Show the conflict status in the issue detail.
- Prefer L1 hard constraints when compliance and custom rules disagree.
- Prefer domain safety rules when scenario safety is involved.
- Use `blocked_by_higher_priority_rule` when a custom or lower-priority recommendation cannot be applied.
- Use `overridden` only when a higher-priority rule explicitly supersedes a lower-priority rule.

## `custom_rule_override_policy`

- Custom rules may add stricter thresholds.
- Custom rules may add brand, project, or market-specific requirements.
- Custom rules may downgrade internal priority for team workflow, but must not hide L1 hard constraint findings.
- Custom rules must expose `custom_rule_source`.
- Custom rules that conflict with L1 must produce a conflict status rather than silently replacing the L1 result.

## MVP Boundary

The MVP may return hard-coded mock annotations using this structure. It should not implement a complex parser, real AI recognition, database-backed rule library, or server-side rule management in this phase.
