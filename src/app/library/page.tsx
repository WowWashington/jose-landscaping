"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { TaskTree } from "@/components/library/task-tree";
import { TaskSearch } from "@/components/library/task-search";
import { TaskForm } from "@/components/library/task-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DIVISION_OPTIONS } from "@/types";
import type { TaskTemplate } from "@/types";
import { ListTree, Search, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type AddMode =
  | { type: "category" }
  | { type: "service"; parentId: string; parentCategory: string | null }
  | { type: "subtask"; parentId: string; parentCategory: string | null }
  | null;

export default function LibraryPage() {
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [addMode, setAddMode] = useState<AddMode>(null);
  const [division, setDivision] = useState("yard_care");

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/templates?division=${division}`)
      .then((r) => r.json())
      .then((data) => {
        setTemplates(data);
        setLoading(false);
      });
  }, [division]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Update a template ──
  async function handleUpdate(id: string, data: Partial<TaskTemplate>) {
    await fetch(`/api/templates/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    load();
  }

  // ── Delete a template ──
  async function handleDelete(id: string) {
    await fetch(`/api/templates/${id}`, { method: "DELETE" });
    load();
  }

  // ── Move (reorder) within siblings ──
  async function handleMove(
    siblings: TaskTemplate[],
    fromIndex: number,
    direction: "up" | "down"
  ) {
    const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= siblings.length) return;

    // Swap sort orders
    const items = siblings.map((s, i) => ({
      id: s.id,
      sortOrder: i,
    }));

    // Swap the two
    const fromOrder = items[fromIndex].sortOrder;
    items[fromIndex].sortOrder = items[toIndex].sortOrder;
    items[toIndex].sortOrder = fromOrder;

    await fetch("/api/templates/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    load();
  }

  // ── Add child (triggered from + button on a tree node) ──
  function handleAddChild(
    parentId: string,
    parentCategory: string | null,
    depth: number
  ) {
    if (depth === 1) {
      setAddMode({ type: "service", parentId, parentCategory });
    } else {
      setAddMode({ type: "subtask", parentId, parentCategory });
    }
  }

  // ── Save new template ──
  async function handleSaveNew(data: {
    name: string;
    parentId: string | null;
    category: string | null;
    division: string;
    depth: number;
    defaultCost: number | null;
    defaultHours: number | null;
    defaultManpower: number | null;
    unit: string | null;
  }) {
    await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setAddMode(null);
    load();
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Task Library</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setAddMode({ type: "category" })}
          >
            <Plus className="h-4 w-4" /> New Category
          </Button>
        </div>
      </div>

      {/* Division toggle */}
      <div className="flex gap-2 mb-4">
        {DIVISION_OPTIONS.map((d) => (
          <button
            key={d.value}
            onClick={() => {
              setDivision(d.value);
              setAddMode(null);
            }}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border-2 px-4 py-2 text-sm font-medium transition-all hover:bg-accent/50",
              division === d.value
                ? "border-green-600 bg-green-50 shadow-sm"
                : "border-muted"
            )}
          >
            <span>{d.icon}</span>
            <span>{d.label}</span>
          </button>
        ))}
      </div>

      {/* Add form (shown above tree when active) */}
      {addMode && (
        <div className="mb-4">
          <TaskForm
            mode={addMode}
            division={division}
            onSave={handleSaveNew}
            onCancel={() => setAddMode(null)}
          />
        </div>
      )}

      <Tabs defaultValue="browse">
        <TabsList className="mb-4">
          <TabsTrigger value="browse" className="gap-2">
            <ListTree className="h-4 w-4" /> Browse
          </TabsTrigger>
          <TabsTrigger value="search" className="gap-2">
            <Search className="h-4 w-4" /> Search
          </TabsTrigger>
        </TabsList>

        <TabsContent value="browse">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-3">
                Hover over items to edit, reorder, or add sub-tasks.
              </p>
              <TaskTree
                templates={templates}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                onMove={handleMove}
                onAddChild={handleAddChild}
                onRefresh={load}
              />
            </>
          )}
        </TabsContent>

        <TabsContent value="search">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <TaskSearch templates={templates} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
