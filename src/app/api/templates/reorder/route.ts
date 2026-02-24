import { db } from "@/db";
import { taskTemplates } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// POST /api/templates/reorder — update sort orders for a batch of templates
// Body: { items: [{ id: string, sortOrder: number }] }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items } = body;

    if (!Array.isArray(items)) {
      return NextResponse.json(
        { error: "items array is required" },
        { status: 400 }
      );
    }

    for (const item of items) {
      if (item.id && typeof item.sortOrder === "number") {
        db.update(taskTemplates)
          .set({ sortOrder: item.sortOrder })
          .where(eq(taskTemplates.id, item.id))
          .run();
      }
    }

    return NextResponse.json({ success: true, updated: items.length });
  } catch (error) {
    console.error("POST /api/templates/reorder error:", error);
    return NextResponse.json(
      { error: "Failed to reorder templates" },
      { status: 500 }
    );
  }
}
