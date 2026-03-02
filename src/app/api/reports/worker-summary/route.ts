import { db } from "@/db";
import { changeLog, projectActivities, projects, users } from "@/db/schema";
import { and, gte, lt, eq, inArray, asc, isNotNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/get-session-user";

function toDateStr(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * GET /api/reports/worker-summary?startDate=2026-02-24&endDate=2026-03-02&tz=480
 *
 * Returns worker productivity data for the given date range:
 * - Per-person: tasks completed, hours, cost, grouped by project
 * - Overall totals
 * - People list for the dropdown
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || (user.role !== "owner" && user.role !== "coordinator")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const sp = request.nextUrl.searchParams;
    const startDateParam = sp.get("startDate");
    const endDateParam = sp.get("endDate");
    const tzOffset = parseInt(sp.get("tz") ?? "0");

    // Default to last 7 days
    const now = new Date();
    const defaultEnd = now.toISOString().slice(0, 10);
    const defaultStartDate = new Date(now);
    defaultStartDate.setDate(defaultStartDate.getDate() - 6);
    const defaultStart = defaultStartDate.toISOString().slice(0, 10);

    const startStr = startDateParam || defaultStart;
    const endStr = endDateParam || defaultEnd;

    // Build UTC boundaries adjusted for client timezone
    const rangeStart = new Date(startStr + "T00:00:00Z");
    rangeStart.setUTCMinutes(rangeStart.getUTCMinutes() + tzOffset);
    const rangeEndBase = new Date(endStr + "T00:00:00Z");
    rangeEndBase.setUTCMinutes(rangeEndBase.getUTCMinutes() + tzOffset);
    const rangeEnd = new Date(rangeEndBase.getTime() + 24 * 60 * 60 * 1000);

    // 1. Get completion entries from changeLog
    const rawCompletions = db
      .select()
      .from(changeLog)
      .where(
        and(
          eq(changeLog.action, "completed"),
          eq(changeLog.entity, "activity"),
          gte(changeLog.createdAt, rangeStart),
          lt(changeLog.createdAt, rangeEnd)
        )
      )
      .all()
      .filter((e) => e.details !== "reopened");

    // Deduplicate: if the same activity was completed multiple times,
    // only count the most recent completion
    const seenActivities = new Map<string, (typeof rawCompletions)[0]>();
    for (const entry of rawCompletions) {
      const key = entry.activityId ?? entry.id;
      const existing = seenActivities.get(key);
      if (
        !existing ||
        (entry.createdAt && existing.createdAt && entry.createdAt > existing.createdAt)
      ) {
        seenActivities.set(key, entry);
      }
    }
    const deduped = [...seenActivities.values()];

    // 2. Batch-fetch activity data for hours/cost
    const activityIds = [
      ...new Set(
        deduped
          .map((e) => e.activityId)
          .filter((id): id is string => !!id)
      ),
    ];

    const activityMap = new Map<
      string,
      { hours: number | null; cost: number | null; quantity: number | null; isComplete: boolean | null }
    >();
    if (activityIds.length > 0) {
      const rows = db
        .select({
          id: projectActivities.id,
          hours: projectActivities.hours,
          cost: projectActivities.cost,
          quantity: projectActivities.quantity,
          isComplete: projectActivities.isComplete,
        })
        .from(projectActivities)
        .where(inArray(projectActivities.id, activityIds))
        .all();
      for (const a of rows) {
        activityMap.set(a.id, a);
      }
    }

    // Filter out tasks that are currently NOT complete (reopened after completion)
    const completionEntries = deduped.filter((e) => {
      if (!e.activityId) return true;
      const act = activityMap.get(e.activityId);
      return !act || act.isComplete;
    });

    // 3. Batch-fetch project data
    const projectIds = [
      ...new Set(
        completionEntries
          .map((e) => e.projectId)
          .filter((id): id is string => !!id)
      ),
    ];

    const projectMap = new Map<
      string,
      { name: string; quoteNumber: string | null }
    >();
    if (projectIds.length > 0) {
      const rows = db
        .select({
          id: projects.id,
          name: projects.name,
          quoteNumber: projects.quoteNumber,
        })
        .from(projects)
        .where(inArray(projects.id, projectIds))
        .all();
      for (const p of rows) {
        projectMap.set(p.id, { name: p.name, quoteNumber: p.quoteNumber });
      }
    }

    // 4. Group by userId -> projectId -> tasks
    type TaskEntry = {
      activityId: string | null;
      activityName: string;
      hours: number;
      cost: number;
      completedAt: Date | null;
    };
    type ProjGroup = {
      tasks: TaskEntry[];
      totalHours: number;
      totalCost: number;
    };
    type UserGroup = {
      userId: string;
      userName: string;
      projectMap: Map<string, ProjGroup>;
    };

    const userMap = new Map<string, UserGroup>();

    for (const entry of completionEntries) {
      const uid = entry.userId ?? "unknown";
      const uname = entry.userName ?? "Unknown";

      if (!userMap.has(uid)) {
        userMap.set(uid, { userId: uid, userName: uname, projectMap: new Map() });
      }
      const userEntry = userMap.get(uid)!;

      const pid = entry.projectId ?? "none";
      if (!userEntry.projectMap.has(pid)) {
        userEntry.projectMap.set(pid, { tasks: [], totalHours: 0, totalCost: 0 });
      }
      const projEntry = userEntry.projectMap.get(pid)!;

      const activity = entry.activityId
        ? activityMap.get(entry.activityId)
        : null;
      const qty = activity?.quantity ?? 1;
      const hours = (activity?.hours ?? 0) * qty;
      const cost = (activity?.cost ?? 0) * qty;

      projEntry.tasks.push({
        activityId: entry.activityId,
        activityName: entry.entityName ?? "Unknown task",
        hours,
        cost,
        completedAt: entry.createdAt,
      });
      projEntry.totalHours += hours;
      projEntry.totalCost += cost;
    }

    // 5. Build response
    let grandTotalTasks = 0;
    let grandTotalHours = 0;
    let grandTotalCost = 0;
    const allProjectIdsSet = new Set<string>();

    const people = [...userMap.values()]
      .map((u) => {
        const projectDetails = [...u.projectMap.entries()].map(([pid, pd]) => {
          const proj = projectMap.get(pid);
          allProjectIdsSet.add(pid);
          return {
            projectId: pid,
            projectName: proj?.name ?? "Unknown project",
            quoteNumber: proj?.quoteNumber ?? null,
            tasks: pd.tasks,
            totalHours: Math.round(pd.totalHours * 10) / 10,
            totalCost: Math.round(pd.totalCost * 100) / 100,
          };
        });

        const tasksCompleted = projectDetails.reduce(
          (s, p) => s + p.tasks.length,
          0
        );
        const totalHours = projectDetails.reduce(
          (s, p) => s + p.totalHours,
          0
        );
        const totalCost = projectDetails.reduce(
          (s, p) => s + p.totalCost,
          0
        );

        grandTotalTasks += tasksCompleted;
        grandTotalHours += totalHours;
        grandTotalCost += totalCost;

        return {
          userId: u.userId,
          userName: u.userName,
          tasksCompleted,
          totalHours: Math.round(totalHours * 10) / 10,
          totalCost: Math.round(totalCost * 100) / 100,
          projects: projectDetails,
        };
      })
      .sort((a, b) => b.tasksCompleted - a.tasksCompleted);

    // 6. Scheduled projects in the date range
    // startDate is stored as local date text ("2026-03-02" or "2026-03-02T09:00")
    // Compute the day after endStr for an exclusive upper bound
    const dayAfterEnd = new Date(endStr + "T12:00:00");
    dayAfterEnd.setDate(dayAfterEnd.getDate() + 1);
    const dayAfterEndStr = toDateStr(dayAfterEnd);

    const scheduledRows = db
      .select()
      .from(projects)
      .where(
        and(
          isNotNull(projects.startDate),
          gte(projects.startDate, startStr),
          lt(projects.startDate, dayAfterEndStr)
        )
      )
      .all();

    // Batch-fetch activities for scheduled projects
    const schedProjectIds = scheduledRows.map((p) => p.id);
    let schedActivities: {
      id: string;
      projectId: string;
      name: string;
      crewId: string | null;
      hours: number | null;
      cost: number | null;
      quantity: number | null;
      isComplete: boolean | null;
    }[] = [];
    if (schedProjectIds.length > 0) {
      schedActivities = db
        .select({
          id: projectActivities.id,
          projectId: projectActivities.projectId,
          name: projectActivities.name,
          crewId: projectActivities.crewId,
          hours: projectActivities.hours,
          cost: projectActivities.cost,
          quantity: projectActivities.quantity,
          isComplete: projectActivities.isComplete,
        })
        .from(projectActivities)
        .where(inArray(projectActivities.projectId, schedProjectIds))
        .all();
    }

    // Build crew name map
    const crewIds = [
      ...new Set(
        [
          ...scheduledRows.map((p) => p.leadCrewId),
          ...schedActivities.map((a) => a.crewId),
        ].filter((id): id is string => !!id)
      ),
    ];
    const crewNameMap = new Map<string, string>();
    if (crewIds.length > 0) {
      const crewRows = db
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(inArray(users.id, crewIds))
        .all();
      for (const c of crewRows) {
        crewNameMap.set(c.id, c.name);
      }
    }

    const scheduled = scheduledRows.map((p) => {
      const acts = schedActivities.filter((a) => a.projectId === p.id);
      const totalTasks = acts.length;
      const completedTasks = acts.filter((a) => a.isComplete).length;
      return {
        projectId: p.id,
        projectName: p.name,
        quoteNumber: p.quoteNumber,
        startDate: p.startDate,
        status: p.status,
        leadCrewName: p.leadCrewId
          ? crewNameMap.get(p.leadCrewId) ?? null
          : null,
        totalTasks,
        completedTasks,
        activities: acts.map((a) => ({
          id: a.id,
          name: a.name,
          crewName: a.crewId ? crewNameMap.get(a.crewId) ?? null : null,
          hours: (a.hours ?? 0) * (a.quantity ?? 1),
          cost: (a.cost ?? 0) * (a.quantity ?? 1),
          isComplete: a.isComplete ?? false,
        })),
      };
    });

    // 7. All people for the dropdown
    const allPeople = db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(and(isNotNull(users.role), eq(users.isBlocked, false)))
      .orderBy(asc(users.name))
      .all();

    return NextResponse.json({
      people,
      totals: {
        tasksCompleted: grandTotalTasks,
        totalHours: Math.round(grandTotalHours * 10) / 10,
        totalCost: Math.round(grandTotalCost * 100) / 100,
        projectCount: allProjectIdsSet.size,
      },
      scheduled,
      allPeople,
    });
  } catch (error) {
    console.error("GET /api/reports/worker-summary error:", error);
    return NextResponse.json(
      { error: "Failed to fetch report" },
      { status: 500 }
    );
  }
}
