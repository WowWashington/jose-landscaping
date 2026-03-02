"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { UNIT_LABELS } from "@/types";
import { formatCurrency } from "@/lib/calculations";
import type { TaskTemplate } from "@/types";
import { ChevronRight, ListTree, PenLine, X as XIcon } from "lucide-react";

export function AddActivitySheet({
  open,
  onClose,
  projectId,
  division,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  division?: string | null;
  onAdded: () => void;
}) {
  const [tab, setTab] = useState("library");
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [search, setSearch] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(
    null
  );
  const [quantity, setQuantity] = useState(1);
  const [saving, setSaving] = useState(false);

  // Custom task state
  const [customName, setCustomName] = useState("");
  const [customRate, setCustomRate] = useState(0);
  const [customHours, setCustomHours] = useState(0);
  const [customManpower, setCustomManpower] = useState(1);
  const [customDescription, setCustomDescription] = useState("");

  const [customOverride, setCustomOverride] = useState<number | null>(null);

  // Live calculation: rate/hr × hours × crew = calculated total
  const calculatedTotal = customRate * customHours * customManpower;
  // Final cost: override if set, otherwise calculated
  const customTotal = customOverride !== null ? customOverride : calculatedTotal;

  useEffect(() => {
    if (open) {
      // Filter templates by project's division
      const params = division ? `?division=${division}` : "";
      fetch(`/api/templates${params}`)
        .then((r) => r.json())
        .then((data) => setTemplates(data));
    }
  }, [open, division]);

  // Flatten templates for search - only show depth 1 (services)
  const searchableTemplates = templates.flatMap(
    (cat) =>
      cat.children?.map((svc) => ({
        ...svc,
        categoryName: cat.name,
      })) ?? []
  );

  const filteredTemplates = search
    ? searchableTemplates.filter((t) =>
        t.name.toLowerCase().includes(search.toLowerCase())
      )
    : searchableTemplates;

  async function addFromLibrary() {
    if (!selectedTemplate) return;
    setSaving(true);
    try {
      await fetch(`/api/projects/${projectId}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "template",
          templateId: selectedTemplate.id,
          quantity,
          includeSubTasks: true,
        }),
      });
      onAdded();
      resetAndClose();
    } finally {
      setSaving(false);
    }
  }

  async function addCustom() {
    if (!customName.trim()) return;
    setSaving(true);
    try {
      await fetch(`/api/projects/${projectId}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "custom",
          name: customName,
          cost: customTotal, // rate × hours × crew
          hours: customHours * customManpower, // total labor hours
          manpower: customManpower,
          description: customDescription,
        }),
      });
      onAdded();
      resetAndClose();
    } finally {
      setSaving(false);
    }
  }

  function resetAndClose() {
    setSelectedTemplate(null);
    setQuantity(1);
    setSearch("");
    setCustomName("");
    setCustomRate(0);
    setCustomHours(0);
    setCustomManpower(1);
    setCustomOverride(null);
    setCustomDescription("");
    onClose();
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && resetAndClose()}>
      <SheetContent side="bottom" className="h-[85vh] sm:h-[70vh]">
        <SheetHeader>
          <SheetTitle>Add Activity</SheetTitle>
        </SheetHeader>

        <Tabs value={tab} onValueChange={setTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="library" className="gap-2">
              <ListTree className="h-4 w-4" /> From Library
            </TabsTrigger>
            <TabsTrigger value="custom" className="gap-2">
              <PenLine className="h-4 w-4" /> Custom Task
            </TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="mt-4 space-y-4">
            {selectedTemplate ? (
              <div className="space-y-4">
                <div className="p-3 border rounded-lg">
                  <p className="font-medium">{selectedTemplate.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Default: {selectedTemplate.defaultCost != null ? `$${selectedTemplate.defaultCost}` : "N/A"} per{" "}
                    {selectedTemplate.unit
                      ? UNIT_LABELS[selectedTemplate.unit] ?? selectedTemplate.unit
                      : "unit"}
                    {selectedTemplate.children &&
                      selectedTemplate.children.length > 0 &&
                      ` | ${selectedTemplate.children.length} sub-tasks`}
                  </p>
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 h-auto mt-1"
                    onClick={() => setSelectedTemplate(null)}
                  >
                    Change selection
                  </Button>
                </div>
                <div>
                  <Label htmlFor="qty">
                    Quantity ({selectedTemplate.unit ? UNIT_LABELS[selectedTemplate.unit] ?? selectedTemplate.unit : "units"})
                  </Label>
                  <Input
                    id="qty"
                    type="number"
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(parseFloat(e.target.value) || 1)
                    }
                    min={1}
                    step={1}
                  />
                </div>
                <Button
                  onClick={addFromLibrary}
                  disabled={saving}
                  className="w-full"
                >
                  {saving ? "Adding..." : "Add to Project"}
                </Button>
              </div>
            ) : (
              <Command className="border rounded-lg">
                <CommandInput
                  placeholder="Search tasks..."
                  value={search}
                  onValueChange={setSearch}
                />
                <CommandList className="max-h-[40vh]">
                  <CommandEmpty>No tasks found.</CommandEmpty>
                  <CommandGroup>
                    {filteredTemplates.map((t) => (
                      <CommandItem
                        key={t.id}
                        value={t.name}
                        onSelect={() =>
                          setSelectedTemplate(t as TaskTemplate)
                        }
                        className="cursor-pointer"
                      >
                        <div className="flex-1">
                          <span>{t.name}</span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            {(t as TaskTemplate & { categoryName: string }).categoryName}
                          </span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            )}
          </TabsContent>

          <TabsContent value="custom" className="mt-4 space-y-4">
            <div>
              <Label htmlFor="cname">Task Name *</Label>
              <Input
                id="cname"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g., Remove old fence"
              />
            </div>

            {/* Rate × Hours × Crew = Total (always visible) */}
            <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label htmlFor="crate" className="text-xs">Rate ($/hr)</Label>
                  <Input
                    id="crate"
                    type="number"
                    value={customRate || ""}
                    onChange={(e) => {
                      setCustomRate(parseFloat(e.target.value) || 0);
                      setCustomOverride(null);
                    }}
                    placeholder="25"
                    step="0.50"
                    min="0"
                  />
                </div>
                <span className="pb-2 text-muted-foreground font-medium">×</span>
                <div className="flex-1">
                  <Label htmlFor="chours" className="text-xs">Hours</Label>
                  <Input
                    id="chours"
                    type="number"
                    value={customHours || ""}
                    onChange={(e) => {
                      setCustomHours(parseFloat(e.target.value) || 0);
                      setCustomOverride(null);
                    }}
                    placeholder="2"
                    step="0.25"
                    min="0"
                  />
                </div>
                <span className="pb-2 text-muted-foreground font-medium">×</span>
                <div className="flex-1">
                  <Label htmlFor="ccrew" className="text-xs">Crew</Label>
                  <Input
                    id="ccrew"
                    type="number"
                    value={customManpower}
                    onChange={(e) => {
                      setCustomManpower(parseInt(e.target.value) || 1);
                      setCustomOverride(null);
                    }}
                    min={1}
                  />
                </div>
                <span className="pb-2 text-muted-foreground font-medium">=</span>
                <div className="pb-1 text-right min-w-[80px]">
                  <p className={`text-lg font-bold ${customOverride !== null ? "line-through text-muted-foreground text-sm" : "text-green-700"}`}>
                    {formatCurrency(calculatedTotal)}
                  </p>
                  {customOverride !== null && (
                    <p className="text-lg font-bold text-green-700">
                      {formatCurrency(customOverride)}
                    </p>
                  )}
                </div>
              </div>

              {/* Override row */}
              <div className="flex items-center gap-2 border-t pt-2">
                <Label htmlFor="coverride" className="text-xs whitespace-nowrap text-muted-foreground">
                  Override $
                </Label>
                <Input
                  id="coverride"
                  type="number"
                  value={customOverride ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setCustomOverride(v === "" ? null : parseFloat(v) || 0);
                  }}
                  placeholder={calculatedTotal > 0 ? calculatedTotal.toFixed(2) : "0.00"}
                  className="h-8 text-sm flex-1"
                  step="1"
                />
                {customOverride !== null && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => setCustomOverride(null)}
                  >
                    <XIcon className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="cdesc">Description</Label>
              <Textarea
                id="cdesc"
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                placeholder="Optional description..."
                rows={2}
              />
            </div>
            <Button
              onClick={addCustom}
              disabled={saving || !customName.trim()}
              className="w-full"
            >
              {saving
                ? "Adding..."
                : `Add Custom Task — ${formatCurrency(customTotal)}`}
            </Button>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
