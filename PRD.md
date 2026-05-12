# Calibra — Product Requirements Document

**Version:** 1.0
**Date:** May 2026
**Status:** Draft — Under Review
**Owner:** Azhar

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Product Vision](#2-product-vision)
3. [Target Users](#3-target-users)
4. [Product Scope — Four Layers](#4-product-scope--four-layers)
5. [LLM Intelligence Layer](#5-llm-intelligence-layer)
6. [Version 1 Domain Pack — Financial Crime](#6-version-1-domain-pack--financial-crime)
7. [Out of Scope — Version 1](#7-out-of-scope--version-1)
8. [Phased Roadmap](#8-phased-roadmap)
9. [Non-Functional Requirements](#9-non-functional-requirements)
10. [Success Metrics](#10-success-metrics)
11. [Open Questions](#11-open-questions)
12. [Appendix — Competitive Landscape](#appendix--competitive-landscape)

---

## 1. Problem Statement

Machine learning teams building fraud detection and AML models face a persistent data problem: real financial crime data is scarce, privacy-restricted, imbalanced, and incomplete in its ground truth labels. A transaction monitoring model might see a 0.1% fraud rate in production data — far too few positive cases to train a reliable classifier.

Existing tools address part of this problem but not all of it:

- **General synthetic data platforms** (SDV, MOSTLY AI, Gretel) learn statistical distributions well but know nothing about financial domain logic. They will generate transaction amounts that exceed account balances, sequences that violate card scheme rules, and fraud prevalence rates that mirror the source data's imbalance.
- **Academic AML simulators** (AMLSim, AMLWorld, Tide) understand the domain but are not configurable to a user's own data, not packaged for non-researchers, and produce fixed typology sets that may not match a given institution's fraud landscape.
- **No tool combines** statistical fidelity, domain-aware constraint enforcement, rare-event prevalence control, and an auditable generation log — all of which are required in a regulated financial institution.

> **The gap is not in statistical methods. It is in the domain intelligence layer and the auditability layer that sits on top of them.**

---

## 2. Product Vision

Calibra is a domain-configurable synthetic data engine with two equal entry points. Users can either upload a sample dataset — and the tool learns its statistical distributions — or describe what they want to generate in natural language, and the agent configures the engine on their behalf. Both paths produce the same output: statistically faithful synthetic data with a full generation audit report.

The product is domain-agnostic by architecture but ships with pre-built domain packs. Version 1 targets financial crime — fraud detection and AML. Subsequent versions expand to credit risk, insurance, and healthcare.

Calibra is free to use in the hosted version. A commercial API and enterprise tier will be introduced in a later phase.

> **One-line positioning:** The only synthetic data tool that understands your domain's rules, not just your data's distributions.

---

## 3. Target Users

| Segment | Profile | Primary Need |
|---|---|---|
| Data Scientists at Banks | ML practitioners building fraud or AML models. Comfortable with Python. Frustrated by data access bottlenecks. | Generate training data for minority-class fraud cases without waiting for data governance approvals. |
| SupTech Teams at Regulators | Analysts and data scientists at central banks and supervisory authorities building ML models to supervise financial institutions. | Generate synthetic regulatory submissions for model development without touching real LFI data. |
| Compliance & Risk Teams | Non-technical users at financial institutions who own model validation or stress testing. | Access a UI-driven tool that produces audit-ready synthetic data without requiring ML expertise. |
| Researchers & Academics | University and think-tank researchers studying financial crime typologies with limited access to real transaction data. | Reproduce realistic financial crime datasets for benchmarking models and publishing reproducible research. |

---

## 4. Product Scope — Four Layers

The product is designed in three layers, each independently useful and commercially viable.

### Layer 1 — Core Statistical Engine

The foundational generation engine. Handles distribution learning and sampling from any tabular dataset.

| Capability | Description |
|---|---|
| Distribution fitting | Learns marginal distributions per column — normal, lognormal, categorical frequency, datetime patterns. |
| Correlation preservation | Models inter-column correlations using Gaussian Copula. Ensures relationships between variables are preserved in synthetic output. |
| Temporal dependency | Models time-series patterns — inter-transaction intervals, velocity distributions, day-of-week and hour-of-day seasonality. |
| Scalable sampling | Once fitted, generates any requested volume in seconds. 10 rows or 10 million rows — same engine. |
| Fidelity metrics | Produces a statistical comparison report — column-by-column distribution match, correlation delta, and a composite fidelity score. |

### Layer 2 — Domain Configuration Layer

The differentiating layer. Sits on top of the engine and enforces domain-specific logic that pure statistical methods cannot capture.

| Feature | Description |
|---|---|
| Constraint schema | A declarative schema where users define business rules: value bounds, conditional logic, referential integrity, and temporal sequencing constraints. |
| Financial crime domain pack (v1) | Pre-built constraint templates for fraud detection and AML: card transaction rules, account velocity patterns, mule account structuring behaviour, and FATF typology prevalence profiles. |
| Prevalence control | Users specify exact fraud or AML alert prevalence rates and typology distributions. The engine generates minority-class records to match targets, not source data ratios. |
| Entity relationship modelling | Generates synthetically consistent multi-entity data — accounts, customers, transactions — with referentially valid linkages across tables. |
| Constraint validation | Every generated row is validated against the constraint schema before output. Violations are logged and regenerated, not silently passed. |
| Domain pack extensibility | Community can contribute domain packs for other verticals using the published schema format. |

### Layer 3 — Agent Layer

A stateful, tool-calling LLM that mediates between user intent and the generation engine. Users with no existing dataset describe what they want in natural language — the agent translates this into a valid engine configuration.

| Feature | Description |
|---|---|
| Dual entry point | Users choose between uploading a dataset or describing their needs to the agent. Both paths produce identical output. |
| Chat mode | Freeform conversation for technical users who know what they want. |
| Wizard mode | Structured step-by-step flow with appropriate input controls per step. Suited to non-technical users. |
| Live config panel | Sidebar updates in real time as the agent builds configuration — full visibility at all times. |
| Iterative refinement | After a preview, users can ask the agent to adjust — "increase fraud rate", "add a velocity constraint" — without starting over. |
| Confirm and generate | Agent presents a plain-English summary when configuration is complete. User confirms with one button. |
| Agent-first schema | When no CSV is uploaded, the agent defines the column schema from scratch based on the user's description. |

### Layer 4 — Browser-Based Web Application

The user-facing product. A browser-based interface with two equal entry points: an upload flow for users with existing data, and a conversational agent for users starting from scratch or iterating on results.

| Feature | Description |
|---|---|
| Dual entry points | Landing screen offers "Chat with Agent" (agent flow) and "Upload Dataset" (upload flow) as equal options. Both produce the same generation output. |
| CSV upload | User uploads a sample dataset (minimum 50 rows recommended). The application profiles the data, infers column types, and presents a configuration interface. |
| Calibra Agent — chat mode | Free-form conversational interface. Agent configures the engine through tool calls, surfaces results inline, and hands off to generation via a single confirm button. Suited to technical users. |
| Calibra Agent — wizard mode | Structured step-by-step flow driven by the agent. Each step renders as a plain-English question with an appropriate input control (dropdown, slider, multi-select). Suited to non-technical users. |
| Live config panel | Always-visible sidebar showing the current configuration state in plain English — updated after every agent turn. |
| Domain pack selection | User selects a domain pack (Financial Crime — Fraud, Financial Crime — AML) or proceeds without one for general tabular generation. |
| Constraint configuration UI | Dropdowns, sliders, and form fields to configure constraints, prevalence targets, and generation volume. No code required. |
| Generation audit report | Every download is accompanied by a PDF report: distributions fitted, constraints applied, prevalence set, fidelity scores, session origin (upload or agent), and a unique run ID. |
| Download | Output as CSV or Parquet. Generation report as PDF. Both packaged in a single ZIP download. |
| Usage limits (free tier) | Up to 100,000 rows per generation run. Up to 10 runs per day per registered user. No account required for runs under 10,000 rows. |

---

## 5. LLM Intelligence Layer

### Why This Exists

The hardest part of using Calibra is not the generation — it is the configuration. A compliance analyst uploading a CSV of fraud transactions may not know what constraints to define, what a realistic fraud prevalence rate looks like for their portfolio, or how to interpret a fidelity score. If they configure it wrong, they get low-fidelity output. If the interface is too technical, they give up.

The LLM layer bridges the gap between a user's intent and the engine's parameter requirements. It acts as a domain-aware configuration assistant — translating what users know (their context, their goals, their data) into what the engine needs (formal constraint schemas, prevalence targets, distribution annotations).

> **Boundary rule:** The LLM assists with configuration and summarisation only. It never touches the statistical engine, never generates data rows, and never makes decisions that are not shown to and approved by the user. Every LLM output is a suggestion — the user confirms before it is passed to the engine.

This boundary is what makes the audit trail defensible. The generation report can truthfully state: *"Constraints were described by the user in natural language, converted to formal schema by LLM, reviewed and approved by user, and enforced deterministically by the constraint engine."*

---

### Five LLM Touch Points

**Touch Point 1 — Schema Inference and Column Annotation**

After CSV upload, the statistical profiler infers column types. But it cannot infer meaning. A column called `amt` with float values could be a transaction amount, a fee, a balance, or a penalty — each requiring different constraint logic.

The LLM reads the column names, sample values, and statistical profile and produces a semantic annotation for each column. Example output:

> *"Column `amt`: Likely a transaction amount in a payment context based on name and value range (0.50–49,800). Suggested distribution: lognormal. Suggested constraint: bound between 0.01 and 100,000. If this is a card transaction dataset, consider applying card-present or card-not-present instrument bounds."*

The user sees these annotations as editable suggestions in the configuration UI — not locked defaults. One click to accept, free text to override.

**Touch Point 2 — Natural Language Constraint Definition**

Users can describe constraints in plain English. The LLM converts the description into a formal constraint object that the validation engine can enforce. Examples:

| User says | Engine receives |
|---|---|
| "Transactions above 10,000 should never appear more than twice per account per day" | `{"rule_type": "temporal", "column": "amount", "group_by": "account_id", "window": "1d", "condition": "amount > 10000", "max_occurrences": 2}` |
| "If the channel is ATM, the amount must always be a round number" | `{"rule_type": "conditional", "if": {"column": "channel", "equals": "ATM"}, "then": {"column": "amount", "rule": "modulo_100_equals_0"}}` |

The generated constraint schema is shown to the user in a readable format before being submitted to the engine. The user can edit, delete, or add constraints. Nothing is passed to the engine without explicit user confirmation.

**Touch Point 3 — Domain Pack and Typology Auto-Suggestion**

When a user uploads a dataset without selecting a domain pack, the LLM profiles the column names, value patterns, and any label columns present, and recommends the appropriate pack and typology configuration. Example:

> *"Your dataset appears to contain card transaction data with a binary fraud label column (`is_fraud`). We recommend the Fraud Detection pack. Based on your data profile — high card-not-present transaction volume, international merchant categories, and transaction velocity patterns — we suggest enabling the card-not-present fraud and account takeover typologies."*

The user selects from the suggested configuration or adjusts manually.

**Touch Point 4 — Prevalence Calibration via Benchmarks**

When a user needs to set a fraud or AML prevalence rate but has no institutional benchmark, the LLM provides a starting point drawn from embedded domain knowledge. Example:

> *"Card-not-present fraud rates in retail banking typically run between 0.08% and 0.30% of transaction volume. For account takeover, the range is typically 0.02% to 0.10%. Based on your data profile (e-commerce channel, mid-ticket transaction amounts), a combined fraud prevalence of 0.18% is a reasonable starting point. You can adjust this before generation."*

This is the LLM acting as domain expert to inform a configuration decision — not making the decision itself.

**Touch Point 5 — Audit Report Plain-English Summary**

The audit report contains statistical outputs that compliance and risk users cannot interpret without ML training. The LLM reads the generation parameters, fidelity scores, constraint results, and prevalence actuals, and writes a one-page plain-English executive summary prepended to the technical report. Example structure:

> *"This generation run produced 50,000 synthetic fraud transactions using the Fraud Detection domain pack. The dataset achieved a composite fidelity score of 0.84, which is above the minimum threshold of 0.75 and indicates strong statistical similarity to the source data. All 14 configured constraints were enforced with zero violations. The fraud prevalence in the output (0.19%) matches the requested target (0.20%) within acceptable tolerance. This dataset is suitable for use in model training pipelines subject to your institution's model risk governance process."*

This is the section a model risk officer or regulator reads. Making it human-readable increases the institutional credibility of the output and reduces the friction of getting synthetic data approved for use.

---

### Data Flow with LLM Layer

```
User uploads CSV
        ↓
Statistical profiler (column types, distributions)
        ↓
LLM: column annotation + domain pack suggestion     ← LLM call 1
        ↓
User reviews and confirms configuration
        ↓
LLM: natural language constraints → formal schema   ← LLM call 2 (if user writes NL constraints)
        ↓
User reviews and confirms constraint schema
        ↓
Core statistical engine (generation + validation)
        ↓
LLM: plain-English audit report summary             ← LLM call 3
        ↓
User downloads ZIP (data + full audit report)
```

The LLM is called a maximum of three times per generation run. Everything between calls 2 and 3 is fully deterministic.

---

### LLM Implementation Notes

- All LLM calls are made server-side. The frontend never calls the LLM directly.
- Prompts are versioned files stored in the codebase. The prompt version used in each run is logged in the audit report.
- Every LLM response is validated against a strict schema before use. If validation fails, the UI falls back to manual configuration — the LLM layer is an enhancement, not a dependency.
- No raw data rows from the uploaded CSV are sent to the LLM. Only column-level metadata is shared: names, inferred types, and statistical summaries.
- Each LLM call has a 10-second timeout. Calls 1 and 3 are non-blocking — the user can proceed without waiting. Call 2 is synchronous but the user has initiated it deliberately.
- Sessions (the shared state object holding the uploaded data profile, annotations, and active constraints) are held in memory only and expire after 2 hours. No source data is persisted to disk or database at any point.

---

## 6. Version 1 Domain Pack — Financial Crime

### 6.1 Fraud Detection Sub-Pack

- **Transaction amount constraints:** instrument-level bounds (card present vs card not present), merchant category plausibility, currency consistency.
- **Velocity constraints:** configurable transaction frequency caps per account per hour, day, and week.
- **Fraud typology prevalence:** user selects typology mix — card-not-present fraud, account takeover, synthetic identity, first-party fraud — and sets target prevalence per typology.
- **Temporal realism:** fraud events generated with realistic time-of-day and day-of-week distributions. Fraudulent velocity spikes generated within configurable burst windows.
- **Label completeness:** every generated row has a ground truth label. Unlike real data, there are no unlabelled positives.

### 6.2 AML Transaction Monitoring Sub-Pack

- **Layering pattern generation:** structuring, fan-out, fan-in, scatter-gather, and circular flow patterns configurable by user.
- **Entity network consistency:** mule accounts, shell entities, and beneficiary chains generated with referentially consistent linkages.
- **FATF typology alignment:** constraint templates aligned to FATF money laundering typologies. Users select which typologies to include.
- **SAR/STR ground truth:** every laundering transaction chain is labelled with the originating typology. Supports both model training and model evaluation use cases.
- **AML alert prevalence control:** user sets the target SAR rate and distribution across typologies independently of the source data's ratios.

---

## 7. Out of Scope — Version 1

- Image, text, audio, or video data generation. Calibra v1 is tabular data only.
- Real-time or streaming data generation. Output is batch files.
- Built-in model training. Calibra generates data; users take it to their own ML pipelines.
- Federated or multi-party generation across institutions.
- Domain packs for credit risk, insurance, or healthcare. These are roadmap items for v2 and v3.
- On-premises deployment. The hosted web app is cloud-only in v1.

---

## 8. Phased Roadmap

| Phase | Scope | Target |
|---|---|---|
| v1 — Core + Financial Crime | Statistical engine, financial crime domain pack, browser-based web app, generation audit report, CSV/Parquet download. | Q3 2026 |
| v2 — API + Credit Risk Pack | Public REST API for programmatic access. Credit risk domain pack (PD modelling, scorecard development data). Usage-based commercial API tier introduced. | Q1 2027 |
| v3 — Enterprise Tier + Multi-domain | Enterprise tier: self-hosted deployment, SSO, volume pricing, dedicated support. Domain packs for insurance and healthcare. Community domain pack marketplace. | Q3 2027 |

---

## 9. Non-Functional Requirements

| Requirement | Specification |
|---|---|
| Generation performance | 100,000 row generation run completes within 60 seconds on hosted infrastructure for a single-table dataset with up to 30 columns. |
| Data privacy | User-uploaded source data is processed in memory and not stored beyond the active session. No source data is retained on Calibra servers. |
| Auditability | Every generation run produces a unique run ID, a full parameter log, and a reproducibility seed. Users can reproduce any prior generation by replaying the run ID. |
| Constraint enforcement | Zero constraint violations in output. The engine regenerates any row that fails constraint validation rather than passing it silently. |
| Fidelity floor | Composite fidelity score must meet a minimum threshold of 0.75 before output is released. Runs below threshold surface a warning and require user confirmation. |
| Availability | Hosted web app targets 99.5% uptime. Generation jobs are queued and results delivered asynchronously for runs above 50,000 rows. |

---

## 10. Success Metrics

| Metric | Definition | Target (12 months post-launch) |
|---|---|---|
| Registered users | Users who have created an account and completed at least one generation run. | 2,000 |
| Generation runs per month | Total runs completed across all users. | 5,000 |
| Domain pack adoption | Percentage of runs using the financial crime domain pack vs general tabular. | 60%+ |
| Fidelity score (median) | Median composite fidelity score across all generation runs. | >0.80 |
| Return usage rate | Percentage of registered users who complete a second run within 30 days. | >40% |
| Institutional users | Organisations (banks, regulators, fintechs) with 3+ active users. | 20 |

---

## 11. Open Questions

- **Name finalisation:** Calibra is a working title. Domain name availability and trademark search required before public launch.
- **Fidelity threshold:** The 0.75 composite score floor is a starting hypothesis. Needs validation against real use cases before hardcoding.
- **Free tier limits:** The 100,000 row cap and 10 runs per day limits need stress testing against infrastructure cost at scale.
- **Regulatory positioning:** Should Calibra proactively seek endorsement from a financial regulator (FCA, CBUAE, MAS) as a validation signal?
- **Community domain pack governance:** If third parties contribute domain packs, what review and quality assurance process governs their inclusion?

---

## Appendix — Competitive Landscape

| Tool | Strengths | Gap vs Calibra |
|---|---|---|
| SDV (DataCebo) | Strong open-source tabular engine. Multi-table support. Good community. | No domain constraints. No prevalence control. No audit report. Requires Python expertise. |
| MOSTLY AI | Strong privacy guarantees. Reasonable UI. Enterprise-grade. | Black-box generation. Poor explainability. No financial crime domain pack. Expensive. |
| Gretel.ai | Developer-friendly API. Broad data type support. Good documentation. | Domain-agnostic. No constraint enforcement. Acquired by NVIDIA — strategic direction unclear. |
| AMLWorld / Tide | Financial crime domain knowledge. Realistic typology modelling. Academically rigorous. | Not configurable to user's own data. No UI. Researcher-only tooling. Not maintained as a product. |
| Calibra (this product) | Domain-aware generation with constraint enforcement. Prevalence control. Audit report. Free hosted UI. | v1 limited to financial crime. No API yet. No multi-table relational generation in v1. |
