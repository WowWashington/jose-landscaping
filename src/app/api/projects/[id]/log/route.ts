import { db } from "@/db";
import { changeLog } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

// GET /api/projects/:id/log — get change log for a project
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const entries = db
      .select()
      .from(changeLog)
      .where(eq(changeLog.projectId, id))
      .orderBy(desc(changeLog.createdAt))
      .all();

    return NextResponse.json(entries);
  } catch (error) {
    console.error("GET /api/projects/[id]/log error:", error);
    return NextResponse.json(
      { error: "Failed to fetch change log" },
      { status: 500 }
    );
  }
}
