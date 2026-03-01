import { db } from "@/db";
import { users } from "@/db/schema";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { verifyPin } from "@/lib/auth-utils";
import { logChange } from "@/lib/log-change";
import { getSessionUser } from "@/lib/get-session-user";

const NINETY_DAYS = 60 * 60 * 24 * 90;

// ─── In-memory rate limiting ────────────────────────────────
// Track failed login attempts per username (lowercase).
// 5 failures → 15-minute lockout. Resets on success.
const attempts = new Map<string, { count: number; lockedUntil: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(name: string): { blocked: boolean; remaining: number } {
  const key = name.toLowerCase();
  const record = attempts.get(key);

  if (!record) return { blocked: false, remaining: MAX_ATTEMPTS };

  if (record.lockedUntil > Date.now()) {
    return { blocked: true, remaining: 0 };
  }

  // Lockout expired — reset
  if (record.lockedUntil > 0 && record.lockedUntil <= Date.now()) {
    attempts.delete(key);
    return { blocked: false, remaining: MAX_ATTEMPTS };
  }

  return { blocked: false, remaining: MAX_ATTEMPTS - record.count };
}

function recordFailure(name: string) {
  const key = name.toLowerCase();
  const record = attempts.get(key) ?? { count: 0, lockedUntil: 0 };
  record.count++;

  if (record.count >= MAX_ATTEMPTS) {
    record.lockedUntil = Date.now() + LOCKOUT_MS;
  }

  attempts.set(key, record);
}

function clearAttempts(name: string) {
  attempts.delete(name.toLowerCase());
}

// POST /api/auth — login with { name, pin }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, pin } = body;

    if (!name || !pin) {
      return NextResponse.json(
        { error: "Name and PIN are required" },
        { status: 400 }
      );
    }

    // Rate limit check
    const limit = checkRateLimit(name);
    if (limit.blocked) {
      return NextResponse.json(
        { error: "Too many attempts. Try again in 15 minutes." },
        { status: 429 }
      );
    }

    // Case-insensitive name matching
    const allUsers = db.select().from(users).all();
    const user = allUsers.find(
      (u) => u.name.toLowerCase() === name.toLowerCase()
    );

    if (!user) {
      recordFailure(name);
      return NextResponse.json(
        { error: "Invalid name or PIN" },
        { status: 401 }
      );
    }

    // Check if user is blocked
    if (user.isBlocked) {
      return NextResponse.json(
        { error: "Your access has been disabled. Contact the owner." },
        { status: 403 }
      );
    }

    // Verify PIN (works with both bcrypt hashes and legacy plain-text)
    if (!user.pin || !(await verifyPin(pin, user.pin))) {
      recordFailure(name);
      return NextResponse.json(
        { error: "Invalid name or PIN" },
        { status: 401 }
      );
    }

    // Success — clear rate limit and set session
    clearAttempts(name);

    const cookieStore = await cookies();
    cookieStore.set("session", user.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: NINETY_DAYS,
    });

    // Log successful login
    logChange({
      userId: user.id,
      userName: user.name,
      action: "login",
      entity: "session",
    });

    // Return user data (exclude pin)
    const { pin: _pin, ...userData } = user;
    return NextResponse.json(userData);
  } catch (error) {
    console.error("POST /api/auth error:", error);
    return NextResponse.json(
      { error: "Failed to authenticate" },
      { status: 500 }
    );
  }
}

// DELETE /api/auth — logout (clear session cookie)
export async function DELETE() {
  try {
    // Get user before clearing session cookie
    const sessionUser = await getSessionUser();

    const cookieStore = await cookies();
    cookieStore.set("session", "", {
      httpOnly: true,
      path: "/",
      maxAge: 0,
    });

    // Log logout
    if (sessionUser) {
      logChange({
        userId: sessionUser.id,
        userName: sessionUser.name,
        action: "logout",
        entity: "session",
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/auth error:", error);
    return NextResponse.json(
      { error: "Failed to logout" },
      { status: 500 }
    );
  }
}
