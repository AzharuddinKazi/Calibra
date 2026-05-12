import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

export default function ConstraintReview({ parsed, onConfirm, onDiscard }) {
  if (!parsed) return null;

  const { constraint, readable_summary, message } = parsed;

  if (!constraint || !constraint.parseable) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertTitle>Could not parse constraint</AlertTitle>
        <AlertDescription className="mt-2 space-y-2">
          <p>{message || constraint?.parse_error}</p>
          <Button size="sm" variant="outline" onClick={onDiscard}>Dismiss</Button>
        </AlertDescription>
      </Alert>
    );
  }

  const isLow = constraint.confidence === "low";
  const variant = isLow ? "warning" : "success";

  return (
    <Alert variant={variant}>
      {isLow ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
      <AlertTitle className="flex items-center gap-2">
        Parsed Constraint
        <Badge variant={isLow ? "warning" : "success"} className="text-xs">
          {constraint.confidence} confidence
        </Badge>
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        <p className="font-medium">{readable_summary}</p>
        {isLow && (
          <p className="text-sm">We made some assumptions — please review before confirming.</p>
        )}
        <div className="flex gap-2">
          <Button size="sm" onClick={onConfirm}>Confirm</Button>
          <Button size="sm" variant="outline" onClick={onDiscard}>Discard</Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
