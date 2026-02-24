import { db } from "@/db";
import { crew } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

// GET /api/crew/:id
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const row = db.select().from(crew).where(eq(crew.id, id)).get();

    if (!row) {
      return NextResponse.json(
        { error: "Crew member not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(row);
  } catch (error) {
    console.error("GET /api/crew/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch crew member" },
      { status: 500 }
    );
  }
}

// PUT /api/crew/:id
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = db.select().from(crew).where(eq(crew.id, id)).get();
    if (!existing) {
      return NextResponse.json(
        { error: "Crew member not found" },
        { status: 404 }
      );
    }

    const row = db
      .update(crew)
      .set(body)
      .where(eq(crew.id, id))
      .returning()
      .get();

    return NextResponse.json(row);
  } catch (error) {
    console.error("PUT /api/crew/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update crew member" },
      { status: 500 }
    );
  }
}

// DELETE /api/crew/:id
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const existing = db.select().from(crew).where(eq(crew.id, id)).get();
    if (!existing) {
      return NextResponse.json(
        { error: "Crew member not found" },
        { status: 404 }
      );
    }

    db.delete(crew).where(eq(crew.id, id)).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/crew/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete crew member" },
      { status: 500 }
    );
  }
}
