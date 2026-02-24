import path from "path";

/**
 * Get the uploads directory path.
 * Defaults to <cwd>/public/uploads but can be overridden via UPLOADS_DIR env var.
 *
 * When UPLOADS_DIR is set (e.g., /home/data/uploads for Azure or VPS),
 * you'll also need to configure Next.js to serve that directory,
 * or use a reverse proxy/symlink.
 */
export function getUploadsDir(): string {
  return process.env.UPLOADS_DIR || path.join(process.cwd(), "public", "uploads");
}
