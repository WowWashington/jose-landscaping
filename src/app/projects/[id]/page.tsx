"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ActivityTree } from "@/components/activities/activity-tree";
import { AddActivitySheet } from "@/components/activities/add-activity-sheet";
import { ProjectSummary } from "@/components/projects/project-summary";
import { GenerateEstimateButton } from "@/components/estimate/generate-button";
import { calculateProjectSummary, formatCurrency } from "@/lib/calculations";
import { useAuth } from "@/lib/auth-context";
import { STATUS_LABELS, DIVISION_LABELS } from "@/types";
import type { Project, ProjectActivity, AppUser, ChangeLogEntry } from "@/types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  ListTree,
  PenLine,
  MapPin,
  User,
  Phone,
  FileText,
  Trash2,
  Calendar,
  CalendarClock,
  Clock,
  CheckCircle2,
  Camera,
  ClipboardList,
  ChevronDown,
  ChevronRight,
  Mail,
  HardHat,
} from "lucide-react";
import Link from "next/link";
import { compressImage } from "@/lib/compress-image";
import {
  formatProjectEmailText,
  formatProjectEmailSubject,
} from "@/lib/format-project-email";
import { MaskedField } from "@/components/ui/masked-field";
import { useSettings } from "@/lib/use-settings";
import { PhotoViewer } from "@/components/ui/photo-viewer";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const { canEdit, isOwner, isWorker } = useAuth();
  const { settings } = useSettings();
  const [project, setProject] = useState<Project | null>(null);
  const [crewMembers, setCrewMembers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  // Worker batching: toggled activity IDs that haven't been saved yet
  const [pendingToggles, setPendingToggles] = useState<Set<string>>(new Set());
  const [pendingHours, setPendingHours] = useState<Map<string, string>>(new Map());
  const [saving, setSaving] = useState(false);
  const [workerNote, setWorkerNote] = useState("");
  // Hours dialog for coordinator/owner immediate completion
  const [hoursDialogOpen, setHoursDialogOpen] = useState(false);
  const [hoursDialogActivity, setHoursDialogActivity] = useState<{ id: string; name: string; estimatedHours: number } | null>(null);
  const [hoursDialogValue, setHoursDialogValue] = useState("");
  const [changeLog, setChangeLog] = useState<ChangeLogEntry[]>([]);
  const [logExpanded, setLogExpanded] = useState(false);
  // Cover photo viewer
  const [coverViewerOpen, setCoverViewerOpen] = useState(false);
  // Email dialog state
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailTo, setEmailTo] = useState("");

  const load = useCallback(() => {
    fetch(`/api/projects/${projectId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load project");
        return r.json();
      })
      .then((data) => {
        setProject(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    // Also load change log
    fetch(`/api/projects/${projectId}/log`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => {
        if (Array.isArray(data)) setChangeLog(data);
      })
      .catch(() => {});
  }, [projectId]);

  // Fetch people once
  useEffect(() => {
    fetch("/api/users")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => setCrewMembers(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function updateActivity(
    id: string,
    data: Partial<ProjectActivity>
  ) {
    try {
      const r = await fetch(`/api/activities/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!r.ok) console.error("Failed to update activity");
    } catch (e) {
      console.error("Failed to update activity", e);
    }
    load();
  }

  async function deleteActivity(id: string) {
    try {
      await fetch(`/api/activities/${id}`, { method: "DELETE" });
    } catch (e) {
      console.error("Failed to delete activity", e);
    }
    load();
  }

  function flattenActivities(acts: ProjectActivity[]): ProjectActivity[] {
    const result: ProjectActivity[] = [];
    for (const a of acts) {
      result.push(a);
      if (a.children) result.push(...flattenActivities(a.children));
    }
    return result;
  }

  async function toggleComplete(id: string, complete: boolean) {
    if (isWorker) {
      // Workers batch their toggles — add/remove from pending set
      setPendingToggles((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id); // undo the pending toggle
          // Also remove pending hours
          setPendingHours((ph) => {
            const m = new Map(ph);
            m.delete(id);
            return m;
          });
        } else {
          next.add(id);
          // Pre-fill hours with estimate for tasks being completed
          const flat = flattenActivities(project?.activities ?? []);
          const act = flat.find((a) => a.id === id);
          if (act && !(act.isComplete ?? false) && act.hours) {
            setPendingHours((ph) => {
              const m = new Map(ph);
              m.set(id, String(act.hours));
              return m;
            });
          }
        }
        return next;
      });
      return;
    }
    // Coordinators/Owners: if completing, show hours dialog
    if (complete) {
      const flat = flattenActivities(project?.activities ?? []);
      const act = flat.find((a) => a.id === id);
      setHoursDialogActivity({
        id,
        name: act?.name ?? "Task",
        estimatedHours: act?.hours ?? 0,
      });
      setHoursDialogValue(act?.hours ? String(act.hours) : "");
      setHoursDialogOpen(true);
      return;
    }
    // Uncompleting — save immediately, no dialog needed
    await fetch(`/api/activities/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isComplete: false }),
    });
    load();
  }

  async function confirmHoursAndComplete() {
    if (!hoursDialogActivity) return;
    const hours = parseFloat(hoursDialogValue) || 0;
    await fetch(`/api/activities/${hoursDialogActivity.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isComplete: true, actualHours: hours > 0 ? hours : null }),
    });
    setHoursDialogOpen(false);
    setHoursDialogActivity(null);
    setHoursDialogValue("");
    load();
  }

  async function saveWorkerProgress() {
    if (pendingToggles.size === 0) return;
    setSaving(true);
    const flat = flattenActivities(project?.activities ?? []);

    // Send each toggled activity
    const completedNames: string[] = [];
    for (const actId of pendingToggles) {
      const act = flat.find((a) => a.id === actId);
      const newState = act ? !(act.isComplete ?? false) : true;
      if (newState && act) completedNames.push(act.name);
      const payload: Record<string, unknown> = { isComplete: newState };
      // Include actual hours for tasks being completed
      if (newState) {
        const hrs = parseFloat(pendingHours.get(actId) ?? "") || 0;
        if (hrs > 0) payload.actualHours = hrs;
      }
      await fetch(`/api/activities/${actId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    // If worker left a note, log it as a separate entry
    if (workerNote.trim()) {
      await fetch(`/api/projects/${projectId}/log/note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: workerNote.trim() }),
      });
    }

    setPendingToggles(new Set());
    setPendingHours(new Map());
    setWorkerNote("");
    setSaving(false);
    load();
  }

  async function updateStatus(status: string) {
    try {
      const r = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!r.ok) console.error("Failed to update status");
    } catch (e) {
      console.error("Failed to update status", e);
    }
    load();
  }

  async function updateProjectField(field: string, value: any) {
    try {
      const r = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!r.ok) console.error("Failed to update project");
    } catch (e) {
      console.error("Failed to update project", e);
    }
    load();
  }

  async function uploadCoverPhoto(file: File) {
    try {
      const compressed = await compressImage(file);
      const formData = new FormData();
      formData.append("file", compressed);
      const r = await fetch(`/api/projects/${projectId}/cover`, {
        method: "POST",
        body: formData,
      });
      if (!r.ok) console.error("Failed to upload cover photo");
    } catch (e) {
      console.error("Failed to upload cover photo", e);
    }
    load();
  }

  async function deleteProject() {
    if (!confirm("Delete this project? This cannot be undone.")) return;
    await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
    router.push("/");
  }

  function openStatusEmail() {
    if (!project) return;
    const subject = encodeURIComponent(formatProjectEmailSubject(project));
    const body = encodeURIComponent(formatProjectEmailText(project, settings.businessName));
    const to = encodeURIComponent(emailTo.trim());
    window.open(`mailto:${to}?subject=${subject}&body=${body}`, "_self");
    setEmailOpen(false);
    setEmailTo("");
  }

  if (loading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Loading...</div>
    );
  }

  if (!project) {
    return (
      <div className="p-6">
        <p>Project not found.</p>
        <Link href="/" className="text-sm text-blue-600 underline">
          Back to projects
        </Link>
      </div>
    );
  }

  const activities = project.activities ?? [];
  const summary = calculateProjectSummary(activities);

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold truncate">{project.name}</h1>
          {project.division && (
            <Badge variant="outline" className="text-xs mt-0.5">
              {project.division === "general_contracting" ? "🔨" : "🌿"}{" "}
              {DIVISION_LABELS[project.division] ?? project.division}
            </Badge>
          )}
          {project.quoteNumber && (
            <span className="text-xs text-muted-foreground font-mono">
              {project.quoteNumber}
            </span>
          )}
          {project.description && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {project.description}
            </p>
          )}
        </div>

        {/* Cover photo + status (stacked right) */}
        <div className="shrink-0 flex flex-col items-end gap-2">
          {project.coverPhoto ? (
            <div
              className="cursor-pointer group relative w-16 h-16 rounded-lg overflow-hidden border bg-muted"
              onClick={() => setCoverViewerOpen(true)}
            >
              <img
                src={`/api/uploads/${project.coverPhoto}`}
                alt="Cover"
                className="object-cover w-full h-full"
              />
              {canEdit && (
                <div className="absolute bottom-0.5 right-0.5 bg-black/50 rounded-full p-0.5">
                  <Camera className="h-3 w-3 text-white" />
                </div>
              )}
            </div>
          ) : canEdit ? (
            <label className="cursor-pointer w-16 h-16 rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center text-muted-foreground/50 hover:border-muted-foreground/60 hover:text-muted-foreground/80 transition-colors">
              <Camera className="h-5 w-5" />
              <span className="text-[10px] mt-0.5">Photo</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadCoverPhoto(f);
                }}
              />
            </label>
          ) : null}
          {/* Hidden file input for replace from lightbox */}
          <input
            id="cover-photo-input"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                uploadCoverPhoto(f);
                setCoverViewerOpen(false);
              }
            }}
          />

          {canEdit ? (
            <Select
              value={project.status ?? "draft"}
              onValueChange={updateStatus}
            >
              <SelectTrigger className="w-[130px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Badge variant="outline" className="capitalize">
              {STATUS_LABELS[project.status ?? "draft"] ?? project.status}
            </Badge>
          )}
        </div>
      </div>

      {/* Contact & Address info */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mb-4">
        {project.contact?.name && (
          <span className="flex items-center gap-1">
            <User className="h-3.5 w-3.5" /> {project.contact.name}
          </span>
        )}
        {project.contact?.phone && (
          <span className="flex items-center gap-1">
            <Phone className="h-3.5 w-3.5" />
            <MaskedField
              value={project.contact.phone}
              type="phone"
              contactName={project.contact.name}
              projectId={project.id}
              maskEnabled={settings.maskContactsForWorkers}
            />
          </span>
        )}
        {project.address && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" /> {project.address}
          </span>
        )}
        {project.createdByName && (
          <span className="flex items-center gap-1 text-xs">
            Created by {project.createdByName}
          </span>
        )}
      </div>

      {/* Project Lead */}
      {project.leadCrewName && (() => {
        const leadMember = crewMembers.find((c) => c.id === project.leadCrewId);
        return (
          <div className="flex items-center gap-3 text-sm mb-4 rounded-lg border bg-blue-50/50 p-2.5">
            <HardHat className="h-4 w-4 text-blue-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="font-medium">Lead: {project.leadCrewName}</span>
            </div>
            {leadMember?.phone && (
              <span className="flex items-center gap-1 shrink-0">
                <Phone className="h-3.5 w-3.5 text-blue-600" />
                <MaskedField
                  value={leadMember.phone}
                  type="phone"
                  contactName={leadMember.name}
                  projectId={project.id}
                  maskEnabled={settings.maskContactsForWorkers}
                >
                  {(val) => (
                    <a href={`tel:${val}`} className="text-blue-600 hover:underline">
                      {val}
                    </a>
                  )}
                </MaskedField>
              </span>
            )}
          </div>
        );
      })()}

      {/* Start Date/Time + Due Date + Confirmed + Status Notes */}
      {canEdit && <div className="rounded-lg border bg-muted/30 p-3 mb-4 space-y-3">
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-[140px]">
            <Label htmlFor="startDate" className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Start Date
            </Label>
            <Input
              id="startDate"
              type="date"
              defaultValue={project.startDate?.split("T")[0] ?? ""}
              onBlur={(e) => {
                const newDate = e.target.value;
                const currentTime = project.startDate?.includes("T")
                  ? project.startDate.split("T")[1]
                  : "";
                const combined = newDate && currentTime
                  ? `${newDate}T${currentTime}`
                  : newDate || null;
                if (combined !== (project.startDate ?? "")) {
                  updateProjectField("startDate", combined);
                }
              }}
              className="h-8 text-sm mt-1"
            />
          </div>
          <div className="w-[120px]">
            <Label htmlFor="startTime" className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> Start Time
            </Label>
            <Input
              id="startTime"
              type="time"
              defaultValue={project.startDate?.includes("T") ? project.startDate.split("T")[1] : ""}
              onBlur={(e) => {
                const currentDate = project.startDate?.split("T")[0] ?? "";
                const newTime = e.target.value;
                if (!currentDate) return;
                const combined = newTime
                  ? `${currentDate}T${newTime}`
                  : currentDate;
                if (combined !== (project.startDate ?? "")) {
                  updateProjectField("startDate", combined);
                }
              }}
              className="h-8 text-sm mt-1"
            />
          </div>
        </div>
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-[160px]">
            <Label htmlFor="dueDate" className="text-xs text-muted-foreground flex items-center gap-1">
              <CalendarClock className="h-3 w-3" /> Due Date
            </Label>
            <Input
              id="dueDate"
              type="date"
              defaultValue={project.dueDate ?? ""}
              onBlur={(e) => {
                if (e.target.value !== (project.dueDate ?? "")) {
                  updateProjectField("dueDate", e.target.value || null);
                }
              }}
              className="h-8 text-sm mt-1"
            />
          </div>
          <div className="flex items-center gap-2 pb-1">
            <Checkbox
              id="confirmed"
              checked={project.confirmed ?? false}
              onCheckedChange={(checked) =>
                updateProjectField("confirmed", !!checked)
              }
            />
            <Label htmlFor="confirmed" className="text-sm font-medium flex items-center gap-1 cursor-pointer">
              <CheckCircle2 className="h-3.5 w-3.5" /> Confirmed
            </Label>
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <HardHat className="h-3 w-3" /> Project Lead
          </Label>
          <select
            value={project.leadCrewId ?? ""}
            onChange={(e) =>
              updateProjectField("leadCrewId", e.target.value || null)
            }
            className="mt-1 flex h-8 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">No lead assigned</option>
            {crewMembers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="statusNotes" className="text-xs text-muted-foreground">
            Status / Notes
          </Label>
          <Textarea
            id="statusNotes"
            defaultValue={project.statusNotes ?? ""}
            onBlur={(e) => {
              if (e.target.value !== (project.statusNotes ?? "")) {
                updateProjectField("statusNotes", e.target.value || null);
              }
            }}
            placeholder="e.g., Job due next Thursday, materials ordered, waiting on permit..."
            rows={2}
            className="text-sm mt-1 resize-y"
          />
        </div>
      </div>}

      {/* Summary */}
      <ProjectSummary summary={summary} />

      {/* Estimate PDF + Email Status */}
      {activities.length > 0 && (
        <div className="mt-4 flex gap-2 flex-wrap">
          <GenerateEstimateButton project={project} />
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setEmailOpen(true)}
          >
            <Mail className="h-4 w-4" />
            Email Status
          </Button>
        </div>
      )}

      <Separator className="my-4" />

      {/* Activities */}
      <div className="mb-4">
        <h2 className="font-semibold text-base mb-3">Activities</h2>
        <ActivityTree
          activities={activities}
          crewMembers={crewMembers}
          readOnly={!canEdit}
          pendingToggles={isWorker ? pendingToggles : undefined}
          onUpdate={updateActivity}
          onDelete={deleteActivity}
          onToggleComplete={toggleComplete}
        />
      </div>

      {/* Worker save panel — shown when worker has pending changes */}
      {isWorker && pendingToggles.size > 0 && (
        <div className="sticky bottom-0 z-20 mb-4 -mx-4 sm:-mx-6 px-4 sm:px-6 pb-4 pt-3 bg-background/95 backdrop-blur border-t shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
          <div className="max-w-3xl mx-auto space-y-2">
            {/* Inline hours inputs for tasks being completed */}
            {(() => {
              const flat = flattenActivities(project?.activities ?? []);
              const completing = [...pendingToggles].filter((id) => {
                const act = flat.find((a) => a.id === id);
                return act && !(act.isComplete ?? false);
              });
              if (completing.length === 0) return null;
              return (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground font-medium">Hours worked:</p>
                  {completing.map((id) => {
                    const act = flat.find((a) => a.id === id);
                    return (
                      <div key={id} className="flex items-center gap-2 text-sm">
                        <span className="flex-1 min-w-0 truncate">{act?.name}</span>
                        <Input
                          type="number"
                          step="0.25"
                          min="0"
                          value={pendingHours.get(id) ?? ""}
                          onChange={(e) =>
                            setPendingHours((ph) => {
                              const m = new Map(ph);
                              m.set(id, e.target.value);
                              return m;
                            })
                          }
                          placeholder="hrs"
                          className="w-20 h-7 text-xs"
                        />
                        <span className="text-xs text-muted-foreground shrink-0">hrs</span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
            <Textarea
              value={workerNote}
              onChange={(e) => setWorkerNote(e.target.value)}
              placeholder="Add a note about this update (optional)..."
              rows={2}
              className="text-sm resize-none"
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">
                {pendingToggles.size} item{pendingToggles.size > 1 ? "s" : ""} changed
              </span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPendingToggles(new Set());
                    setPendingHours(new Map());
                    setWorkerNote("");
                  }}
                  disabled={saving}
                >
                  Discard
                </Button>
                <Button
                  onClick={saveWorkerProgress}
                  disabled={saving}
                  className="gap-2 bg-green-700 hover:bg-green-800"
                  size="sm"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {saving ? "Saving..." : "Save Progress"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hours dialog for coordinator/owner completing a task */}
      <Dialog open={hoursDialogOpen} onOpenChange={setHoursDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Hours Worked</DialogTitle>
            <DialogDescription>{hoursDialogActivity?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="completion-hours">Hours</Label>
              <Input
                id="completion-hours"
                type="number"
                step="0.25"
                min="0"
                value={hoursDialogValue}
                onChange={(e) => setHoursDialogValue(e.target.value)}
                placeholder={hoursDialogActivity?.estimatedHours ? `Est: ${hoursDialogActivity.estimatedHours}` : "0"}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setHoursDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmHoursAndComplete} className="bg-green-700 hover:bg-green-800">
              Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action buttons (coordinator+) */}
      {canEdit && (
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={() => setSheetOpen(true)}
            className="gap-2 bg-green-700 hover:bg-green-800"
          >
            <ListTree className="h-4 w-4" />
            Add from Library
          </Button>
          <Button
            variant="outline"
            onClick={() => setSheetOpen(true)}
            className="gap-2"
          >
            <PenLine className="h-4 w-4" />
            Add Custom Task
          </Button>
        </div>
      )}

      <Separator className="my-4" />

      {/* Notes */}
      {project.notes && (
        <div className="mb-4">
          <h3 className="text-sm font-medium mb-1 flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Notes
          </h3>
          <p className="text-sm text-muted-foreground">{project.notes}</p>
        </div>
      )}

      {/* Change Log (coordinator+) */}
      {canEdit && changeLog.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => setLogExpanded(!logExpanded)}
            className="flex items-center gap-1.5 text-sm font-medium mb-2 hover:text-foreground text-muted-foreground transition-colors"
          >
            {logExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
            <ClipboardList className="h-3.5 w-3.5" />
            Activity Log ({changeLog.length})
          </button>
          {logExpanded && (
            <div className="space-y-1 max-h-60 overflow-y-auto rounded-lg border bg-muted/20 p-2">
              {changeLog.map((entry) => {
                const date = entry.createdAt
                  ? new Date(
                      typeof entry.createdAt === "string"
                        ? entry.createdAt
                        : entry.createdAt
                    )
                  : null;
                const dateStr = date
                  ? date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    }) +
                    " " +
                    date.toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : "";
                return (
                  <div
                    key={entry.id}
                    className="flex items-start gap-2 text-xs py-1 border-b border-border/50 last:border-0"
                  >
                    <span className="text-muted-foreground shrink-0 w-24">
                      {dateStr}
                    </span>
                    <span className="flex-1">
                      <span className="font-medium">
                        {entry.userName ?? "System"}
                      </span>{" "}
                      <span className="text-muted-foreground">
                        {entry.action}
                      </span>{" "}
                      {entry.entityName && (
                        <span className="font-medium">{entry.entityName}</span>
                      )}
                      {entry.action === "completed" && entry.details === "reopened" ? (
                        <span className="text-amber-600 ml-1 font-medium">
                          (reopened)
                        </span>
                      ) : entry.details ? (
                        <span className="text-muted-foreground ml-1">
                          ({entry.details})
                        </span>
                      ) : null}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Danger zone (owner only) */}
      {isOwner && (
        <div className="mt-6 pt-4 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive gap-1.5"
            onClick={deleteProject}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete Project
          </Button>
        </div>
      )}

      {/* Add activity sheet */}
      <AddActivitySheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        projectId={projectId}
        division={project.division}
        onAdded={load}
      />

      {/* Cover photo lightbox */}
      {project.coverPhoto && (
        <PhotoViewer
          src={`/api/uploads/${project.coverPhoto}`}
          alt="Cover photo"
          open={coverViewerOpen}
          onClose={() => setCoverViewerOpen(false)}
        >
          {canEdit && (
            <Button
              variant="secondary"
              size="sm"
              className="gap-2"
              onClick={() => document.getElementById("cover-photo-input")?.click()}
            >
              <Camera className="h-4 w-4" />
              Replace
            </Button>
          )}
        </PhotoViewer>
      )}

      {/* Email Status dialog */}
      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-4 w-4" /> Email Project Status
            </DialogTitle>
            <DialogDescription>
              Opens your mail app with a full project status snapshot — activities, costs, completion. Great as an offline reference in the field.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="emailTo" className="text-sm">
                To (optional)
              </Label>
              <Input
                id="emailTo"
                type="email"
                placeholder="worker@email.com"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") openStatusEmail();
                }}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave blank to fill in yourself in the mail app.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEmailOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={openStatusEmail}
              className="gap-2 bg-green-700 hover:bg-green-800"
              size="sm"
            >
              <Mail className="h-4 w-4" />
              Open in Mail
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
