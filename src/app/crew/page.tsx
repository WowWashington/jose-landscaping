"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { CrewMember, AppUser } from "@/types";
import { useAuth } from "@/lib/auth-context";
import {
  Plus,
  X,
  Pencil,
  Trash2,
  Phone,
  MapPin,
  Clock,
  Wrench,
  Send,
  Mail,
  MessageSquare,
  UserPlus,
} from "lucide-react";

export default function CrewPage() {
  const { user: currentUser, canEdit } = useAuth();
  const [members, setMembers] = useState<CrewMember[]>([]);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Invite dialog state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteMember, setInviteMember] = useState<CrewMember | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePin, setInvitePin] = useState("");
  const [inviteCreated, setInviteCreated] = useState(false);
  const [inviteSending, setInviteSending] = useState(false);

  const [form, setForm] = useState({
    name: "",
    city: "",
    phone: "",
    availability: "",
    tasks: "",
  });

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/crew").then((r) => r.json()),
      fetch("/api/users").then((r) => r.json()),
    ])
      .then(([c, u]) => {
        setMembers(c);
        setAllUsers(u);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function resetForm() {
    setForm({ name: "", city: "", phone: "", availability: "", tasks: "" });
    setShowForm(false);
    setEditingId(null);
  }

  function startEdit(m: CrewMember) {
    setForm({
      name: m.name ?? "",
      city: m.city ?? "",
      phone: m.phone ?? "",
      availability: m.availability ?? "",
      tasks: m.tasks ?? "",
    });
    setEditingId(m.id);
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.name.trim()) return;

    if (editingId) {
      await fetch(`/api/crew/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } else {
      await fetch("/api/crew", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }
    resetForm();
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this crew member?")) return;
    await fetch(`/api/crew/${id}`, { method: "DELETE" });
    load();
  }

  /** Check if a crew member already has a linked user account */
  function getLinkedUser(crewId: string): AppUser | undefined {
    return allUsers.find((u) => u.crewId === crewId);
  }

  /** Open invite dialog for a crew member */
  function openInvite(member: CrewMember) {
    setInviteMember(member);
    setInviteEmail("");
    setInvitePin("");
    setInviteCreated(false);
    setInviteOpen(true);
  }

  /** Create user account and generate PIN */
  async function createInvite() {
    if (!inviteMember) return;
    setInviteSending(true);

    try {
      const res = await fetch("/api/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crewId: inviteMember.id,
          name: inviteMember.name,
          email: inviteEmail || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setInvitePin(data.pin); // plain-text PIN before hashing
        setInviteCreated(true);
        load(); // refresh to show linked status
      }
    } finally {
      setInviteSending(false);
    }
  }

  function buildWelcomeMessage(): string {
    const senderName = currentUser?.name ?? "Your manager";
    const appUrl = typeof window !== "undefined" ? window.location.origin : "the app";

    return [
      `Hi ${inviteMember?.name}!`,
      ``,
      `${senderName} has added you to Jose's Yard Care.`,
      ``,
      `Your login:`,
      `  Name: ${inviteMember?.name}`,
      `  PIN: ${invitePin}`,
      ``,
      `Open the app: ${appUrl}`,
      ``,
      `You can change your PIN after logging in.`,
    ].join("\n");
  }

  function sendViaEmail() {
    const subject = encodeURIComponent("You're invited to Jose's Yard Care");
    const body = encodeURIComponent(buildWelcomeMessage());
    const to = encodeURIComponent(inviteEmail);
    window.open(`mailto:${to}?subject=${subject}&body=${body}`, "_self");
  }

  function sendViaText() {
    const body = encodeURIComponent(buildWelcomeMessage());
    const phone = inviteMember?.phone?.replace(/\D/g, "") ?? "";
    window.open(`sms:${phone}?body=${body}`, "_self");
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Crew</h1>
        <Button
          onClick={() => {
            if (showForm) resetForm();
            else setShowForm(true);
          }}
          className={showForm ? "" : "gap-2 bg-green-700 hover:bg-green-800"}
          variant={showForm ? "outline" : "default"}
        >
          {showForm ? (
            <>
              <X className="h-4 w-4" /> Cancel
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" /> Add Member
            </>
          )}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardContent className="p-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="crew-name">Name *</Label>
                <Input
                  id="crew-name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="e.g., Carlos"
                />
              </div>
              <div>
                <Label htmlFor="crew-city">City</Label>
                <Input
                  id="crew-city"
                  value={form.city}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, city: e.target.value }))
                  }
                  placeholder="e.g., Austin"
                />
              </div>
              <div>
                <Label htmlFor="crew-phone">Phone</Label>
                <Input
                  id="crew-phone"
                  value={form.phone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, phone: e.target.value }))
                  }
                  placeholder="(512) 555-1234"
                />
              </div>
              <div>
                <Label htmlFor="crew-avail">Availability</Label>
                <Input
                  id="crew-avail"
                  value={form.availability}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, availability: e.target.value }))
                  }
                  placeholder="Mon-Fri, weekends on request"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="crew-tasks">Tasks / Skills</Label>
              <Input
                id="crew-tasks"
                value={form.tasks}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tasks: e.target.value }))
                }
                placeholder="Mowing, trimming, heavy lifting, stone work..."
              />
            </div>
            <Button onClick={handleSave} className="w-full sm:w-auto">
              {editingId ? "Update Member" : "Add Member"}
            </Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : members.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No crew members yet.</p>
          <p className="text-sm mt-1">
            Add your team to assign them to project tasks.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {members.map((m) => {
            const linked = getLinkedUser(m.id);
            return (
              <Card key={m.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-base">{m.name}</p>
                      {linked ? (
                        <Badge
                          variant="outline"
                          className="text-xs bg-green-50 text-green-700 border-green-200"
                        >
                          Has login
                        </Badge>
                      ) : null}
                    </div>
                    <div className="flex gap-1">
                      {/* Invite button — only show if no linked user and user canEdit */}
                      {!linked && canEdit && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-blue-600"
                          onClick={() => openInvite(m)}
                          title="Send invite"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => startEdit(m)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        onClick={() => handleDelete(m.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {m.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5" />
                        <span>{m.phone}</span>
                      </div>
                    )}
                    {m.city && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{m.city}</span>
                      </div>
                    )}
                    {m.availability && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{m.availability}</span>
                      </div>
                    )}
                    {m.tasks && (
                      <div className="flex items-center gap-2">
                        <Wrench className="h-3.5 w-3.5" />
                        <span className="line-clamp-2">{m.tasks}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ─── Invite Dialog ─────────────────────────────────────── */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Invite {inviteMember?.name}
            </DialogTitle>
            <DialogDescription>
              Create a login and send them their credentials via email or text.
            </DialogDescription>
          </DialogHeader>

          {!inviteCreated ? (
            /* Step 1: Set up the invite */
            <div className="space-y-3">
              <div>
                <Label htmlFor="invite-email">Email (optional)</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="their@email.com"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Saved on their user account for reference.
                </p>
              </div>

              <DialogFooter>
                <Button
                  onClick={createInvite}
                  disabled={inviteSending}
                  className="gap-1.5 bg-green-700 hover:bg-green-800"
                >
                  <UserPlus className="h-4 w-4" />
                  {inviteSending ? "Creating..." : "Create Login"}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            /* Step 2: Login created — show PIN and send options */
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-1">
                <p>
                  <span className="text-muted-foreground">Name:</span>{" "}
                  <span className="font-medium">{inviteMember?.name}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">PIN:</span>{" "}
                  <span className="font-mono font-bold text-lg">{invitePin}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Role: Worker · Invited by {currentUser?.name}
                </p>
              </div>

              <p className="text-sm text-muted-foreground">
                Send their login credentials:
              </p>

              <div className="flex gap-2">
                {inviteEmail && (
                  <Button
                    variant="outline"
                    className="flex-1 gap-1.5"
                    onClick={sendViaEmail}
                  >
                    <Mail className="h-4 w-4" />
                    Email
                  </Button>
                )}
                {inviteMember?.phone && (
                  <Button
                    variant="outline"
                    className="flex-1 gap-1.5"
                    onClick={sendViaText}
                  >
                    <MessageSquare className="h-4 w-4" />
                    Text
                  </Button>
                )}
              </div>

              {!inviteEmail && !inviteMember?.phone && (
                <p className="text-xs text-amber-600">
                  No email or phone on file. Share the credentials above manually.
                </p>
              )}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setInviteOpen(false)}
                >
                  Done
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
