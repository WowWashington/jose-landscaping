import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";

type SessionUser = {
  id: string;
  name: string;
  role: string | null;
  crewId: string | null;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");
    if (!session?.value) return null;

    // Cookie format: "userId:version" (legacy cookies without version are rejected)
    const [userId, cookieVersion] = session.value.split(":");
    if (!userId || !cookieVersion) return null;

    const user = db
      .select({
        id: users.id,
        name: users.name,
        role: users.role,
        crewId: users.crewId,
        sessionVersion: users.sessionVersion,
      })
      .from(users)
      .where(eq(users.id, userId))
      .get();

    if (!user) return null;

    // Reject if session version doesn't match (logout-everywhere was triggered)
    if (cookieVersion !== String(user.sessionVersion ?? 1)) return null;

    return { id: user.id, name: user.name, role: user.role, crewId: user.crewId };
  } catch {
    return null;
  }
}
