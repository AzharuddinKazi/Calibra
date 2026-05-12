# Calibra — Implementation TODO

Track implementation status for every module. Update status as work progresses.

Legend: `[ ]` pending · `[~]` in progress · `[x]` complete

---

## Phase 1 — Foundation

- [x] Project setup — requirements.txt, directory scaffolding, constants.py
- [x] backend/models/schemas.py — all Pydantic request/response schemas
- [x] backend/session/store.py — in-memory session store with asyncio.Lock and expiry sweeper

---

## Phase 2 — Core Statistical Engine

- [x] backend/engine/profiler.py — column type inference and distribution fitting
- [x] backend/engine/sampler.py — synthetic data sampling (upload-first and agent-first paths)
- [x] backend/engine/validator.py — constraint validation with 3-attempt regeneration loop
- [x] backend/engine/fidelity.py — JS divergence column fidelity + correlation fidelity composite score
- [x] backend/engine/previewer.py — histogram bins, KDE, correlation matrices for /preview

---

## Phase 3 — Domain Packs

- [x] backend/domain_packs/base.py — abstract BaseDomainPack interface
- [x] backend/domain_packs/fraud.py — financial crime fraud detection domain pack
- [x] backend/domain_packs/aml.py — AML transaction monitoring domain pack

---

## Phase 4 — Intelligence Layer

- [x] backend/intelligence/client.py — shared Anthropic LLM client (singleton, call_llm, load_prompt)
- [x] backend/intelligence/prompts/ — three versioned prompt files (annotate_columns_v1, parse_constraints_v1, summarise_report_v1)
- [x] backend/intelligence/annotator.py — LLM Call 1: column semantic annotation + domain pack suggestion
- [x] backend/intelligence/constraint_parser.py — LLM Call 2: natural language → formal constraint schema
- [x] backend/intelligence/report_summariser.py — LLM Call 3: plain-English audit report summary

---

## Phase 5 — Agent

- [x] backend/agent/state.py — AgentState and GenerationConfig Pydantic schemas
- [x] backend/agent/tools.py — six tool definitions + handlers (set_domain_pack, set_prevalence, add_constraint, define_schema, run_preview, mark_ready)
- [x] backend/agent/prompts/agent_system_v1.txt — agent system prompt
- [x] backend/agent/agent.py — core agent loop: tool-use, config context injection, message history cap + summarisation

---

## Phase 6 — Reporting

- [x] backend/reporting/audit_report.py — PDF audit report generation with all 12 required sections (ReportLab)

---

## Phase 7 — Routers + App

- [x] backend/routers/generation.py — /upload, /generate, /replay endpoints
- [x] backend/routers/intelligence.py — /intelligence/annotate and /intelligence/parse-constraint endpoints
- [x] backend/routers/preview.py — /preview/{run_id} endpoint
- [x] backend/routers/agent.py — /agent/session, /agent/message, /agent/state endpoints
- [x] backend/routers/auth.py — JWT auth endpoints
- [x] backend/main.py — FastAPI app entry point, lifespan session sweeper, router registration

---

## Phase 8 — Frontend

### Utilities & App Shell
- [x] frontend/src/utils/api.js — all fetch calls centralised (no fetch elsewhere)
- [x] frontend/src/App.jsx — top-level routing and layout

### Upload Flow
- [x] frontend/src/components/upload/Upload.jsx — CSV drop zone, file validation, upload trigger
- [x] frontend/src/components/upload/ColumnPreviewTable.jsx — raw column profile display post-upload

### Intelligence Components
- [x] frontend/src/components/intelligence/ColumnAnnotations.jsx — LLM suggestions per column with accept/edit/reject
- [x] frontend/src/components/intelligence/ConstraintInput.jsx — free-text NL constraint input triggering Call 2
- [x] frontend/src/components/intelligence/ConstraintReview.jsx — parsed constraint review with confirm/discard
- [x] frontend/src/components/intelligence/PrevalenceBenchmark.jsx — LLM-suggested prevalence range pre-filling slider

### Config Components
- [x] frontend/src/components/config/DomainConfig.jsx — domain pack selection + typology checkboxes
- [x] frontend/src/components/config/ConstraintList.jsx — active confirmed constraints with edit/delete
- [x] frontend/src/components/config/PrevalenceSlider.jsx — manual prevalence target input per class

### Generation
- [x] frontend/src/components/generation/GenerationPanel.jsx — row count input, generate button, async status polling

### Agent Components
- [x] frontend/src/components/agent/AgentEntryPoint.jsx — landing choice: chat vs upload
- [x] frontend/src/components/agent/AgentChat.jsx — message thread, config update badges, ConfirmGenerate pin
- [x] frontend/src/components/agent/AgentWizard.jsx — step-by-step wizard mode driven by agent state
- [x] frontend/src/components/agent/WizardStep.jsx — single wizard step with adaptive input controls
- [x] frontend/src/components/agent/ConfigSummaryPanel.jsx — live sidebar with amber indicators for unset fields
- [x] frontend/src/components/agent/InlinePreviewCard.jsx — compact in-chat preview after run_preview tool
- [x] frontend/src/components/agent/ConfirmGenerate.jsx — row count input + generate button

### Preview Components
- [x] frontend/src/components/preview/DataPreview.jsx — tab container fetching /preview/{run_id}
- [x] frontend/src/components/preview/FidelityScoreCard.jsx — composite, column, correlation scores with colour coding
- [x] frontend/src/components/preview/DistributionChart.jsx — real vs synthetic histogram + KDE overlay (Recharts)
- [x] frontend/src/components/preview/CorrelationHeatmap.jsx — real vs synthetic heatmaps side by side
- [x] frontend/src/components/preview/PrevalenceBar.jsx — target vs actual grouped bar chart
- [x] frontend/src/components/preview/SampleTable.jsx — first 50 rows scrollable table with fraud label badges

### Results
- [x] frontend/src/components/results/ResultsDownload.jsx — ZIP download, report link, run ID display

### Hooks
- [x] frontend/src/hooks/useGeneration.js — generation state, polling, run_id management
- [x] frontend/src/hooks/useAnnotation.js — LLM Call 1 state: loading, result, fallback flag
- [x] frontend/src/hooks/useConstraintParser.js — LLM Call 2 state: input, parsed result, confirm/discard
- [x] frontend/src/hooks/useAgent.js — agent session state, message history, tool result rendering

---

## Phase 9 — Tests

- [x] tests/test_profiler.py — profiler unit tests ≥80% coverage
- [x] tests/test_sampler.py — sampler unit tests ≥80% coverage
- [x] tests/test_validator.py — passing row + failing row per constraint type
- [x] tests/test_fidelity.py — fidelity tests against known dataset with expected score range
- [x] tests/test_previewer.py — histogram bins, KDE shape, correlation matrix symmetry
- [x] tests/test_domain_packs.py — constraint pass/fail tests for fraud and AML packs
- [x] tests/test_intelligence.py — all three LLM calls mocked; fallback degradation tests
- [x] tests/test_agent.py — tool handler logic mocked; no live API or engine calls

---

*Run tests with: `pytest tests/ --cov=backend --cov-report=term-missing`*
