"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatHours } from "@/lib/calculations";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Clock,
  FolderKanban,
  DollarSign,
  ChevronRight,
  Calendar,
  User,
} from "lucide-react";
import Link from "next/link";

type TaskDetail = {
  activityId: string | null;
  activityName: string;
  hours: number;
  actualHours: number | null;
  cost: number;
  billingRate: number | null;
  laborCost: number | null;
  completedAt: string | null;
};

type ProjectDetail = {
  projectId: string;
  projectName: string;
  quoteNumber: string | null;
  tasks: TaskDetail[];
  totalHours: number;
  totalCost: number;
  totalLaborCost: number;
};

type PersonSummary = {
  userId: string;
  userName: string;
  tasksCompleted: number;
  totalHours: number;
  totalCost: number;
  totalLaborCost: number;
  projects: ProjectDetail[];
};

type ScheduledActivity = {
  id: string;
  name: string;
  crewName: string | null;
  hours: number;
  cost: number;
  isComplete: boolean;
};

type ScheduledProject = {
  projectId: string;
  projectName: string;
  quoteNumber: string | null;
  startDate: string | null;
  status: string | null;
  leadCrewName: string | null;
  totalTasks: number;
  completedTasks: number;
  activities: ScheduledActivity[];
};

type ReportData = {
  people: PersonSummary[];
  totals: {
    tasksCompleted: number;
    totalHours: number;
    totalCost: number;
    totalLaborCost: number;
    projectCount: number;
  };
  scheduled: ScheduledProject[];
  allPeople: { id: string; name: string }[];
};

type Preset = "last-week" | "this-week" | "last-2-weeks" | "this-month";

function toLocalDateString(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  }) + " " + d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function getPresetDates(preset: Preset): {
  startDate: string;
  endDate: string;
} {
  const now = new Date();
  const today = toLocalDateString(now);
  const dayOfWeek = now.getDay(); // 0=Sun
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  switch (preset) {
    case "last-week": {
      const thisMonday = new Date(now);
      thisMonday.setDate(now.getDate() - mondayOffset);
      const lastMonday = new Date(thisMonday);
      lastMonday.setDate(thisMonday.getDate() - 7);
      const lastSunday = new Date(thisMonday);
      lastSunday.setDate(thisMonday.getDate() - 1);
      return {
        startDate: toLocalDateString(lastMonday),
        endDate: toLocalDateString(lastSunday),
      };
    }
    case "this-week": {
      const monday = new Date(now);
      monday.setDate(now.getDate() - mondayOffset);
      return { startDate: toLocalDateString(monday), endDate: today };
    }
    case "last-2-weeks": {
      const twoWeeksAgo = new Date(now);
      twoWeeksAgo.setDate(now.getDate() - mondayOffset - 7);
      return { startDate: toLocalDateString(twoWeeksAgo), endDate: today };
    }
    case "this-month": {
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate: toLocalDateString(firstOfMonth), endDate: today };
    }
  }
}

const PRESET_LABELS: Record<Preset, string> = {
  "last-week": "Last Week",
  "this-week": "This Week",
  "last-2-weeks": "Last 2 Weeks",
  "this-month": "This Month",
};

export default function ReportsPage() {
  const { isOwner } = useAuth();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePreset, setActivePreset] = useState<Preset | null>("last-week");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);

  // Initialize dates
  useEffect(() => {
    const { startDate: s, endDate: e } = getPresetDates("last-week");
    setStartDate(s);
    setEndDate(e);
  }, []);

  const load = useCallback(async () => {
    if (!startDate || !endDate) return;
    setLoading(true);
    try {
      const tz = new Date().getTimezoneOffset();
      const res = await fetch(
        `/api/reports/worker-summary?startDate=${startDate}&endDate=${endDate}&tz=${tz}`
      );
      if (res.ok) {
        setData(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    load();
  }, [load]);

  function selectPreset(preset: Preset) {
    setActivePreset(preset);
    const { startDate: s, endDate: e } = getPresetDates(preset);
    setStartDate(s);
    setEndDate(e);
    setSelectedPerson(null);
  }

  function handleDateChange(which: "start" | "end", value: string) {
    setActivePreset(null);
    if (which === "start") setStartDate(value);
    else setEndDate(value);
  }

  if (!isOwner) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">
          You don&apos;t have permission to view this page.
        </p>
      </div>
    );
  }

  const selectedPersonData = selectedPerson
    ? data?.people.find((p) => p.userId === selectedPerson)
    : null;

  const displayTotals = selectedPersonData
    ? {
        tasksCompleted: selectedPersonData.tasksCompleted,
        totalHours: selectedPersonData.totalHours,
        totalCost: selectedPersonData.totalCost,
        totalLaborCost: selectedPersonData.totalLaborCost,
        projectCount: selectedPersonData.projects.length,
      }
    : data?.totals;

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Worker productivity and pay calculations
        </p>
      </div>

      {/* Date range */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => handleDateChange("start", e.target.value)}
            className="flex h-8 rounded-md border border-input bg-background px-3 text-sm"
          />
          <span className="text-sm text-muted-foreground">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => handleDateChange("end", e.target.value)}
            className="flex h-8 rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(PRESET_LABELS) as Preset[]).map((preset) => (
            <Button
              key={preset}
              variant={activePreset === preset ? "default" : "outline"}
              size="sm"
              className="text-xs h-7"
              onClick={() => selectPreset(preset)}
            >
              {PRESET_LABELS[preset]}
            </Button>
          ))}
        </div>
      </div>

      {/* People filter */}
      {data && data.allPeople.length > 0 && (
        <select
          value={selectedPerson ?? ""}
          onChange={(e) => setSelectedPerson(e.target.value || null)}
          className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="">All People</option>
          {data.allPeople.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      )}

      {/* Summary cards */}
      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Loading...
        </p>
      ) : !data ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No data available.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                Tasks Done
              </div>
              <p className="text-2xl font-semibold">
                {displayTotals?.tasksCompleted ?? 0}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <Clock className="h-3.5 w-3.5 text-blue-600" />
                Hours
              </div>
              <p className="text-2xl font-semibold">
                {formatHours(displayTotals?.totalHours ?? 0)}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                Labor Cost
              </div>
              <p className="text-2xl font-semibold">
                {formatCurrency(displayTotals?.totalLaborCost ?? 0)}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <FolderKanban className="h-3.5 w-3.5 text-violet-600" />
                Projects
              </div>
              <p className="text-2xl font-semibold">
                {displayTotals?.projectCount ?? 0}
              </p>
            </div>
          </div>

          {/* All People breakdown */}
          {!selectedPerson && data.people.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground">
                By Person
              </h2>
              {data.people.map((person) => (
                <button
                  key={person.userId}
                  onClick={() => setSelectedPerson(person.userId)}
                  className="w-full text-left rounded-lg border p-3 hover:bg-accent/30 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">
                      {person.userName}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                    <span>
                      {person.tasksCompleted} task
                      {person.tasksCompleted !== 1 ? "s" : ""}
                    </span>
                    <span>{formatHours(person.totalHours)}</span>
                    {person.totalLaborCost > 0 && (
                      <span>{formatCurrency(person.totalLaborCost)}</span>
                    )}
                    <span>
                      {person.projects.length} project
                      {person.projects.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {!selectedPerson && data.people.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No completed tasks in this period.
            </p>
          )}

          {/* Individual person view */}
          {selectedPerson && selectedPersonData && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium">
                  {selectedPersonData.userName}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => setSelectedPerson(null)}
                >
                  View All
                </Button>
              </div>

              {selectedPersonData.projects.map((proj) => (
                <div
                  key={proj.projectId}
                  className="rounded-lg border overflow-hidden"
                >
                  <div className="bg-muted/30 px-3 py-2 flex items-center justify-between">
                    <Link
                      href={`/projects/${proj.projectId}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {proj.projectName}
                      {proj.quoteNumber && (
                        <span className="font-mono text-xs text-muted-foreground ml-1.5">
                          ({proj.quoteNumber})
                        </span>
                      )}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {formatHours(proj.totalHours)}
                      {proj.totalLaborCost > 0 && ` · ${formatCurrency(proj.totalLaborCost)}`}
                    </span>
                  </div>
                  <div className="divide-y">
                    {proj.tasks.map((task, i) => (
                      <div
                        key={`${task.activityId}-${i}`}
                        className="px-3 py-2 flex items-center justify-between text-sm"
                      >
                        <div className="min-w-0 flex-1">
                          <span>{task.activityName}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {formatTime(task.completedAt)}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0 ml-2">
                          {(task.actualHours ?? task.hours) > 0 && formatHours(task.actualHours ?? task.hours)}
                          {task.billingRate != null && task.billingRate > 0 && ` @ ${formatCurrency(task.billingRate)}/hr`}
                          {task.laborCost != null && task.laborCost > 0 && ` · ${formatCurrency(task.laborCost)}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {selectedPersonData.projects.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No completed tasks for this person in this period.
                </p>
              )}
            </div>
          )}

          {selectedPerson && !selectedPersonData && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No completed tasks for this person in this period.
            </p>
          )}

          {/* Scheduled Projects */}
          {!selectedPerson && data.scheduled && data.scheduled.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Scheduled Work
                </h2>
                {data.scheduled.map((proj) => (
                  <div
                    key={proj.projectId}
                    className="rounded-lg border overflow-hidden"
                  >
                    <div className="bg-muted/30 px-3 py-2">
                      <div className="flex items-center justify-between">
                        <Link
                          href={`/projects/${proj.projectId}`}
                          className="text-sm font-medium hover:underline"
                        >
                          {proj.projectName}
                          {proj.quoteNumber && (
                            <span className="font-mono text-xs text-muted-foreground ml-1.5">
                              ({proj.quoteNumber})
                            </span>
                          )}
                        </Link>
                        <Badge variant="outline" className="text-xs capitalize">
                          {proj.status ?? "draft"}
                        </Badge>
                      </div>
                      <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                        {proj.startDate && (
                          <span>
                            {new Date(proj.startDate.includes("T") ? proj.startDate : proj.startDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                            {proj.startDate.includes("T") && (
                              <> at {new Date(proj.startDate).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}</>
                            )}
                          </span>
                        )}
                        {proj.leadCrewName && (
                          <span className="flex items-center gap-0.5">
                            <User className="h-3 w-3" />
                            {proj.leadCrewName}
                          </span>
                        )}
                        <span>
                          {proj.completedTasks}/{proj.totalTasks} done
                        </span>
                      </div>
                    </div>
                    {proj.activities.length > 0 && (
                      <div className="divide-y">
                        {proj.activities.map((act) => (
                          <div
                            key={act.id}
                            className={`px-3 py-1.5 flex items-center justify-between text-sm ${act.isComplete ? "opacity-50" : ""}`}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <CheckCircle2
                                className={`h-3.5 w-3.5 shrink-0 ${act.isComplete ? "text-green-600" : "text-muted-foreground/30"}`}
                              />
                              <span className={act.isComplete ? "line-through" : ""}>
                                {act.name}
                              </span>
                              {act.crewName && (
                                <span className="text-xs text-blue-600 bg-blue-50 px-1 py-0.5 rounded shrink-0">
                                  {act.crewName}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground shrink-0 ml-2">
                              {act.hours > 0 && formatHours(act.hours)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
