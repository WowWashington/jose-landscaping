import { db } from "@/db";
import { contacts, projects, projectActivities, crew, activityPhotos, users } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import type { ProjectActivity } from "@/types";
import { logChange } from "@/lib/log-change";
import { getSessionUser } from "@/lib/get-session-user";

type Params = { params: Promise<{ id: string }> };

// Build a tree of activities from a flat list
function buildActivityTree(
  activities: ProjectActivity[]
): (ProjectActivity & { children: ProjectActivity[] })[] {
  const map = new Map<
    string,
    ProjectActivity & { children: ProjectActivity[] }
  >();
  const roots: (ProjectActivity & { children: ProjectActivity[] })[] = [];

  for (const a of activities) {
    map.set(a.id, { ...a, children: [] });
  }

  for (const a of activities) {
    const node = map.get(a.id)!;
    if (a.parentActivityId && map.has(a.parentActivityId)) {
      map.get(a.parentActivityId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

// GET /api/projects/:id — get a project with full activity tree and contact
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const project = db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .get();

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Get associated contact
    const contact = project.contactId
      ? db
          .select()
          .from(contacts)
          .where(eq(contacts.id, project.contactId))
          .get()
      : null;

    // Get all activities for this project and build a tree
    const allActivities = db
      .select()
      .from(projectActivities)
      .where(eq(projectActivities.projectId, id))
      .orderBy(asc(projectActivities.sortOrder), asc(projectActivities.name))
      .all();

    // Build a crew name lookup for assigned members
    const crewIds = [
      ...new Set(
        allActivities
          .map((a) => a.crewId)
          .filter((id): id is string => id !== null)
      ),
    ];
    const crewMap = new Map<string, string>();
    if (crewIds.length > 0) {
      const crewRows = db.select().from(crew).all();
      for (const c of crewRows) {
        crewMap.set(c.id, c.name);
      }
    }

    // Get photo counts per activity
    const allPhotos = db.select().from(activityPhotos).all();
    const photoCountMap = new Map<string, number>();
    for (const p of allPhotos) {
      photoCountMap.set(p.activityId, (photoCountMap.get(p.activityId) ?? 0) + 1);
    }

    // Build user name lookup for completedBy
    const allUsers = db.select().from(users).all();
    const userMap = new Map(allUsers.map((u) => [u.id, u.name]));

    // Enrich activities with crew name, photo count, completedBy name
    const enrichedActivities = allActivities.map((a) => ({
      ...a,
      crewName: a.crewId ? crewMap.get(a.crewId) ?? null : null,
      photoCount: photoCountMap.get(a.id) ?? 0,
      completedByName: a.completedBy ? userMap.get(a.completedBy) ?? null : null,
    }));

    const activityTree = buildActivityTree(enrichedActivities as ProjectActivity[]);

    // Get createdBy user name
    const createdByUser = project.createdBy
      ? db.select().from(users).where(eq(users.id, project.createdBy)).get()
      : null;

    // Get lead crew member name
    const leadCrew = project.leadCrewId
      ? db.select().from(crew).where(eq(crew.id, project.leadCrewId)).get()
      : null;

    return NextResponse.json({
      ...project,
      contact: contact ?? null,
      activities: activityTree,
      leadCrewName: leadCrew?.name ?? null,
      createdByName: createdByUser?.name ?? null,
    });
  } catch (error) {
    console.error("GET /api/projects/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch project" },
      { status: 500 }
    );
  }
}

// PUT /api/projects/:id — update a project
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .get();

    if (!existing) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const row = db
      .update(projects)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning()
      .get();

    // Log the change
    const sessionUser = await getSessionUser();
    if (body.status && body.status !== existing.status) {
      logChange({
        projectId: id,
        userId: sessionUser?.id,
        userName: sessionUser?.name,
        action: "status_changed",
        entity: "project",
        entityName: existing.name,
        details: `${existing.status ?? "draft"} → ${body.status}`,
      });
    } else {
      const fields = Object.keys(body).filter((k) => k !== "updatedAt");
      logChange({
        projectId: id,
        userId: sessionUser?.id,
        userName: sessionUser?.name,
        action: "updated",
        entity: "project",
        entityName: existing.name,
        details: fields.join(", "),
      });
    }

    return NextResponse.json(row);
  } catch (error) {
    console.error("PUT /api/projects/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update project" },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/:id — delete a project and all its activities
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const existing = db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .get();

    if (!existing) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Log before deleting
    const sessionUser = await getSessionUser();
    logChange({
      projectId: id,
      userId: sessionUser?.id,
      userName: sessionUser?.name,
      action: "deleted",
      entity: "project",
      entityName: existing.name,
    });

    // Delete all activities for this project first
    db.delete(projectActivities)
      .where(eq(projectActivities.projectId, id))
      .run();

    // Delete the project
    db.delete(projects).where(eq(projects.id, id)).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/projects/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 }
    );
  }
}
