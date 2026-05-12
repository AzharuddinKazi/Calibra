import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { getPreview } from "../../utils/api";
import FidelityScoreCard from "./FidelityScoreCard";
import DistributionChart from "./DistributionChart";
import CorrelationHeatmap from "./CorrelationHeatmap";
import PrevalenceBar from "./PrevalenceBar";
import SampleTable from "./SampleTable";

export default function DataPreview({ runId }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCol, setSelectedCol] = useState("0");

  useEffect(() => {
    if (!runId) return;
    getPreview(runId)
      .then(setPreview)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [runId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    );
  }
  if (error) return <p className="text-sm text-destructive">Failed to load preview: {error}</p>;
  if (!preview) return null;

  const colIndex = parseInt(selectedCol, 10);

  return (
    <div className="space-y-6">
      <FidelityScoreCard fidelity={preview.fidelity} />

      <Tabs defaultValue="distributions">
        <TabsList>
          <TabsTrigger value="distributions">Distributions</TabsTrigger>
          <TabsTrigger value="correlation">Correlation</TabsTrigger>
          <TabsTrigger value="prevalence">Prevalence</TabsTrigger>
          <TabsTrigger value="sample">Sample Data</TabsTrigger>
        </TabsList>

        <TabsContent value="distributions" className="space-y-4 pt-4">
          {preview.columns?.length > 0 && (
            <Select value={selectedCol} onValueChange={setSelectedCol}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {preview.columns.map((col, i) => (
                  <SelectItem key={col.name} value={String(i)}>{col.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {preview.columns?.[colIndex] && (
            <DistributionChart column={preview.columns[colIndex]} />
          )}
        </TabsContent>

        <TabsContent value="correlation" className="pt-4">
          <CorrelationHeatmap correlation={preview.correlation} />
        </TabsContent>

        <TabsContent value="prevalence" className="pt-4">
          <PrevalenceBar prevalence={preview.prevalence} />
        </TabsContent>

        <TabsContent value="sample" className="pt-4">
          <SampleTable rows={preview.sample_rows} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
