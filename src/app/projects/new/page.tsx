"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ProjectForm } from "@/components/projects/project-form";
import { useAuth } from "@/lib/auth-context";

export default function NewProjectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  // Pre-fill contact from URL param (e.g. /projects/new?contactId=abc123)
  const contactId = searchParams.get("contactId") ?? undefined;

  async function handleSave(data: {
    name: string;
    description: string;
    address: string;
    contactId: string | null;
    leadCrewId: string | null;
    startDate: string;
    notes: string;
    division: string;
  }) {
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, createdBy: user?.id ?? null }),
    });
    const project = await res.json();
    router.push(`/projects/${project.id}`);
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <ProjectForm
        initial={contactId ? { contactId } : undefined}
        onSave={handleSave}
        onCancel={() => router.back()}
      />
    </div>
  );
}
