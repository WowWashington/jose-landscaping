"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ContactCard } from "@/components/contacts/contact-card";
import { ContactForm } from "@/components/contacts/contact-form";
import type { Contact } from "@/types";
import { Plus, X } from "lucide-react";
import { useSettings } from "@/lib/use-settings";

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const { settings } = useSettings();

  const load = useCallback(() => {
    setLoading(true);
    const params = search ? `?q=${encodeURIComponent(search)}` : "";
    fetch(`/api/contacts${params}`)
      .then((r) => r.json())
      .then((data) => setContacts(data))
      .finally(() => setLoading(false));
  }, [search]);

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
    await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setShowForm(false);
    load();
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Contacts</h1>
        <Button
          onClick={() => setShowForm(!showForm)}
          className={showForm ? "" : "gap-2 bg-green-700 hover:bg-green-800"}
          variant={showForm ? "outline" : "default"}
        >
          {showForm ? (
            <>
              <X className="h-4 w-4" /> Cancel
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" /> New Contact
            </>
          )}
        </Button>
      </div>

      {showForm && (
        <div className="mb-6">
          <ContactForm
            onSave={handleSave}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      <Input
        placeholder="Search contacts..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4"
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : contacts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No contacts yet.</p>
          <p className="text-sm mt-1">
            Add contacts to link them to your projects.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {contacts.map((c) => (
            <ContactCard key={c.id} contact={c} maskEnabled={settings.maskContactsForWorkers} />
          ))}
        </div>
      )}
    </div>
  );
}
