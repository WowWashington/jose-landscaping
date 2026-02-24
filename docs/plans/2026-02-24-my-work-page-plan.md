# My Work Page + Project Search Enhancement — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a personal "My Work" dashboard showing a worker's assigned projects and tasks, plus expand the project search to match crew names.

**Architecture:** New `/my-work` page fetches from a new `GET /api/my-work` endpoint that queries activities/projects by the user's linked `crewId`. Task completion reuses the existing `PUT /api/activities/[id]` endpoint. Project search enhancement is a single-line filter expansion.

**Tech Stack:** Next.js 14 (App Router), Drizzle ORM (SQLite), React, Tailwind CSS, Lucide icons

---

## Task 1: My Work API Endpoint

**Files:**
- Create: `src/app/api/my-work/route.ts`

**Step 1: Create the API endpoint**

Create `src/app/api/my-work/route.ts`:

```typescript
import { db } from "@/db";
import { projects, projectActivities, crew, users } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/get-session-user";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user.crewId) {
      return NextResponse.json({ today: [], upcoming: [], noCrewProfile: true });
    }

    const crewId = user.crewId;
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    // Build crew name lookup
    const allCrew = db.select().from(crew).all();
    const crewMap = new Map(allCrew.map((c) => [c.id, c.name]));

    // Find all activities assigned to this crew member
    const myActivities = db
      .select()
      .from(projectActivities)
      .where(eq(projectActivities.crewId, crewId))
      .all();

    // Get unique project IDs from my activities
    const activityProjectIds = [...new Set(myActivities.map((a) => a.projectId))];

    // Also find projects where I'm the lead
    const leadProjects = db
      .select()
      .from(projects)
      .where(eq(projects.leadCrewId, crewId))
      .all();

    const leadProjectIds = leadProjects.map((p) => p.id);

    // Combine all relevant project IDs
    const allProjectIds = [...new Set([...activityProjectIds, ...leadProjectIds])];

    if (allProjectIds.length === 0) {
      return NextResponse.json({ today: [], upcoming: [], noCrewProfile: false });
    }

    // Fetch all relevant projects
    const allProjects = allProjectIds.length > 0
      ? db.select().from(projects).where(inArray(projects.id, allProjectIds)).all()
      : [];

    // Fetch ALL activities for these projects (to show other crew)
    const allProjectActivities = allProjectIds.length > 0
      ? db.select().from(projectActivities).where(inArray(projectActivities.projectId, allProjectIds)).all()
      : [];

    // Build response
    const todayProjects: any[] = [];
    const upcomingProjects: any[] = [];

    for (const project of allProjects) {
      const projectActs = allProjectActivities.filter((a) => a.projectId === project.id);
      const myProjectActs = projectActs.filter((a) => a.crewId === crewId);
      const pendingActs = myProjectActs.filter((a) => !a.isComplete);
      const myHours = myProjectActs.reduce((sum, a) => sum + (a.hours ?? 0), 0);

      // Other crew on this project
      const otherCrewIds = [...new Set(
        projectActs
          .map((a) => a.crewId)
          .filter((id): id is string => id !== null && id !== crewId)
      )];
      const otherCrew = otherCrewIds.map((id) => crewMap.get(id)).filter(Boolean) as string[];

      const leadCrewName = project.leadCrewId ? crewMap.get(project.leadCrewId) ?? null : null;

      const projectData = {
        id: project.id,
        name: project.name,
        division: project.division,
        address: project.address,
        dueDate: project.dueDate,
        startDate: project.startDate,
        status: project.status,
        confirmed: project.confirmed,
        leadCrewName,
      };

      // Active projects = today's work
      if (project.status === "active") {
        todayProjects.push({
          project: projectData,
          myActivities: myProjectActs.map((a) => ({
            id: a.id,
            name: a.name,
            hours: a.hours,
            isComplete: a.isComplete,
          })),
          otherCrew,
          myHours: Math.round(myHours * 10) / 10,
          pendingCount: pendingActs.length,
          totalCount: myProjectActs.length,
        });
      }

      // Upcoming: confirmed + future start date, or quoted + confirmed
      const isFuture = project.startDate && project.startDate > today;
      const isUpcoming =
        (project.confirmed && isFuture) ||
        (project.status === "quoted" && project.confirmed);

      if (isUpcoming && project.status !== "active") {
        upcomingProjects.push({
          project: projectData,
          taskCount: myProjectActs.length,
        });
      }
    }

    // Sort today by due date (soonest first)
    todayProjects.sort((a, b) => {
      if (!a.project.dueDate && !b.project.dueDate) return 0;
      if (!a.project.dueDate) return 1;
      if (!b.project.dueDate) return -1;
      return a.project.dueDate.localeCompare(b.project.dueDate);
    });

    // Sort upcoming by start date
    upcomingProjects.sort((a, b) => {
      if (!a.project.startDate && !b.project.startDate) return 0;
      if (!a.project.startDate) return 1;
      if (!b.project.startDate) return -1;
      return a.project.startDate.localeCompare(b.project.startDate);
    });

    return NextResponse.json({ today: todayProjects, upcoming: upcomingProjects, noCrewProfile: false });
  } catch (error) {
    console.error("GET /api/my-work error:", error);
    return NextResponse.json({ error: "Failed to fetch my work" }, { status: 500 });
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/my-work/route.ts
git commit -m "feat: add GET /api/my-work endpoint for personal dashboard"
```

---

## Task 2: My Work Page UI

**Files:**
- Create: `src/app/my-work/page.tsx`

**Step 1: Create the My Work page**

Create `src/app/my-work/page.tsx`:

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Briefcase,
  CalendarClock,
  Calendar,
  Clock,
  HardHat,
  MapPin,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

type MyActivity = {
  id: string;
  name: string;
  hours: number | null;
  isComplete: boolean | null;
};

type TodayProject = {
  project: {
    id: string;
    name: string;
    division: string | null;
    address: string | null;
    dueDate: string | null;
    leadCrewName: string | null;
  };
  myActivities: MyActivity[];
  otherCrew: string[];
  myHours: number;
  pendingCount: number;
  totalCount: number;
};

type UpcomingProject = {
  project: {
    id: string;
    name: string;
    division: string | null;
    startDate: string | null;
  };
  taskCount: number;
};

type MyWorkData = {
  today: TodayProject[];
  upcoming: UpcomingProject[];
  noCrewProfile: boolean;
};

export default function MyWorkPage() {
  const { user } = useAuth();
  const [data, setData] = useState<MyWorkData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetch("/api/my-work")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleTask(activityId: string, currentComplete: boolean) {
    await fetch(`/api/activities/${activityId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isComplete: !currentComplete }),
    });
    load(); // Refresh
  }

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading...</div>;
  }

  if (data?.noCrewProfile) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        <h1 className="text-xl font-semibold flex items-center gap-2 mb-4">
          <Briefcase className="h-5 w-5" /> My Work
        </h1>
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No crew profile linked to your account.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Ask the owner to link your user to a crew member in the Users page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const divIcon = (div: string | null) =>
    div === "general_contracting" ? "🔨" : "🌿";

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold flex items-center gap-2 mb-4">
        <Briefcase className="h-5 w-5" /> My Work
      </h1>

      {/* Today's Work */}
      <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
        Active Projects
      </h2>

      {data?.today.length === 0 ? (
        <Card className="mb-6">
          <CardContent className="p-4 text-sm text-muted-foreground text-center">
            No active projects assigned to you right now.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 mb-6">
          {data?.today.map((item) => (
            <Card key={item.project.id}>
              <CardContent className="p-4">
                <Link
                  href={`/projects/${item.project.id}`}
                  className="block mb-2"
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <h3 className="font-medium text-base">
                        <span className="mr-1.5">
                          {divIcon(item.project.division)}
                        </span>
                        {item.project.name}
                      </h3>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-1">
                        {item.project.address && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {item.project.address}
                          </span>
                        )}
                        {item.project.dueDate && (
                          <span className="flex items-center gap-1">
                            <CalendarClock className="h-3 w-3" />
                            Due{" "}
                            {new Date(
                              item.project.dueDate + "T00:00:00"
                            ).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        )}
                        {item.myHours > 0 && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {item.myHours} hrs
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground shrink-0 ml-2">
                      {item.pendingCount}/{item.totalCount} pending
                    </div>
                  </div>
                </Link>

                {/* My tasks */}
                <div className="space-y-1.5 mt-2 border-t pt-2">
                  {item.myActivities.map((act) => (
                    <div
                      key={act.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Checkbox
                        checked={!!act.isComplete}
                        onCheckedChange={() =>
                          toggleTask(act.id, !!act.isComplete)
                        }
                      />
                      <span
                        className={
                          act.isComplete
                            ? "line-through text-muted-foreground"
                            : ""
                        }
                      >
                        {act.name}
                      </span>
                      {act.hours && (
                        <span className="text-xs text-muted-foreground ml-auto">
                          {act.hours}h
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Other crew */}
                {item.otherCrew.length > 0 && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <HardHat className="h-3 w-3" />
                    Also: {item.otherCrew.join(", ")}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upcoming */}
      {data?.upcoming && data.upcoming.length > 0 && (
        <>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Upcoming
          </h2>
          <div className="space-y-2">
            {data.upcoming.map((item) => (
              <Link
                key={item.project.id}
                href={`/projects/${item.project.id}`}
              >
                <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-sm">
                        <span className="mr-1">
                          {divIcon(item.project.division)}
                        </span>
                        {item.project.name}
                      </p>
                      {item.project.startDate && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Calendar className="h-3 w-3" />
                          Starts{" "}
                          {new Date(
                            item.project.startDate + "T00:00:00"
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {item.taskCount} tasks
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
```

**Step 2: Verify Checkbox component exists**

Run: `ls /Users/automator/Projects/jose-landscaping/src/components/ui/checkbox.tsx`

If missing: `cd /Users/automator/Projects/jose-landscaping && npx shadcn@latest add checkbox`

**Step 3: Commit**

```bash
git add src/app/my-work/page.tsx
git commit -m "feat: add My Work page with task completion"
```

---

## Task 3: Add My Work to Navigation

**Files:**
- Modify: `src/components/layout/app-shell.tsx`

**Step 1: Add Briefcase import and nav item**

In `src/components/layout/app-shell.tsx`, add `Briefcase` to the lucide import on line 5:
```typescript
import { FolderKanban, ListTree, Users, HardHat, ShieldCheck, LogOut, ClipboardList, Settings, Briefcase } from "lucide-react";
```

Add the My Work nav item as the FIRST item in the `navItems` array (before Projects):
```typescript
const navItems: NavItem[] = [
  { href: "/my-work", label: "My Work", icon: Briefcase, minRole: "worker" },
  { href: "/", label: "Projects", icon: FolderKanban, minRole: "worker" },
  // ... rest unchanged
];
```

**Step 2: Update the `isActive` function to handle `/my-work`**

The existing `isActive` function handles `/` specially. No changes needed — `/my-work` will match via `pathname === href || pathname.startsWith(href + "/")`.

**Step 3: Commit**

```bash
git add src/components/layout/app-shell.tsx
git commit -m "feat: add My Work to navigation (all roles)"
```

---

## Task 4: Enhanced Project Search — Crew Name Matching

**Files:**
- Modify: `src/app/page.tsx` (lines 56-63, the search filter)

**Step 1: Expand the search filter**

In `src/app/page.tsx`, find the search filter (lines 56-63):
```typescript
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
```

Add two more conditions after the `quoteNumber` line:
```typescript
const filtered = useMemo(() => {
  let result = search
    ? projects.filter((p) => {
        const q = search.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.contact?.name?.toLowerCase().includes(q) ||
          p.address?.toLowerCase().includes(q) ||
          p.quoteNumber?.toLowerCase().includes(q) ||
          p.assignedCrew.some((name) => name.toLowerCase().includes(q)) ||
          (p.leadCrewName?.toLowerCase().includes(q) ?? false)
        );
      })
    : [...projects];
```

**Step 2: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: expand project search to match crew member names"
```

---

## Task 5: Build and Verify

**Step 1: Run the build**

Run: `cd /Users/automator/Projects/jose-landscaping && npm run build`
Expected: Build succeeds with no type errors

**Step 2: Manual verification checklist**

1. Navigate to `/my-work` — page loads
2. If logged-in user has `crewId` linked — shows their active projects + tasks
3. If no `crewId` — shows the "no crew profile" message
4. Check task checkboxes — toggles completion via existing API
5. Upcoming section shows confirmed future projects
6. On Projects page, type a crew member name in search — filters correctly
7. Nav shows "My Work" for all roles as the first item

**Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address build issues from my-work feature"
```
