"use client";

import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "./status-badge";
import { formatCurrency } from "@/lib/calculations";
import { DIVISION_LABELS } from "@/types";
import { MapPin, User, CalendarClock, CheckCircle2, HardHat, Calendar, Clock } from "lucide-react";
import Link from "next/link";

type ProjectCardData = {
  id: string;
  name: string;
  quoteNumber: string | null;
  status: string | null;
  division: string | null;
  address: string | null;
  contactName: string | null;
  totalCost: number;
  activityCount: number;
  dueDate: string | null;
  confirmed: boolean | null;
  statusNotes: string | null;
  assignedCrew: string[];
  leadCrewName: string | null;
  coverPhoto: string | null;
  startDate: string | null;
  totalHours: number;
};

function GrassAccent() {
  return (
    <div className="absolute bottom-0 left-0 right-0 h-8 overflow-hidden pointer-events-none rounded-b-lg">
      {/* Soft green gradient base */}
      <div className="absolute inset-0 bg-gradient-to-t from-green-100/60 to-transparent dark:from-green-950/30" />
      {/* Left grass blades */}
      <svg
        className="absolute bottom-0 left-1 h-5 w-12 text-green-400/50 dark:text-green-600/40"
        viewBox="0 0 48 20"
        fill="currentColor"
      >
        <path d="M2 20 Q3 8 6 2 Q5 10 8 20Z" />
        <path d="M8 20 Q10 10 14 4 Q12 12 14 20Z" />
        <path d="M14 20 Q15 12 18 6 Q17 14 19 20Z" />
        <path d="M20 20 Q22 10 25 3 Q23 12 25 20Z" />
        <path d="M26 20 Q27 14 29 8 Q28 15 30 20Z" />
      </svg>
      {/* Right grass blades */}
      <svg
        className="absolute bottom-0 right-1 h-5 w-12 text-green-400/50 dark:text-green-600/40"
        viewBox="0 0 48 20"
        fill="currentColor"
      >
        <path d="M18 20 Q20 10 23 3 Q21 12 23 20Z" />
        <path d="M24 20 Q25 12 28 5 Q27 13 29 20Z" />
        <path d="M30 20 Q32 8 35 2 Q33 11 35 20Z" />
        <path d="M36 20 Q37 14 40 6 Q39 15 41 20Z" />
        <path d="M42 20 Q43 10 46 4 Q44 13 46 20Z" />
      </svg>
    </div>
  );
}

function MetalAccent() {
  return (
    <div className="absolute bottom-0 left-0 right-0 h-8 overflow-hidden pointer-events-none rounded-b-lg">
      {/* Brushed metal gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-200/60 to-transparent dark:from-slate-700/30" />
      {/* Left corner: nails */}
      <svg
        className="absolute bottom-1 left-2 h-4 w-10 text-slate-400/60 dark:text-slate-500/40"
        viewBox="0 0 40 16"
        fill="currentColor"
      >
        {/* Nail 1 */}
        <rect x="4" y="4" width="1.5" height="10" rx="0.3" />
        <circle cx="4.75" cy="3.5" r="2" />
        {/* Nail 2 */}
        <rect x="14" y="6" width="1.5" height="8" rx="0.3" />
        <circle cx="14.75" cy="5.5" r="2" />
      </svg>
      {/* Right corner: hammer */}
      <svg
        className="absolute bottom-1 right-2 h-5 w-8 text-slate-400/60 dark:text-slate-500/40"
        viewBox="0 0 32 20"
        fill="currentColor"
      >
        {/* Hammer handle */}
        <rect x="12" y="8" width="16" height="2.5" rx="1" transform="rotate(-30 20 9)" />
        {/* Hammer head */}
        <rect x="6" y="4" width="8" height="5" rx="1" transform="rotate(-30 10 7)" />
      </svg>
      {/* Subtle metallic line */}
      <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-slate-300/50 to-transparent dark:via-slate-600/30" />
    </div>
  );
}

export function ProjectCard({ project }: { project: ProjectCardData }) {
  const isLandscaping = project.division !== "general_contracting";
  const divIcon = isLandscaping ? "🌿" : "🔨";

  const dueDateLabel = project.dueDate
    ? new Date(project.dueDate + "T00:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null;

  const startDateLabel = (() => {
    if (!project.startDate) return null;
    const hasTime = project.startDate.includes("T");
    const dateStr = hasTime ? project.startDate : project.startDate + "T00:00:00";
    const d = new Date(dateStr);
    const datePart = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    if (hasTime) {
      const timePart = d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      return `${datePart} · ${timePart}`;
    }
    return datePart;
  })();

  const cardBorder = isLandscaping
    ? "border-green-200/60 dark:border-green-900/30"
    : "border-slate-300/60 dark:border-slate-700/30";

  return (
    <Link href={`/projects/${project.id}`}>
      <Card
        className={`hover:bg-accent/50 transition-colors cursor-pointer relative overflow-hidden ${cardBorder}`}
      >
        <CardContent className="p-4 pb-6 relative z-10">
          <div className="flex items-start justify-between">
            {/* Cover photo thumbnail */}
            {project.coverPhoto && (
              <div className="shrink-0 mr-3 rounded-md overflow-hidden w-14 h-14 bg-muted">
                <img
                  src={`/api/uploads/${project.coverPhoto}`}
                  alt=""
                  className="object-cover w-full h-full"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-base truncate">
                <span className="mr-1.5">{divIcon}</span>
                {project.name}
              </h3>
              {project.quoteNumber && (
                <span className="text-[11px] text-muted-foreground font-mono">
                  {project.quoteNumber}
                </span>
              )}
              <div className="mt-1 space-y-0.5 text-sm text-muted-foreground">
                {project.contactName && (
                  <div className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    <span className="truncate">{project.contactName}</span>
                  </div>
                )}
                {startDateLabel && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Start: {startDateLabel}</span>
                  </div>
                )}
                {project.address && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    <span className="truncate">{project.address}</span>
                  </div>
                )}
                {dueDateLabel && (
                  <div className="flex items-center gap-1.5">
                    <CalendarClock className="h-3.5 w-3.5" />
                    <span>
                      Due {dueDateLabel}
                      {project.confirmed && (
                        <span className="ml-1.5 text-green-600 inline-flex items-center gap-0.5">
                          <CheckCircle2 className="h-3 w-3" /> Confirmed
                        </span>
                      )}
                    </span>
                  </div>
                )}
                {!dueDateLabel && project.confirmed && (
                  <div className="flex items-center gap-1.5 text-green-600">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Confirmed</span>
                  </div>
                )}
                {project.totalHours > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{project.totalHours} hrs</span>
                  </div>
                )}
                {project.leadCrewName && (
                  <div className="flex items-center gap-1.5 text-blue-600">
                    <HardHat className="h-3.5 w-3.5" />
                    <span className="truncate font-medium">
                      Lead: {project.leadCrewName}
                    </span>
                  </div>
                )}
                {project.assignedCrew.length > 0 && !project.leadCrewName && (
                  <div className="flex items-center gap-1.5">
                    <HardHat className="h-3.5 w-3.5" />
                    <span className="truncate">
                      {project.assignedCrew.join(", ")}
                    </span>
                  </div>
                )}
              </div>
              {project.statusNotes && (
                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 italic">
                  {project.statusNotes}
                </p>
              )}
            </div>
            <div className="text-right shrink-0 ml-3">
              <StatusBadge status={project.status ?? "draft"} />
              <p className="mt-1.5 text-sm font-medium">
                {formatCurrency(project.totalCost)}
              </p>
            </div>
          </div>
        </CardContent>
        {isLandscaping ? <GrassAccent /> : <MetalAccent />}
      </Card>
    </Link>
  );
}
