"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ContactPicker } from "@/components/contacts/contact-picker";
import { CrewPicker } from "@/components/crew/crew-picker";
import { DIVISION_OPTIONS } from "@/types";
import { cn } from "@/lib/utils";

type ProjectFormData = {
  name: string;
  description: string;
  address: string;
  contactId: string | null;
  leadCrewId: string | null;
  startDate: string;
  notes: string;
  division: string;
};

export function ProjectForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<ProjectFormData>;
  onSave: (data: ProjectFormData) => Promise<void>;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState<ProjectFormData>({
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    address: initial?.address ?? "",
    contactId: initial?.contactId ?? null,
    leadCrewId: initial?.leadCrewId ?? null,
    startDate: initial?.startDate ?? "",
    notes: initial?.notes ?? "",
    division: initial?.division ?? "",
  });
  const [saving, setSaving] = useState(false);

  const update = (field: keyof ProjectFormData, value: string | null) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.division) return;
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initial ? "Edit Project" : "New Project"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Division selector — prominent, first choice */}
          <div>
            <Label className="mb-2 block">
              Division <span className="text-destructive">*</span>
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {DIVISION_OPTIONS.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => update("division", d.value)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-lg border-2 p-4 text-center transition-all hover:bg-accent/50",
                    form.division === d.value
                      ? "border-green-600 bg-green-50 shadow-sm"
                      : "border-muted"
                  )}
                >
                  <span className="text-2xl">{d.icon}</span>
                  <span className="text-sm font-medium">{d.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="name">
              Project Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder={
                form.division === "general_contracting"
                  ? "e.g., Church Interior Renovation"
                  : "e.g., Garcia Backyard Renovation"
              }
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Brief project description..."
              rows={2}
            />
          </div>
          <div>
            <Label>Contact</Label>
            <ContactPicker
              value={form.contactId}
              onChange={(id) => update("contactId", id)}
            />
          </div>
          <div>
            <Label>Project Lead</Label>
            <CrewPicker
              value={form.leadCrewId}
              onChange={(id) => update("leadCrewId", id)}
            />
          </div>
          <div>
            <Label htmlFor="address">Site Address</Label>
            <Input
              id="address"
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              placeholder="Project site address"
            />
          </div>
          <div>
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={form.startDate}
              onChange={(e) => update("startDate", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Any project notes..."
              rows={2}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              type="submit"
              disabled={saving || !form.name.trim() || !form.division}
            >
              {saving ? "Saving..." : "Create Project"}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
