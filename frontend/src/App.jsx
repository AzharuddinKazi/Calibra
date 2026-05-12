import { useState } from "react";
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
import { generate } from "./utils/api";

// ── Views ─────────────────────────────────────────────────────────────────────

const VIEW = {
  ENTRY: "entry",
  UPLOAD: "upload",
  CONFIGURE: "configure",
  AGENT_CHAT: "agent_chat",
  PREVIEW: "preview",
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
  const [acceptedAnnotations, setAcceptedAnnotations] = useState([]);

  const agent = useAgent();
  const annotation = useAnnotation();
  const constraintParser = useConstraintParser();

  // ── Entry point selection ─────────────────────────────────────────────────

  async function handleEntrySelect(entryPoint, mode) {
    if (entryPoint === "agent_first") {
      await agent.startSession(mode, "agent_first");
      setAgentMode(mode);
      setView(VIEW.AGENT_CHAT);
    } else {
      setView(VIEW.UPLOAD);
    }
  }

  // ── Upload flow ────────────────────────────────────────────────────────────

  async function handleUploadComplete(uploadData) {
    setSessionId(uploadData.session_id);
    setColumnProfiles([]);
    setView(VIEW.CONFIGURE);
    annotation.annotate(uploadData.session_id);
  }

  // ── Annotation ─────────────────────────────────────────────────────────────

  function handleAnnotationAccept(col) {
    setAcceptedAnnotations((prev) => [...prev, col]);
    if (annotation.result?.recommended_domain_pack) {
      setDomainPack(annotation.result.recommended_domain_pack);
    }
  }

  // ── Constraints ────────────────────────────────────────────────────────────

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

  // ── Generation ─────────────────────────────────────────────────────────────

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

  // ── Agent generation ───────────────────────────────────────────────────────

  async function handleAgentGenerate(rowCount) {
    if (!agent.sessionId) return;
    try {
      const result = await generate({
        session_id: agent.sessionId,
        row_count: rowCount,
        domain_pack: agent.config?.domain_pack || "none",
        domain_config: {},
        random_seed: 42,
      });
      setGenerationResult(result);
      setPreviewRunId(result.run_id);
      setView(VIEW.RESULTS);
    } catch (err) {
      alert(`Generation failed: ${err.message}`);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <button
          onClick={() => setView(VIEW.ENTRY)}
          className="text-lg font-bold text-gray-900 hover:text-blue-600"
        >
          Calibra
        </button>
        <span className="text-xs text-gray-400">Synthetic Data Engine</span>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">

        {/* Entry */}
        {view === VIEW.ENTRY && (
          <AgentEntryPoint onSelectMode={handleEntrySelect} />
        )}

        {/* Upload flow */}
        {view === VIEW.UPLOAD && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800">Upload Dataset</h2>
            <Upload onUploadComplete={handleUploadComplete} />
          </div>
        )}

        {/* Configure flow */}
        {view === VIEW.CONFIGURE && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {columnProfiles.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Column Profile</h3>
                  <ColumnPreviewTable profiles={columnProfiles} />
                </section>
              )}

              {annotation.loading && (
                <p className="text-sm text-gray-400 animate-pulse">Analysing your dataset…</p>
              )}

              {annotation.result && !annotation.isFallback && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Column Annotations</h3>
                  <ColumnAnnotations
                    annotations={annotation.result.columns}
                    onAccept={handleAnnotationAccept}
                    onReject={() => {}}
                  />
                  <div className="mt-4">
                    <PrevalenceBenchmark
                      annotation={annotation.result}
                      onApply={setPrevalence}
                    />
                  </div>
                </section>
              )}

              <section>
                <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Domain Configuration</h3>
                <DomainConfig
                  domainPack={domainPack}
                  typologies={typologies}
                  onChange={({ domainPack: dp, typologies: t }) => {
                    setDomainPack(dp);
                    setTypologies(t);
                  }}
                />
              </section>

              <section>
                <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Prevalence</h3>
                <PrevalenceSlider
                  domainPack={domainPack}
                  prevalence={prevalence}
                  onChange={setPrevalence}
                />
              </section>

              <section>
                <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Constraints</h3>
                <div className="space-y-3">
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
                  <ConstraintList constraints={constraints} onDelete={handleConstraintDelete} />
                </div>
              </section>

              <section>
                <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Generate</h3>
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
              <div className="border border-gray-200 rounded-xl bg-white p-4">
                <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Summary</h3>
                <div className="text-xs text-gray-600 space-y-1">
                  <div className="flex justify-between"><span>Domain Pack</span><span className="font-medium capitalize">{domainPack}</span></div>
                  <div className="flex justify-between"><span>Constraints</span><span className="font-medium">{constraints.length}</span></div>
                  <div className="flex justify-between"><span>Typologies</span><span className="font-medium">{typologies.length}</span></div>
                </div>
              </div>
            </aside>
          </div>
        )}

        {/* Agent chat/wizard */}
        {view === VIEW.AGENT_CHAT && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-120px)]">
            <div className="lg:col-span-2 flex flex-col border border-gray-200 rounded-xl bg-white overflow-hidden">
              <div className="border-b border-gray-200 px-4 py-2 flex items-center gap-2">
                <button
                  onClick={() => setAgentMode("chat")}
                  className={`text-xs px-3 py-1 rounded-full ${agentMode === "chat" ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:text-gray-700"}`}
                >
                  Chat
                </button>
                <button
                  onClick={() => { setAgentMode("wizard"); agent.switchMode("wizard"); }}
                  className={`text-xs px-3 py-1 rounded-full ${agentMode === "wizard" ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:text-gray-700"}`}
                >
                  Wizard
                </button>
              </div>

              {agentMode === "chat" ? (
                <AgentChat
                  messages={agent.messages}
                  isLoading={agent.isLoading}
                  readyToGenerate={agent.readyToGenerate}
                  config={agent.config}
                  onSend={agent.sendMessage}
                  onGenerate={handleAgentGenerate}
                />
              ) : (
                <AgentWizard
                  messages={agent.messages}
                  isLoading={agent.isLoading}
                  readyToGenerate={agent.readyToGenerate}
                  config={agent.config}
                  onSend={agent.sendMessage}
                  onGenerate={handleAgentGenerate}
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
            <ResultsDownload
              result={generationResult}
              onReplay={(rid) => {
                const { replay } = require("./utils/api");
                replay(rid).then((r) => {
                  setGenerationResult(r);
                  setPreviewRunId(r.run_id);
                });
              }}
            />
            {previewRunId && (
              <section>
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Data Preview</h2>
                <DataPreview runId={previewRunId} />
              </section>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
