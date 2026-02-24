import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { hashPin } from "@/lib/auth-utils";

type Params = { params: Promise<{ id: string }> };

// GET /api/users/:id
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const row = db.select().from(users).where(eq(users.id, id)).get();

    if (!row) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(row);
  } catch (error) {
    console.error("GET /api/users/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

// PUT /api/users/:id
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = db.select().from(users).where(eq(users.id, id)).get();
    if (!existing) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Hash PIN if provided
    const updates = { ...body };
    if (updates.pin) {
      updates.pin = await hashPin(updates.pin);
    }

    const row = db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning()
      .get();

    return NextResponse.json(row);
  } catch (error) {
    console.error("PUT /api/users/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

// DELETE /api/users/:id
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const existing = db.select().from(users).where(eq(users.id, id)).get();
    if (!existing) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    db.delete(users).where(eq(users.id, id)).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/users/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
