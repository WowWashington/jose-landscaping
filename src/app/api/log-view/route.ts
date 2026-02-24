import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/get-session-user";
import { logChange } from "@/lib/log-change";

// POST /api/log-view — log that a worker revealed masked contact info
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { contactName, field, projectId } = await request.json();

    logChange({
      projectId: projectId ?? null,
      userId: user.id,
      userName: user.name,
      action: "contact_viewed",
      entity: "contact",
      entityName: contactName ?? null,
      details: `Viewed ${field}`,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/log-view error:", error);
    return NextResponse.json({ error: "Failed to log view" }, { status: 500 });
  }
}
