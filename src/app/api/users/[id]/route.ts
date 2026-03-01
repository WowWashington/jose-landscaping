import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { hashPin } from "@/lib/auth-utils";
import { getSessionUser } from "@/lib/get-session-user";

type Params = { params: Promise<{ id: string }> };

const ROLE_LEVELS: Record<string, number> = {
  worker: 1,
  coordinator: 2,
  owner: 3,
};

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
// Owner: can edit anyone. Coordinator: workers only. Worker: own PIN only.
// Owner account is only modifiable by the owner themselves.
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const caller = await getSessionUser();
    if (!caller) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const existing = db.select().from(users).where(eq(users.id, id)).get();
    if (!existing) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const callerLevel = ROLE_LEVELS[caller.role ?? "worker"] ?? 1;
    const targetLevel = ROLE_LEVELS[existing.role ?? "worker"] ?? 1;

    // Owner account only modifiable by the owner themselves
    if (targetLevel === 3 && caller.id !== id) {
      return NextResponse.json(
        { error: "Only the owner can modify their own account" },
        { status: 403 }
      );
    }

    // Worker can only change their own PIN
    if (callerLevel === 1) {
      if (caller.id !== id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const allowedKeys = ["pin"];
      const bodyKeys = Object.keys(body);
      if (bodyKeys.some((k) => !allowedKeys.includes(k))) {
        return NextResponse.json(
          { error: "Workers can only update their own PIN" },
          { status: 403 }
        );
      }
    }

    // Coordinator can only edit workers
    if (callerLevel === 2 && targetLevel >= 2 && caller.id !== id) {
      return NextResponse.json(
        { error: "Coordinators can only edit workers" },
        { status: 403 }
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

// DELETE /api/users/:id — owner only, cannot delete self
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const caller = await getSessionUser();
    if (!caller || caller.role !== "owner") {
      return NextResponse.json(
        { error: "Only the owner can delete users" },
        { status: 403 }
      );
    }

    const { id } = await params;

    if (caller.id === id) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 400 }
      );
    }

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
