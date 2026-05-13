import { useState } from "react";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Check, ArrowLeft } from "lucide-react";
import Upload from "./components/upload/Upload";
import ColumnPreviewTable from "./components/upload/ColumnPreviewTable";
import ColumnAnnotations from "./components/intelligence/ColumnAnnotations";
import ConstraintInput from "./components/intelligence/ConstraintInput";
import ConstraintReview from "./components/intelligence/ConstraintReview";
import PrevalenceBenchmark from "./components/intelligence/PrevalenceBenchmark";
import DomainConfig from "./components/config/DomainConfig";
import ConstraintList from "./components/config/ConstraintList";
import PrevalenceSlider from "./components/config/PrevalenceSlider";
import DistributionEditor from "./components/config/DistributionEditor";
import CategoryFrequencyEditor from "./components/config/CategoryFrequencyEditor";
import ConstraintBuilder from "./components/config/ConstraintBuilder";
import GenerationPanel from "./components/generation/GenerationPanel";
import AgentEntryPoint from "./components/agent/AgentEntryPoint";
import AgentChat from "./components/agent/AgentChat";
import AgentWizard from "./components/agent/AgentWizard";
import ConfigSummaryPanel from "./components/agent/ConfigSummaryPanel";
import ConfirmGenerate from "./components/agent/ConfirmGenerate";
import ColumnConfigGrid from "./components/columnconfig/ColumnConfigGrid";
import DataPreview from "./components/preview/DataPreview";
import ResultsDownload from "./components/results/ResultsDownload";
import { useAgent } from "./hooks/useAgent";
import { useAnnotation } from "./hooks/useAnnotation";
import { useConstraintParser } from "./hooks/useConstraintParser";
import { useDistributionOverrides } from "./hooks/useDistributionOverrides";
import { useColumnConfig } from "./hooks/useColumnConfig";
import { annotateColumns } from "./utils/api";
import { generate, replay, patchAgentColumns } from "./utils/api";

const VIEW = {
  ENTRY: "entry",
  UPLOAD: "upload",
  CONFIGURE: "configure",
  AGENT_CHAT: "agent_chat",
  COLUMN_CONFIG: "column_config",
  RESULTS: "results",
};

const UPLOAD_STEPS = [
  { id: 1, label: "Upload", view: VIEW.UPLOAD },
  { id: 2, label: "Configure", view: VIEW.CONFIGURE },
  { id: 3, label: "Results", view: VIEW.RESULTS },
];

function stepFromView(view) {
  if (view === VIEW.UPLOAD) return 1;
  if (view === VIEW.CONFIGURE) return 2;
  if (view === VIEW.RESULTS) return 3;
  return 0;
}

function Sidebar({ currentView, onHome }) {
  const currentStep = stepFromView(currentView);
  return (
    <aside className="w-60 shrink-0 flex flex-col border-r border-border bg-card min-h-screen sticky top-0 h-screen overflow-hidden">
      <div className="px-6 py-5 border-b border-border">
        <button
          onClick={onHome}
          className="flex items-center gap-2 group focus:outline-none"
        >
          <span className="text-primary text-xl leading-none group-hover:drop-shadow-[0_0_8px_hsl(235_80%_65%/0.7)] transition-all">
            ◆
          </span>
          <span className="font-semibold text-base tracking-tight text-foreground">Calibra</span>
        </button>
        <p className="text-xs text-muted-foreground mt-1 pl-0.5">Synthetic Data Engine</p>
      </div>

      <nav className="px-3 py-6 flex flex-col gap-0.5">
        {UPLOAD_STEPS.map((step) => {
          const done = currentStep > step.id;
          const active = currentStep === step.id;
          return (
            <div
              key={step.id}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors",
                active && "bg-primary/10 text-primary font-medium",
                done && "text-muted-foreground",
                !active && !done && "text-muted-foreground/40"
              )}
            >
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 border transition-colors",
                  active && "border-primary bg-primary text-primary-foreground",
                  done && "border-emerald-500/60 bg-emerald-500/10 text-emerald-400",
                  !active && !done && "border-border/50 text-muted-foreground/40"
                )}
              >
                {done ? <Check className="w-3 h-3" /> : step.id}
              </div>
              {step.label}
            </div>
          );
        })}
      </nav>

      <div className="mt-auto px-4 py-5 border-t border-border">
        <p className="text-xs text-muted-foreground/40 leading-relaxed">
          Financial crime · Fraud · AML
        </p>
      </div>
    </aside>
  );
}

export default function App() {
  const [view, setView] = useState(VIEW.ENTRY);
  const [agentMode, setAgentMode] = useState("chat");
  const [entryLoading, setEntryLoading] = useState(false);
  const [entryError, setEntryError] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [columnProfiles, setColumnProfiles] = useState([]);
  const [domainPack, setDomainPack] = useState("none");
  const [typologies, setTypologies] = useState([]);
  const [prevalence, setPrevalence] = useState(null);
  const [constraints, setConstraints] = useState([]);
  const [generationResult, setGenerationResult] = useState(null);
  const [previewRunId, setPreviewRunId] = useState(null);
  const [selectedCatColumn, setSelectedCatColumn] = useState(null);

  const agent = useAgent();
  const annotation = useAnnotation();
  const constraintParser = useConstraintParser();
  const { overrides, setOverride, clearOverride } = useDistributionOverrides();
  const columnConfig = useColumnConfig();

  async function handleEntrySelect(entryPoint, mode) {
    setEntryError(null);
    if (entryPoint === "agent_first") {
      setEntryLoading(true);
      const session = await agent.startSession(mode, "agent_first");
      setEntryLoading(false);
      if (!session) {
        setEntryError(
          "Could not connect to the backend. Make sure the server is running and try again."
        );
        return;
      }
      setAgentMode(mode);
      setView(VIEW.AGENT_CHAT);
    } else {
      setView(VIEW.UPLOAD);
    }
  }

  async function handleUploadComplete(uploadData) {
    setSessionId(uploadData.session_id);
    setColumnProfiles(uploadData.column_profiles || []);
    setView(VIEW.CONFIGURE);
    annotation.annotate(uploadData.session_id);
  }

  function handleAnnotationAccept() {
    if (
      annotation.result?.recommended_domain_pack &&
      annotation.result.recommended_domain_pack !== "none"
    ) {
      setDomainPack(annotation.result.recommended_domain_pack);
    }
  }

  async function handleConstraintParse(sid, text) {
    await constraintParser.parse(sid, text);
  }

  function handleConstraintConfirm() {
    const result = constraintParser.confirm();
    if (result?.constraint?.parseable) {
      setConstraints((prev) => [
        ...prev,
        {
          rule_type: result.constraint.rule_type,
          column: result.constraint.column,
          params: result.constraint.params || {},
          readable_summary: result.constraint.readable_summary,
          source: "user_nl",
        },
      ]);
    }
  }

  function handleConstraintDelete(index) {
    setConstraints((prev) => prev.filter((_, i) => i !== index));
  }

  function handleAddManualConstraint(constraint) {
    setConstraints((prev) => [...prev, constraint]);
  }

  function handleEditCategoryColumn(colName) {
    setSelectedCatColumn(colName);
  }

  function handleCategoryFreqSave(freqs) {
    if (!selectedCatColumn) return;
    setOverride(selectedCatColumn, {
      distribution: "categorical",
      params: { frequencies: freqs },
    });
  }

  function handleCategoryFreqClear() {
    if (!selectedCatColumn) return;
    clearOverride(selectedCatColumn);
  }

  async function handleGenerate(rowCount) {
    const sid = sessionId || agent.sessionId;
    if (!sid) return;
    try {
      const result = await generate({
        session_id: sid,
        row_count: rowCount,
        domain_pack: domainPack || agent.config?.domain_pack || "none",
        domain_config: { active_constraints: constraints },
        random_seed: 42,
        distribution_overrides: overrides,
      });
      setGenerationResult(result);
      setPreviewRunId(result.run_id);
      setView(VIEW.RESULTS);
    } catch (err) {
      alert(`Generation failed: ${err.message}`);
    }
  }

  async function handleReplay(runId) {
    try {
      const result = await replay(runId);
      setGenerationResult(result);
      setPreviewRunId(result.run_id);
    } catch (err) {
      alert(`Replay failed: ${err.message}`);
    }
  }

  function handleConfigureColumns() {
    const specs = agent.config?.columns;
    if (specs?.length > 0) {
      // Only re-initialise the grid on first visit to preserve prior edits
      if (columnConfig.columns.length === 0) {
        columnConfig.initFromSpec(specs);
      }
      setView(VIEW.COLUMN_CONFIG);
    }
  }

  async function handleColumnConfigComplete() {
    const updatedSpecs = columnConfig.getUpdatedSpecs();
    if (agent.sessionId && updatedSpecs.length > 0) {
      try {
        await patchAgentColumns(agent.sessionId, updatedSpecs);
      } catch (err) {
        // Non-fatal — generation uses whatever the server has
        console.error("Failed to sync column config:", err.message);
      }
    }
    setView(VIEW.CONFIGURE);
  }

  const selectedCatProfile = columnProfiles.find(
    (p) => p.name === selectedCatColumn && p.col_type === "categorical"
  ) ?? null;

  const catFreqOverride =
    selectedCatColumn && overrides[selectedCatColumn]?.params?.frequencies
      ? overrides[selectedCatColumn].params.frequencies
      : null;

  if (view === VIEW.ENTRY) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AgentEntryPoint
          onSelectMode={handleEntrySelect}
          isLoading={entryLoading}
          error={entryError}
        />
      </div>
    );
  }

  if (view === VIEW.AGENT_CHAT) {
    const hasColumns = !!(agent.config?.columns?.length > 0);

    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="h-14 border-b border-border flex items-center px-5 shrink-0 bg-card/50 backdrop-blur-sm">
          <button
            onClick={() => setView(VIEW.ENTRY)}
            className="text-muted-foreground hover:text-foreground transition-colors text-sm flex items-center gap-1.5 mr-5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
          <span className="text-primary text-base leading-none mr-2">◆</span>
          <span className="font-semibold text-sm">Calibra</span>
          <span className="mx-3 text-border/60">|</span>
          <span className="text-sm text-muted-foreground">AI Agent</span>

          <div className="ml-auto flex items-center gap-1.5">
            {["chat", "wizard"].map((m) => (
              <button
                key={m}
                onClick={() => {
                  setAgentMode(m);
                  agent.switchMode(m);
                }}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-full capitalize transition-colors font-medium",
                  agentMode === m
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </header>

        <div
          className="flex flex-1 overflow-hidden"
          style={{ height: "calc(100vh - 3.5rem)" }}
        >
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            {agentMode === "chat" ? (
              <AgentChat
                messages={agent.messages}
                isLoading={agent.isLoading}
                readyToGenerate={agent.readyToGenerate}
                config={agent.config}
                suggestions={agent.suggestions ?? []}
                hasColumns={hasColumns}
                onSend={agent.sendMessage}
                onGenerate={handleGenerate}
                onConfigureColumns={handleConfigureColumns}
              />
            ) : (
              <AgentWizard
                messages={agent.messages}
                isLoading={agent.isLoading}
                readyToGenerate={agent.readyToGenerate}
                config={agent.config}
                onSend={agent.sendMessage}
                onGenerate={handleGenerate}
              />
            )}
          </div>

          <aside className="w-72 border-l border-border bg-card overflow-y-auto shrink-0 hidden lg:block">
            <div className="p-5">
              <ConfigSummaryPanel config={agent.config} />
            </div>
          </aside>
        </div>
      </div>
    );
  }

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
            onBack={() => setView(VIEW.AGENT_CHAT)}
            onContinue={handleColumnConfigComplete}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar currentView={view} onHome={() => setView(VIEW.ENTRY)} />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border flex items-center px-8 shrink-0 bg-card/30">
          <button
            onClick={() => setView(VIEW.ENTRY)}
            className="text-muted-foreground hover:text-foreground transition-colors text-sm flex items-center gap-1.5 mr-5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Home
          </button>
          <h1 className="text-sm font-medium text-foreground">
            {view === VIEW.UPLOAD && "Upload Dataset"}
            {view === VIEW.CONFIGURE && "Configure & Generate"}
            {view === VIEW.RESULTS && "Results"}
          </h1>
        </header>

        <main className="flex-1 overflow-y-auto px-8 py-8">
          {view === VIEW.UPLOAD && (
            <div className="max-w-2xl mx-auto space-y-7">
              <div className="space-y-1.5">
                <h2 className="text-2xl font-semibold tracking-tight">Upload your dataset</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Upload a sample CSV — Calibra learns its statistical structure and generates
                  synthetic data at scale.
                </p>
              </div>
              <Upload onUploadComplete={handleUploadComplete} />
            </div>
          )}

          {view === VIEW.CONFIGURE && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl">
              <div className="lg:col-span-2 space-y-8">
                {columnProfiles.length > 0 && (
                  <section className="space-y-3">
                    <SectionHeader>Column Profile</SectionHeader>
                    <ColumnPreviewTable profiles={columnProfiles} />
                  </section>
                )}

                {annotation.loading && (
                  <div className="flex items-center gap-2.5 text-sm text-muted-foreground py-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                    Analysing your dataset with AI…
                  </div>
                )}

                {annotation.result && !annotation.isFallback && (
                  <section className="space-y-3">
                    <SectionHeader>AI Column Annotations</SectionHeader>
                    <ColumnAnnotations
                      annotations={annotation.result.columns}
                      onAccept={handleAnnotationAccept}
                      onReject={() => {}}
                    />
                    <PrevalenceBenchmark
                      annotation={annotation.result}
                      onApply={setPrevalence}
                    />
                  </section>
                )}

                <Separator />

                <section className="space-y-3">
                  <SectionHeader>Distribution Overrides</SectionHeader>
                  <DistributionEditor
                    columns={columnProfiles}
                    overrides={overrides}
                    onOverrideChange={setOverride}
                    onOverrideClear={clearOverride}
                    onEditCategoryColumn={handleEditCategoryColumn}
                  />
                  {selectedCatProfile && (
                    <div className="mt-4">
                      <CategoryFrequencyEditor
                        column={selectedCatProfile}
                        frequencies={catFreqOverride}
                        onSave={handleCategoryFreqSave}
                        onClear={handleCategoryFreqClear}
                      />
                    </div>
                  )}
                </section>

                <Separator />

                <section className="space-y-3">
                  <SectionHeader>Domain Configuration</SectionHeader>
                  <DomainConfig
                    domainPack={domainPack}
                    typologies={typologies}
                    onChange={({ domainPack: dp, typologies: t }) => {
                      setDomainPack(dp);
                      setTypologies(t);
                    }}
                  />
                </section>

                <section className="space-y-3">
                  <SectionHeader>Prevalence Targets</SectionHeader>
                  <PrevalenceSlider
                    domainPack={domainPack}
                    prevalence={prevalence}
                    onChange={setPrevalence}
                  />
                </section>

                <Separator />

                <section className="space-y-3">
                  <SectionHeader>Constraints</SectionHeader>
                  <Tabs defaultValue="ai-parser">
                    <TabsList>
                      <TabsTrigger value="ai-parser">AI Parser</TabsTrigger>
                      <TabsTrigger value="manual-builder">Manual Builder</TabsTrigger>
                    </TabsList>
                    <TabsContent value="ai-parser" className="space-y-3 pt-3">
                      <ConstraintInput
                        sessionId={sessionId}
                        onParse={handleConstraintParse}
                        loading={constraintParser.loading}
                      />
                      {constraintParser.parsed && (
                        <ConstraintReview
                          parsed={constraintParser.parsed}
                          onConfirm={handleConstraintConfirm}
                          onDiscard={constraintParser.discard}
                        />
                      )}
                    </TabsContent>
                    <TabsContent value="manual-builder" className="pt-3">
                      <ConstraintBuilder
                        columns={columnProfiles}
                        onAddConstraint={handleAddManualConstraint}
                      />
                    </TabsContent>
                  </Tabs>
                  <ConstraintList
                    constraints={constraints}
                    onDelete={handleConstraintDelete}
                  />
                </section>

                <Separator />

                <section className="space-y-3">
                  <SectionHeader>Generate</SectionHeader>
                  <GenerationPanel
                    sessionId={sessionId}
                    domainPack={domainPack}
                    domainConfig={{ active_constraints: constraints }}
                    distributionOverrides={overrides}
                    onGenerated={(result) => {
                      setGenerationResult(result);
                      setPreviewRunId(result.run_id);
                      setView(VIEW.RESULTS);
                    }}
                  />
                </section>
              </div>

              <aside>
                <div className="sticky top-8 space-y-4">
                  <div className="rounded-xl border border-border bg-card p-5 space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                      Session Summary
                    </p>
                    {[
                      ["Domain Pack", domainPack !== "none" ? domainPack : null],
                      ["Typologies", typologies.length ? typologies.join(", ") : null],
                      ["Constraints", constraints.length ? `${constraints.length} active` : null],
                      ["Overrides", Object.keys(overrides).length ? `${Object.keys(overrides).length} column${Object.keys(overrides).length > 1 ? "s" : ""}` : null],
                    ].map(([label, val]) => (
                      <div key={label} className="flex justify-between text-xs py-1.5 gap-3">
                        <span className="text-muted-foreground shrink-0">{label}</span>
                        <span
                          className={cn(
                            "font-medium text-right truncate",
                            val ? "text-foreground" : "text-muted-foreground/40 italic"
                          )}
                        >
                          {val || "not set"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          )}

          {view === VIEW.RESULTS && (
            <div className="space-y-10 max-w-5xl mx-auto">
              <ResultsDownload result={generationResult} onReplay={handleReplay} />
              {previewRunId && (
                <section className="space-y-4">
                  <Separator />
                  <h2 className="text-lg font-semibold tracking-tight">Data Preview</h2>
                  <DataPreview runId={previewRunId} />
                </section>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function SectionHeader({ children }) {
  return (
    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
      {children}
    </h3>
  );
}
