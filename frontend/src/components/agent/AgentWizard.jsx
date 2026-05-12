import { Progress } from "@/components/ui/progress";
import WizardStep from "./WizardStep";
import ConfirmGenerate from "./ConfirmGenerate";

const TOTAL_STEPS = 5;

export default function AgentWizard({ messages, isLoading, readyToGenerate, config, onSend, onGenerate }) {
  const agentMessages = messages.filter((m) => m.role === "assistant");
  const currentStep = agentMessages.length;
  const latestMessage = agentMessages[agentMessages.length - 1]?.content || "";
  const progress = Math.min(100, (currentStep / TOTAL_STEPS) * 100);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Step {currentStep} of {TOTAL_STEPS}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {currentStep === 0 && !isLoading && (
        <p className="text-sm text-muted-foreground text-center py-6">Starting configuration wizard…</p>
      )}

      {latestMessage && !readyToGenerate && (
        <WizardStep step={currentStep} message={latestMessage} onAnswer={onSend} isLoading={isLoading} />
      )}

      {isLoading && (
        <div className="flex justify-center py-4">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {readyToGenerate && <ConfirmGenerate config={config} onGenerate={onGenerate} />}
    </div>
  );
}
