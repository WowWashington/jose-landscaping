"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ContactForm } from "@/components/contacts/contact-form";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Contact } from "@/types";
import { STATUS_LABELS } from "@/types";
import { formatCurrency } from "@/lib/calculations";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/projects/status-badge";
import {
  ArrowLeft,
  Trash2,
  Calendar,
  FileText,
  FolderOpen,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { MaskedField } from "@/components/ui/masked-field";
import { useSettings } from "@/lib/use-settings";

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const contactId = params.id as string;

  const [contact, setContact] = useState<Contact | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const { settings } = useSettings();

  const load = useCallback(() => {
    fetch(`/api/contacts/${contactId}`)
      .then((r) => r.json())
      .then((data) => {
        setContact(data);
        setLoading(false);
      });
    fetch(`/api/projects?contactId=${contactId}`)
      .then((r) => r.json())
      .then((data) => setProjects(data));
  }, [contactId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave(data: {
    name: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    notes: string;
    lastContactDate: string;
  }) {
    await fetch(`/api/contacts/${contactId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setEditing(false);
    load();
  }

  async function deleteContact() {
    if (!confirm("Delete this contact? This cannot be undone.")) return;
    await fetch(`/api/contacts/${contactId}`, { method: "DELETE" });
    router.push("/contacts");
  }

  if (loading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Loading...</div>
    );
  }

  if (!contact) {
    return (
      <div className="p-6">
        <p>Contact not found.</p>
        <Link href="/contacts" className="text-sm text-blue-600 underline">
          Back to contacts
        </Link>
      </div>
    );
  }

  // Format last contact date for display
  const lastContactLabel = contact.lastContactDate
    ? new Date(contact.lastContactDate + "T00:00:00").toLocaleDateString(
        "en-US",
        { month: "short", day: "numeric", year: "numeric" }
      )
    : null;

  if (editing) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        <ContactForm
          initial={{
            name: contact.name ?? "",
            phone: contact.phone ?? "",
            email: contact.email ?? "",
            address: contact.address ?? "",
            city: contact.city ?? "",
            state: contact.state ?? "",
            zip: contact.zip ?? "",
            notes: contact.notes ?? "",
            lastContactDate: contact.lastContactDate ?? "",
          }}
          onSave={handleSave}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/contacts")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold truncate">
            {contact.name || "Unnamed Contact"}
          </h1>
        </div>
        <div className="flex gap-2">
          <Link href={`/projects/new?contactId=${contactId}`}>
            <Button
              size="sm"
              className="gap-1.5 bg-green-700 hover:bg-green-800"
            >
              <Plus className="h-3.5 w-3.5" />
              New Quote
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditing(true)}
          >
            Edit
          </Button>
        </div>
      </div>

      {/* Contact info */}
      <div className="space-y-3 text-sm">
        {contact.phone && (
          <div>
            <span className="text-muted-foreground">Phone:</span>{" "}
            <MaskedField
              value={contact.phone}
              type="phone"
              contactName={contact.name}
              maskEnabled={settings.maskContactsForWorkers}
            >
              {(val) => (
                <a href={`tel:${val}`} className="text-blue-600 underline">
                  {val}
                </a>
              )}
            </MaskedField>
          </div>
        )}
        {contact.email && (
          <div>
            <span className="text-muted-foreground">Email:</span>{" "}
            <MaskedField
              value={contact.email}
              type="email"
              contactName={contact.name}
              maskEnabled={settings.maskContactsForWorkers}
            >
              {(val) => (
                <a href={`mailto:${val}`} className="text-blue-600 underline">
                  {val}
                </a>
              )}
            </MaskedField>
          </div>
        )}
        {(contact.address || contact.city) && (
          <div>
            <span className="text-muted-foreground">Address:</span>{" "}
            {[contact.address, contact.city, contact.state, contact.zip]
              .filter(Boolean)
              .join(", ")}
          </div>
        )}
        {lastContactLabel && (
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Last contact:</span>{" "}
            {lastContactLabel}
          </div>
        )}
      </div>

      {/* Projects */}
      {projects.length > 0 && (
        <>
          <Separator className="my-4" />
          <div>
            <h3 className="text-sm font-medium mb-2 flex items-center gap-1.5">
              <FolderOpen className="h-3.5 w-3.5" /> Projects ({projects.length})
            </h3>
            <div className="grid gap-2">
              {projects.map((p: any) => {
                const divIcon = p.division === "general_contracting" ? "🔨" : "🌿";
                return (
                  <Link key={p.id} href={`/projects/${p.id}`}>
                    <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            <span className="mr-1">{divIcon}</span>
                            {p.name}
                          </p>
                          {p.address && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {p.address}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <StatusBadge status={p.status ?? "draft"} />
                          <p className="text-xs font-medium mt-1">
                            {formatCurrency(p.totalCost ?? 0)}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Notes */}
      {contact.notes && (
        <>
          <Separator className="my-4" />
          <div>
            <h3 className="text-sm font-medium mb-2 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Notes
            </h3>
            <div className="text-sm whitespace-pre-wrap bg-muted/30 rounded-lg p-4">
              {contact.notes}
            </div>
          </div>
        </>
      )}

      {/* Danger zone */}
      <div className="mt-8 pt-4 border-t">
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive gap-1.5"
          onClick={deleteContact}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete Contact
        </Button>
      </div>
    </div>
  );
}
