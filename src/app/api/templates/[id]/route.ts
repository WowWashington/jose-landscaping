import { db } from "@/db";
import { taskTemplates } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

// GET /api/templates/:id — get a single template
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const row = db
      .select()
      .from(taskTemplates)
      .where(eq(taskTemplates.id, id))
      .get();

    if (!row) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(row);
  } catch (error) {
    console.error("GET /api/templates/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch template" },
      { status: 500 }
    );
  }
}

// PUT /api/templates/:id — update a template
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = db
      .select()
      .from(taskTemplates)
      .where(eq(taskTemplates.id, id))
      .get();

    if (!existing) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    const row = db
      .update(taskTemplates)
      .set(body)
      .where(eq(taskTemplates.id, id))
      .returning()
      .get();

    return NextResponse.json(row);
  } catch (error) {
    console.error("PUT /api/templates/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update template" },
      { status: 500 }
    );
  }
}

// DELETE /api/templates/:id — delete a template (and its children)
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const existing = db
      .select()
      .from(taskTemplates)
      .where(eq(taskTemplates.id, id))
      .get();

    if (!existing) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    // Delete grandchildren first (depth 2)
    const children = db
      .select()
      .from(taskTemplates)
      .where(eq(taskTemplates.parentId, id))
      .all();

    for (const child of children) {
      db.delete(taskTemplates)
        .where(eq(taskTemplates.parentId, child.id))
        .run();
    }

    // Delete children (depth 1)
    db.delete(taskTemplates)
      .where(eq(taskTemplates.parentId, id))
      .run();

    // Delete the template itself
    db.delete(taskTemplates)
      .where(eq(taskTemplates.id, id))
      .run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/templates/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 }
    );
  }
}
