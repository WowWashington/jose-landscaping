import { db } from "@/db";
import { taskTemplates } from "@/db/schema";
import { like, or, and, eq, asc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import type { TaskTemplate } from "@/types";

// GET /api/templates — list all templates as a hierarchical tree
// Query params: ?q= (search), ?division= (filter by division)
export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get("q");
    const division = request.nextUrl.searchParams.get("division");

    const conditions = [];

    if (q) {
      const pattern = `%${q}%`;
      conditions.push(
        or(
          like(taskTemplates.name, pattern),
          like(taskTemplates.description, pattern),
          like(taskTemplates.category, pattern)
        )!
      );
    }

    if (division) {
      conditions.push(eq(taskTemplates.division, division));
    }

    let rows;
    if (conditions.length > 0) {
      rows = db
        .select()
        .from(taskTemplates)
        .where(conditions.length === 1 ? conditions[0] : and(...conditions))
        .orderBy(asc(taskTemplates.sortOrder), asc(taskTemplates.name))
        .all();
    } else {
      rows = db
        .select()
        .from(taskTemplates)
        .orderBy(asc(taskTemplates.sortOrder), asc(taskTemplates.name))
        .all();
    }

    // Build hierarchical tree
    const map = new Map<string, TaskTemplate & { children: TaskTemplate[] }>();
    const roots: (TaskTemplate & { children: TaskTemplate[] })[] = [];

    for (const row of rows) {
      map.set(row.id, { ...row, children: [] });
    }

    for (const row of rows) {
      const node = map.get(row.id)!;
      if (row.parentId && map.has(row.parentId)) {
        map.get(row.parentId)!.children.push(node);
      } else if (!row.parentId) {
        roots.push(node);
      } else {
        roots.push(node);
      }
    }

    return NextResponse.json(roots);
  } catch (error) {
    console.error("GET /api/templates error:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}

// POST /api/templates — create a new template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      parentId,
      name,
      description,
      division,
      category,
      depth,
      defaultCost,
      defaultHours,
      defaultManpower,
      unit,
      sortOrder,
      isActive,
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const row = db
      .insert(taskTemplates)
      .values({
        parentId: parentId ?? null,
        name,
        description,
        division: division ?? "yard_care",
        category,
        depth: depth ?? 0,
        defaultCost,
        defaultHours,
        defaultManpower,
        unit,
        sortOrder: sortOrder ?? 0,
        isActive: isActive ?? true,
      })
      .returning()
      .get();

    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    console.error("POST /api/templates error:", error);
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 }
    );
  }
}
