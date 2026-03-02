"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/calculations";
import { UNIT_LABELS } from "@/types";
import { Pencil, Trash2, Check, X, User, Camera } from "lucide-react";
import Link from "next/link";
import type { ProjectActivity, AppUser } from "@/types";

function formatCompletedDate(date: Date | string | null): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  return `${day}/${month}`;
}

export function ActivityRow({
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
  crewMembers?: AppUser[];
  readOnly?: boolean;
  pendingToggles?: Set<string>;
  onUpdate: (id: string, data: Partial<ProjectActivity>) => void;
  onDelete: (id: string) => void;
  onToggleComplete: (id: string, complete: boolean) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    cost: activity.cost ?? 0,
    hours: activity.hours ?? 0,
    manpower: activity.manpower ?? 1,
    quantity: activity.quantity ?? 1,
  });

  const lineTotal =
    (activity.cost ?? 0) * (activity.quantity ?? 1);
  const unitLabel = activity.unit
    ? UNIT_LABELS[activity.unit] ?? activity.unit
    : "";

  // For workers with pending changes, show visual state from pending set
  const isPendingToggle = pendingToggles?.has(activity.id) ?? false;
  const displayComplete = isPendingToggle
    ? !(activity.isComplete ?? false) // flip the display
    : (activity.isComplete ?? false);

  function saveEdit() {
    onUpdate(activity.id, editData);
    setEditing(false);
  }

  function cancelEdit() {
    setEditData({
      cost: activity.cost ?? 0,
      hours: activity.hours ?? 0,
      manpower: activity.manpower ?? 1,
      quantity: activity.quantity ?? 1,
    });
    setEditing(false);
  }

  function handleCrewChange(value: string) {
    const crewId = value === "__none__" ? null : value;
    onUpdate(activity.id, { crewId } as Partial<ProjectActivity>);
  }

  return (
    <div
      className={`flex items-start gap-2 py-2 px-3 hover:bg-accent/30 rounded transition-colors ${
        displayComplete ? "opacity-60" : ""
      } ${isPendingToggle ? "bg-yellow-50 dark:bg-yellow-950/20" : ""}`}
      style={{ paddingLeft: `${depth * 24 + 12}px` }}
    >
      <Checkbox
        checked={displayComplete}
        onCheckedChange={(checked) =>
          onToggleComplete(activity.id, checked as boolean)
        }
        className="shrink-0 mt-0.5"
      />

      <div className="flex-1 min-w-0">
        <span
          className={`text-sm block truncate ${
            displayComplete ? "line-through text-muted-foreground" : ""
          }`}
          title={activity.name}
        >
          {activity.name}
        </span>
        {/* Crew assignment badge (compact) */}
        {activity.crewName && !editing && (
          <span className="ml-2 inline-flex items-center gap-0.5 text-xs text-blue-600 bg-blue-50 dark:bg-blue-950/30 px-1.5 py-0.5 rounded">
            <User className="h-2.5 w-2.5" />
            {activity.crewName}
          </span>
        )}
        {/* Completion info inline */}
        {activity.isComplete && activity.completedByName && !isPendingToggle && (
          <div className="text-[11px] text-muted-foreground mt-0.5 italic">
            ✓ Completed by {activity.completedByName}
            {activity.completedAt ? `, ${formatCompletedDate(activity.completedAt)}` : ""}
          </div>
        )}
        {isPendingToggle && (
          <div className="text-[11px] text-yellow-600 dark:text-yellow-400 mt-0.5 font-medium">
            {displayComplete ? "Will be marked complete" : "Will be unmarked"}
            {" — save to apply"}
          </div>
        )}
      </div>

      {editing ? (
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">$</span>
            <Input
              type="number"
              value={editData.cost}
              onChange={(e) =>
                setEditData((d) => ({ ...d, cost: parseFloat(e.target.value) || 0 }))
              }
              className="w-20 h-7 text-xs"
              step="0.01"
              min="0"
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">qty</span>
            <Input
              type="number"
              value={editData.quantity}
              onChange={(e) =>
                setEditData((d) => ({
                  ...d,
                  quantity: parseFloat(e.target.value) || 1,
                }))
              }
              className="w-16 h-7 text-xs"
              step="1"
              min="0"
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">hrs</span>
            <Input
              type="number"
              value={editData.hours}
              onChange={(e) =>
                setEditData((d) => ({
                  ...d,
                  hours: parseFloat(e.target.value) || 0,
                }))
              }
              className="w-16 h-7 text-xs"
              step="0.25"
              min="0"
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">crew</span>
            <Input
              type="number"
              value={editData.manpower}
              onChange={(e) =>
                setEditData((d) => ({
                  ...d,
                  manpower: parseInt(e.target.value) || 1,
                }))
              }
              className="w-14 h-7 text-xs"
              step="1"
              min="1"
            />
          </div>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveEdit}>
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEdit}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2 shrink-0">
          {/* Photos link */}
          <Link
            href={`/activities/${activity.id}/photos`}
            onClick={() =>
              sessionStorage.setItem(
                `activity-${activity.id}`,
                JSON.stringify({
                  name: activity.name,
                  projectId: activity.projectId,
                })
              )
            }
            className="relative flex items-center justify-center h-7 w-7 rounded hover:bg-accent transition-colors"
            title="Photos"
          >
            <Camera className="h-3.5 w-3.5 text-muted-foreground" />
            {(activity.photoCount ?? 0) > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                {activity.photoCount}
              </span>
            )}
          </Link>

          {/* Crew selector (minimal, coordinator+) */}
          {!readOnly && crewMembers.length > 0 && (
            <Select
              value={activity.crewId ?? "__none__"}
              onValueChange={handleCrewChange}
            >
              <SelectTrigger className="h-7 w-[90px] text-xs border-dashed">
                <SelectValue placeholder="Assign" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">
                  <span className="text-muted-foreground">None</span>
                </SelectItem>
                {crewMembers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <span className="text-xs text-muted-foreground">
            {activity.quantity && activity.quantity !== 1
              ? `${activity.quantity} ${unitLabel} @`
              : ""}
          </span>
          <span className="text-sm font-medium w-20 text-right">
            {formatCurrency(lineTotal)}
          </span>
          {!readOnly && (
            <>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => setEditing(true)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-destructive"
                onClick={() => {
                  if (confirm("Delete this activity?")) onDelete(activity.id);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
