import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { hashPin, generatePin } from "@/lib/auth-utils";
import { getSessionUser } from "@/lib/get-session-user";

/**
 * POST /api/users/invite
 *
 * Grants login to an existing person (no-login user).
 * Generates a random 6-digit PIN, sets role to "worker",
 * and returns the plain-text PIN so the inviter can share it.
 *
 * Owner only.
 *
 * Body: { userId, email? }
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
    const { userId, email } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const existing = db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .get();

    if (!existing) {
      return NextResponse.json(
        { error: "Person not found" },
        { status: 404 }
      );
    }

    if (existing.role && existing.pin) {
      return NextResponse.json(
        { error: "This person already has a login" },
        { status: 409 }
      );
    }

    // Generate a random 6-digit PIN
    const plainPin = generatePin();
    const hashedPinValue = await hashPin(plainPin);

    const row = db
      .update(users)
      .set({
        pin: hashedPinValue,
        role: "worker",
        email: email || existing.email,
      })
      .where(eq(users.id, userId))
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
