# Calibra

**Domain-configurable synthetic data engine for financial crime datasets.**

Calibra generates statistically faithful synthetic tabular data with domain-aware constraint enforcement, rare-event prevalence control, and a full generation audit report. Version 1 targets fraud detection and AML transaction monitoring.

---

## What It Does

Two equal entry points — both produce the same output:

| Entry point | How it works |
|---|---|
| **Upload-first** | Upload a sample CSV. Calibra learns its statistical distributions and generates synthetic data at scale with domain constraints applied. |
| **Agent-first** | Describe what you need in natural language. The agent translates your intent into engine configuration and hands off to the same generation pipeline. |

**Output:** synthetic dataset (CSV or Parquet) + PDF audit report, packaged as a ZIP download.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│               Browser Web Application               │
│   Upload flow ──────────────── Agent flow (chat /   │
│   (CSV → profile → config)     wizard → config)     │
└───────────────────────┬─────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────┐
│                  Agent Layer                        │
│   Stateful LLM mediator — 6 tools, chat + wizard    │
└───────────────────────┬─────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────┐
│            Domain Configuration Layer               │
│   Constraint enforcement · Prevalence control       │
│   Financial crime domain packs (fraud / AML)        │
└───────────────────────┬─────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────┐
│            Core Statistical Engine                  │
│   Distribution fitting · Gaussian Copula sampling   │
│   Fidelity scoring · Audit report generation        │
└─────────────────────────────────────────────────────┘
```

### LLM Intelligence Layer (3 calls max per run)

| Call | Trigger | What it does |
|---|---|---|
| 1 — Annotate | Auto after upload | Column semantic annotation + domain pack suggestion |
| 2 — Parse constraint | User submits NL constraint | Natural language → formal constraint schema |
| 3 — Summarise | Auto after generation | Plain-English executive summary for audit report |

Every LLM output is a suggestion that requires user confirmation before reaching the engine. The LLM never generates data rows.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11+, FastAPI, SDV, scipy, numpy, pandas |
| LLM | Anthropic Claude (`claude-sonnet-4-20250514`) |
| PDF reports | ReportLab |
| Frontend | React (functional components), Tailwind CSS, Recharts |
| Auth | JWT (registered users) / anonymous sessions (< 10k rows) |

---

## Project Structure

```
calibra/
├── backend/
│   ├── main.py                      # FastAPI entry point
│   ├── constants.py                 # All constants — no magic numbers elsewhere
│   ├── routers/                     # generation, intelligence, preview, agent, auth
│   ├── engine/                      # profiler, sampler, validator, fidelity, previewer
│   ├── domain_packs/                # base, fraud, aml
│   ├── intelligence/                # LLM client + 3 call modules + versioned prompts
│   ├── agent/                       # agent loop, 6 tools, state, system prompt
│   ├── reporting/                   # PDF audit report (ReportLab)
│   ├── session/                     # In-memory session store
│   └── models/schemas.py            # All Pydantic schemas
├── frontend/
│   └── src/
│       ├── components/              # upload, intelligence, config, generation, agent, preview, results
│       ├── hooks/                   # useGeneration, useAnnotation, useConstraintParser, useAgent
│       └── utils/api.js             # All fetch calls (never call fetch directly in components)
├── tests/                           # pytest — all LLM calls mocked, ≥80% engine coverage
├── requirements.txt
├── TODO.md                          # Implementation checklist
└── CLAUDE.md                        # Authoritative architecture reference for AI agents
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 20+
- An Anthropic API key (set as `ANTHROPIC_API_KEY` environment variable)

### Backend

```bash
# Install dependencies
pip install -r requirements.txt

# Run the development server
uvicorn backend.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

### Running Tests

```bash
pytest tests/ --cov=backend --cov-report=term-missing
```

Minimum 80% line coverage is required on all engine modules.

---

## Domain Packs (v1)

### Fraud Detection

Constraints and prevalence profiles for card-present, card-not-present, account takeover, synthetic identity, and first-party fraud typologies. Configurable velocity caps, instrument-level amount bounds, and temporal burst patterns.

### AML Transaction Monitoring

Layering pattern generation (structuring, fan-out, fan-in, scatter-gather, circular flow) with entity network consistency. FATF typology alignment. SAR/STR ground truth labels on every generated transaction chain.

---

## Fidelity Scoring

Every generation run is scored against the source data:

| Component | Weight | Method |
|---|---|---|
| Column fidelity | 0.6 | Jensen-Shannon divergence per column, averaged |
| Correlation fidelity | 0.4 | Frobenius norm of correlation matrix difference |
| **Composite** | — | Weighted sum of the above |

**Minimum threshold: 0.75.** Runs below this surface a warning and require explicit user confirmation before download.

---

## Audit Report

Every download includes a PDF audit report containing:

- Run ID, timestamp, random seed, row counts
- Source data profile and fitted distributions
- Domain pack, constraints applied, and failure counts
- Prevalence targets vs actuals
- Fidelity scores with warning flag if below threshold
- LLM assistance log (which calls were made, which prompt versions, any fallbacks)
- Reproducibility instructions (replay any run by run ID)

The report is designed for model risk officers and compliance reviewers, not just data scientists.

---

## Reproducibility

Every generation run stores its full parameter set against a unique `run_id`. Any run can be replayed exactly by passing the `run_id` to `POST /replay`.

---

## Constraints

Constraints are defined declaratively and enforced row-by-row. Four rule types:

| Type | Example |
|---|---|
| `bound` | Transaction amount between £0.01 and £100,000 |
| `conditional` | If channel is ATM, amount must be a round number |
| `relational` | Settlement date must be after transaction date |
| `temporal` | Max 2 transactions above £10k per account per day |

Rows failing validation after 3 regeneration attempts are excluded and logged — never silently passed.

---

## Out of Scope (v1)

- Image, text, audio, or video generation
- Real-time or streaming data
- Built-in model training or evaluation
- Domain packs for credit risk, insurance, or healthcare
- Multi-party or federated generation
- On-premises deployment
- Public developer API

---

## Roadmap

| Version | Target | Scope |
|---|---|---|
| v1 | Q3 2026 | Financial crime domain pack, browser UI, audit report |
| v2 | Q1 2027 | Public REST API, credit risk domain pack |
| v3 | Q3 2027 | Enterprise tier, insurance + healthcare packs, community domain pack marketplace |

---

## Implementation Status

See [`TODO.md`](./TODO.md) for the full 63-task implementation checklist with current status.
