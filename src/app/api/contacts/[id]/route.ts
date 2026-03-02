import { db } from "@/db";
import { contacts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/get-session-user";

type Params = { params: Promise<{ id: string }> };

// GET /api/contacts/:id — get a single contact
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const row = db
      .select()
      .from(contacts)
      .where(eq(contacts.id, id))
      .get();

    if (!row) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(row);
  } catch (error) {
    console.error("GET /api/contacts/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch contact" },
      { status: 500 }
    );
  }
}

// PUT /api/contacts/:id — update a contact (coordinator+)
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const user = await getSessionUser();
    if (!user || user.role === "worker") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    const body = await request.json();

    const existing = db
      .select()
      .from(contacts)
      .where(eq(contacts.id, id))
      .get();

    if (!existing) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      );
    }

    const row = db
      .update(contacts)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(contacts.id, id))
      .returning()
      .get();

    return NextResponse.json(row);
  } catch (error) {
    console.error("PUT /api/contacts/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update contact" },
      { status: 500 }
    );
  }
}

// DELETE /api/contacts/:id — delete a contact (coordinator+)
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const user = await getSessionUser();
    if (!user || user.role === "worker") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;

    const existing = db
      .select()
      .from(contacts)
      .where(eq(contacts.id, id))
      .get();

    if (!existing) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      );
    }

    db.delete(contacts).where(eq(contacts.id, id)).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/contacts/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete contact" },
      { status: 500 }
    );
  }
}
