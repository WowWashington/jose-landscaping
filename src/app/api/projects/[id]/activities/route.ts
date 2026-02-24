import { db } from "@/db";
import { projects, projectActivities } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { copyTemplateToProject } from "@/lib/template-to-activities";
import type { ProjectActivity } from "@/types";

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

// GET /api/projects/:id/activities — get activities as a tree
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    // Verify project exists
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

    const allActivities = db
      .select()
      .from(projectActivities)
      .where(eq(projectActivities.projectId, id))
      .orderBy(asc(projectActivities.sortOrder), asc(projectActivities.name))
      .all();

    const tree = buildActivityTree(allActivities as ProjectActivity[]);

    return NextResponse.json(tree);
  } catch (error) {
    console.error("GET /api/projects/[id]/activities error:", error);
    return NextResponse.json(
      { error: "Failed to fetch activities" },
      { status: 500 }
    );
  }
}

// POST /api/projects/:id/activities — add an activity
//   Body type "template": { type: "template", templateId, quantity?, includeSubTasks? }
//   Body type "custom":   { type: "custom", name, cost?, hours?, manpower?, description? }
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id: projectId } = await params;

    // Verify project exists
    const project = db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .get();

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const body = await request.json();

    if (body.type === "template") {
      const { templateId, quantity, includeSubTasks } = body;

      if (!templateId) {
        return NextResponse.json(
          { error: "templateId is required" },
          { status: 400 }
        );
      }

      const parentActivityId = await copyTemplateToProject(
        templateId,
        projectId,
        quantity ?? 1,
        includeSubTasks ?? true
      );

      // Return the newly created activity with its children
      const created = db
        .select()
        .from(projectActivities)
        .where(eq(projectActivities.projectId, projectId))
        .orderBy(asc(projectActivities.sortOrder))
        .all();

      // Find the subtree rooted at the new parent activity
      const subtree = created.filter(
        (a) =>
          a.id === parentActivityId ||
          a.parentActivityId === parentActivityId ||
          created.some(
            (mid) =>
              mid.parentActivityId === parentActivityId &&
              a.parentActivityId === mid.id
          )
      );

      const tree = buildActivityTree(subtree as ProjectActivity[]);

      return NextResponse.json(tree.length === 1 ? tree[0] : tree, {
        status: 201,
      });
    } else if (body.type === "custom") {
      const { name, cost, hours, manpower, description, parentActivityId } =
        body;

      if (!name) {
        return NextResponse.json(
          { error: "Name is required for custom activities" },
          { status: 400 }
        );
      }

      const row = db
        .insert(projectActivities)
        .values({
          projectId,
          parentActivityId: parentActivityId ?? null,
          name,
          description,
          cost: cost ?? null,
          hours: hours ?? null,
          manpower: manpower ?? null,
          quantity: 1,
        })
        .returning()
        .get();

      return NextResponse.json(row, { status: 201 });
    } else {
      return NextResponse.json(
        { error: 'Invalid type. Expected "template" or "custom".' },
        { status: 400 }
      );
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create activity";
    console.error("POST /api/projects/[id]/activities error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
