"""Central constants for the Calibra backend. No magic numbers elsewhere."""

# ── Session ────────────────────────────────────────────────────────────────────
SESSION_TTL_HOURS = 2
SESSION_SWEEP_INTERVAL_MINUTES = 15
ANONYMOUS_ROW_LIMIT = 10_000

# ── Generation ─────────────────────────────────────────────────────────────────
MAX_UPLOAD_SIZE_MB = 50
MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024
ASYNC_GENERATION_THRESHOLD = 50_000   # rows; above this, job is queued
PREVIEW_MAX_ROWS = 500
SAMPLE_TABLE_ROWS = 50
CONSTRAINT_REGEN_ATTEMPTS = 3
PREVALENCE_TOLERANCE_PP = 0.005       # ±0.5 percentage points

# ── Fidelity ───────────────────────────────────────────────────────────────────
FIDELITY_COLUMN_WEIGHT = 0.6
FIDELITY_CORRELATION_WEIGHT = 0.4
FIDELITY_WARNING_THRESHOLD = 0.75

# ── Preview / visualisation ───────────────────────────────────────────────────
KDE_POINTS = 200
HISTOGRAM_BINS = 30
HEATMAP_MAX_COLUMNS = 10

# ── LLM ────────────────────────────────────────────────────────────────────────
LLM_MODEL = "claude-sonnet-4-20250514"
LLM_TIMEOUT_SECONDS = 10.0
LLM_MAX_TOKENS = 1024

PROMPT_VERSIONS = {
    "annotate": "annotate_columns_v1.txt",
    "parse_constraint": "parse_constraints_v1.txt",
    "summarise": "summarise_report_v1.txt",
}

# ── Agent ──────────────────────────────────────────────────────────────────────
AGENT_MAX_MESSAGES = 40
AGENT_SUMMARISE_OLDEST = 20
AGENT_MAX_TOOL_ITERATIONS = 5
AGENT_SYSTEM_PROMPT_FILE = "agent_system_v1.txt"

# ── Domain packs ───────────────────────────────────────────────────────────────
VALID_DOMAIN_PACKS = {"fraud", "aml", "none"}

VALID_TYPOLOGIES = {
    "card_not_present",
    "account_takeover",
    "synthetic_identity",
    "first_party_fraud",
    "structuring",
    "fan_out",
    "fan_in",
    "scatter_gather",
    "circular_flow",
}

# ── Column types ───────────────────────────────────────────────────────────────
COLUMN_TYPES = {"continuous", "categorical", "datetime", "boolean", "id"}
CATEGORICAL_UNIQUE_THRESHOLD = 10     # ≤ this many unique values → categorical
DISTRIBUTION_TYPES = {"normal", "lognormal", "uniform", "exponential", "categorical"}

# ── Auth ───────────────────────────────────────────────────────────────────────
JWT_ALGORITHM = "HS256"
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24   # 24 hours
