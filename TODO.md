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

### Project Setup (new)
- [ ] frontend/package.json — dependencies: react, vite, tailwind, shadcn, recharts
- [ ] frontend/index.html — Vite entry point with root div
- [ ] frontend/vite.config.js — Vite + React plugin config
- [ ] frontend/tailwind.config.js — Tailwind content paths
- [ ] frontend/postcss.config.js — PostCSS with Tailwind and autoprefixer
- [ ] frontend/src/index.css — Tailwind directives + shadcn CSS variables
- [ ] frontend/src/main.jsx — React DOM root mount
- [ ] frontend/components.json — shadcn/ui config
- [ ] frontend/src/lib/utils.js — shadcn cn() utility
- [ ] Install shadcn components: Button, Card, Badge, Input, Select, Slider, Tabs, Table, Dialog, Progress, Separator, Label, Tooltip

### Utilities & App Shell
- [x] frontend/src/utils/api.js — all fetch calls centralised (no fetch elsewhere)
- [ ] frontend/src/App.jsx — rewrite using shadcn layout, fix require() bug, add react-router

### Upload Flow
- [ ] frontend/src/components/upload/Upload.jsx — rewrite with shadcn Card, drag-drop zone
- [ ] frontend/src/components/upload/ColumnPreviewTable.jsx — rewrite with shadcn Table

### Intelligence Components
- [ ] frontend/src/components/intelligence/ColumnAnnotations.jsx — rewrite with shadcn Card + Badge + Input
- [ ] frontend/src/components/intelligence/ConstraintInput.jsx — rewrite with shadcn Input + Button
- [ ] frontend/src/components/intelligence/ConstraintReview.jsx — rewrite with shadcn Card + Badge
- [ ] frontend/src/components/intelligence/PrevalenceBenchmark.jsx — rewrite with shadcn Card

### Config Components
- [ ] frontend/src/components/config/DomainConfig.jsx — rewrite with shadcn Button group + Badge
- [ ] frontend/src/components/config/ConstraintList.jsx — rewrite with shadcn Card + Badge + Button
- [ ] frontend/src/components/config/PrevalenceSlider.jsx — rewrite with shadcn Slider + Label

### Generation
- [ ] frontend/src/components/generation/GenerationPanel.jsx — rewrite with shadcn Card + Input + Button

### Agent Components
- [ ] frontend/src/components/agent/AgentEntryPoint.jsx — rewrite with shadcn Card layout
- [ ] frontend/src/components/agent/AgentChat.jsx — rewrite with shadcn ScrollArea + Input + Button
- [ ] frontend/src/components/agent/AgentWizard.jsx — rewrite with shadcn Card + Progress
- [ ] frontend/src/components/agent/WizardStep.jsx — rewrite with shadcn Card + adaptive inputs
- [ ] frontend/src/components/agent/ConfigSummaryPanel.jsx — rewrite with shadcn Card + Badge
- [ ] frontend/src/components/agent/InlinePreviewCard.jsx — rewrite with shadcn Card + Badge
- [ ] frontend/src/components/agent/ConfirmGenerate.jsx — rewrite with shadcn Card + Input + Button

### Preview Components
- [ ] frontend/src/components/preview/DataPreview.jsx — rewrite with shadcn Tabs + Card
- [ ] frontend/src/components/preview/FidelityScoreCard.jsx — rewrite with shadcn Card + Badge
- [ ] frontend/src/components/preview/DistributionChart.jsx — keep Recharts, wrap in shadcn Card
- [ ] frontend/src/components/preview/CorrelationHeatmap.jsx — wrap in shadcn Card
- [ ] frontend/src/components/preview/PrevalenceBar.jsx — keep Recharts, wrap in shadcn Card
- [ ] frontend/src/components/preview/SampleTable.jsx — rewrite with shadcn Table + Badge

### Results
- [ ] frontend/src/components/results/ResultsDownload.jsx — rewrite with shadcn Card + Button

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
