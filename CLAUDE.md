# CLAUDE.md — Calibra

This file is the authoritative reference for any AI agent (Claude Code or otherwise) working on this codebase. Read it fully before writing any code, creating any file, or making any architectural decision.

---

## What Calibra Is

Calibra is a domain-configurable synthetic data engine with two equal entry points:

1. **Upload-first flow** — user uploads a sample CSV dataset. The engine learns its statistical distributions and generates synthetic data at scale with domain constraints applied.
2. **Agent-first flow** — user describes what they want in natural language via a chat interface or step-by-step wizard. The agent translates intent into engine configuration and hands off to the same generation engine.

Both flows produce identical output — synthetic data + audit report. The agent is a configuration mediator, not a separate product.

The product is free and hosted. It is not open-source. The IP is proprietary.

**Version 1 domain scope:** Financial crime only — fraud detection and AML transaction monitoring.

**Four-layer architecture:**
1. Core statistical engine — distribution fitting and sampling
2. Domain configuration layer — constraint enforcement and prevalence control
3. Agent layer — stateful conversational mediator between user intent and engine config
4. Browser-based web application — dual entry point UI, configure, preview, download

---

## Tech Stack

**Backend**
- Language: Python only. No other backend languages.
- Framework: FastAPI
- Core generation libraries: SDV (Synthetic Data Vault), scipy, numpy, pandas
- Constraint engine: custom — do not use a third-party rules engine
- Report generation: ReportLab (PDF audit reports)
- Output formats: CSV, Parquet

**Frontend**
- Framework: React (functional components, hooks only — no class components)
- Styling: Tailwind CSS (utility classes only — no custom CSS files unless unavoidable)
- File handling: browser-native File API for CSV upload
- No external UI component libraries unless explicitly approved

**Infrastructure**
- API communication: REST (JSON). No GraphQL.
- File delivery: presigned URLs or direct download — no base64 encoding of large files in API responses
- Auth: JWT for registered users. Anonymous sessions for runs under 10,000 rows.

---

## Project Structure

```
calibra/
├── backend/
│   ├── main.py                  # FastAPI app entry point
│   ├── routers/
│   │   ├── generation.py        # /generate and /upload and /replay endpoints
│   │   ├── intelligence.py      # /intelligence/annotate and /intelligence/parse-constraint endpoints
│   │   ├── preview.py           # /preview/{run_id} endpoint
│   │   ├── agent.py             # /agent/message and /agent/session endpoints
│   │   └── auth.py              # /auth endpoints
│   ├── engine/
│   │   ├── profiler.py          # Column type inference and distribution fitting
│   │   ├── sampler.py           # Synthetic data sampling from fitted model
│   │   ├── validator.py         # Constraint validation against domain schema
│   │   ├── fidelity.py          # Fidelity scoring (column match + correlation delta)
│   │   └── previewer.py         # Computes histogram bins, KDE, correlation matrices for /preview
│   ├── domain_packs/
│   │   ├── base.py              # Abstract domain pack interface
│   │   ├── fraud.py             # Financial crime — fraud detection pack
│   │   └── aml.py               # Financial crime — AML pack
│   ├── reporting/
│   │   └── audit_report.py      # PDF audit report generation (ReportLab)
│   ├── intelligence/
│   │   ├── annotator.py         # LLM call 1: column semantic annotation + domain pack suggestion
│   │   ├── constraint_parser.py # LLM call 2: natural language → formal constraint schema
│   │   ├── report_summariser.py # LLM call 3: plain-English audit report summary
│   │   └── prompts/
│   │       ├── annotate_columns_v1.txt
│   │       ├── parse_constraints_v1.txt
│   │       └── summarise_report_v1.txt
│   ├── agent/
│   │   ├── agent.py             # Core agent loop — stateful, tool-calling, session-aware
│   │   ├── tools.py             # Five tool definitions + handlers (see Agent section)
│   │   ├── state.py             # AgentState schema — conversation history + live config
│   │   └── prompts/
│   │       └── agent_system_v1.txt  # Agent system prompt (see Agent section)
│   ├── session/
│   │   └── store.py             # Session lifecycle management (see Session Lifecycle section)
│   └── models/
│       └── schemas.py           # Pydantic schemas for all request/response objects
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── upload/
│   │   │   │   ├── Upload.jsx              # CSV drop zone, file validation, upload trigger
│   │   │   │   └── ColumnPreviewTable.jsx  # Raw column profile shown immediately after upload
│   │   │   ├── intelligence/
│   │   │   │   ├── ColumnAnnotations.jsx   # LLM suggestions per column — accept/edit/reject per row
│   │   │   │   ├── ConstraintInput.jsx     # Free-text NL constraint input — triggers Call 2
│   │   │   │   ├── ConstraintReview.jsx    # Parsed constraint readable_summary + confirm/discard
│   │   │   │   └── PrevalenceBenchmark.jsx # LLM-suggested prevalence range, pre-fills slider
│   │   │   ├── config/
│   │   │   │   ├── DomainConfig.jsx        # Domain pack selection + typology checkboxes
│   │   │   │   ├── ConstraintList.jsx      # Active confirmed constraints — edit/delete per item
│   │   │   │   └── PrevalenceSlider.jsx    # Manual prevalence target input per class
│   │   │   ├── generation/
│   │   │   │   └── GenerationPanel.jsx     # Row count input, generate button, async status polling
│   │   │   ├── agent/
│   │   │   │   ├── AgentEntryPoint.jsx     # Landing choice: "Chat with Agent" vs "Upload Dataset"
│   │   │   │   ├── AgentChat.jsx           # Chat interface — message thread, input, streaming response
│   │   │   │   ├── AgentWizard.jsx         # Step-by-step wizard mode driven by agent state
│   │   │   │   ├── WizardStep.jsx          # Single wizard step renderer — question + input type
│   │   │   │   ├── ConfigSummaryPanel.jsx  # Live sidebar showing current agent-built config state
│   │   │   │   ├── InlinePreviewCard.jsx   # Mini preview shown inline in chat after run_preview tool
│   │   │   │   └── ConfirmGenerate.jsx     # Final confirm button + row count input before handoff
│   │   │   ├── preview/
│   │   │   │   ├── DataPreview.jsx         # Parent: tab container for all visualisation panels
│   │   │   │   ├── DistributionChart.jsx   # Per-column real vs synthetic overlay (histogram + KDE)
│   │   │   │   ├── CorrelationHeatmap.jsx  # Real vs synthetic correlation matrix side-by-side
│   │   │   │   ├── PrevalenceBar.jsx       # Target vs actual class prevalence bar chart
│   │   │   │   ├── FidelityScoreCard.jsx   # Composite, column, and correlation fidelity scores
│   │   │   │   └── SampleTable.jsx         # First 50 rows of synthetic output, scrollable
│   │   │   └── results/
│   │   │       └── ResultsDownload.jsx     # Download ZIP, report link, run ID display
│   │   ├── hooks/
│   │   │   ├── useGeneration.js            # Generation state, polling, run_id management
│   │   │   ├── useAnnotation.js            # LLM Call 1 state — loading, result, fallback flag
│   │   │   ├── useConstraintParser.js      # LLM Call 2 state — input, parsed result, confirm/discard
│   │   │   └── useAgent.js                 # Agent session state, message history, tool result rendering
│   │   └── utils/
│   │       └── api.js                      # All fetch calls to backend — no fetch calls elsewhere
│   └── public/
│
├── tests/
│   ├── test_profiler.py
│   ├── test_sampler.py
│   ├── test_validator.py
│   ├── test_fidelity.py
│   ├── test_previewer.py        # Histogram bins, KDE output shape, correlation matrix symmetry
│   ├── test_domain_packs.py
│   ├── test_intelligence.py     # All LLM calls mocked via unittest.mock.patch — no live API calls ever
│   └── test_agent.py            # Tool handler logic mocked — no live API calls, no engine calls
│
├── CLAUDE.md                    # This file
├── requirements.txt
└── README.md
```

---

## Core Concepts — Read Before Touching Engine Code

### Distribution Fitting (profiler.py)

The profiler infers column types and fits distributions. Column type taxonomy:

| Type | Detection logic | Distribution |
|---|---|---|
| `continuous` | Numeric, >10 unique values | Fit lognormal or normal via MLE. Use KS test to select. |
| `categorical` | String or numeric with ≤10 unique values | Frequency table. |
| `datetime` | Parseable as date/time | Extract hour, day-of-week, inter-event interval distributions separately. |
| `boolean` | Binary 0/1 or True/False | Bernoulli with fitted p. |
| `id` | High cardinality string or sequential int | Flag as non-generatable. Synthesise as UUID or sequential index. |

Inter-column correlations are modelled using a Gaussian Copula over the continuous and boolean columns. Categorical columns are handled via conditional frequency tables conditioned on a binned version of the most correlated continuous column.

### Constraint Validation (validator.py)

Constraints are defined in domain packs as a list of rule objects. Each rule has:
- `column` or `columns` — what the rule applies to
- `rule_type` — one of: `bound`, `conditional`, `relational`, `temporal`
- `params` — rule-specific parameters

The validator runs every generated row through all active rules. Any row failing a rule is flagged and regenerated (up to 3 attempts). If a row cannot be made valid after 3 attempts, it is logged in the audit report as a constraint failure and excluded from the output. The final output row count may be slightly below the requested count in edge cases — this is expected and documented in the audit report.

**Do not silently pass constraint-failing rows. Ever.**

### Fidelity Scoring (fidelity.py)

The fidelity score is a composite of two components:

1. **Column fidelity (weight 0.6):** For each column, compute the Jensen-Shannon divergence between the real and synthetic distributions. Score = 1 - mean(JS divergence across columns). Higher is better.

2. **Correlation fidelity (weight 0.4):** Compute the Frobenius norm of the difference between the real and synthetic correlation matrices. Normalise to [0, 1]. Score = 1 - normalised norm.

Composite = 0.6 × column_fidelity + 0.4 × correlation_fidelity.

**Minimum acceptable composite score: 0.75.** Runs below this surface a warning to the user in the UI and in the audit report. The user must explicitly confirm before downloading below-threshold output.

### Domain Packs (domain_packs/)

Each domain pack is a Python class inheriting from `BaseDomainPack`. It must implement:

```python
class BaseDomainPack:
    def get_constraints(self, user_config: dict) -> list[Constraint]:
        """Return list of Constraint objects based on user configuration."""
        raise NotImplementedError

    def get_prevalence_config(self, user_config: dict) -> PrevalenceConfig:
        """Return prevalence targets per label class."""
        raise NotImplementedError

    def get_ui_schema(self) -> dict:
        """Return JSON Schema for the frontend configuration form."""
        raise NotImplementedError
```

The UI schema drives the constraint configuration UI in the frontend dynamically. Adding a new domain pack requires only: creating the pack class, registering it in a pack registry, and writing tests. No frontend code changes are needed for pack configuration.

### Prevalence Control

When a domain pack is active, the engine generates labelled data in two passes:

1. Generate the majority class (non-fraud / non-suspicious) rows to fill `(1 - target_prevalence) × total_rows`.
2. Generate minority class rows to fill `target_prevalence × total_rows`, using the minority-class constraint profile from the domain pack.

The two sets are shuffled before output. The prevalence in the output must match the target within ±0.5 percentage points. If it does not, the engine adjusts and resamples before finalising.

---

## LLM Intelligence Layer

The LLM layer is a configuration and summarisation assistant. It is called a maximum of three times per generation run — all server-side, all in the `intelligence/` module. It never generates data rows and never makes decisions that bypass user review.

### Boundary Rule

**The LLM assists with configuration and summarisation only.** Every LLM output is a suggestion that the user must confirm before it is passed to the engine. If an LLM call fails, times out, or returns an invalid schema, the UI falls back to manual configuration silently. The LLM layer is an enhancement — never a dependency.

This boundary is what makes the audit report defensible. It can truthfully state: *"Constraints were described by the user in natural language, converted to formal schema by LLM, reviewed and approved by user, and enforced deterministically by the constraint engine."*

---

### Data Flow — Where the LLM Sits

```
User uploads CSV
        ↓
POST /upload → session_id returned
        ↓
Statistical profiler runs (column types, distributions)   [deterministic]
        ↓
POST /intelligence/annotate called automatically
        ↓
LLM Call 1: column annotation + domain pack suggestion    [10s timeout]
        ↓
User sees configuration UI with pre-filled suggestions
User reviews, edits, and confirms column annotations
        ↓
[Optional] User types a natural language constraint
        ↓
POST /intelligence/parse-constraint called on submit
        ↓
LLM Call 2: NL → formal constraint schema                 [10s timeout]
        ↓
User sees readable summary + raw schema, confirms or discards
        ↓
User clicks Generate
        ↓
POST /generate — core statistical engine runs             [deterministic]
        ↓
LLM Call 3: plain-English audit report summary            [10s timeout]
        ↓
Audit report assembled (LLM summary prepended)
        ↓
User downloads ZIP
```

The LLM is called a maximum of three times. Everything between calls 2 and 3 is fully deterministic. Call 2 only happens if the user chooses to write a natural language constraint — it is optional.

---

### Session Lifecycle (`session/store.py`)

A session is created on `/upload` and is the shared state object that all subsequent calls reference.

**Session schema:**
```python
class Session(BaseModel):
    session_id: str                    # UUID4, generated on upload
    created_at: datetime
    expires_at: datetime               # created_at + 2 hours
    column_profile: list[ColumnProfile]  # output of profiler.py
    raw_filename: str                  # original filename, for display only
    row_count: int
    annotations: list[ColumnAnnotation] | None  # output of LLM call 1, None until complete
    active_constraints: list[Constraint]        # user-confirmed constraints
    domain_pack: str | None            # "fraud" | "aml" | None
    domain_config: dict                # user-configured domain pack parameters
```

**Storage:** In-memory dict (`Dict[str, Session]`) for v1. Key is `session_id`. This is intentional — sessions are ephemeral, source data is never persisted to disk or database.

**Expiry:** Sessions expire after 2 hours. A background task (FastAPI `lifespan`) sweeps expired sessions every 15 minutes.

**Concurrency:** The session store is protected by an `asyncio.Lock`. Do not access it without acquiring the lock.

**No cross-session access:** A `session_id` issued to one user must never be accessible by another. Validate ownership via JWT sub claim on every request that references a `session_id`.

---

### Three LLM Calls

**Call 1 — Column Annotation (`annotator.py`)**

Triggered automatically after `/upload` completes. Runs asynchronously — the frontend polls for annotation status while the user reads the column preview table.

**Timeout:** 10 seconds. On timeout, return `{"annotations": null}` and proceed to manual configuration.

**What is sent to the LLM:**
- Column names and inferred statistical types
- Per-column summary: min, max, mean, stddev, top-5 most frequent values, null rate
- **Never send raw data rows. Never.**

**System prompt** (stored in `intelligence/prompts/annotate_columns_v1.txt`):
```
You are a financial data analyst assistant embedded in a synthetic data generation tool called Calibra.

Your job is to analyse a statistical profile of a dataset's columns and return a structured JSON annotation. You must:
1. Infer the real-world meaning of each column from its name and statistics.
2. Suggest an appropriate constraint for each column based on its likely domain role.
3. Recommend the most appropriate domain pack and typologies.

Rules:
- Return ONLY valid JSON. No preamble, no explanation, no markdown fences.
- If you are not confident about a column's meaning, set "semantic_label" to null and omit "suggested_constraint".
- Valid rule_type values are: "bound", "conditional", "relational", "temporal".
- Valid domain_pack values are: "fraud", "aml", "none".
- Valid typology values are: "card_not_present", "account_takeover", "synthetic_identity", "first_party_fraud", "structuring", "fan_out", "fan_in", "scatter_gather", "circular_flow".

Output schema:
{
  "columns": [
    {
      "name": "<column_name>",
      "semantic_label": "<human readable label or null>",
      "suggested_constraint": { "rule_type": "...", ... } or null,
      "reasoning": "<one sentence>"
    }
  ],
  "recommended_domain_pack": "fraud | aml | none",
  "recommended_typologies": ["<typology_value>"]
}
```

**User message template** (assembled in `annotator.py`):
```
Analyse the following column profiles and return the JSON annotation.

Columns:
{column_profiles_json}
```

**Validation:** Parse response as JSON. Validate against the output schema using Pydantic. On failure, log the raw response and return `{"annotations": null}`.

---

**Call 2 — Natural Language Constraint Parser (`constraint_parser.py`)**

Triggered on user submit of a free-text constraint. Synchronous — user waits for the response before seeing the result.

**Timeout:** 10 seconds. On timeout, return `{"constraint": null, "message": "Request timed out. Please try again or use the manual form."}`.

**What is sent to the LLM:**
- The user's plain-English constraint text
- Available column names and their inferred types
- Valid rule_type values
- **No data rows. No statistical summaries beyond column names and types.**

**System prompt** (stored in `intelligence/prompts/parse_constraints_v1.txt`):
```
You are a constraint schema generator for a synthetic data tool called Calibra.

Your job is to convert a plain-English data constraint description into a structured JSON constraint object.

Rules:
- Return ONLY valid JSON. No preamble, no explanation, no markdown fences.
- Valid rule_type values: "bound", "conditional", "relational", "temporal".
- Only reference column names that exist in the provided column list.
- If the constraint cannot be expressed in the schema, set "parseable" to false and explain in "parse_error".
- Set "confidence" to "high" if the constraint is unambiguous, "low" if you had to make assumptions.

Output schema:
{
  "parseable": true,
  "confidence": "high | low",
  "rule_type": "...",
  "column": "<column_name>",
  "params": { },
  "readable_summary": "<one sentence restating the constraint in plain English>",
  "parse_error": null
}

If not parseable:
{
  "parseable": false,
  "confidence": "low",
  "rule_type": null,
  "column": null,
  "params": null,
  "readable_summary": null,
  "parse_error": "<brief explanation of why it cannot be parsed>"
}
```

**User message template:**
```
Available columns: {column_list}

User constraint: "{natural_language_input}"

Convert this to a constraint schema object.
```

**Frontend behaviour on response:**
- `parseable: true, confidence: high` → show readable_summary with a green confirm button
- `parseable: true, confidence: low` → show readable_summary with a yellow warning: "We made some assumptions — please review before confirming"
- `parseable: false` → show parse_error message and suggest the manual constraint form

---

**Call 3 — Audit Report Summariser (`report_summariser.py`)**

Triggered after generation completes, before the PDF is assembled. Synchronous — the user sees a "preparing report" state while this runs.

**Timeout:** 10 seconds. On timeout, omit the executive summary from the report and note "Executive summary unavailable" in the PDF header. Do not block report delivery.

**What is sent to the LLM:**
- Run ID, timestamp, row count requested, row count delivered
- Domain pack name and version
- Fidelity scores (column fidelity, correlation fidelity, composite)
- Constraint count applied, constraint failure count
- Prevalence target vs actual per class
- Whether any fidelity warning was triggered
- **No generated data rows. Never.**

**System prompt** (stored in `intelligence/prompts/summarise_report_v1.txt`):
```
You are a model risk documentation assistant for a synthetic data tool called Calibra.

Your job is to write a plain-English executive summary of a synthetic data generation run, suitable for a non-technical reader such as a compliance officer or model risk reviewer.

Rules:
- Write 150–250 words. No more.
- Do not use bullet points. Write in clear prose paragraphs.
- Do not use technical jargon (no "Gaussian Copula", no "Jensen-Shannon divergence").
- If the fidelity score is below 0.75, explicitly flag this as a limitation the user should be aware of.
- If constraint failures occurred, state how many rows were excluded and why this is expected.
- End with one sentence stating what the dataset is suitable for, based on the fidelity score and domain pack used.
- Return plain text only. No JSON. No markdown.
```

**User message template:**
```
Generation run summary:
{run_summary_json}

Write the executive summary.
```

---

### LLM Client (`intelligence/client.py`)

Create a shared client module. All three intelligence modules import from here — do not instantiate `anthropic.Anthropic()` more than once.

```python
import anthropic
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

_client = anthropic.Anthropic()

PROMPT_DIR = Path(__file__).parent / "prompts"

def load_prompt(filename: str) -> str:
    """Load a versioned prompt from the prompts directory."""
    path = PROMPT_DIR / filename
    if not path.exists():
        raise FileNotFoundError(f"Prompt file not found: {filename}")
    return path.read_text(encoding="utf-8")

def call_llm(
    system_prompt: str,
    user_message: str,
    max_tokens: int = 1024,
    timeout: float = 10.0,
) -> str | None:
    """
    Call the Claude API with a system and user message.

    Returns the text response, or None on any failure.
    Never raises — all exceptions are caught and logged.
    """
    try:
        message = _client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=max_tokens,
            system=system_prompt,
            messages=[{"role": "user", "content": user_message}],
            timeout=timeout,
        )
        return message.content[0].text
    except Exception as e:
        logger.error("LLM call failed: %s", e)
        return None
```

**Key points:**
- `system` is always a separate parameter — never fold it into the user message.
- Return type is `str | None`. Callers must handle `None` as a fallback trigger.
- `timeout` is passed per-call — 10.0 seconds for all three calls in v1.
- The model string `claude-sonnet-4-20250514` is defined once here as a constant. Do not duplicate it.

---

### Prompt Versioning

- Prompt files are named `<purpose>_v<N>.txt` — e.g. `annotate_columns_v1.txt`.
- When a prompt changes, create a new file with an incremented version. Keep the old file.
- The active prompt version for each call is defined in `constants.py`:

```python
PROMPT_VERSIONS = {
    "annotate": "annotate_columns_v1.txt",
    "parse_constraint": "parse_constraints_v1.txt",
    "summarise": "summarise_report_v1.txt",
}
```

- Log the active prompt version in the generation run record so the audit report can state which version was used.

---

### LLM Latency Budget

| Call | Trigger | Timeout | User-facing state |
|---|---|---|---|
| Call 1 — annotate | Auto after upload | 10s | "Analysing your dataset..." spinner on column preview. UI is interactive — user can proceed manually without waiting. |
| Call 2 — parse constraint | User submits NL constraint | 10s | "Parsing constraint..." inline loader on the constraint input field. Submit button disabled during wait. |
| Call 3 — summarise | Auto after generation | 10s | "Preparing your report..." state on the results screen. Download button appears after report is ready or timeout. |

LLM latency is **never** on the critical generation path. Calls 1 and 3 run after their respective trigger events complete — they do not block the next user action.

---

### What the LLM Must Never Do

- Receive raw data rows from the uploaded CSV
- Generate synthetic data rows
- Make constraint decisions applied without user confirmation
- Be called during the generation or validation phase
- Be called more than three times per generation run
- Have its system prompt and user message merged into a single string (always use the `system` parameter separately)

---

## Agent Architecture

### What the Agent Is

The agent is a stateful, tool-calling LLM that acts as a mediator between the user and the core generation engine. It has one job: take whatever the user tells it — in any order, at any level of specificity — and translate it into a valid, complete engine configuration. When the configuration is ready, it presents a summary and waits for the user to confirm before triggering generation.

The agent does not generate data. It does not call the statistical engine directly (except via `run_preview`). It builds config and hands off.

---

### Two Interaction Modes

**Chat mode** — freeform conversation. The user types naturally. The agent asks follow-up questions, calls tools silently, and keeps a live `ConfigSummaryPanel` in the sidebar updated in real time. Suited to technical users who know what they want.

**Wizard mode** — structured step-by-step flow. The agent drives a sequence of focused questions, one at a time, rendered as `WizardStep.jsx` cards with appropriate input controls (dropdowns, sliders, multi-select). The underlying agent is identical — only the rendering differs. Suited to compliance analysts and non-technical users.

The user selects mode at `AgentEntryPoint.jsx`. They can switch modes mid-session without losing state.

---

### Agent State (`agent/state.py`)

```python
class AgentState(BaseModel):
    session_id: str
    mode: Literal["chat", "wizard"]
    created_at: datetime
    updated_at: datetime
    messages: list[AgentMessage]           # full conversation history — {"role": "user|assistant", "content": "..."}
    config: GenerationConfig               # live config being built
    wizard_step: int | None                # current wizard step index; None in chat mode
    wizard_completed_steps: list[int]
    entry_point: Literal["agent_first", "upload_first"]
    upload_session_id: str | None          # set if user uploaded a CSV before or during agent session
    preview_run_id: str | None             # run_id of most recent preview run

class GenerationConfig(BaseModel):
    domain_pack: str | None                # "fraud" | "aml" | None
    typologies: list[str]
    row_count: int | None
    prevalence: dict[str, float] | None    # {"fraud": 0.02, "non_fraud": 0.98}
    constraints: list[Constraint]
    columns: list[ColumnSpec] | None       # agent-first only — schema defined from scratch
    distribution_hints: dict[str, str] | None
    ready_to_generate: bool                # True only when agent calls mark_ready tool
```

`ready_to_generate` gates the `ConfirmGenerate` button in the UI. The agent sets it by calling `mark_ready`. The frontend never sets it directly.

Conversation history is capped at 40 messages. When the cap is reached, summarise the oldest 20 into a single `[conversation summary]` message and replace them. Never truncate silently.

---

### Six Agent Tools (`agent/tools.py`)

**Tool 1 — `set_domain_pack`**
Sets domain pack and typologies in live config.
```json
{
  "name": "set_domain_pack",
  "input_schema": {
    "type": "object",
    "properties": {
      "domain_pack": { "type": "string", "enum": ["fraud", "aml", "none"] },
      "typologies": { "type": "array", "items": { "type": "string", "enum": ["card_not_present", "account_takeover", "synthetic_identity", "first_party_fraud", "structuring", "fan_out", "fan_in", "scatter_gather", "circular_flow"] } }
    },
    "required": ["domain_pack"]
  }
}
```

**Tool 2 — `set_prevalence`**
Sets class prevalence targets. Handler validates values sum to 1.0 before storing.
```json
{
  "name": "set_prevalence",
  "input_schema": {
    "type": "object",
    "properties": {
      "prevalence": { "type": "object", "description": "Class name → float. Must sum to 1.0. E.g. {"fraud": 0.02, "non_fraud": 0.98}" }
    },
    "required": ["prevalence"]
  }
}
```

**Tool 3 — `add_constraint`**
Adds a constraint via plain-English description. Handler calls `constraint_parser.py` internally — agent never writes raw constraint JSON.
```json
{
  "name": "add_constraint",
  "input_schema": {
    "type": "object",
    "properties": {
      "description": { "type": "string" }
    },
    "required": ["description"]
  }
}
```

**Tool 4 — `define_schema`**
Agent-first only. Defines column schema from scratch when no CSV was uploaded.
```json
{
  "name": "define_schema",
  "input_schema": {
    "type": "object",
    "properties": {
      "columns": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "name": { "type": "string" },
            "type": { "type": "string", "enum": ["continuous", "categorical", "datetime", "boolean", "id"] },
            "distribution_hint": { "type": "string", "enum": ["normal", "lognormal", "uniform", "exponential", "categorical"] },
            "sample_values": { "type": "array" }
          },
          "required": ["name", "type"]
        }
      }
    },
    "required": ["columns"]
  }
}
```

**Tool 5 — `run_preview`**
Triggers a lightweight generation run (max 500 rows) using current config. Stores `run_id` in `AgentState.preview_run_id`. Frontend detects this and renders `InlinePreviewCard.jsx` in the chat thread.
```json
{
  "name": "run_preview",
  "input_schema": {
    "type": "object",
    "properties": {
      "row_count": { "type": "integer", "default": 200, "maximum": 500 }
    }
  }
}
```

**Tool 6 — `mark_ready`**
Called by the agent when config is complete. Sets `ready_to_generate: true`. Must include a plain-English summary shown to the user. The frontend `ConfirmGenerate` button activates on this flag.
```json
{
  "name": "mark_ready",
  "input_schema": {
    "type": "object",
    "properties": {
      "summary": { "type": "string", "description": "One-paragraph plain-English config summary shown to the user before they confirm." }
    },
    "required": ["summary"]
  }
}
```

Tool call rules:
- Call tools as soon as there is enough information — do not batch to end of conversation.
- Each tool call overwrites the previous value for that field. Repeat calls are safe.
- `run_preview` is the only tool that calls the generation engine. All other tools only mutate `AgentState`.
- Log every tool call and its inputs in `AgentState` for the audit report.

---

### Agent System Prompt (`agent/prompts/agent_system_v1.txt`)

Store in `agent/prompts/agent_system_v1.txt`. Never hardcode in Python. Follow the same versioning convention as intelligence prompts.

```
You are Calibra's data configuration assistant. Your job is to help users configure a synthetic data generation run through natural conversation.

You have six tools: set_domain_pack, set_prevalence, add_constraint, define_schema, run_preview, mark_ready.

Your goal is to collect:
1. What kind of data (domain: fraud, AML, or general tabular)
2. If financial crime: which typologies and at what prevalence
3. Any business rules or constraints the data must follow
4. How many rows (suggest 10,000 if user is unsure)
5. If no CSV uploaded: the column schema

Rules:
- Ask one question at a time. Never combine multiple questions in one message.
- Call tools as soon as you have enough information — do not wait until the end.
- After calling a tool, briefly confirm what you set and ask the next question.
- If the user is vague, interpret charitably, set a sensible default, tell them what you chose, and move on.
- If the user asks to change something, call the relevant tool again with the new value.
- Offer run_preview once domain pack and prevalence are set. Do not wait for the user to ask.
- When all required fields are set, call mark_ready with a plain-English config summary. Do not ask permission — let the user confirm via the UI button.
- Never mention tool names to the user. Never say "I'll call set_domain_pack". Just do it.
- Never generate data rows yourself. Never make up benchmark statistics. If unsure, say so.
- Keep responses to 1–3 sentences per turn unless asked for more detail.
- Maintain a professional but approachable tone — users are compliance teams and data scientists.

Current config state is injected after each user message as JSON. Use it to track what is set and what is missing. Never mention the JSON to the user.
```

---

### Agent Loop (`agent/agent.py`)

Standard Anthropic tool-use loop. Config context injected into the last user message on every turn — not into every message.

```python
async def run_agent_turn(state: AgentState, user_message: str) -> AgentTurnResult:
    state.messages.append({"role": "user", "content": user_message})
    config_context = f"\n\n[Current config: {state.config.model_dump_json()}]"
    messages_with_context = inject_config_context(state.messages, config_context)

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        system=load_prompt("agent_system_v1.txt"),
        tools=TOOL_DEFINITIONS,
        messages=messages_with_context,
    )

    tool_results = []
    for block in response.content:
        if block.type == "tool_use":
            result = await execute_tool(block.name, block.input, state)
            tool_results.append({"type": "tool_result", "tool_use_id": block.id, "content": result})

    if tool_results:
        state.messages.append({"role": "assistant", "content": response.content})
        state.messages.append({"role": "user", "content": tool_results})
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            system=load_prompt("agent_system_v1.txt"),
            tools=TOOL_DEFINITIONS,
            messages=inject_config_context(state.messages, config_context),
        )

    assistant_text = extract_text(response.content)
    state.messages.append({"role": "assistant", "content": assistant_text})
    state.updated_at = datetime.utcnow()

    return AgentTurnResult(
        reply=assistant_text,
        updated_config=state.config,
        tool_calls_made=[b.name for b in response.content if hasattr(b, "name")],
    )
```

`inject_config_context` appends the config JSON to the last user message only. Do not repeat it across every message in history.

---

### Agent-First vs Upload-First Differences

| Aspect | Upload-first | Agent-first |
|---|---|---|
| Column schema | Learned from CSV by profiler.py | Defined via `define_schema` tool |
| Distribution fitting | Real — fitted from actual data | Uses distribution hints + domain pack defaults |
| Fidelity score | Real vs synthetic comparison | Not applicable — no source data to compare |
| Audit report | Standard fidelity report | States "Schema defined via agent — no source dataset provided" |

When `entry_point == "agent_first"` and no CSV uploaded, `sampler.py` must use `GenerationConfig.columns` and `distribution_hints` instead of a fitted model. Handle this path explicitly — do not assume a fitted model always exists.

---

### Agent API Endpoints

**POST /agent/session**
Creates a new agent session. Returns `session_id` and initial empty config.

Request:
```json
{ "mode": "chat | wizard", "entry_point": "agent_first | upload_first", "upload_session_id": "string | null" }
```
Response:
```json
{ "session_id": "string", "mode": "chat | wizard", "config": { }, "expires_at": "ISO8601" }
```

**POST /agent/message**
Sends a user message. Runs one agent turn. Returns agent reply, updated config, and tool calls made.

Request:
```json
{ "session_id": "string", "message": "string" }
```
Response:
```json
{
  "reply": "string",
  "updated_config": { },
  "tool_calls_made": ["set_domain_pack"],
  "ready_to_generate": false,
  "preview_run_id": "string | null"
}
```

**GET /agent/state/{session_id}**
Returns current `AgentState`. Polled by `ConfigSummaryPanel.jsx` after each turn.

---

### Frontend Agent Components

- `AgentEntryPoint.jsx` — two equal-weight entry cards: "Describe what you need" vs "Upload your dataset"
- `AgentChat.jsx` — message thread, user messages right-aligned, agent left-aligned. Config update badge on messages that triggered a tool call. `ConfirmGenerate` pins above input when `ready_to_generate` is true.
- `AgentWizard.jsx` — one `WizardStep` at a time, progress bar, back button for completed steps.
- `WizardStep.jsx` — renders input control type based on agent message content: list of options → radio/dropdown, asks for number → numeric input with agent's suggested default, free text → text input. Inference is client-side, no backend call.
- `ConfigSummaryPanel.jsx` — sticky sidebar (desktop) / collapsible bottom sheet (mobile). Human-readable live config. Unset required fields show amber indicator.
- `InlinePreviewCard.jsx` — compact preview in chat thread after `run_preview`: fidelity badge, mini prevalence bar, 5-row sample, "View full preview" link.
- `ConfirmGenerate.jsx` — row count input pre-filled from config, single "Generate" button. Calls `POST /generate` with confirmed config on click.
- `useAgent.js` — agent session state hook. Calls `POST /agent/message`, receives `{reply, updated_config, tool_calls_made}`, updates local state. Exposes: `messages`, `config`, `sendMessage(text)`, `isLoading`, `switchMode(mode)`.

After generation, both agent-first and upload-first users go to the same `ResultsDownload.jsx` and `DataPreview.jsx` flow.

---

### POST /upload



Accepts a CSV file as multipart form data. Creates a session and runs the statistical profiler.

Request: `multipart/form-data` with field `file` (CSV only, max 50MB).

Response:
```json
{
  "session_id": "string (UUID4)",
  "row_count": 1000,
  "column_count": 12,
  "expires_at": "ISO8601"
}
```

After this response is returned, `/intelligence/annotate` is called automatically by the frontend using the returned `session_id`.

### POST /generate

Request body:
```json
{
  "session_id": "string",
  "row_count": 10000,
  "domain_pack": "fraud | aml | none",
  "domain_config": { },
  "random_seed": 42
}
```

The uploaded file is submitted as a multipart form upload to `/upload` first, which returns a `session_id`. The `/generate` call references this session.

Response (async for runs > 50,000 rows):
```json
{
  "run_id": "string",
  "status": "queued | processing | complete | failed",
  "fidelity_score": 0.83,
  "constraint_failures": 12,
  "download_url": "string",
  "report_url": "string",
  "expires_at": "ISO8601"
}
```

All generation run parameters are stored server-side against the `run_id` for reproducibility. A user can replay any prior run by passing `run_id` to `/replay`.

### POST /intelligence/annotate

Called automatically after `/upload`. Returns LLM-generated column annotations and domain pack suggestion.

Request body:
```json
{ "session_id": "string" }
```

Response:
```json
{
  "columns": [
    {
      "name": "string",
      "semantic_label": "string",
      "suggested_constraint": { },
      "reasoning": "string"
    }
  ],
  "recommended_domain_pack": "fraud | aml | none",
  "recommended_typologies": ["string"]
}
```

Returns `{"annotations": null}` on LLM failure — the UI falls back to manual configuration silently.

### POST /intelligence/parse-constraint

Called when a user submits a natural language constraint.

Request body:
```json
{
  "session_id": "string",
  "natural_language": "string"
}
```

Response:
```json
{
  "constraint": { },
  "readable_summary": "string",
  "confidence": "high | low"
}
```

Returns `{"constraint": null, "message": "string"}` if the LLM cannot parse — the UI prompts the user to rephrase.

### GET /preview/{run_id}

Called after generation completes. Returns pre-computed visualisation data for the preview panel. The backend computes this from the statistical engine outputs — the frontend never does statistical computation.

Response:
```json
{
  "run_id": "string",
  "fidelity": {
    "composite": 0.83,
    "column_fidelity": 0.85,
    "correlation_fidelity": 0.80
  },
  "prevalence": {
    "target": { "fraud": 0.02, "non_fraud": 0.98 },
    "actual": { "fraud": 0.0198, "non_fraud": 0.9802 }
  },
  "columns": [
    {
      "name": "amount",
      "type": "continuous",
      "real": {
        "histogram": { "bins": [0, 100, 200, ...], "counts": [120, 340, ...] },
        "kde": { "x": [...], "y": [...] },
        "stats": { "mean": 245.3, "stddev": 180.1, "min": 0.5, "max": 49800 }
      },
      "synthetic": {
        "histogram": { "bins": [0, 100, 200, ...], "counts": [118, 335, ...] },
        "kde": { "x": [...], "y": [...] },
        "stats": { "mean": 242.1, "stddev": 179.4, "min": 0.5, "max": 49800 }
      },
      "js_divergence": 0.04
    }
  ],
  "correlation": {
    "real": [[1.0, 0.42, ...], [0.42, 1.0, ...]],
    "synthetic": [[1.0, 0.40, ...], [0.40, 1.0, ...]],
    "column_names": ["amount", "hour_of_day", ...]
  },
  "sample_rows": [
    { "amount": 120.5, "channel": "online", "is_fraud": 0, ... }
  ]
}
```

`sample_rows` contains exactly 50 rows sampled randomly from the generated output. `correlation` matrices are numeric columns only. `kde` arrays contain 200 evenly-spaced points. Histogram bins are fixed at 30 for continuous columns.

---

## Visualisation Components (`preview/`)

All chart data comes from `GET /preview/{run_id}`. Components are purely presentational — no statistical computation in the frontend.

Charting library: **Recharts**. Do not introduce a second charting library.

### DataPreview.jsx

Tab container with four tabs: **Distributions**, **Correlation**, **Prevalence**, **Sample Data**. Fetches from `/preview/{run_id}` once on mount and passes data down as props. Shows a loading skeleton while fetching. Shows `FidelityScoreCard` above the tabs at all times — it is not tab-specific.

### FidelityScoreCard.jsx

Three score displays: composite (large, prominent), column fidelity, correlation fidelity. Colour coding: ≥0.80 green, 0.75–0.80 amber, <0.75 red. Includes a one-line plain-English label per score level — do not show raw numbers alone.

### DistributionChart.jsx

Props: `column` object from `/preview` response (one column at a time). Renders:
- Overlaid histogram bars — real (blue, 60% opacity) and synthetic (orange, 60% opacity) on the same axis
- KDE lines overlaid on top — real (solid blue) and synthetic (dashed orange)
- Stats table below: mean, stddev, min, max for real and synthetic side by side

Categorical columns: grouped bar chart (real vs synthetic frequency per category). No KDE.

Parent `DataPreview.jsx` renders a column selector dropdown — `DistributionChart` renders one column at a time, not all columns simultaneously.

### CorrelationHeatmap.jsx

Two heatmaps side by side: real (left) and synthetic (right). Each cell coloured on a diverging scale: dark blue = +1, white = 0, dark red = −1. Cell value shown as text inside each cell. Column names on both axes. If more than 10 numeric columns, show a note that only the top 10 by variance are displayed.

### PrevalenceBar.jsx

Horizontal grouped bar chart. One group per class (fraud, non-fraud or AML typologies). Each group has two bars: target (grey) and actual (coloured). Difference percentage shown as a label on the actual bar. If actual is within ±0.5pp of target, colour the bar green. Outside tolerance, colour amber.

### SampleTable.jsx

Scrollable table, max height 400px. First 50 rows of synthetic output. Columns auto-detected from row keys. Fraud/AML label column highlighted with a coloured badge (green = 0/non-fraud, red = 1/fraud). Numeric columns right-aligned. No sorting, no pagination — display only.

---

## Coding Standards

**Python**
- Type hints on all function signatures. No exceptions.
- Pydantic for all data models and API schemas.
- No mutable default arguments.
- Docstrings on all public functions and classes — one-line summary, then params and return if non-obvious.
- Never use `print()` in production code. Use the standard `logging` module.
- All file I/O through context managers (`with open(...)`).

**React / JavaScript**
- Functional components only. No class components.
- One component per file.
- Props destructured in function signature.
- No inline styles. Tailwind classes only.
- All API calls go through `utils/api.js` — never call `fetch` directly in a component.
- No `console.log` in production code.

**General**
- No hardcoded magic numbers. Constants go in a `constants.py` or `constants.js` file.
- No commented-out code in committed files.
- Every new function needs a corresponding test before the PR is considered complete.

---

## What Not to Build

These are explicitly out of scope for v1. Do not implement them, do not stub them out speculatively, and do not design for them unless asked.

- Image, text, audio, or video generation
- Real-time or streaming data generation
- Built-in model training or evaluation
- Multi-party or federated generation
- Domain packs for credit risk, insurance, or healthcare
- On-premises or self-hosted deployment tooling
- A public API (REST endpoints exist for the web app only — not a public developer API)

---

## Testing Requirements

- Minimum 80% line coverage on all engine modules (profiler, sampler, validator, fidelity).
- Every domain pack constraint must have at least one test for a passing row and one for a failing row.
- Fidelity scoring must be tested against a known dataset with a pre-computed expected score range.
- API endpoints must have integration tests covering the happy path and the main failure modes (invalid file, unsupported column types, constraint failure rate above threshold).
- All three LLM calls must have unit tests using mocked LLM responses — tests must not make live API calls.
- Each intelligence module must have a fallback test: simulate LLM failure and confirm the system degrades gracefully to manual mode without raising an exception.

Run tests with: `pytest tests/ --cov=backend --cov-report=term-missing`

---

## Audit Report Contents

Every generation run produces a PDF audit report. The report must contain:

1. Run metadata: run ID, timestamp, random seed, row count requested, row count delivered.
2. Source data profile: column names, inferred types, row count, missing value rates.
3. Fitted distributions: per-column distribution type and parameters.
4. Domain pack applied: pack name, version, user configuration summary.
5. Constraints applied: list of all active constraints with parameters.
6. Constraint failures: count of rows that failed validation after 3 attempts and were excluded.
7. Prevalence targets vs actuals: requested vs delivered prevalence per class.
8. Fidelity scores: column fidelity, correlation fidelity, composite score.
9. Fidelity warning flag: clearly marked if composite score is below 0.75.
10. Reproducibility note: instructions for replaying the run using the run ID.
11. LLM assistance log: which LLM touch points were used, which prompt versions, and whether any fell back to manual mode.
12. Session origin: whether the session was created via upload flow or agent flow. If agent, include the agent session ID and a summary of the configuration conversation (tool calls made and their outcomes — not the full chat transcript).

The report is not a summary. It is an audit trail. Write it as if a model risk officer will use it to validate the data before allowing it into a model training pipeline.

---

## Questions to Ask Before Starting Any Feature

1. Is this in scope for v1? (Check the Out of Scope section above.)
2. Does this touch the constraint validation path? If yes, confirm that no constraint failures can be silently passed.
3. Does this change the fidelity scoring formula? If yes, existing tests will break — update them intentionally, not as a side effect.
4. Does this add a new API endpoint? If yes, add it to the API contract section of this file.
5. Does this affect what goes into the audit report? If yes, update the Audit Report Contents section.
6. Does this touch the LLM layer? If yes, confirm: (a) no raw data rows are sent to the LLM, (b) the call has a graceful fallback, (c) the prompt is versioned in `intelligence/prompts/`, and (d) the call is mocked in tests.
7. Does this touch the agent? If yes, confirm: (a) tool handlers never raise exceptions — errors are returned as strings, (b) the agent loop has a maximum iteration cap of 5, (c) `[READY_TO_GENERATE]` and `[WIZARD_STEP]` tokens are stripped before display, and (d) `AgentConfig` serialises cleanly into a `Session` before calling `/generate`.

---

*Last updated: May 2026. Update this file whenever architecture, scope, or standards change. This file is the source of truth — not comments in code, not Slack messages, not verbal agreements.*
