import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MessageSquare, Upload } from "lucide-react";

export default function AgentEntryPoint({ onSelectMode }) {
  return (
    <div className="max-w-2xl mx-auto py-12 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="text-primary">◆</span> Calibra
        </h1>
        <p className="text-muted-foreground">
          Domain-configurable synthetic data for financial crime datasets.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card
          className="cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
          onClick={() => onSelectMode("agent_first", "chat")}
        >
          <CardHeader>
            <div className="rounded-lg bg-primary/10 p-3 w-fit mb-2">
              <MessageSquare className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-lg">Describe what you need</CardTitle>
            <CardDescription>
              Chat with the agent to configure your dataset. It'll ask the right questions and build the config for you.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card
          className="cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
          onClick={() => onSelectMode("upload_first", "upload")}
        >
          <CardHeader>
            <div className="rounded-lg bg-primary/10 p-3 w-fit mb-2">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-lg">Upload your dataset</CardTitle>
            <CardDescription>
              Upload a sample CSV. Calibra learns its structure and generates synthetic data at scale with domain constraints applied.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
