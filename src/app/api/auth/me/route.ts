import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// GET /api/auth/me — get current authenticated user
export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");

    if (!session?.value) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const user = db
      .select()
      .from(users)
      .where(eq(users.id, session.value))
      .get();

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 401 }
      );
    }

    // If user is blocked, reject session
    if (user.isBlocked) {
      // Clear their session cookie
      cookieStore.set("session", "", {
        httpOnly: true,
        path: "/",
        maxAge: 0,
      });
      return NextResponse.json(
        { error: "Your access has been disabled. Contact the owner." },
        { status: 403 }
      );
    }

    // Return user data (exclude pin)
    const { pin: _pin, ...userData } = user;
    return NextResponse.json(userData);
  } catch (error) {
    console.error("GET /api/auth/me error:", error);
    return NextResponse.json(
      { error: "Failed to get session" },
      { status: 500 }
    );
  }
}
