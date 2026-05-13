import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import LandingPage from "./components/landing/LandingPage";
import AgentChat from "./components/agent/AgentChat";
import ConfigSummaryPanel from "./components/agent/ConfigSummaryPanel";
import ColumnConfigGrid from "./components/columnconfig/ColumnConfigGrid";
import DataPreview from "./components/preview/DataPreview";
import ResultsDownload from "./components/results/ResultsDownload";
import { useAgent } from "./hooks/useAgent";
import { useColumnConfig } from "./hooks/useColumnConfig";
import { generate, replay, patchAgentColumns } from "./utils/api";

const VIEW = {
  LANDING: "landing",
  AGENT_CHAT: "agent_chat",
  COLUMN_CONFIG: "column_config",
  RESULTS: "results",
};

export default function App() {
  const [view, setView] = useState(VIEW.LANDING);
  const [entryLoading, setEntryLoading] = useState(false);
  const [entryError, setEntryError] = useState(null);
  const [generationResult, setGenerationResult] = useState(null);
  const [generationError, setGenerationError] = useState(null);
  const [previewRunId, setPreviewRunId] = useState(null);

  const agent = useAgent();
  const columnConfig = useColumnConfig();

  async function handleStart() {
    setEntryError(null);
    setEntryLoading(true);
    const session = await agent.startSession("chat", "agent_first");
    setEntryLoading(false);
    if (!session) {
      const detail = agent.error ? ` (${agent.error})` : "";
      setEntryError(
        `Could not connect to the backend. Make sure the server is running and try again.${detail}`
      );
      return;
    }
    setView(VIEW.AGENT_CHAT);
  }

  async function handleGenerate(rowCount) {
    if (!agent.sessionId) return;
    setGenerationError(null);
    try {
      const result = await generate({
        session_id: agent.sessionId,
        row_count: rowCount,
        domain_pack: agent.config?.domain_pack || "none",
        domain_config: { active_constraints: agent.config?.constraints || [] },
        random_seed: 42,
      });
      setGenerationResult(result);
      setPreviewRunId(result.run_id);
      setView(VIEW.RESULTS);
    } catch (err) {
      setGenerationError(err.message);
    }
  }

  async function handleReplay(runId) {
    try {
      const result = await replay(runId);
      setGenerationResult(result);
      setPreviewRunId(result.run_id);
    } catch (err) {
      setGenerationError(err.message);
      setView(VIEW.AGENT_CHAT);
    }
  }

  function handleConfigureColumns() {
    // Always allow entry into the column config view.
    // Init from agent config if available and not yet initialised locally.
    const specs = agent.config?.columns;
    if (specs?.length > 0 && columnConfig.columns.length === 0) {
      columnConfig.initFromSpec(specs);
    }
    setView(VIEW.COLUMN_CONFIG);
  }

  async function handleColumnConfigComplete() {
    const updatedSpecs = columnConfig.getUpdatedSpecs();
    if (agent.sessionId && updatedSpecs.length > 0) {
      try {
        await patchAgentColumns(agent.sessionId, updatedSpecs);
      } catch (err) {
        console.error("Failed to sync column config:", err.message);
      }
    }
    setView(VIEW.AGENT_CHAT);
  }

  // ── Landing ────────────────────────────────────────────────────────────────

  if (view === VIEW.LANDING) {
    return (
      <LandingPage
        onStart={handleStart}
        isLoading={entryLoading}
        error={entryError}
      />
    );
  }

  // ── Agent Chat ─────────────────────────────────────────────────────────────

  if (view === VIEW.AGENT_CHAT) {
    const hasColumns = !!(agent.config?.columns?.length > 0);

    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="h-14 border-b border-border flex items-center px-5 shrink-0 bg-card/50 backdrop-blur-sm">
          <button
            onClick={() => setView(VIEW.LANDING)}
            className="text-muted-foreground hover:text-foreground transition-colors text-sm flex items-center gap-1.5 mr-5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
          <span className="text-primary text-base leading-none mr-2">◆</span>
          <span className="font-semibold text-sm">Calibra</span>
          <span className="mx-3 text-border/60">|</span>
          <span className="text-sm text-muted-foreground">AI Agent</span>
        </header>

        <div
          className="flex flex-1 overflow-hidden"
          style={{ height: "calc(100vh - 3.5rem)" }}
        >
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            <AgentChat
              messages={agent.messages}
              isLoading={agent.isLoading}
              readyToGenerate={agent.readyToGenerate}
              config={agent.config}
              suggestions={agent.suggestions ?? []}
              suggestionKey={agent.suggestionKey}
              hasColumns={hasColumns}
              generationError={generationError}
              onSend={agent.sendMessage}
              onGenerate={handleGenerate}
              onConfigureColumns={handleConfigureColumns}
            />
          </div>

          <aside className="w-72 border-l border-border bg-card overflow-y-auto shrink-0 hidden lg:block">
            <div className="p-5">
              <ConfigSummaryPanel
                config={agent.config}
                hasColumns={hasColumns}
                onConfigureColumns={handleConfigureColumns}
              />
            </div>
          </aside>
        </div>
      </div>
    );
  }

  // ── Column Config ──────────────────────────────────────────────────────────

  if (view === VIEW.COLUMN_CONFIG) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="h-14 border-b border-border flex items-center px-5 shrink-0 bg-card/50 backdrop-blur-sm">
          <button
            onClick={() => setView(VIEW.AGENT_CHAT)}
            className="text-muted-foreground hover:text-foreground transition-colors text-sm flex items-center gap-1.5 mr-5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Chat
          </button>
          <span className="text-primary text-base leading-none mr-2">◆</span>
          <span className="font-semibold text-sm">Calibra</span>
          <span className="mx-3 text-border/60">|</span>
          <span className="text-sm text-muted-foreground">Column Configuration</span>
        </header>

        <div className="flex-1 overflow-hidden" style={{ height: "calc(100vh - 3.5rem)" }}>
          <ColumnConfigGrid
            columns={columnConfig.columns}
            onColumnChange={columnConfig.updateField}
            onProcess={columnConfig.processColumn}
            onProcessAll={columnConfig.processAll}
            isProcessingAll={columnConfig.isProcessingAll}
            onAddColumn={columnConfig.addColumn}
            onDeleteColumn={columnConfig.deleteColumn}
            onRenameColumn={columnConfig.renameColumn}
            onMoveColumn={columnConfig.moveColumn}
            onResetColumn={columnConfig.resetColumn}
            onDuplicateColumn={columnConfig.duplicateColumn}
            onApplyTemplate={columnConfig.applyTemplate}
            onBack={() => setView(VIEW.AGENT_CHAT)}
            onContinue={handleColumnConfigComplete}
          />
        </div>
      </div>
    );
  }

  // ── Results ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-14 border-b border-border flex items-center px-5 shrink-0 bg-card/50 backdrop-blur-sm">
        <button
          onClick={() => setView(VIEW.AGENT_CHAT)}
          className="text-muted-foreground hover:text-foreground transition-colors text-sm flex items-center gap-1.5 mr-5"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Agent
        </button>
        <span className="text-primary text-base leading-none mr-2">◆</span>
        <span className="font-semibold text-sm">Calibra</span>
        <span className="mx-3 text-border/60">|</span>
        <span className="text-sm text-muted-foreground">Results</span>
      </header>

      <main className="flex-1 overflow-y-auto px-8 py-8">
        <div className="space-y-10 max-w-5xl mx-auto">
          <ResultsDownload result={generationResult} onReplay={handleReplay} />
          {previewRunId && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold tracking-tight">Data Preview</h2>
              <DataPreview runId={previewRunId} />
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
