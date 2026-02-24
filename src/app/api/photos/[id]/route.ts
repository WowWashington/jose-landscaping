import { db } from "@/db";
import { activityPhotos } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { unlink } from "fs/promises";
import path from "path";
import { getUploadsDir } from "@/lib/uploads";

type Params = { params: Promise<{ id: string }> };

// PUT /api/photos/:id — update a photo's note
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = db.select().from(activityPhotos).where(eq(activityPhotos.id, id)).get();
    if (!existing) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    const row = db
      .update(activityPhotos)
      .set({ note: body.note ?? null })
      .where(eq(activityPhotos.id, id))
      .returning()
      .get();

    return NextResponse.json(row);
  } catch (error) {
    console.error("PUT /api/photos/[id] error:", error);
    return NextResponse.json({ error: "Failed to update photo" }, { status: 500 });
  }
}

// DELETE /api/photos/:id — delete a photo
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const existing = db.select().from(activityPhotos).where(eq(activityPhotos.id, id)).get();
    if (!existing) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    // Delete the file from disk
    try {
      const filePath = path.join(getUploadsDir(), existing.fileName);
      await unlink(filePath);
    } catch {
      // File may already be deleted, that's ok
    }

    db.delete(activityPhotos).where(eq(activityPhotos.id, id)).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/photos/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete photo" }, { status: 500 });
  }
}
