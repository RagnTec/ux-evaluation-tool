# Contributing to UX Evaluation Tool

Thank you for your interest in contributing to the UX Evaluation Tool. We welcome contributions from UX researchers, Human Factors practitioners, accessibility specialists, and software engineers.

---

## Core Principles

All contributions should adhere to the foundational principles of this repository:

1. **Evidence-Linked & Traceable**: Every rule, recommendation, and finding must declare its source, rule layer, and reasoning type.
2. **Honesty Regarding Maturity (Mock vs. Real)**: Do not describe simulated measurements or mock evaluation outputs as automated computer vision or production AI.
3. **Respect Rule Hierarchies**: Distinguish between normative hard constraints (L1), platform guidelines (L2), human factors theory (L3), domain safety rules (L4), and custom team heuristics (L5).
4. **Standalone First**: The core evaluation workflow must remain functional as an independent, local-first tool without mandatory runtime dependencies on other repositories.
5. **Repository as Implementation Truth**: Source code, test builds, and documentation in this repository represent the canonical project state.

---

## Development Workflow

### Getting Started

1. **Fork and Clone**:
   ```bash
   git clone https://github.com/your-username/ux-evaluation-tool.git
   cd ux-evaluation-tool
   ```
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Local Development**:
   ```bash
   npm run dev
   ```
4. **Build & Type Check**:
   ```bash
   npm run build
   ```

> **Note**: Run `npm test` to verify contract integrity, and ensure that `npm run build` passes with zero TypeScript or bundling errors before opening a pull request.

### Pull Request Guidelines

* **Small, Reviewable Slices**: Submit focused PRs addressing a specific issue, model improvement, or rule definition.
* **Keep Documentation Synchronized**: When modifying data structures in `src/types/`, update corresponding specifications in `docs/`.
* **Clean Commits**: Write clear, descriptive commit messages. Avoid committing temporary files, secrets, or local environment configs.

---

## Rule & Evidence Contribution Guidelines

When adding or refining evaluation rules, metrics, or evidence mappings:

### Mandatory Fields
* **Source Name & Reference**: The formal name of the standard, guideline, or empirical publication (e.g., *WCAG 2.2 Success Criterion 2.5.8*, *Apple Human Interface Guidelines*, *Fitts's Law (1954)*).
* **Rule Layer**: Must be one of `L1_HARD_CONSTRAINT`, `L2_PLATFORM_GUIDELINE`, `L3_HUMAN_FACTORS`, `L4_DOMAIN_RULE`, or `L5_CUSTOM_RULE`.
* **Reasoning Type**: Must strictly be one of:
  * `rule_match` (normative standard or explicit platform specification)
  * `theory_inference` (deduced from human factors, motor control, or cognitive science)
  * `heuristic_risk` (practical usability inspection heuristic)
  * `custom_rule` (project-specific requirement)
* **Reference Status**: Must declare `verified_reference`, `example_reference`, or `pending_verification`.
* **Claim Strength**: Must declare `strong`, `moderate`, or `weak`.

### Prohibitions
* ❌ **Do not fabricate standard numbers or citations**.
* ❌ **Do not reproduce verbatim copyrighted text** from proprietary standards or paywalled papers (use concise summaries and citations).
* ❌ **Do not present theoretical inferences or heuristics as regulatory violations**.
* ❌ **Do not assign `strong` claim strength to unverified or example references**.
* ❌ **Custom rules must not silently suppress L1 hard constraints**.

---

## AI-Assisted Development

AI coding assistants are welcome to support contributors. Contributors remain responsible for adhering to repository development constraints, local-first workflows, and verifiable evidence standards. Proposed changes are evaluated solely on the quality, correctness, and evidence integrity of the code.
