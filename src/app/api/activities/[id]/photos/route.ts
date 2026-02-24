import { db } from "@/db";
import { activityPhotos } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getUploadsDir } from "@/lib/uploads";
import { validateImageFile, validateImageBytes } from "@/lib/validate-image";

type Params = { params: Promise<{ id: string }> };

// GET /api/activities/:id/photos — list photos for an activity
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const photos = db
      .select()
      .from(activityPhotos)
      .where(eq(activityPhotos.activityId, id))
      .orderBy(desc(activityPhotos.createdAt))
      .all();

    return NextResponse.json(photos);
  } catch (error) {
    console.error("GET /api/activities/[id]/photos error:", error);
    return NextResponse.json({ error: "Failed to fetch photos" }, { status: 500 });
  }
}

// POST /api/activities/:id/photos — upload a photo
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const note = formData.get("note") as string | null;

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    // Validate: check MIME type, extension, and file size
    const fileCheck = validateImageFile(file);
    if (!fileCheck.valid) {
      return NextResponse.json({ error: fileCheck.error }, { status: 400 });
    }

    // Validate: check actual file bytes (magic number signature)
    const bytes = await file.arrayBuffer();
    const bytesCheck = await validateImageBytes(bytes);
    if (!bytesCheck.valid) {
      return NextResponse.json({ error: bytesCheck.error }, { status: 400 });
    }

    // Create uploads directory
    const uploadsDir = getUploadsDir();
    await mkdir(uploadsDir, { recursive: true });

    // Generate unique filename — always save as the detected extension
    const ext = path.extname(file.name) || ".jpg";
    const fileName = `${id}-${Date.now()}${ext}`;
    const filePath = path.join(uploadsDir, fileName);

    // Write validated file to disk
    await writeFile(filePath, Buffer.from(bytes));

    // Save to database
    const row = db
      .insert(activityPhotos)
      .values({
        activityId: id,
        fileName,
        note: note || null,
      })
      .returning()
      .get();

    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    console.error("POST /api/activities/[id]/photos error:", error);
    return NextResponse.json({ error: "Failed to upload photo" }, { status: 500 });
  }
}
