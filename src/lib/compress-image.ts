/**
 * Client-side image compression using Canvas API.
 * Resizes large photos (e.g., 200MP Samsung shots) down to a sensible
 * max dimension and compresses as JPEG before upload.
 *
 * A 35MB phone photo becomes ~200-500KB — more than enough for
 * project documentation and before/after shots.
 */

const MAX_DIMENSION = 1920; // px — longest side (good for full-screen viewing)
const JPEG_QUALITY = 0.80; // 80% quality — great balance of size vs clarity

export async function compressImage(
  file: File,
  options?: { maxDimension?: number; quality?: number }
): Promise<File> {
  const maxDim = options?.maxDimension ?? MAX_DIMENSION;
  const quality = options?.quality ?? JPEG_QUALITY;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Only resize if larger than max dimension
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        // Fallback — return original if canvas fails
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }

          // Build a new File with a .jpg extension
          const baseName = file.name.replace(/\.[^.]+$/, "");
          const compressed = new File([blob], `${baseName}.jpg`, {
            type: "image/jpeg",
            lastModified: Date.now(),
          });

          // Log the savings (helpful during development)
          const saved = ((1 - compressed.size / file.size) * 100).toFixed(0);
          console.log(
            `[compress] ${file.name}: ${formatSize(file.size)} → ${formatSize(compressed.size)} (${saved}% smaller)`
          );

          resolve(compressed);
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      // If image can't be loaded (e.g., not an image), return original
      resolve(file);
    };

    img.src = url;
  });
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
