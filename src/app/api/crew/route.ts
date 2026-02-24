import { db } from "@/db";
import { crew } from "@/db/schema";
import { asc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// GET /api/crew — list all crew members
export async function GET() {
  try {
    const rows = db
      .select()
      .from(crew)
      .orderBy(asc(crew.name))
      .all();

    return NextResponse.json(rows);
  } catch (error) {
    console.error("GET /api/crew error:", error);
    return NextResponse.json(
      { error: "Failed to fetch crew" },
      { status: 500 }
    );
  }
}

// POST /api/crew — create a new crew member
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, city, phone, availability, tasks } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const row = db
      .insert(crew)
      .values({ name, city, phone, availability, tasks })
      .returning()
      .get();

    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    console.error("POST /api/crew error:", error);
    return NextResponse.json(
      { error: "Failed to create crew member" },
      { status: 500 }
    );
  }
}
