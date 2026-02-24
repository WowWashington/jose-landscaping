"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UNIT_OPTIONS, CATEGORY_OPTIONS } from "@/types";
import type { TaskTemplate } from "@/types";
import { X } from "lucide-react";

type AddMode =
  | { type: "category" }
  | { type: "service"; parentId: string; parentCategory: string | null }
  | { type: "subtask"; parentId: string; parentCategory: string | null };

export function TaskForm({
  mode,
  division,
  onSave,
  onCancel,
}: {
  mode: AddMode;
  division: string;
  onSave: (data: {
    name: string;
    parentId: string | null;
    category: string | null;
    division: string;
    depth: number;
    defaultCost: number | null;
    defaultHours: number | null;
    defaultManpower: number | null;
    unit: string | null;
  }) => Promise<void>;
  onCancel: () => void;
}) {
  const categoryOptions = CATEGORY_OPTIONS[division] ?? CATEGORY_OPTIONS["yard_care"];
  const defaultCategory = mode.type === "category"
    ? categoryOptions[0]?.value ?? "green"
    : (mode as { parentCategory: string | null }).parentCategory ?? categoryOptions[0]?.value ?? "green";

  const [name, setName] = useState("");
  const [category, setCategory] = useState(defaultCategory);
  const [cost, setCost] = useState(0);
  const [hours, setHours] = useState(0);
  const [manpower, setManpower] = useState(1);
  const [unit, setUnit] = useState("each");
  const [saving, setSaving] = useState(false);

  const isCategory = mode.type === "category";

  const titleMap = {
    category: "New Category",
    service: "New Service / Project Type",
    subtask: "New Sub-Task",
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        parentId: isCategory ? null : (mode as { parentId: string }).parentId,
        category,
        division,
        depth: mode.type === "category" ? 0 : mode.type === "service" ? 1 : 2,
        defaultCost: isCategory ? null : cost,
        defaultHours: isCategory ? null : hours,
        defaultManpower: isCategory ? null : manpower,
        unit: isCategory ? null : unit,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border-green-200 bg-green-50/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{titleMap[mode.type]}</CardTitle>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="taskName">Name *</Label>
            <Input
              id="taskName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                mode.type === "category"
                  ? "e.g., Outdoor Structures"
                  : mode.type === "service"
                  ? "e.g., Build Stone Pathway"
                  : "e.g., Dig ground"
              }
              autoFocus
              required
            />
          </div>

          {isCategory && (
            <div>
              <Label>Category Key</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {!isCategory && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <Label htmlFor="tcost">Default Cost ($)</Label>
                  <Input
                    id="tcost"
                    type="number"
                    value={cost}
                    onChange={(e) => setCost(parseFloat(e.target.value) || 0)}
                    step="0.01"
                  />
                </div>
                <div>
                  <Label htmlFor="thours">Hours</Label>
                  <Input
                    id="thours"
                    type="number"
                    value={hours}
                    onChange={(e) => setHours(parseFloat(e.target.value) || 0)}
                    step="0.25"
                  />
                </div>
                <div>
                  <Label htmlFor="tcrew">Crew</Label>
                  <Input
                    id="tcrew"
                    type="number"
                    value={manpower}
                    onChange={(e) => setManpower(parseInt(e.target.value) || 1)}
                    min={1}
                  />
                </div>
                <div>
                  <Label>Unit</Label>
                  <Select value={unit} onValueChange={setUnit}>
                    <SelectTrigger>
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
            </>
          )}

          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={saving || !name.trim()} size="sm">
              {saving ? "Adding..." : `Add ${titleMap[mode.type].replace("New ", "")}`}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
