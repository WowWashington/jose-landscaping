"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { Plus, ArrowUpDown } from "lucide-react";
import { ProjectCard } from "@/components/projects/project-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ProjectListItem = {
  id: string;
  name: string;
  quoteNumber: string | null;
  status: string | null;
  division: string | null;
  address: string | null;
  dueDate: string | null;
  confirmed: boolean | null;
  statusNotes: string | null;
  assignedCrew: string[];
  coverPhoto: string | null;
  contact: { name: string | null } | null;
  activityCount: number;
  totalCost: number;
  startDate: string | null;
  totalHours: number;
};

type SortOption = "newest" | "name" | "dueDate";

const STATUSES = ["all", "draft", "quoted", "active", "completed", "cancelled"];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");

  const load = useCallback(() => {
    setLoading(true);
    const params = filter !== "all" ? `?status=${filter}` : "";
    fetch(`/api/projects${params}`)
      .then((r) => r.json())
      .then((data) => setProjects(data))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    let result = search
      ? projects.filter(
          (p) =>
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.contact?.name?.toLowerCase().includes(search.toLowerCase()) ||
            p.address?.toLowerCase().includes(search.toLowerCase()) ||
            p.quoteNumber?.toLowerCase().includes(search.toLowerCase())
        )
      : [...projects];

    if (sort === "name") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === "dueDate") {
      result.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      });
    }
    // "newest" keeps API order (desc createdAt)

    return result;
  }, [projects, search, sort]);

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
        <Link
          href="/projects/new"
          className="inline-flex items-center gap-2 rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-800"
        >
          <Plus className="h-4 w-4" />
          New Project
        </Link>
      </div>

      <Input
        placeholder="Search projects..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-3"
      />

      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex gap-1.5 flex-wrap">
          {STATUSES.map((s) => (
            <Badge
              key={s}
              variant={filter === s ? "default" : "outline"}
              className="cursor-pointer capitalize"
              onClick={() => setFilter(s)}
            >
              {s}
            </Badge>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          {(["newest", "name", "dueDate"] as SortOption[]).map((s) => (
            <Button
              key={s}
              variant={sort === s ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs px-2"
              onClick={() => setSort(s)}
            >
              {s === "newest" ? "New" : s === "name" ? "Name" : "Due"}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No projects yet.</p>
          <p className="text-sm mt-1">
            Create your first project to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <ProjectCard
              key={p.id}
              project={{
                id: p.id,
                name: p.name,
                quoteNumber: p.quoteNumber ?? null,
                status: p.status,
                division: p.division,
                address: p.address,
                contactName: p.contact?.name ?? null,
                totalCost: p.totalCost,
                activityCount: p.activityCount,
                dueDate: p.dueDate,
                confirmed: p.confirmed,
                statusNotes: p.statusNotes,
                assignedCrew: p.assignedCrew ?? [],
                coverPhoto: p.coverPhoto ?? null,
                startDate: p.startDate ?? null,
                totalHours: p.totalHours ?? 0,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
