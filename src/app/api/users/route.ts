import { db } from "@/db";
import { users, changeLog, userBillingRates } from "@/db/schema";
import { asc, count, eq, desc, max, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { hashPin } from "@/lib/auth-utils";
import { getSessionUser } from "@/lib/get-session-user";

// GET /api/users — list all people (users + former crew)
export async function GET() {
  try {
    const rows = db
      .select()
      .from(users)
      .orderBy(asc(users.name))
      .all();

    // Single query for last activity per user
    const lastActivities = db
      .select({
        userId: changeLog.userId,
        lastAt: max(changeLog.createdAt).as("lastAt"),
      })
      .from(changeLog)
      .groupBy(changeLog.userId)
      .all();

    const lastActivityMap = new Map(
      lastActivities
        .filter((r) => r.userId && r.lastAt)
        .map((r) => [r.userId!, typeof r.lastAt === "string" ? r.lastAt : (r.lastAt as Date).toISOString()])
    );

    // Fetch all billing rates in one query
    const allRates = db
      .select({
        userId: userBillingRates.userId,
        division: userBillingRates.division,
        hourlyRate: userBillingRates.hourlyRate,
      })
      .from(userBillingRates)
      .all();

    const ratesMap = new Map<string, { division: string; hourlyRate: number }[]>();
    for (const r of allRates) {
      if (!ratesMap.has(r.userId)) ratesMap.set(r.userId, []);
      ratesMap.get(r.userId)!.push({ division: r.division, hourlyRate: r.hourlyRate });
    }

    const enriched = rows.map((u) => ({
      ...u,
      lastActivity: lastActivityMap.get(u.id) ?? null,
      billingRates: ratesMap.get(u.id) ?? [],
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("GET /api/users error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

// POST /api/users — create a new person (owner only; skip guard for first-time setup)
export async function POST(request: NextRequest) {
  try {
    // Allow unauthenticated creation only when no users exist (first-time setup)
    const [{ total }] = db.select({ total: count() }).from(users).all();

    if (total > 0) {
      const caller = await getSessionUser();
      if (!caller || caller.role !== "owner") {
        return NextResponse.json(
          { error: "Only the owner can create users" },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const { name, email, phone, pin, role, city, availability, tasks } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    // Hash the PIN before storing (only required for people with a role)
    const hashedPin = pin ? await hashPin(pin) : null;

    const row = db
      .insert(users)
      .values({
        name,
        email,
        phone,
        pin: hashedPin,
        role: role ?? null,
        city,
        availability,
        tasks,
      })
      .returning()
      .get();

    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    console.error("POST /api/users error:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
