import { useState } from "react";
import { Separator } from "@/components/ui/separator";
import AgentEntryPoint from "./components/agent/AgentEntryPoint";
import AgentChat from "./components/agent/AgentChat";
import AgentWizard from "./components/agent/AgentWizard";
import ConfigSummaryPanel from "./components/agent/ConfigSummaryPanel";
import Upload from "./components/upload/Upload";
import ColumnPreviewTable from "./components/upload/ColumnPreviewTable";
import ColumnAnnotations from "./components/intelligence/ColumnAnnotations";
import ConstraintInput from "./components/intelligence/ConstraintInput";
import ConstraintReview from "./components/intelligence/ConstraintReview";
import PrevalenceBenchmark from "./components/intelligence/PrevalenceBenchmark";
import DomainConfig from "./components/config/DomainConfig";
import ConstraintList from "./components/config/ConstraintList";
import PrevalenceSlider from "./components/config/PrevalenceSlider";
import GenerationPanel from "./components/generation/GenerationPanel";
import DataPreview from "./components/preview/DataPreview";
import ResultsDownload from "./components/results/ResultsDownload";
import { useAgent } from "./hooks/useAgent";
import { useAnnotation } from "./hooks/useAnnotation";
import { useConstraintParser } from "./hooks/useConstraintParser";
import { generate, replay } from "./utils/api";

const VIEW = {
  ENTRY: "entry",
  UPLOAD: "upload",
  CONFIGURE: "configure",
  AGENT_CHAT: "agent_chat",
  RESULTS: "results",
};

export default function App() {
  const [view, setView] = useState(VIEW.ENTRY);
  const [agentMode, setAgentMode] = useState("chat");
  const [sessionId, setSessionId] = useState(null);
  const [columnProfiles, setColumnProfiles] = useState([]);
  const [domainPack, setDomainPack] = useState("none");
  const [typologies, setTypologies] = useState([]);
  const [prevalence, setPrevalence] = useState(null);
  const [constraints, setConstraints] = useState([]);
  const [generationResult, setGenerationResult] = useState(null);
  const [previewRunId, setPreviewRunId] = useState(null);

  const agent = useAgent();
  const annotation = useAnnotation();
  const constraintParser = useConstraintParser();

  async function handleEntrySelect(entryPoint, mode) {
    if (entryPoint === "agent_first") {
      await agent.startSession(mode, "agent_first");
      setAgentMode(mode);
      setView(VIEW.AGENT_CHAT);
    } else {
      setView(VIEW.UPLOAD);
    }
  }

  async function handleUploadComplete(uploadData) {
    setSessionId(uploadData.session_id);
    setColumnProfiles([]);
    setView(VIEW.CONFIGURE);
    annotation.annotate(uploadData.session_id);
  }

  function handleAnnotationAccept(col) {
    if (annotation.result?.recommended_domain_pack && annotation.result.recommended_domain_pack !== "none") {
      setDomainPack(annotation.result.recommended_domain_pack);
    }
  }

  async function handleConstraintParse(sid, text) {
    await constraintParser.parse(sid, text);
  }

  function handleConstraintConfirm() {
    const result = constraintParser.confirm();
    if (result?.constraint?.parseable) {
      setConstraints((prev) => [...prev, {
        rule_type: result.constraint.rule_type,
        column: result.constraint.column,
        params: result.constraint.params || {},
        readable_summary: result.constraint.readable_summary,
        source: "user_nl",
      }]);
    }
  }

  function handleConstraintDelete(index) {
    setConstraints((prev) => prev.filter((_, i) => i !== index));
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <button
            onClick={() => setView(VIEW.ENTRY)}
            className="flex items-center gap-2 font-semibold text-lg hover:text-primary transition-colors"
          >
            <span className="text-primary">◆</span> Calibra
          </button>
          <span className="text-xs text-muted-foreground">Synthetic Data Engine</span>
        </div>
      </header>

      <main className="container py-8">

        {/* Entry */}
        {view === VIEW.ENTRY && (
          <AgentEntryPoint onSelectMode={handleEntrySelect} />
        )}

        {/* Upload */}
        {view === VIEW.UPLOAD && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Upload Dataset</h2>
              <p className="text-muted-foreground mt-1">Upload a sample CSV and Calibra will learn its statistical structure.</p>
            </div>
            <Upload onUploadComplete={handleUploadComplete} />
          </div>
        )}

        {/* Configure */}
        {view === VIEW.CONFIGURE && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">

              {columnProfiles.length > 0 && (
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Column Profile</h3>
                  <ColumnPreviewTable profiles={columnProfiles} />
                </section>
              )}

              {annotation.loading && (
                <p className="text-sm text-muted-foreground animate-pulse">Analysing your dataset with AI…</p>
              )}

              {annotation.result && !annotation.isFallback && (
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">AI Column Annotations</h3>
                  <ColumnAnnotations
                    annotations={annotation.result.columns}
                    onAccept={handleAnnotationAccept}
                    onReject={() => {}}
                  />
                  <PrevalenceBenchmark annotation={annotation.result} onApply={setPrevalence} />
                </section>
              )}

              <Separator />

              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Domain Configuration</h3>
                <DomainConfig
                  domainPack={domainPack}
                  typologies={typologies}
                  onChange={({ domainPack: dp, typologies: t }) => { setDomainPack(dp); setTypologies(t); }}
                />
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Prevalence Targets</h3>
                <PrevalenceSlider domainPack={domainPack} prevalence={prevalence} onChange={setPrevalence} />
              </section>

              <Separator />

              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Constraints</h3>
                <ConstraintInput sessionId={sessionId} onParse={handleConstraintParse} loading={constraintParser.loading} />
                {constraintParser.parsed && (
                  <ConstraintReview parsed={constraintParser.parsed} onConfirm={handleConstraintConfirm} onDiscard={constraintParser.discard} />
                )}
                <ConstraintList constraints={constraints} onDelete={handleConstraintDelete} />
              </section>

              <Separator />

              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Generate</h3>
                <GenerationPanel
                  sessionId={sessionId}
                  domainPack={domainPack}
                  domainConfig={{ active_constraints: constraints }}
                  onGenerated={(result) => {
                    setGenerationResult(result);
                    setPreviewRunId(result.run_id);
                    setView(VIEW.RESULTS);
                  }}
                />
              </section>
            </div>

            <aside className="space-y-4">
              <div className="sticky top-20 space-y-4">
                <div className="rounded-lg border bg-card p-4 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Session Summary</p>
                  {[
                    ["Domain Pack", domainPack !== "none" ? domainPack : null],
                    ["Typologies", typologies.length ? typologies.join(", ") : null],
                    ["Constraints", constraints.length ? `${constraints.length} active` : null],
                  ].map(([label, val]) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{label}</span>
                      <span className={val ? "font-medium" : "text-muted-foreground italic"}>{val || "not set"}</span>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        )}

        {/* Agent chat/wizard */}
        {view === VIEW.AGENT_CHAT && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-6rem)]">
            <div className="lg:col-span-2 flex flex-col rounded-lg border bg-card overflow-hidden">
              <div className="border-b px-4 py-2 flex items-center gap-2">
                {["chat", "wizard"].map((m) => (
                  <button
                    key={m}
                    onClick={() => { setAgentMode(m); agent.switchMode(m); }}
                    className={`text-xs px-3 py-1 rounded-full capitalize transition-colors ${agentMode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              {agentMode === "chat" ? (
                <AgentChat
                  messages={agent.messages}
                  isLoading={agent.isLoading}
                  readyToGenerate={agent.readyToGenerate}
                  config={agent.config}
                  onSend={agent.sendMessage}
                  onGenerate={handleGenerate}
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
            <aside>
              <ConfigSummaryPanel config={agent.config} />
            </aside>
          </div>
        )}

        {/* Results */}
        {view === VIEW.RESULTS && (
          <div className="space-y-10">
            <ResultsDownload result={generationResult} onReplay={handleReplay} />
            {previewRunId && (
              <section className="space-y-4">
                <Separator />
                <h2 className="text-xl font-semibold tracking-tight">Data Preview</h2>
                <DataPreview runId={previewRunId} />
              </section>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
