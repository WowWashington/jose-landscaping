"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { ActivityPhoto } from "@/types";
import {
  ArrowLeft,
  Camera,
  ImagePlus,
  Trash2,
  Pencil,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { compressImage } from "@/lib/compress-image";

export default function ActivityPhotosPage() {
  const params = useParams();
  const router = useRouter();
  const activityId = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<ActivityPhoto[]>([]);
  const [activityName, setActivityName] = useState("");
  const [projectId, setProjectId] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState("");

  const loadPhotos = useCallback(() => {
    fetch(`/api/activities/${activityId}/photos`)
      .then((r) => r.json())
      .then((data) => {
        setPhotos(data);
        setLoading(false);
      });
  }, [activityId]);

  // Load activity info for the header
  useEffect(() => {
    // We'll get activity name from the activity API — but we only have
    // an update/delete route, not a GET. Let's just use a simple approach:
    // store it in the URL or fetch from project. For now, use localStorage.
    const stored = sessionStorage.getItem(`activity-${activityId}`);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setActivityName(data.name ?? "Activity");
        setProjectId(data.projectId ?? "");
      } catch {
        setActivityName("Activity");
      }
    } else {
      setActivityName("Activity");
    }
  }, [activityId]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  async function handleFileSelect(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);

    for (const file of Array.from(files)) {
      // Compress before upload — shrinks 35MB Samsung shots to ~200-500KB
      const compressed = await compressImage(file);
      const formData = new FormData();
      formData.append("file", compressed);
      await fetch(`/api/activities/${activityId}/photos`, {
        method: "POST",
        body: formData,
      });
    }

    setUploading(false);
    loadPhotos();
  }

  async function deletePhoto(photoId: string) {
    if (!confirm("Delete this photo?")) return;
    await fetch(`/api/photos/${photoId}`, { method: "DELETE" });
    loadPhotos();
  }

  async function saveNote(photoId: string) {
    await fetch(`/api/photos/${photoId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: editNote }),
    });
    setEditingId(null);
    loadPhotos();
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() =>
            projectId ? router.push(`/projects/${projectId}`) : router.back()
          }
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold truncate">Photos</h1>
          <p className="text-sm text-muted-foreground truncate">
            {activityName}
          </p>
        </div>
      </div>

      {/* Upload buttons */}
      <div className="flex gap-2 mb-4">
        {/* Camera button (mobile) — uses capture attribute */}
        <Button
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "image/*";
            input.capture = "environment";
            input.onchange = (e) =>
              handleFileSelect((e.target as HTMLInputElement).files);
            input.click();
          }}
          disabled={uploading}
          className="gap-2 bg-green-700 hover:bg-green-800 sm:hidden"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
          Take Photo
        </Button>

        {/* File browse button (all devices) */}
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          variant="outline"
          className="gap-2"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus className="h-4 w-4" />
          )}
          {uploading ? "Uploading..." : "Browse Files"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
        />
      </div>

      <Separator className="my-4" />

      {/* Photo grid */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading photos...</p>
      ) : photos.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Camera className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No photos yet.</p>
          <p className="text-xs mt-1">
            Take a photo or browse files to add before/after shots.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {photos.map((photo) => (
            <Card key={photo.id} className="overflow-hidden">
              <div className="relative aspect-video bg-muted">
                <img
                  src={`/uploads/${photo.fileName}`}
                  alt={photo.note ?? "Activity photo"}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
              <CardContent className="p-3">
                {editingId === photo.id ? (
                  <div className="flex gap-2">
                    <Textarea
                      value={editNote}
                      onChange={(e) => setEditNote(e.target.value)}
                      placeholder="Add a note (e.g., Before work started, After completion...)"
                      rows={2}
                      className="text-sm resize-none flex-1"
                    />
                    <div className="flex flex-col gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => saveNote(photo.id)}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {photo.note ? (
                        <p className="text-sm">{photo.note}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          No note
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {photo.createdAt
                          ? new Date(photo.createdAt).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              }
                            )
                          : ""}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => {
                          setEditNote(photo.note ?? "");
                          setEditingId(photo.id);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        onClick={() => deletePhoto(photo.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
