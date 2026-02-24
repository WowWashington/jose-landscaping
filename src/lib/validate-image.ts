/**
 * Server-side image validation.
 *
 * Checks BOTH the MIME type AND the file's magic bytes (file signature)
 * to ensure the upload is actually a photo — not a PDF, executable,
 * or renamed file pretending to be an image.
 *
 * Allowed formats: JPEG, PNG, WebP, HEIC/HEIF (Samsung/iPhone photos)
 */

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const ALLOWED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".heic",
  ".heif",
]);

// Magic byte signatures for each format
// prettier-ignore
const MAGIC_BYTES: { prefix: number[]; type: string }[] = [
  { prefix: [0xFF, 0xD8, 0xFF],                         type: "JPEG" },   // JPEG always starts with FF D8 FF
  { prefix: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A],      type: "PNG" },    // PNG: 89 50 4E 47 0D 0A
  { prefix: [0x52, 0x49, 0x46, 0x46],                   type: "WebP" },   // WebP: RIFF (then check for WEBP at offset 8)
];

// HEIC/HEIF uses the ISO BMFF container — "ftyp" at offset 4
const FTYP_BRANDS = ["heic", "heix", "hevc", "mif1", "msf1", "heif"];

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB after client-side compression

export type ValidationResult =
  | { valid: true }
  | { valid: false; error: string };

export function validateImageFile(file: File): ValidationResult {
  // 1. Check file size
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File too large (${sizeMB}MB). Maximum is 20MB.`,
    };
  }

  // 2. Check MIME type
  if (file.type && !ALLOWED_MIME_TYPES.has(file.type.toLowerCase())) {
    return {
      valid: false,
      error: `Invalid file type "${file.type}". Only photos allowed (JPEG, PNG, WebP, HEIC).`,
    };
  }

  // 3. Check extension
  const ext = getExtension(file.name);
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      error: `Invalid file extension "${ext}". Only photo files allowed (.jpg, .png, .webp, .heic).`,
    };
  }

  return { valid: true };
}

export async function validateImageBytes(bytes: ArrayBuffer): Promise<ValidationResult> {
  const header = new Uint8Array(bytes.slice(0, 12));

  // Check standard magic bytes (JPEG, PNG, WebP)
  for (const magic of MAGIC_BYTES) {
    let match = true;
    for (let i = 0; i < magic.prefix.length; i++) {
      if (header[i] !== magic.prefix[i]) {
        match = false;
        break;
      }
    }
    if (match) {
      // Extra check for WebP: bytes 8-11 must be "WEBP"
      if (magic.type === "WebP") {
        const webpSig = String.fromCharCode(header[8], header[9], header[10], header[11]);
        if (webpSig !== "WEBP") continue;
      }
      return { valid: true };
    }
  }

  // Check HEIC/HEIF: "ftyp" at offset 4, then brand at offset 8
  if (
    header[4] === 0x66 && // f
    header[5] === 0x74 && // t
    header[6] === 0x79 && // y
    header[7] === 0x70    // p
  ) {
    const brand = String.fromCharCode(header[8], header[9], header[10], header[11]);
    if (FTYP_BRANDS.includes(brand.toLowerCase())) {
      return { valid: true };
    }
  }

  return {
    valid: false,
    error: "File does not appear to be a valid photo. The file contents don't match any supported image format.",
  };
}

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  if (dot === -1) return "";
  return filename.slice(dot).toLowerCase();
}
