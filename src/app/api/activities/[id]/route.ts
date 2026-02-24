import { db } from "@/db";
import { projectActivities } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { logChange } from "@/lib/log-change";
import { getSessionUser } from "@/lib/get-session-user";

type Params = { params: Promise<{ id: string }> };

// PUT /api/activities/:id — update a single activity
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = db
      .select()
      .from(projectActivities)
      .where(eq(projectActivities.id, id))
      .get();

    if (!existing) {
      return NextResponse.json(
        { error: "Activity not found" },
        { status: 404 }
      );
    }

    // Only allow updating safe fields
    const allowedFields: Record<string, unknown> = {};
    const updatable = [
      "name",
      "description",
      "cost",
      "hours",
      "manpower",
      "quantity",
      "unit",
      "isComplete",
      "sortOrder",
      "crewId",
    ] as const;

    for (const key of updatable) {
      if (key in body) {
        allowedFields[key] = body[key];
      }
    }

    // Track who completed and when
    const sessionUser = await getSessionUser();
    if ("isComplete" in body) {
      if (body.isComplete) {
        allowedFields.completedBy = sessionUser?.id ?? null;
        allowedFields.completedAt = new Date();
      } else {
        allowedFields.completedBy = null;
        allowedFields.completedAt = null;
      }
    }

    const row = db
      .update(projectActivities)
      .set(allowedFields)
      .where(eq(projectActivities.id, id))
      .returning()
      .get();

    // Log changes
    if ("isComplete" in body) {
      logChange({
        projectId: existing.projectId,
        activityId: id,
        userId: sessionUser?.id,
        userName: sessionUser?.name,
        action: body.isComplete ? "completed" : "uncompleted",
        entity: "activity",
        entityName: existing.name,
      });
    } else {
      const fields = Object.keys(body);
      logChange({
        projectId: existing.projectId,
        activityId: id,
        userId: sessionUser?.id,
        userName: sessionUser?.name,
        action: "updated",
        entity: "activity",
        entityName: existing.name,
        details: fields.join(", "),
      });
    }

    return NextResponse.json(row);
  } catch (error) {
    console.error("PUT /api/activities/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update activity" },
      { status: 500 }
    );
  }
}

// DELETE /api/activities/:id — delete an activity and all its children
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const existing = db
      .select()
      .from(projectActivities)
      .where(eq(projectActivities.id, id))
      .get();

    if (!existing) {
      return NextResponse.json(
        { error: "Activity not found" },
        { status: 404 }
      );
    }

    // Log before deleting
    const delUser = await getSessionUser();
    logChange({
      projectId: existing.projectId,
      activityId: id,
      userId: delUser?.id,
      userName: delUser?.name,
      action: "deleted",
      entity: "activity",
      entityName: existing.name,
    });

    // Delete grandchildren first (children of children)
    const children = db
      .select()
      .from(projectActivities)
      .where(eq(projectActivities.parentActivityId, id))
      .all();

    for (const child of children) {
      db.delete(projectActivities)
        .where(eq(projectActivities.parentActivityId, child.id))
        .run();
    }

    // Delete direct children
    db.delete(projectActivities)
      .where(eq(projectActivities.parentActivityId, id))
      .run();

    // Delete the activity itself
    db.delete(projectActivities)
      .where(eq(projectActivities.id, id))
      .run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/activities/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete activity" },
      { status: 500 }
    );
  }
}
