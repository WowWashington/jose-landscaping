import { formatCurrency, formatHours } from "@/lib/calculations";
import type { ProjectSummary as Summary } from "@/types";
import { DollarSign, Clock, Users } from "lucide-react";

export function ProjectSummary({ summary }: { summary: Summary }) {
  return (
    <div className="grid grid-cols-3 gap-3 p-4 bg-muted/50 rounded-lg">
      <div className="text-center">
        <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
          <DollarSign className="h-4 w-4" />
          <span className="text-xs uppercase tracking-wide">Total Cost</span>
        </div>
        <p className="text-lg font-semibold">
          {formatCurrency(summary.totalCost)}
        </p>
      </div>
      <div className="text-center">
        <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
          <Clock className="h-4 w-4" />
          <span className="text-xs uppercase tracking-wide">Hours</span>
        </div>
        <p className="text-lg font-semibold">
          {formatHours(summary.totalHours)}
        </p>
      </div>
      <div className="text-center">
        <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
          <Users className="h-4 w-4" />
          <span className="text-xs uppercase tracking-wide">Crew</span>
        </div>
        <p className="text-lg font-semibold">
          {summary.maxManpower} {summary.maxManpower === 1 ? "person" : "people"}
        </p>
      </div>
    </div>
  );
}
