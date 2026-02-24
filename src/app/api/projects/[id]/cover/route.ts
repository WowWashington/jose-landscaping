import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getUploadsDir } from "@/lib/uploads";
import { validateImageFile, validateImageBytes } from "@/lib/validate-image";

type Params = { params: Promise<{ id: string }> };

// POST /api/projects/:id/cover — upload a cover photo
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

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

    const existing = db.select().from(projects).where(eq(projects.id, id)).get();
    if (!existing) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Create uploads directory
    const uploadsDir = getUploadsDir();
    await mkdir(uploadsDir, { recursive: true });

    // Generate unique filename
    const ext = path.extname(file.name) || ".jpg";
    const fileName = `cover-${id}-${Date.now()}${ext}`;
    const filePath = path.join(uploadsDir, fileName);

    // Write validated file to disk
    await writeFile(filePath, Buffer.from(bytes));

    // Update project with cover photo
    const row = db
      .update(projects)
      .set({ coverPhoto: fileName, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning()
      .get();

    return NextResponse.json(row);
  } catch (error) {
    console.error("POST /api/projects/[id]/cover error:", error);
    return NextResponse.json(
      { error: "Failed to upload cover photo" },
      { status: 500 }
    );
  }
}
