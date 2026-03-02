import { db } from "@/db";
import { users } from "@/db/schema";
import { sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { generatePin, hashPin } from "@/lib/auth-utils";
import { logChange } from "@/lib/log-change";
import { maskPhone } from "@/lib/mask-utils";

// In-memory rate limit: name (lowercase) → timestamp of last reset
const resetCooldowns = new Map<string, number>();
const COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes

/**
 * POST /api/auth/reset-pin
 *
 * Body: { name }
 * - Case-insensitive user lookup
 * - Rate limited: 1 reset per 15 min per name
 * - Blocked users get 403
 * - Non-existent names get generic 200 (no user enumeration)
 * - Sends PIN via Textbelt if phone on file, otherwise returns directly
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const normalizedName = name.trim().toLowerCase();

    // Rate limit check
    const lastReset = resetCooldowns.get(normalizedName);
    if (lastReset && Date.now() - lastReset < COOLDOWN_MS) {
      const remainingMin = Math.ceil(
        (COOLDOWN_MS - (Date.now() - lastReset)) / 60000
      );
      return NextResponse.json(
        { error: `Please wait ${remainingMin} minute${remainingMin > 1 ? "s" : ""} before requesting another reset` },
        { status: 429 }
      );
    }

    // Case-insensitive lookup
    const user = db
      .select()
      .from(users)
      .where(sql`lower(${users.name}) = ${normalizedName}`)
      .get();

    // Non-existent name: generic 200 to prevent user enumeration
    if (!user) {
      return NextResponse.json({
        method: "sent",
        message: "If an account with that name exists, a new PIN has been issued.",
      });
    }

    // Blocked users get 403
    if (user.isBlocked) {
      return NextResponse.json(
        { error: "This account is blocked. Contact the owner." },
        { status: 403 }
      );
    }

    // Generate new PIN
    const plainPin = generatePin();
    const hashedPinValue = await hashPin(plainPin);

    // Update user's PIN in DB
    db.update(users)
      .set({ pin: hashedPinValue })
      .where(sql`lower(${users.name}) = ${normalizedName}`)
      .run();

    // Record rate limit
    resetCooldowns.set(normalizedName, Date.now());

    // Log the reset
    logChange({
      userId: user.id,
      userName: user.name,
      action: "pin_reset",
      entity: "user",
      entityName: user.name,
      details: "PIN reset requested",
    });

    // Try Textbelt SMS if phone on file
    if (user.phone) {
      try {
        const digits = user.phone.replace(/\D/g, "");
        const res = await fetch("https://textbelt.com/text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: digits,
            message: `Your new PIN is: ${plainPin}`,
            key: "textbelt",
          }),
        });
        const result = await res.json();

        if (result.success) {
          return NextResponse.json({
            method: "sms",
            maskedPhone: maskPhone(user.phone),
          });
        }
      } catch {
        // SMS failed — fall through to direct display
      }
    }

    // Fallback: instruct user to contact the owner
    return NextResponse.json({
      method: "failed",
      message: "Could not deliver PIN via SMS. Please contact the owner for your new PIN.",
    });
  } catch (error) {
    console.error("POST /api/auth/reset-pin error:", error);
    return NextResponse.json(
      { error: "Failed to reset PIN" },
      { status: 500 }
    );
  }
}
