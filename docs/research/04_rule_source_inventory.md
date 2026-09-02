# 04 Rule Source Inventory

## Rule Layers

### L1 Hard Constraints

Sources:

- WCAG 2.2.
- EN 301 549.
- Section 508.

Meaning:

- L1 contains strong rules and compliance-oriented constraints.
- L1 findings should be labeled as normative rule matches when applicable.
- Custom rules must not silently override L1 hard constraints.

### L2 Platform Guidelines

Sources:

- Apple Human Interface Guidelines.
- Google Material Design / Android Accessibility.
- Microsoft Fluent.

Meaning:

- L2 contains platform adaptation rules.
- Findings should explain the relevant platform expectation and target device context.

### L3 Human Factors & Cognitive Models

Sources:

- Fitts's Law.
- Hick-Hyman Law.
- Signal Detection Theory.
- Gestalt principles.
- Cognitive Load Theory.
- NASA-TLX.
- ISO 9241.

Meaning:

- L3 contains theory-based inference or heuristic risk.
- Findings should avoid presenting theory inference as strict compliance failure.
- Outputs should describe the assumption, user group, and scenario behind the risk.

### L4 Domain Rules

Sources:

- Automotive HMI.
- ISO 15005.
- ISO 15007.
- Appliance / IoT rules.
- Public device rules.
- Wearable device rules.

Meaning:

- L4 contains industry and scenario rules.
- Findings should be tied to domain context such as vehicle, public terminal, appliance, wearable, or operation environment.

### L5 Custom Rules

Sources:

- User-uploaded enterprise guidelines.
- Brand design guidelines.
- Project-specific acceptance criteria.
- Country-specific or market-specific requirements.

Meaning:

- L5 contains user-defined rules.
- L5 can add stricter requirements or project-specific checks.
- L5 cannot silently weaken or override L1 hard constraints.

## Output Classification

Every finding should distinguish one of these reasoning types:

- `rule_match`: a normative or explicitly defined rule is matched.
- `theory_inference`: a human factors or cognitive model suggests risk.
- `heuristic_risk`: a practical UX heuristic indicates likely risk.
- `custom_rule`: a user-defined rule is matched.

## Conflict Policy

- L1 hard constraints have the highest protection level.
- L5 custom rules can refine, add, or make stricter requirements.
- L5 custom rules cannot silently suppress L1 findings.
- When rules conflict, the result should expose conflict status rather than hiding lower-priority evidence.
- Reports must distinguish normative rule matches from theoretical inference and heuristic risk.
