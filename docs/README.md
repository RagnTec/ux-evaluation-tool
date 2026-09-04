# Documentation Index

**English** | [简体中文](./README.zh-CN.md)

---

## 1. Documentation Overview

This index provides a structured guide to the public documentation for **UX Evaluation Tool**. It is organized to help users get started quickly, assist developers in understanding the architecture and rule engine, and guide researchers through our human factors evidence and rule transferability audits.

---

## 2. Core Product & Architecture

- [**00 Product Definition & Principles**](./00_product_definition.md): Product vision, problem statement, core positioning, and explicit operational boundaries.
- [**01 MVP Scope & Boundaries**](./01_mvp_scope.md): Functional scope for Public v0.1, supported evaluation paths, and feature boundaries.
- [**02 Evaluation Framework**](./02_evaluation_framework.md): Five-layer rule hierarchy (L1–L5), capability-driven precision tiers, and rule resolution flow.
- [**03 Annotation & Evidence Model**](./03_annotation_model.md): Manual spatial annotations, measurement evidence, and derived evaluation data.
- [**04 Technical Architecture**](./04_technical_architecture.md): Local-first browser architecture, module topology, and unidirectional data flow.

---

## 3. Evaluation & Rule System

- [**06 Evaluation Session Lifecycle**](./06_evaluation_session.md): Project and workspace lifecycle, local persistence, state restoration, and derived evaluation updates.
- [**07 Rule Engine Design**](./07_rule_engine_design.md): Deterministic evaluation pipeline, input requirements, and threshold calculation logic.
- [**08 Explanation Layer Design**](./08_explanation_layer_design.md): Epistemic reasoning types, evidence cards, human-readable rationale, and remediation suggestions.
- [**09 Rule Reference Policy**](./09_rule_reference_policy.md): Multi-reference governance, Reference Envelope model, priority resolution, and fallback hierarchy.

---

## 4. Research & Evidence

*(Note: The following documents contain research audits and theoretical evidence qualifications rather than runtime feature documentation.)*

- [**03 Research & Product Positioning**](./research/03_product_positioning.md): Product positioning and the gap between accessibility checkers, usability testing platforms, and heavyweight ergonomic tools.
- [**04 Rule Source Inventory**](./research/04_rule_source_inventory.md): Rule-source inventory, evidence status, and runtime / research classification.
- [**Human Factors Evidence Qualification**](./research/human_factors_evidence_qualification.md): Multi-reference Human Factors evidence qualification and measurement target gating.
- [**Rule Transferability Audit**](./research/rule_transferability_audit.md): Scientific audit of rule transferability across viewing distances and interaction modalities.

---

## 5. Language Convention

- Files ending in `.md` are the English canonical documentation.
- Files ending in `.zh-CN.md` are the matching Simplified Chinese counterparts.
- Each bilingual pair is maintained to remain semantically aligned.

---

## 6. Recommended Reading Paths

- **For Product & UX Readers**:
  [00 Product Definition](./00_product_definition.md) → [01 MVP Scope](./01_mvp_scope.md) → [02 Evaluation Framework](./02_evaluation_framework.md) → [08 Explanation Layer](./08_explanation_layer_design.md)
- **For Developers & Contributors**:
  [04 Technical Architecture](./04_technical_architecture.md) → [03 Annotation Model](./03_annotation_model.md) → [06 Evaluation Session](./06_evaluation_session.md) → [07 Rule Engine Design](./07_rule_engine_design.md) → [09 Rule Reference Policy](./09_rule_reference_policy.md)
- **For Human Factors & Research Readers**:
  [02 Evaluation Framework](./02_evaluation_framework.md) → [09 Rule Reference Policy](./09_rule_reference_policy.md) → [04 Rule Source Inventory](./research/04_rule_source_inventory.md) → [Human Factors Evidence Qualification](./research/human_factors_evidence_qualification.md) → [Rule Transferability Audit](./research/rule_transferability_audit.md)
