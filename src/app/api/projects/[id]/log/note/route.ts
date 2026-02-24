import { NextRequest, NextResponse } from "next/server";
import { logChange } from "@/lib/log-change";
import { getSessionUser } from "@/lib/get-session-user";

type Params = { params: Promise<{ id: string }> };

// POST /api/projects/:id/log/note — add a worker note to the change log
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { note } = await request.json();

    if (!note || typeof note !== "string" || !note.trim()) {
      return NextResponse.json({ error: "Note is required" }, { status: 400 });
    }

    const sessionUser = await getSessionUser();

    logChange({
      projectId: id,
      userId: sessionUser?.id,
      userName: sessionUser?.name,
      action: "note",
      entity: "project",
      details: note.trim(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/projects/[id]/log/note error:", error);
    return NextResponse.json(
      { error: "Failed to add note" },
      { status: 500 }
    );
  }
}
