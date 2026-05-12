import WizardStep from "./WizardStep";
import ConfirmGenerate from "./ConfirmGenerate";

export default function AgentWizard({ messages, isLoading, readyToGenerate, config, onSend, onGenerate }) {
  const agentMessages = messages.filter((m) => m.role === "assistant");
  const currentStep = agentMessages.length;
  const latestMessage = agentMessages[agentMessages.length - 1]?.content || "";

  const totalSteps = 5;
  const progress = Math.min(100, (currentStep / totalSteps) * 100);

  return (
    <div className="max-w-lg mx-auto py-8 px-4 space-y-6">
      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Step {currentStep} of {totalSteps}</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-2 bg-blue-600 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {currentStep === 0 && !isLoading && (
        <div className="text-center text-gray-500 text-sm py-6">
          Starting your configuration wizard…
        </div>
      )}

      {latestMessage && !readyToGenerate && (
        <WizardStep
          step={currentStep}
          message={latestMessage}
          onAnswer={onSend}
          isLoading={isLoading}
        />
      )}

      {isLoading && (
        <div className="text-sm text-gray-400 text-center animate-pulse">Processing…</div>
      )}

      {readyToGenerate && (
        <ConfirmGenerate config={config} onGenerate={onGenerate} />
      )}
    </div>
  );
}
