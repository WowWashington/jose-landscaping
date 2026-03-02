"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

interface PhotoViewerProps {
  src: string;
  alt?: string;
  open: boolean;
  onClose: () => void;
  children?: React.ReactNode;
}

export function PhotoViewer({ src, alt, open, onClose, children }: PhotoViewerProps) {
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 text-white/80 hover:text-white p-2"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Image */}
      <img
        src={src}
        alt={alt ?? "Photo"}
        className="max-h-[85vh] max-w-[95vw] object-contain"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Actions slot */}
      {children && (
        <div
          className="mt-4 flex gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      )}
    </div>
  );
}
