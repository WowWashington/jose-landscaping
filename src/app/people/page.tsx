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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { useSettings } from "@/lib/use-settings";
import type { AppUser } from "@/types";
import { ROLE_LABELS } from "@/types";
import {
  Plus,
  X,
  Pencil,
  Trash2,
  Phone,
  MapPin,
  Clock,
  Wrench,
  Mail,
  MessageSquare,
  UserPlus,
  Eye,
  Ban,
  CheckCircle2,
  LogOut,
  ShieldCheck,
  Shield,
} from "lucide-react";

type PersonWithActivity = AppUser & { lastActivity?: string | null };

function formatLastSeen(isoStr: string): string {
  const d = new Date(isoStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const ROLE_ICONS: Record<string, typeof ShieldCheck> = {
  owner: ShieldCheck,
  coordinator: Shield,
  worker: Eye,
};

export default function PeoplePage() {
  const { user: currentUser, canEdit, isOwner } = useAuth();
  const { settings } = useSettings();
  const [people, setPeople] = useState<PersonWithActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Invite dialog state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invitePerson, setInvitePerson] = useState<PersonWithActivity | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePin, setInvitePin] = useState("");
  const [inviteCreated, setInviteCreated] = useState(false);
  const [inviteSending, setInviteSending] = useState(false);

  // Credential share dialog (after create/update with PIN)
  const [credDialogOpen, setCredDialogOpen] = useState(false);
  const [credUser, setCredUser] = useState<{
    name: string;
    email: string;
    pin: string;
    role: string;
    phone: string;
    isNew: boolean;
  } | null>(null);

  const [form, setForm] = useState({
    name: "",
    city: "",
    phone: "",
    availability: "",
    tasks: "",
    // Auth fields (owner only)
    email: "",
    pin: "",
    role: "",
  });

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => setPeople(data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function resetForm() {
    setForm({ name: "", city: "", phone: "", availability: "", tasks: "", email: "", pin: "", role: "" });
    setShowForm(false);
    setEditingId(null);
  }

  function startEdit(p: PersonWithActivity) {
    setForm({
      name: p.name ?? "",
      city: p.city ?? "",
      phone: p.phone ?? "",
      availability: p.availability ?? "",
      tasks: p.tasks ?? "",
      email: p.email ?? "",
      pin: "",
      role: p.role ?? "",
    });
    setEditingId(p.id);
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.name.trim()) return;

    const body: Record<string, any> = {
      name: form.name,
      city: form.city || null,
      phone: form.phone || null,
      availability: form.availability || null,
      tasks: form.tasks || null,
    };

    // Owner can set auth fields
    if (isOwner) {
      body.email = form.email || null;
      body.role = form.role || null;
      if (form.pin) body.pin = form.pin;
    }

    if (editingId) {
      const res = await fetch(`/api/users/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok && form.pin && isOwner) {
        setCredUser({
          name: form.name,
          email: form.email,
          pin: form.pin,
          role: form.role || "worker",
          phone: form.phone,
          isNew: false,
        });
        setCredDialogOpen(true);
      }
    } else {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok && form.pin && isOwner) {
        setCredUser({
          name: form.name,
          email: form.email,
          pin: form.pin,
          role: form.role || "worker",
          phone: form.phone,
          isNew: true,
        });
        setCredDialogOpen(true);
      }
    }
    resetForm();
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this person?")) return;
    await fetch(`/api/users/${id}`, { method: "DELETE" });
    load();
  }

  async function toggleBlock(p: PersonWithActivity) {
    const newBlocked = !p.isBlocked;
    if (!confirm(`${newBlocked ? "Block" : "Unblock"} ${p.name}? ${newBlocked ? "They will be logged out immediately." : "They will be able to log in again."}`)) return;
    await fetch(`/api/users/${p.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isBlocked: newBlocked }),
    });
    load();
  }

  async function handleLogoutAll(p: PersonWithActivity) {
    const isSelf = p.id === currentUser?.id;
    const msg = isSelf
      ? "Logout all your sessions everywhere? You will need to log in again."
      : `Logout all sessions for ${p.name}? They will need to log in again on all devices.`;
    if (!confirm(msg)) return;
    await fetch(`/api/users/${p.id}/logout-all`, { method: "POST" });
    if (isSelf) {
      window.location.reload();
    } else {
      load();
    }
  }

  function openGrantLogin(person: PersonWithActivity) {
    setInvitePerson(person);
    setInviteEmail(person.email ?? "");
    setInvitePin("");
    setInviteCreated(false);
    setInviteOpen(true);
  }

  async function createLogin() {
    if (!invitePerson) return;
    setInviteSending(true);
    try {
      const res = await fetch("/api/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: invitePerson.id,
          email: inviteEmail || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setInvitePin(data.pin);
        setInviteCreated(true);
        load();
      }
    } finally {
      setInviteSending(false);
    }
  }

  function buildWelcomeMessage(name: string, pin: string, phone?: string): string {
    const senderName = currentUser?.name ?? "Your manager";
    const appUrl = typeof window !== "undefined" ? window.location.origin : "the app";
    return [
      `Hi ${name}!`,
      ``,
      `${senderName} has added you to ${settings.businessName}.`,
      ``,
      `Your login:`,
      `  Name: ${name}`,
      `  PIN: ${pin}`,
      ``,
      `Open the app: ${appUrl}`,
      ``,
      `You can change your PIN after logging in.`,
    ].join("\n");
  }

  function sendInviteViaEmail() {
    const subject = encodeURIComponent(`You're invited to ${settings.businessName}`);
    const body = encodeURIComponent(buildWelcomeMessage(invitePerson?.name ?? "", invitePin));
    const to = encodeURIComponent(inviteEmail);
    window.open(`mailto:${to}?subject=${subject}&body=${body}`, "_self");
  }

  function sendInviteViaText() {
    const body = encodeURIComponent(buildWelcomeMessage(invitePerson?.name ?? "", invitePin));
    const phone = invitePerson?.phone?.replace(/\D/g, "") ?? "";
    window.open(`sms:${phone}?body=${body}`, "_self");
  }

  function sendCredViaEmail() {
    if (!credUser?.email) return;
    const subject = encodeURIComponent(`Your login for ${settings.businessName}`);
    const body = encodeURIComponent(buildWelcomeMessage(credUser.name, credUser.pin));
    const to = encodeURIComponent(credUser.email);
    window.open(`mailto:${to}?subject=${subject}&body=${body}`, "_self");
  }

  function sendCredViaText() {
    const body = encodeURIComponent(buildWelcomeMessage(credUser?.name ?? "", credUser?.pin ?? ""));
    const phone = credUser?.phone?.replace(/\D/g, "") ?? "";
    window.open(`sms:${phone}?body=${body}`, "_self");
  }

  const hasLogin = (p: PersonWithActivity) => p.role !== null && p.pin !== null;

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">People</h1>
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
              <Plus className="h-4 w-4" /> Add Person
            </>
          )}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardContent className="p-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="person-name">Name *</Label>
                <Input
                  id="person-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g., Carlos"
                />
              </div>
              <div>
                <Label htmlFor="person-city">City</Label>
                <Input
                  id="person-city"
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  placeholder="e.g., Austin"
                />
              </div>
              <div>
                <Label htmlFor="person-phone">Phone</Label>
                <Input
                  id="person-phone"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="(512) 555-1234"
                />
              </div>
              <div>
                <Label htmlFor="person-avail">Availability</Label>
                <Input
                  id="person-avail"
                  value={form.availability}
                  onChange={(e) => setForm((f) => ({ ...f, availability: e.target.value }))}
                  placeholder="Mon-Fri, weekends on request"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="person-tasks">Tasks / Skills</Label>
              <Input
                id="person-tasks"
                value={form.tasks}
                onChange={(e) => setForm((f) => ({ ...f, tasks: e.target.value }))}
                placeholder="Mowing, trimming, heavy lifting, stone work..."
              />
            </div>

            {/* Auth fields — owner only */}
            {isOwner && (
              <>
                <div className="border-t pt-3 mt-2">
                  <p className="text-xs text-muted-foreground mb-2">Login (optional — leave blank for no-login person)</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="person-email">Email</Label>
                      <Input
                        id="person-email"
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                        placeholder="optional"
                      />
                    </div>
                    <div>
                      <Label htmlFor="person-pin">
                        PIN {editingId ? "(leave blank to keep)" : ""}
                      </Label>
                      <Input
                        id="person-pin"
                        type="password"
                        inputMode="numeric"
                        maxLength={6}
                        value={form.pin}
                        onChange={(e) => setForm((f) => ({ ...f, pin: e.target.value }))}
                        placeholder="6-digit PIN"
                      />
                    </div>
                    <div>
                      <Label htmlFor="person-role">Role</Label>
                      <Select
                        value={form.role || "__none__"}
                        onValueChange={(v) => setForm((f) => ({ ...f, role: v === "__none__" ? "" : v }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">No login</SelectItem>
                          <SelectItem value="owner">Owner</SelectItem>
                          <SelectItem value="coordinator">Coordinator</SelectItem>
                          <SelectItem value="worker">Worker</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </>
            )}

            <Button onClick={handleSave} className="w-full sm:w-auto">
              {editingId ? "Update Person" : "Add Person"}
            </Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : people.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No people yet.</p>
          <p className="text-sm mt-1">
            Add your team to assign them to project tasks.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {people.map((p) => {
            const isSelf = p.id === currentUser?.id;
            const login = hasLogin(p);
            const RoleIcon = p.role ? (ROLE_ICONS[p.role] ?? Eye) : null;

            return (
              <Card key={p.id} className={p.isBlocked ? "opacity-60" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-base">{p.name}</p>
                      {login ? (
                        <Badge
                          variant="outline"
                          className="text-xs bg-green-50 text-green-700 border-green-200"
                        >
                          {ROLE_LABELS[p.role!] ?? p.role}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          No login
                        </Badge>
                      )}
                      {p.isBlocked && (
                        <Badge variant="destructive" className="text-xs">
                          Blocked
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {/* Grant login — owner only, no-login people only */}
                      {isOwner && !login && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-blue-600"
                          onClick={() => openGrantLogin(p)}
                          title="Grant login"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {/* Logout everywhere — owner only, login people only */}
                      {isOwner && login && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-blue-600"
                          onClick={() => handleLogoutAll(p)}
                          title="Logout everywhere"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {/* Block/Unblock — owner only, not self */}
                      {isOwner && !isSelf && login && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className={`h-7 w-7 ${p.isBlocked ? "text-green-600" : "text-amber-600"}`}
                          onClick={() => toggleBlock(p)}
                          title={p.isBlocked ? "Unblock" : "Block"}
                        >
                          {p.isBlocked ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <Ban className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => startEdit(p)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {isOwner && !isSelf && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive"
                          onClick={() => handleDelete(p.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {p.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5" />
                        <span>{p.phone}</span>
                      </div>
                    )}
                    {p.city && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{p.city}</span>
                      </div>
                    )}
                    {p.availability && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{p.availability}</span>
                      </div>
                    )}
                    {p.tasks && (
                      <div className="flex items-center gap-2">
                        <Wrench className="h-3.5 w-3.5" />
                        <span className="line-clamp-2">{p.tasks}</span>
                      </div>
                    )}
                    {p.lastActivity && (
                      <div className="flex items-center gap-2">
                        <Eye className="h-3.5 w-3.5" />
                        <span>Last seen {formatLastSeen(p.lastActivity)}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ─── Grant Login Dialog ──────────────────────────────────── */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Grant Login — {invitePerson?.name}</DialogTitle>
            <DialogDescription>
              Create a login and send them their credentials via email or text.
            </DialogDescription>
          </DialogHeader>

          {!inviteCreated ? (
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
                  Saved on their account for reference.
                </p>
              </div>
              <DialogFooter>
                <Button
                  onClick={createLogin}
                  disabled={inviteSending}
                  className="gap-1.5 bg-green-700 hover:bg-green-800"
                >
                  <UserPlus className="h-4 w-4" />
                  {inviteSending ? "Creating..." : "Create Login"}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-1">
                <p>
                  <span className="text-muted-foreground">Name:</span>{" "}
                  <span className="font-medium">{invitePerson?.name}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">PIN:</span>{" "}
                  <span className="font-mono font-bold text-lg">{invitePin}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Role: Worker
                </p>
              </div>
              <p className="text-sm text-muted-foreground">Send their login credentials:</p>
              <div className="flex gap-2">
                {inviteEmail && (
                  <Button variant="outline" className="flex-1 gap-1.5" onClick={sendInviteViaEmail}>
                    <Mail className="h-4 w-4" /> Email
                  </Button>
                )}
                {invitePerson?.phone && (
                  <Button variant="outline" className="flex-1 gap-1.5" onClick={sendInviteViaText}>
                    <MessageSquare className="h-4 w-4" /> Text
                  </Button>
                )}
              </div>
              {!inviteEmail && !invitePerson?.phone && (
                <p className="text-xs text-amber-600">
                  No email or phone on file. Share the credentials above manually.
                </p>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setInviteOpen(false)}>Done</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Credential Share Dialog (after create/update with PIN) ─ */}
      <Dialog open={credDialogOpen} onOpenChange={setCredDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {credUser?.isNew ? "Person Created" : "PIN Updated"}
            </DialogTitle>
            <DialogDescription>
              {credUser?.isNew
                ? `${credUser?.name} has been added.`
                : `${credUser?.name}'s PIN has been changed.`}{" "}
              Share their login credentials below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-1">
              <p>
                <span className="text-muted-foreground">Name:</span>{" "}
                <span className="font-medium">{credUser?.name}</span>
              </p>
              <p>
                <span className="text-muted-foreground">PIN:</span>{" "}
                <span className="font-mono font-bold text-lg">{credUser?.pin}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Role: {ROLE_LABELS[credUser?.role ?? "worker"] ?? credUser?.role}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">Send their login credentials:</p>
            <div className="flex gap-2">
              {credUser?.email && (
                <Button variant="outline" className="flex-1 gap-1.5" onClick={sendCredViaEmail}>
                  <Mail className="h-4 w-4" /> Email
                </Button>
              )}
              {credUser?.phone && (
                <Button variant="outline" className="flex-1 gap-1.5" onClick={sendCredViaText}>
                  <MessageSquare className="h-4 w-4" /> Text
                </Button>
              )}
            </div>
            {!credUser?.email && !credUser?.phone && (
              <p className="text-xs text-amber-600">
                No email or phone on file. Share the credentials above manually.
              </p>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setCredDialogOpen(false)}>Done</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
