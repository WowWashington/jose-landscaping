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

    // Cookie format: "userId:version"
    const [userId, cookieVersion] = session.value.split(":");
    if (!userId || !cookieVersion) {
      // Legacy cookie without version — force re-login
      cookieStore.set("session", "", { httpOnly: true, path: "/", maxAge: 0 });
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const user = db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .get();

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 401 }
      );
    }

    // If user is blocked, reject session
    if (user.isBlocked) {
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

    // If session version doesn't match, sessions have been revoked
    if (cookieVersion !== String(user.sessionVersion ?? 1)) {
      cookieStore.set("session", "", { httpOnly: true, path: "/", maxAge: 0 });
      return NextResponse.json(
        { error: "Session expired. Please log in again." },
        { status: 401 }
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
