"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  Check,
  X,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/calculations";
import { UNIT_LABELS, UNIT_OPTIONS } from "@/types";
import type { TaskTemplate } from "@/types";

function TaskNode({
  task,
  depth = 0,
  siblings,
  index,
  onUpdate,
  onDelete,
  onMove,
  onAddChild,
  onRefresh,
}: {
  task: TaskTemplate;
  depth?: number;
  siblings: TaskTemplate[];
  index: number;
  onUpdate: (id: string, data: Partial<TaskTemplate>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onMove: (siblings: TaskTemplate[], fromIndex: number, direction: "up" | "down") => Promise<void>;
  onAddChild: (parentId: string, parentCategory: string | null, depth: number) => void;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(depth === 0);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: task.name,
    defaultCost: task.defaultCost ?? 0,
    defaultHours: task.defaultHours ?? 0,
    defaultManpower: task.defaultManpower ?? 1,
    unit: task.unit ?? "each",
  });

  const hasChildren = task.children && task.children.length > 0;
  const unitLabel = task.unit ? UNIT_LABELS[task.unit] ?? task.unit : "";
  const isFirst = index === 0;
  const isLast = index === siblings.length - 1;
  const isCategory = depth === 0;

  async function saveEdit() {
    await onUpdate(task.id, {
      name: editData.name,
      defaultCost: editData.defaultCost,
      defaultHours: editData.defaultHours,
      defaultManpower: editData.defaultManpower,
      unit: editData.unit,
    });
    setEditing(false);
  }

  function cancelEdit() {
    setEditData({
      name: task.name,
      defaultCost: task.defaultCost ?? 0,
      defaultHours: task.defaultHours ?? 0,
      defaultManpower: task.defaultManpower ?? 1,
      unit: task.unit ?? "each",
    });
    setEditing(false);
  }

  // ── Editing mode ──
  if (editing) {
    return (
      <div
        className="border rounded-lg p-3 bg-accent/20 space-y-2 my-1"
        style={{ marginLeft: `${depth * 20}px` }}
      >
        <div className="flex items-center gap-2">
          <Input
            value={editData.name}
            onChange={(e) => setEditData((d) => ({ ...d, name: e.target.value }))}
            className="flex-1 h-8 text-sm"
            placeholder="Task name"
          />
        </div>
        {!isCategory && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground w-8">Cost</span>
              <Input
                type="number"
                value={editData.defaultCost}
                onChange={(e) =>
                  setEditData((d) => ({ ...d, defaultCost: parseFloat(e.target.value) || 0 }))
                }
                className="w-24 h-8 text-sm"
                step="0.01"
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground w-8">Hrs</span>
              <Input
                type="number"
                value={editData.defaultHours}
                onChange={(e) =>
                  setEditData((d) => ({ ...d, defaultHours: parseFloat(e.target.value) || 0 }))
                }
                className="w-20 h-8 text-sm"
                step="0.25"
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground w-8">Crew</span>
              <Input
                type="number"
                value={editData.defaultManpower}
                onChange={(e) =>
                  setEditData((d) => ({ ...d, defaultManpower: parseInt(e.target.value) || 1 }))
                }
                className="w-16 h-8 text-sm"
                min={1}
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground w-8">Unit</span>
              <Select
                value={editData.unit}
                onValueChange={(v) => setEditData((d) => ({ ...d, unit: v }))}
              >
                <SelectTrigger className="w-28 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_OPTIONS.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        <div className="flex gap-1.5 pt-1">
          <Button size="sm" className="h-7 gap-1" onClick={saveEdit}>
            <Check className="h-3.5 w-3.5" /> Save
          </Button>
          <Button size="sm" variant="outline" className="h-7 gap-1" onClick={cancelEdit}>
            <X className="h-3.5 w-3.5" /> Cancel
          </Button>
        </div>
      </div>
    );
  }

  // ── Category row (depth 0) ──
  if (isCategory) {
    return (
      <div className="mb-2">
        <div className="flex items-center gap-1 group">
          <button
            className="flex-1 flex items-center gap-2 py-2.5 px-3 hover:bg-accent/30 rounded transition-colors text-left"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <span className="font-semibold text-base flex-1">{task.name}</span>
            {hasChildren && (
              <span className="text-xs text-muted-foreground">
                {task.children!.length} items
              </span>
            )}
          </button>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            {!isFirst && (
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onMove(siblings, index, "up")} title="Move up">
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
            )}
            {!isLast && (
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onMove(siblings, index, "down")} title="Move down">
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(true)} title="Edit">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-green-700"
              onClick={() => onAddChild(task.id, task.category, 1)}
              title="Add service"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        {expanded && (
          <div className="ml-2 border-l pl-1">
            {(task.children ?? []).map((child, ci) => (
              <TaskNode
                key={child.id}
                task={child}
                depth={1}
                siblings={task.children ?? []}
                index={ci}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onMove={onMove}
                onAddChild={onAddChild}
                onRefresh={onRefresh}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Service row (depth 1) or sub-task row (depth 2) ──
  return (
    <div>
      <div className="flex items-center gap-1 group">
        {hasChildren ? (
          <button
            className="flex-1 flex items-center gap-2 py-1.5 px-3 hover:bg-accent/30 rounded transition-colors text-left"
            style={{ paddingLeft: `${depth * 20 + 12}px` }}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            )}
            <span className="font-medium text-sm flex-1">{task.name}</span>
            {task.defaultCost != null && (
              <span className="text-xs text-muted-foreground shrink-0">
                {formatCurrency(task.defaultCost)}{unitLabel ? `/${unitLabel}` : ""}
              </span>
            )}
            <span className="text-xs text-muted-foreground shrink-0">
              {task.children!.length} steps
            </span>
          </button>
        ) : (
          <div
            className="flex-1 flex items-center gap-2 py-1.5 px-3 hover:bg-accent/30 rounded transition-colors text-sm"
            style={{ paddingLeft: `${depth * 20 + 12}px` }}
          >
            <div className="w-3.5" />
            <span className="flex-1">{task.name}</span>
            {task.defaultCost != null && (
              <span className="text-xs text-muted-foreground shrink-0">
                {formatCurrency(task.defaultCost)}{unitLabel ? `/${unitLabel}` : ""}
              </span>
            )}
          </div>
        )}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 pr-1">
          {!isFirst && (
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onMove(siblings, index, "up")} title="Move up">
              <ArrowUp className="h-3 w-3" />
            </Button>
          )}
          {!isLast && (
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onMove(siblings, index, "down")} title="Move down">
              <ArrowDown className="h-3 w-3" />
            </Button>
          )}
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditing(true)} title="Edit">
            <Pencil className="h-3 w-3" />
          </Button>
          {depth === 1 && (
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-green-700"
              onClick={() => onAddChild(task.id, task.category, 2)}
              title="Add sub-task"
            >
              <Plus className="h-3 w-3" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-destructive"
            onClick={() => {
              if (confirm(`Delete "${task.name}"${hasChildren ? " and all its sub-tasks" : ""}?`)) {
                onDelete(task.id);
              }
            }}
            title="Delete"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      {expanded && hasChildren && (
        <div>
          {(task.children ?? []).map((child, ci) => (
            <TaskNode
              key={child.id}
              task={child}
              depth={depth + 1}
              siblings={task.children ?? []}
              index={ci}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onMove={onMove}
              onAddChild={onAddChild}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function TaskTree({
  templates,
  onUpdate,
  onDelete,
  onMove,
  onAddChild,
  onRefresh,
}: {
  templates: TaskTemplate[];
  onUpdate: (id: string, data: Partial<TaskTemplate>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onMove: (siblings: TaskTemplate[], fromIndex: number, direction: "up" | "down") => Promise<void>;
  onAddChild: (parentId: string, parentCategory: string | null, depth: number) => void;
  onRefresh: () => void;
}) {
  if (templates.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">No tasks in the library yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {templates.map((category, i) => (
        <TaskNode
          key={category.id}
          task={category}
          depth={0}
          siblings={templates}
          index={i}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onMove={onMove}
          onAddChild={onAddChild}
          onRefresh={onRefresh}
        />
      ))}
    </div>
  );
}
