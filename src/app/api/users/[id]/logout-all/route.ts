import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/get-session-user";
import { logChange } from "@/lib/log-change";

type Params = { params: Promise<{ id: string }> };

// POST /api/users/:id/logout-all — revoke all sessions for a user
export async function POST(_request: NextRequest, { params }: Params) {
  try {
    const caller = await getSessionUser();
    if (!caller || caller.role !== "owner") {
      return NextResponse.json(
        { error: "Not authorized" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const target = db.select().from(users).where(eq(users.id, id)).get();
    if (!target) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Increment session version — invalidates all existing cookies for this user
    db.update(users)
      .set({ sessionVersion: sql`coalesce(${users.sessionVersion}, 1) + 1` })
      .where(eq(users.id, id))
      .run();

    logChange({
      userId: caller.id,
      userName: caller.name,
      action: "logout-all",
      entity: "user",
      entityName: target.name,
      details: `Revoked all sessions for ${target.name}`,
    });

    // If the owner is logging out themselves, clear their own cookie too
    if (id === caller.id) {
      const cookieStore = await cookies();
      cookieStore.set("session", "", {
        httpOnly: true,
        path: "/",
        maxAge: 0,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/users/[id]/logout-all error:", error);
    return NextResponse.json(
      { error: "Failed to logout user" },
      { status: 500 }
    );
  }
}
