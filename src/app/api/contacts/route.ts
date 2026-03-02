import { db } from "@/db";
import { contacts } from "@/db/schema";
import { like, or, desc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/get-session-user";

// GET /api/contacts — list all contacts, optional search with ?q=
export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get("q");

    let rows;
    if (q) {
      const pattern = `%${q}%`;
      rows = db
        .select()
        .from(contacts)
        .where(
          or(
            like(contacts.name, pattern),
            like(contacts.phone, pattern),
            like(contacts.email, pattern),
            like(contacts.address, pattern),
            like(contacts.city, pattern)
          )
        )
        .orderBy(desc(contacts.createdAt))
        .all();
    } else {
      rows = db
        .select()
        .from(contacts)
        .orderBy(desc(contacts.createdAt))
        .all();
    }

    return NextResponse.json(rows);
  } catch (error) {
    console.error("GET /api/contacts error:", error);
    return NextResponse.json(
      { error: "Failed to fetch contacts" },
      { status: 500 }
    );
  }
}

// POST /api/contacts — create a new contact (coordinator+)
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role === "worker") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = await request.json();
    const { name, phone, email, address, city, state, zip, notes, lastContactDate } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const row = db
      .insert(contacts)
      .values({ name, phone, email, address, city, state, zip, notes, lastContactDate })
      .returning()
      .get();

    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    console.error("POST /api/contacts error:", error);
    return NextResponse.json(
      { error: "Failed to create contact" },
      { status: 500 }
    );
  }
}
