import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { hashPin, generatePin } from "@/lib/auth-utils";
import { getSessionUser } from "@/lib/get-session-user";

/**
 * POST /api/users/invite
 *
 * Creates a new worker user account linked to a crew member.
 * Generates a random 6-digit PIN and returns it in plain text
 * so the inviter can share it (it's stored hashed in the DB).
 *
 * Owner only.
 *
 * Body: { crewId, name, email? }
 * Returns: { user, pin } where pin is the plain-text PIN
 */
export async function POST(request: NextRequest) {
  try {
    const caller = await getSessionUser();
    if (!caller || caller.role !== "owner") {
      return NextResponse.json(
        { error: "Only the owner can invite users" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { crewId, name, email } = body;

    if (!crewId || !name) {
      return NextResponse.json(
        { error: "crewId and name are required" },
        { status: 400 }
      );
    }

    // Check if a user already exists for this crew member
    const existing = db
      .select()
      .from(users)
      .where(eq(users.crewId, crewId))
      .get();

    if (existing) {
      return NextResponse.json(
        { error: "This crew member already has a user account" },
        { status: 409 }
      );
    }

    // Generate a random 6-digit PIN
    const plainPin = generatePin();
    const hashedPinValue = await hashPin(plainPin);

    const row = db
      .insert(users)
      .values({
        name,
        email: email || null,
        pin: hashedPinValue,
        role: "worker",
        crewId,
      })
      .returning()
      .get();

    // Return user + plain PIN (so inviter can share it)
    const { pin: _pin, ...userData } = row;
    return NextResponse.json({ user: userData, pin: plainPin }, { status: 201 });
  } catch (error) {
    console.error("POST /api/users/invite error:", error);
    return NextResponse.json(
      { error: "Failed to create invite" },
      { status: 500 }
    );
  }
}
