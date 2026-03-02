import { db } from "@/db";
import { changeLog, projects } from "@/db/schema";
import { and, gte, lt, inArray, desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/activity-log?date=2026-02-23
 *
 * Returns change log entries for a given day, filtered to the actions
 * an owner / coordinator cares about:
 *   - project created    (new quote started)
 *   - status_changed     (quote sent, project completed, etc.)
 *   - completed          (task marked done)
 *   - uncompleted        (task re-opened)
 *
 * Each entry is enriched with the project's quoteNumber for context.
 */
export async function GET(request: NextRequest) {
  try {
    const dateParam = request.nextUrl.searchParams.get("date");
    const date = dateParam ? new Date(dateParam + "T00:00:00") : new Date();

    // Build day boundaries
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    // Actions we care about on the daily board
    const relevantActions = [
      "created",         // project created (new quote)
      "status_changed",  // quote sent, project completed, etc.
      "completed",       // task completed
      "uncompleted",     // task re-opened
      "login",           // user logged in
      "logout",          // user logged out
    ];

    const entries = db
      .select()
      .from(changeLog)
      .where(
        and(
          gte(changeLog.createdAt, dayStart),
          lt(changeLog.createdAt, dayEnd),
          inArray(changeLog.action, relevantActions)
        )
      )
      .orderBy(desc(changeLog.createdAt))
      .all();

    // Enrich with project quote numbers for display (batch query)
    const projectIds = [
      ...new Set(
        entries
          .map((e) => e.projectId)
          .filter((id): id is string => id !== null)
      ),
    ];

    const quoteMap = new Map<string, string>();
    const nameMap = new Map<string, string>();
    if (projectIds.length > 0) {
      const projectRows = db
        .select({ id: projects.id, quoteNumber: projects.quoteNumber, name: projects.name })
        .from(projects)
        .where(inArray(projects.id, projectIds))
        .all();
      for (const p of projectRows) {
        if (p.quoteNumber) quoteMap.set(p.id, p.quoteNumber);
        nameMap.set(p.id, p.name);
      }
    }

    const enriched = entries.map((e) => ({
      ...e,
      projectQuoteNumber: e.projectId ? quoteMap.get(e.projectId) ?? null : null,
      projectName: e.projectId ? nameMap.get(e.projectId) ?? null : null,
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("GET /api/activity-log error:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity log" },
      { status: 500 }
    );
  }
}
