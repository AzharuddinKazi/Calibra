# Calibra — Implementation TODO

Track implementation status for every module. Update status as work progresses.

Legend: `[ ]` pending · `[~]` in progress · `[x]` complete

---

## Phase 1 — Foundation

- [x] Project setup — requirements.txt, directory scaffolding, constants.py
- [ ] backend/models/schemas.py — all Pydantic request/response schemas
- [ ] backend/session/store.py — in-memory session store with asyncio.Lock and expiry sweeper

---

## Phase 2 — Core Statistical Engine

- [ ] backend/engine/profiler.py — column type inference and distribution fitting
- [ ] backend/engine/sampler.py — synthetic data sampling (upload-first and agent-first paths)
- [ ] backend/engine/validator.py — constraint validation with 3-attempt regeneration loop
- [ ] backend/engine/fidelity.py — JS divergence column fidelity + correlation fidelity composite score
- [ ] backend/engine/previewer.py — histogram bins, KDE, correlation matrices for /preview

---

## Phase 3 — Domain Packs

- [ ] backend/domain_packs/base.py — abstract BaseDomainPack interface
- [ ] backend/domain_packs/fraud.py — financial crime fraud detection domain pack
- [ ] backend/domain_packs/aml.py — AML transaction monitoring domain pack

---

## Phase 4 — Intelligence Layer

- [ ] backend/intelligence/client.py — shared Anthropic LLM client (singleton, call_llm, load_prompt)
- [ ] backend/intelligence/prompts/ — three versioned prompt files (annotate_columns_v1, parse_constraints_v1, summarise_report_v1)
- [ ] backend/intelligence/annotator.py — LLM Call 1: column semantic annotation + domain pack suggestion
- [ ] backend/intelligence/constraint_parser.py — LLM Call 2: natural language → formal constraint schema
- [ ] backend/intelligence/report_summariser.py — LLM Call 3: plain-English audit report summary

---

## Phase 5 — Agent

- [ ] backend/agent/state.py — AgentState and GenerationConfig Pydantic schemas
- [ ] backend/agent/tools.py — six tool definitions + handlers (set_domain_pack, set_prevalence, add_constraint, define_schema, run_preview, mark_ready)
- [ ] backend/agent/prompts/agent_system_v1.txt — agent system prompt
- [ ] backend/agent/agent.py — core agent loop: tool-use, config context injection, message history cap + summarisation

---

## Phase 6 — Reporting

- [ ] backend/reporting/audit_report.py — PDF audit report generation with all 12 required sections (ReportLab)

---

## Phase 7 — Routers + App

- [ ] backend/routers/generation.py — /upload, /generate, /replay endpoints
- [ ] backend/routers/intelligence.py — /intelligence/annotate and /intelligence/parse-constraint endpoints
- [ ] backend/routers/preview.py — /preview/{run_id} endpoint
- [ ] backend/routers/agent.py — /agent/session, /agent/message, /agent/state endpoints
- [ ] backend/routers/auth.py — JWT auth endpoints
- [ ] backend/main.py — FastAPI app entry point, lifespan session sweeper, router registration

---

## Phase 8 — Frontend

### Utilities & App Shell
- [ ] frontend/src/utils/api.js — all fetch calls centralised (no fetch elsewhere)
- [ ] frontend/src/App.jsx — top-level routing and layout

### Upload Flow
- [ ] frontend/src/components/upload/Upload.jsx — CSV drop zone, file validation, upload trigger
- [ ] frontend/src/components/upload/ColumnPreviewTable.jsx — raw column profile display post-upload

### Intelligence Components
- [ ] frontend/src/components/intelligence/ColumnAnnotations.jsx — LLM suggestions per column with accept/edit/reject
- [ ] frontend/src/components/intelligence/ConstraintInput.jsx — free-text NL constraint input triggering Call 2
- [ ] frontend/src/components/intelligence/ConstraintReview.jsx — parsed constraint review with confirm/discard
- [ ] frontend/src/components/intelligence/PrevalenceBenchmark.jsx — LLM-suggested prevalence range pre-filling slider

### Config Components
- [ ] frontend/src/components/config/DomainConfig.jsx — domain pack selection + typology checkboxes
- [ ] frontend/src/components/config/ConstraintList.jsx — active confirmed constraints with edit/delete
- [ ] frontend/src/components/config/PrevalenceSlider.jsx — manual prevalence target input per class

### Generation
- [ ] frontend/src/components/generation/GenerationPanel.jsx — row count input, generate button, async status polling

### Agent Components
- [ ] frontend/src/components/agent/AgentEntryPoint.jsx — landing choice: chat vs upload
- [ ] frontend/src/components/agent/AgentChat.jsx — message thread, config update badges, ConfirmGenerate pin
- [ ] frontend/src/components/agent/AgentWizard.jsx — step-by-step wizard mode driven by agent state
- [ ] frontend/src/components/agent/WizardStep.jsx — single wizard step with adaptive input controls
- [ ] frontend/src/components/agent/ConfigSummaryPanel.jsx — live sidebar with amber indicators for unset fields
- [ ] frontend/src/components/agent/InlinePreviewCard.jsx — compact in-chat preview after run_preview tool
- [ ] frontend/src/components/agent/ConfirmGenerate.jsx — row count input + generate button

### Preview Components
- [ ] frontend/src/components/preview/DataPreview.jsx — tab container fetching /preview/{run_id}
- [ ] frontend/src/components/preview/FidelityScoreCard.jsx — composite, column, correlation scores with colour coding
- [ ] frontend/src/components/preview/DistributionChart.jsx — real vs synthetic histogram + KDE overlay (Recharts)
- [ ] frontend/src/components/preview/CorrelationHeatmap.jsx — real vs synthetic heatmaps side by side
- [ ] frontend/src/components/preview/PrevalenceBar.jsx — target vs actual grouped bar chart
- [ ] frontend/src/components/preview/SampleTable.jsx — first 50 rows scrollable table with fraud label badges

### Results
- [ ] frontend/src/components/results/ResultsDownload.jsx — ZIP download, report link, run ID display

### Hooks
- [ ] frontend/src/hooks/useGeneration.js — generation state, polling, run_id management
- [ ] frontend/src/hooks/useAnnotation.js — LLM Call 1 state: loading, result, fallback flag
- [ ] frontend/src/hooks/useConstraintParser.js — LLM Call 2 state: input, parsed result, confirm/discard
- [ ] frontend/src/hooks/useAgent.js — agent session state, message history, tool result rendering

---

## Phase 9 — Tests

- [ ] tests/test_profiler.py — profiler unit tests ≥80% coverage
- [ ] tests/test_sampler.py — sampler unit tests ≥80% coverage
- [ ] tests/test_validator.py — passing row + failing row per constraint type
- [ ] tests/test_fidelity.py — fidelity tests against known dataset with expected score range
- [ ] tests/test_previewer.py — histogram bins, KDE shape, correlation matrix symmetry
- [ ] tests/test_domain_packs.py — constraint pass/fail tests for fraud and AML packs
- [ ] tests/test_intelligence.py — all three LLM calls mocked; fallback degradation tests
- [ ] tests/test_agent.py — tool handler logic mocked; no live API or engine calls

---

*Run tests with: `pytest tests/ --cov=backend --cov-report=term-missing`*
