import { db } from "@/db";
import { contacts, projects, projectActivities, users } from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { logChange } from "@/lib/log-change";
import { getSessionUser } from "@/lib/get-session-user";
import { generateQuoteNumber } from "@/lib/quote-number";

// GET /api/projects — list all projects with contact name and activity count/totalCost
//   Optional filter: ?status=active
export async function GET(request: NextRequest) {
  try {
    const status = request.nextUrl.searchParams.get("status");
    const contactId = request.nextUrl.searchParams.get("contactId");

    // Fetch projects with optional status and contactId filters
    const conditions = [];
    if (status) conditions.push(eq(projects.status, status));
    if (contactId) conditions.push(eq(projects.contactId, contactId));

    let projectRows;
    if (conditions.length > 0) {
      projectRows = db
        .select()
        .from(projects)
        .where(conditions.length === 1 ? conditions[0] : and(...conditions))
        .orderBy(desc(projects.createdAt))
        .all();
    } else {
      projectRows = db
        .select()
        .from(projects)
        .orderBy(desc(projects.createdAt))
        .all();
    }

    // Batch-load all lookups once instead of per-project
    const allUsers = db.select().from(users).all();
    const crewMap = new Map(allUsers.map((u) => [u.id, u.name]));

    const allContacts = db.select().from(contacts).all();
    const contactMap = new Map(allContacts.map((c) => [c.id, c]));

    const allActivities = db.select().from(projectActivities).all();
    const activitiesByProject = new Map<string, typeof allActivities>();
    for (const a of allActivities) {
      const list = activitiesByProject.get(a.projectId) ?? [];
      list.push(a);
      activitiesByProject.set(a.projectId, list);
    }

    // Enrich each project
    const enriched = projectRows.map((project) => {
      const contact = project.contactId ? contactMap.get(project.contactId) ?? null : null;
      const activities = activitiesByProject.get(project.id) ?? [];

      const leafActivities = activities.filter(
        (a) => !activities.some((child) => child.parentActivityId === a.id)
      );

      const totalCost = leafActivities.reduce(
        (sum, a) => sum + (a.cost ?? 0) * (a.quantity ?? 1),
        0
      );

      const totalHours = leafActivities.reduce(
        (sum, a) => sum + (a.hours ?? 0),
        0
      );

      const assignedCrewNames = [
        ...new Set(
          activities
            .map((a) => (a.crewId ? crewMap.get(a.crewId) : null))
            .filter((n): n is string => n !== null && n !== undefined)
        ),
      ];

      return {
        ...project,
        contact: contact ?? null,
        activityCount: activities.length,
        totalCost: Math.round(totalCost * 100) / 100,
        totalHours: Math.round(totalHours * 10) / 10,
        assignedCrew: assignedCrewNames,
        leadCrewName: project.leadCrewId ? crewMap.get(project.leadCrewId) ?? null : null,
        createdByName: project.createdBy ? crewMap.get(project.createdBy) ?? null : null,
      };
    });

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("GET /api/projects error:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

// POST /api/projects — create a new project
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      contactId,
      division,
      name,
      description,
      status,
      address,
      startDate,
      endDate,
      notes,
      leadCrewId,
      createdBy,
    } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const row = db
      .insert(projects)
      .values({
        contactId: contactId ?? null,
        quoteNumber: generateQuoteNumber(),
        division: division ?? "yard_care",
        name: name.trim(),
        description,
        status: status ?? "draft",
        address,
        startDate,
        endDate,
        notes,
        leadCrewId: leadCrewId ?? null,
        createdBy: createdBy ?? null,
      })
      .returning()
      .get();

    // Log creation
    const sessionUser = await getSessionUser();
    logChange({
      projectId: row.id,
      userId: sessionUser?.id,
      userName: sessionUser?.name,
      action: "created",
      entity: "project",
      entityName: name,
    });

    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    console.error("POST /api/projects error:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
