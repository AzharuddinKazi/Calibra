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
- An Anthropic API key

### Environment Variables

| Variable | Where | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Backend | Required. Your Anthropic API key for LLM calls. |
| `VITE_API_URL` | Frontend | Backend base URL. Defaults to `http://localhost:8000` if not set. |

### 1 — Backend

```bash
# From the project root
pip install -r requirements.txt

# Set your API key
export ANTHROPIC_API_KEY=sk-ant-...

# Start the API server
uvicorn backend.main:app --reload --port 8000
```

The API is now available at `http://localhost:8000`. Health check: `GET /health`.

### 2 — Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start the development server (proxies /api → localhost:8000 automatically)
npm run dev
```

Open `http://localhost:5173` in your browser.

### Running Tests

**Backend (pytest):**
```bash
# From project root
pytest tests/ --cov=backend --cov-report=term-missing
```

**Frontend (Vitest):**
```bash
cd frontend
npm test
```

Minimum 80% line coverage is enforced on all engine modules. All LLM calls are mocked — tests never make live API calls.

---

## Deployment

### Frontend — Vercel

The frontend is a standard Vite/React app and deploys to Vercel in one step.

**Option A — Vercel CLI:**
```bash
cd frontend
npm i -g vercel
vercel --prod
```

When prompted:
- **Root directory:** `frontend`
- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Framework preset:** Vite

**Option B — GitHub integration:**

1. Push this repo to GitHub.
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your repo.
3. In **Configure Project**, set **Root Directory** to `frontend`.
4. Vercel auto-detects Vite. Leave build and output settings as-is.
5. Under **Environment Variables**, add:

| Name | Value |
|---|---|
| `VITE_API_URL` | Your deployed backend URL (e.g. `https://calibra-api.railway.app`) |

6. Click **Deploy**.

A `vercel.json` at the repo root handles client-side routing:

```json
{
  "rewrites": [{ "source": "/((?!api/).*)", "destination": "/index.html" }]
}
```

> **Note:** Create this file at `frontend/vercel.json` if deploying with the root directory set to `frontend/`.

---

### Backend — Railway (recommended)

The FastAPI backend requires a persistent server because it holds in-memory session state. Serverless platforms (Vercel Functions, AWS Lambda) are not suitable — sessions would not persist across cold starts.

**Deploy to Railway:**

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**.
2. Select this repository.
3. Railway auto-detects the Python app. Set the following in **Settings → Variables**:

| Name | Value |
|---|---|
| `ANTHROPIC_API_KEY` | `sk-ant-...` |

4. In **Settings → Deploy**, set the start command:
```
uvicorn backend.main:app --host 0.0.0.0 --port $PORT
```

5. Copy the generated Railway URL (e.g. `https://calibra-api.railway.app`) and paste it as `VITE_API_URL` in your Vercel frontend environment variables.

**Alternative platforms:** [Render](https://render.com), [Fly.io](https://fly.io), or any VPS running Docker.

**Dockerfile (optional, for any container platform):**
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./backend/
EXPOSE 8000
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

### Full-Stack Configuration Summary

| Component | Local | Production |
|---|---|---|
| Backend | `http://localhost:8000` | Railway / Render / Fly.io URL |
| Frontend | `http://localhost:5173` | Vercel deployment URL |
| `VITE_API_URL` | Not needed (proxy handles it) | Set to backend URL in Vercel env vars |
| `ANTHROPIC_API_KEY` | Exported in shell | Set in Railway / Render env vars |

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
