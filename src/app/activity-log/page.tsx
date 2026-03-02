"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  FileText,
  FolderPlus,
  RotateCcw,
  ArrowRight,
  LogIn,
  LogOut,
  X,
} from "lucide-react";
import Link from "next/link";

type LogEntry = {
  id: string;
  projectId: string | null;
  activityId: string | null;
  userId: string | null;
  userName: string | null;
  action: string;
  entity: string;
  entityName: string | null;
  details: string | null;
  createdAt: string | null;
  projectQuoteNumber: string | null;
  projectName: string | null;
};

function toLocalDateString(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const today = new Date();
  const todayStr = toLocalDateString(today);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = toLocalDateString(yesterday);

  if (dateStr === todayStr) return "Today";
  if (dateStr === yesterdayStr) return "Yesterday";

  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** Describe the action in a concise human-readable way */
function describeAction(entry: LogEntry): {
  icon: React.ReactNode;
  label: string;
  color: string;
} {
  const { action, entity, details } = entry;

  if (action === "completed" && entity === "activity") {
    return {
      icon: <CheckCircle2 className="h-4 w-4 text-green-600" />,
      label: "Task completed",
      color: "bg-green-50 text-green-700 border-green-200",
    };
  }

  if (action === "uncompleted" && entity === "activity") {
    return {
      icon: <RotateCcw className="h-4 w-4 text-amber-600" />,
      label: "Task reopened",
      color: "bg-amber-50 text-amber-700 border-amber-200",
    };
  }

  if (action === "status_changed" && entity === "project") {
    // Parse "draft → quoted", "quoted → active", "active → completed", etc.
    const toStatus = details?.split("→").pop()?.trim() ?? "";

    if (toStatus === "quoted") {
      return {
        icon: <FileText className="h-4 w-4 text-blue-600" />,
        label: "Quote sent",
        color: "bg-blue-50 text-blue-700 border-blue-200",
      };
    }
    if (toStatus === "active") {
      return {
        icon: <ArrowRight className="h-4 w-4 text-indigo-600" />,
        label: "Project activated",
        color: "bg-indigo-50 text-indigo-700 border-indigo-200",
      };
    }
    if (toStatus === "completed") {
      return {
        icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
        label: "Project completed",
        color: "bg-emerald-50 text-emerald-700 border-emerald-200",
      };
    }
    if (toStatus === "cancelled") {
      return {
        icon: <RotateCcw className="h-4 w-4 text-red-600" />,
        label: "Project cancelled",
        color: "bg-red-50 text-red-700 border-red-200",
      };
    }

    return {
      icon: <ArrowRight className="h-4 w-4 text-gray-600" />,
      label: `Status: ${details}`,
      color: "bg-gray-50 text-gray-700 border-gray-200",
    };
  }

  if (action === "created" && entity === "project") {
    return {
      icon: <FolderPlus className="h-4 w-4 text-violet-600" />,
      label: "Quote created",
      color: "bg-violet-50 text-violet-700 border-violet-200",
    };
  }

  if (action === "login" && entity === "session") {
    return {
      icon: <LogIn className="h-4 w-4 text-sky-600" />,
      label: "Logged in",
      color: "bg-sky-50 text-sky-700 border-sky-200",
    };
  }

  if (action === "logout" && entity === "session") {
    return {
      icon: <LogOut className="h-4 w-4 text-gray-500" />,
      label: "Logged out",
      color: "bg-gray-50 text-gray-600 border-gray-200",
    };
  }

  return {
    icon: <ArrowRight className="h-4 w-4 text-gray-500" />,
    label: `${action} ${entity}`,
    color: "bg-gray-50 text-gray-700 border-gray-200",
  };
}

type FilterType = "completed" | "quotes" | "status" | "logins" | null;

export default function ActivityLogPage() {
  const { canEdit } = useAuth();
  const [date, setDate] = useState(toLocalDateString(new Date()));
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterUser, setFilterUser] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<FilterType>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/activity-log?date=${date}`);
      if (res.ok) {
        setEntries(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  function shiftDate(days: number) {
    const d = new Date(date + "T12:00:00");
    d.setDate(d.getDate() + days);
    setDate(toLocalDateString(d));
  }

  // Reset filters when date changes
  useEffect(() => {
    setFilterUser(null);
    setFilterType(null);
  }, [date]);

  // Unique user names for the user filter
  const uniqueUsers = [...new Set(entries.map((e) => e.userName).filter((n): n is string => !!n))].sort();

  // Apply filters
  const filtered = entries.filter((e) => {
    if (filterUser && e.userName !== filterUser) return false;
    if (filterType === "completed" && !(e.action === "completed" && e.entity === "activity")) return false;
    if (filterType === "quotes" && !(e.action === "created" && e.entity === "project")) return false;
    if (filterType === "status" && !(e.action === "status_changed" && e.entity === "project")) return false;
    if (filterType === "logins" && !(e.action === "login" && e.entity === "session")) return false;
    return true;
  });

  // Group entries by category for summary counts (from unfiltered-by-type, but respecting user filter)
  const userFiltered = filterUser ? entries.filter((e) => e.userName === filterUser) : entries;
  const tasksDone = userFiltered.filter(
    (e) => e.action === "completed" && e.entity === "activity"
  ).length;
  const quotesCreated = userFiltered.filter(
    (e) => e.action === "created" && e.entity === "project"
  ).length;
  const statusChanges = userFiltered.filter(
    (e) => e.action === "status_changed" && e.entity === "project"
  ).length;
  const logins = userFiltered.filter(
    (e) => e.action === "login" && e.entity === "session"
  ).length;

  if (!canEdit) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">
          You don&apos;t have permission to view this page.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Activity Log</h1>
        <p className="text-sm text-muted-foreground">
          Daily overview of quotes, completions, and status changes
        </p>
      </div>

      {/* Date navigation */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => shiftDate(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="flex h-8 rounded-md border border-input bg-background px-3 text-sm"
        />

        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => shiftDate(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>

        {date !== toLocalDateString(new Date()) && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => setDate(toLocalDateString(new Date()))}
          >
            Today
          </Button>
        )}
      </div>

      {/* Date label + user filter */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{formatDisplayDate(date)}</p>
        {uniqueUsers.length > 1 && (
          <select
            value={filterUser ?? ""}
            onChange={(e) => setFilterUser(e.target.value || null)}
            className="flex h-8 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">All people</option>
            {uniqueUsers.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Summary chips — clickable to filter */}
      {!loading && entries.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tasksDone > 0 && (
            <button onClick={() => setFilterType(filterType === "completed" ? null : "completed")}>
              <Badge variant="outline" className={`cursor-pointer transition-all ${filterType === "completed" ? "ring-2 ring-green-400 bg-green-100 text-green-800 border-green-300" : "bg-green-50 text-green-700 border-green-200"}`}>
                {tasksDone} task{tasksDone !== 1 ? "s" : ""} completed
              </Badge>
            </button>
          )}
          {quotesCreated > 0 && (
            <button onClick={() => setFilterType(filterType === "quotes" ? null : "quotes")}>
              <Badge variant="outline" className={`cursor-pointer transition-all ${filterType === "quotes" ? "ring-2 ring-violet-400 bg-violet-100 text-violet-800 border-violet-300" : "bg-violet-50 text-violet-700 border-violet-200"}`}>
                {quotesCreated} quote{quotesCreated !== 1 ? "s" : ""} created
              </Badge>
            </button>
          )}
          {statusChanges > 0 && (
            <button onClick={() => setFilterType(filterType === "status" ? null : "status")}>
              <Badge variant="outline" className={`cursor-pointer transition-all ${filterType === "status" ? "ring-2 ring-blue-400 bg-blue-100 text-blue-800 border-blue-300" : "bg-blue-50 text-blue-700 border-blue-200"}`}>
                {statusChanges} status change{statusChanges !== 1 ? "s" : ""}
              </Badge>
            </button>
          )}
          {logins > 0 && (
            <button onClick={() => setFilterType(filterType === "logins" ? null : "logins")}>
              <Badge variant="outline" className={`cursor-pointer transition-all ${filterType === "logins" ? "ring-2 ring-sky-400 bg-sky-100 text-sky-800 border-sky-300" : "bg-sky-50 text-sky-700 border-sky-200"}`}>
                {logins} login{logins !== 1 ? "s" : ""}
              </Badge>
            </button>
          )}
          {(filterType || filterUser) && (
            <button
              onClick={() => { setFilterType(null); setFilterUser(null); }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3 w-3" /> Clear filters
            </button>
          )}
        </div>
      )}

      {/* Entries */}
      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>
      ) : entries.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No activity recorded for this day.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No matching entries.
          </p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => { setFilterType(null); setFilterUser(null); }}>
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((entry) => {
            const { icon, label, color } = describeAction(entry);

            return (
              <div
                key={entry.id}
                className="flex items-start gap-3 rounded-lg border border-border p-3"
              >
                {/* Icon */}
                <div className="mt-0.5 shrink-0">{icon}</div>

                {/* Content */}
                <div className="min-w-0 flex-1 space-y-0.5">
                  {/* Action label + badge */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={`text-xs ${color}`}>
                      {label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(entry.createdAt)}
                    </span>
                  </div>

                  {/* What was affected */}
                  <p className="text-sm">
                    {entry.entity === "activity" ? (
                      <>
                        <span className="font-medium">{entry.entityName}</span>
                      </>
                    ) : (
                      <>
                        <span className="font-medium">{entry.projectName ?? entry.entityName}</span>
                      </>
                    )}
                  </p>

                  {/* Project context for activities */}
                  {entry.entity === "activity" && entry.projectId && (
                    <p className="text-xs text-muted-foreground">
                      <Link
                        href={`/projects/${entry.projectId}`}
                        className="hover:underline"
                      >
                        {entry.projectName}
                        {entry.projectQuoteNumber && (
                          <span className="font-mono ml-1">
                            ({entry.projectQuoteNumber})
                          </span>
                        )}
                      </Link>
                    </p>
                  )}

                  {/* Quote number for project-level entries */}
                  {entry.entity === "project" && entry.projectQuoteNumber && (
                    <p className="text-xs text-muted-foreground font-mono">
                      <Link
                        href={`/projects/${entry.projectId}`}
                        className="hover:underline"
                      >
                        {entry.projectQuoteNumber}
                      </Link>
                    </p>
                  )}

                  {/* Who did it */}
                  {entry.userName && (
                    <p className="text-xs text-muted-foreground">
                      by {entry.userName}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
