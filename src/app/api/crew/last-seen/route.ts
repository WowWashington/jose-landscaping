import { db } from "@/db";
import { changeLog, users } from "@/db/schema";
import { desc, eq, isNotNull } from "drizzle-orm";
import { NextResponse } from "next/server";

/**
 * GET /api/crew/last-seen
 *
 * Returns the most recent change log timestamp for each crew member
 * who has a linked user account. Used to display "last seen" on crew cards.
 *
 * Response: { [crewId]: string (ISO timestamp) }
 */
export async function GET() {
  try {
    // Get all users with a crewId
    const linkedUsers = db
      .select({ id: users.id, crewId: users.crewId })
      .from(users)
      .where(isNotNull(users.crewId))
      .all();

    if (linkedUsers.length === 0) {
      return NextResponse.json({});
    }

    // For each linked user, find their most recent log entry
    const lastSeenMap: Record<string, string> = {};

    for (const u of linkedUsers) {
      if (!u.crewId) continue;

      const latest = db
        .select({ createdAt: changeLog.createdAt })
        .from(changeLog)
        .where(eq(changeLog.userId, u.id))
        .orderBy(desc(changeLog.createdAt))
        .limit(1)
        .get();

      if (latest?.createdAt) {
        lastSeenMap[u.crewId] = latest.createdAt.toISOString();
      }
    }

    return NextResponse.json(lastSeenMap);
  } catch (error) {
    console.error("GET /api/crew/last-seen error:", error);
    return NextResponse.json(
      { error: "Failed to fetch last-seen data" },
      { status: 500 }
    );
  }
}
