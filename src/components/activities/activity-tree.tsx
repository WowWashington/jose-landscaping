"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { ActivityRow } from "./activity-row";
import { formatCurrency } from "@/lib/calculations";
import type { ProjectActivity, CrewMember } from "@/types";

function ActivityGroup({
  activity,
  depth = 0,
  crewMembers = [],
  readOnly = false,
  pendingToggles,
  onUpdate,
  onDelete,
  onToggleComplete,
}: {
  activity: ProjectActivity;
  depth?: number;
  crewMembers?: CrewMember[];
  readOnly?: boolean;
  pendingToggles?: Set<string>;
  onUpdate: (id: string, data: Partial<ProjectActivity>) => void;
  onDelete: (id: string) => void;
  onToggleComplete: (id: string, complete: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = activity.children && activity.children.length > 0;

  if (!hasChildren) {
    return (
      <ActivityRow
        activity={activity}
        depth={depth}
        crewMembers={crewMembers}
        readOnly={readOnly}
        pendingToggles={pendingToggles}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onToggleComplete={onToggleComplete}
      />
    );
  }

  // Calculate group total from children
  const groupTotal = (activity.children ?? []).reduce((sum, child) => {
    const childrenTotal = (child.children ?? []).reduce(
      (s, gc) => s + (gc.cost ?? 0) * (gc.quantity ?? 1),
      0
    );
    if (child.children && child.children.length > 0) {
      return sum + childrenTotal;
    }
    return sum + (child.cost ?? 0) * (child.quantity ?? 1);
  }, 0);

  return (
    <div className="border rounded-lg mb-2 overflow-hidden">
      <button
        className="w-full flex items-center gap-2 p-3 hover:bg-accent/30 transition-colors text-left"
        style={{ paddingLeft: `${depth * 24 + 12}px` }}
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <span className="font-medium text-sm flex-1">{activity.name}</span>
        <span className="text-sm font-medium text-muted-foreground">
          {formatCurrency(groupTotal)}
        </span>
      </button>
      {expanded && (
        <div className="border-t">
          {(activity.children ?? []).map((child) => (
            <ActivityGroup
              key={child.id}
              activity={child}
              depth={depth + 1}
              crewMembers={crewMembers}
              readOnly={readOnly}
              pendingToggles={pendingToggles}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onToggleComplete={onToggleComplete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ActivityTree({
  activities,
  crewMembers = [],
  readOnly = false,
  pendingToggles,
  onUpdate,
  onDelete,
  onToggleComplete,
}: {
  activities: ProjectActivity[];
  crewMembers?: CrewMember[];
  readOnly?: boolean;
  pendingToggles?: Set<string>;
  onUpdate: (id: string, data: Partial<ProjectActivity>) => void;
  onDelete: (id: string) => void;
  onToggleComplete: (id: string, complete: boolean) => void;
}) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">No activities yet.</p>
        <p className="text-xs mt-1">
          Add tasks from the library or create custom ones.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {activities.map((activity) => (
        <ActivityGroup
          key={activity.id}
          activity={activity}
          crewMembers={crewMembers}
          readOnly={readOnly}
          pendingToggles={pendingToggles}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onToggleComplete={onToggleComplete}
        />
      ))}
    </div>
  );
}
