import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { getUploadsDir } from "@/lib/uploads";

type Params = { params: Promise<{ path: string[] }> };

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".heic": "image/heic",
  ".heif": "image/heif",
};

// GET /api/uploads/:path — serve uploaded files
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const segments = (await params).path;
    const fileName = segments[segments.length - 1];

    // Prevent directory traversal
    if (fileName.includes("..") || fileName.includes("/")) {
      return new NextResponse("Not found", { status: 404 });
    }

    const uploadsDir = getUploadsDir();
    const filePath = path.join(uploadsDir, fileName);

    // Ensure resolved path is still within uploads dir
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(path.resolve(uploadsDir))) {
      return new NextResponse("Not found", { status: 404 });
    }

    const buffer = await readFile(resolved);
    const ext = path.extname(fileName).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
