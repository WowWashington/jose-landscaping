"use client";

import { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { Button } from "@/components/ui/button";
import { EstimatePDF } from "./estimate-pdf";
import { formatEstimateData } from "@/lib/format-estimate";
import { useSettings } from "@/lib/use-settings";
import type { Project } from "@/types";
import { FileDown, Mail, Loader2 } from "lucide-react";

export function GenerateEstimateButton({ project }: { project: Project }) {
  const [generating, setGenerating] = useState(false);
  const { settings } = useSettings();

  async function generateAndDownload() {
    setGenerating(true);
    try {
      const data = formatEstimateData(project);
      const blob = await pdf(
        <EstimatePDF data={data} businessName={settings.businessName} businessSubtitle={settings.businessSubtitle} />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `estimate-${project.name.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setGenerating(false);
    }
  }

  async function generateAndEmail() {
    setGenerating(true);
    try {
      const data = formatEstimateData(project);
      const blob = await pdf(
        <EstimatePDF data={data} businessName={settings.businessName} businessSubtitle={settings.businessSubtitle} />
      ).toBlob();

      // Create a download first (since mailto can't attach files directly)
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `estimate-${project.name.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      // Then open mail client with pre-filled subject and body
      const to = project.contact?.email ?? "";
      const subject = encodeURIComponent(
        `Estimate: ${project.name} - ${settings.businessName}`
      );
      const body = encodeURIComponent(
        `Hi ${project.contact?.name ?? ""},\n\nPlease find the attached estimate for your ${project.name} project.\n\nTotal Estimate: $${data.summary.totalCost.toFixed(2)}\n\nPlease let me know if you have any questions.\n\nThank you,\n${settings.businessName}`
      );
      window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="flex gap-2 flex-wrap">
      <Button
        onClick={generateAndDownload}
        disabled={generating}
        variant="outline"
        className="gap-2"
      >
        {generating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileDown className="h-4 w-4" />
        )}
        Download PDF
      </Button>
      <Button
        onClick={generateAndEmail}
        disabled={generating}
        variant="outline"
        className="gap-2"
      >
        {generating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Mail className="h-4 w-4" />
        )}
        Send via Email
      </Button>
    </div>
  );
}
