"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import type { AppUser, CrewMember } from "@/types";
import { ROLE_LABELS } from "@/types";
import {
  Plus,
  X,
  Pencil,
  Trash2,
  ShieldCheck,
  Shield,
  Eye,
  Ban,
  CheckCircle2,
} from "lucide-react";
import { useRouter } from "next/navigation";

const ROLE_ICONS: Record<string, typeof ShieldCheck> = {
  owner: ShieldCheck,
  coordinator: Shield,
  worker: Eye,
};

export default function UsersPage() {
  const { isOwner, user: currentUser } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    pin: "",
    role: "worker",
    crewId: "",
  });

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/users").then((r) => r.json()),
      fetch("/api/crew").then((r) => r.json()),
    ]).then(([u, c]) => {
      setUsers(u);
      setCrewMembers(c);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!isOwner) {
      router.push("/");
      return;
    }
    load();
  }, [isOwner, router, load]);

  function resetForm() {
    setForm({ name: "", email: "", pin: "", role: "worker", crewId: "" });
    setShowForm(false);
    setEditingId(null);
  }

  function startEdit(u: AppUser) {
    setForm({
      name: u.name ?? "",
      email: u.email ?? "",
      pin: "", // don't show existing pin
      role: u.role ?? "worker",
      crewId: u.crewId ?? "",
    });
    setEditingId(u.id);
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.name.trim()) return;

    const body: Record<string, any> = {
      name: form.name,
      email: form.email || null,
      role: form.role,
      crewId: form.crewId || null,
    };
    if (form.pin) body.pin = form.pin;

    if (editingId) {
      await fetch(`/api/users/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }
    resetForm();
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this user?")) return;
    await fetch(`/api/users/${id}`, { method: "DELETE" });
    load();
  }

  async function toggleBlock(u: AppUser) {
    const newBlocked = !u.isBlocked;
    const action = newBlocked ? "block" : "unblock";
    if (!confirm(`${newBlocked ? "Block" : "Unblock"} ${u.name}? ${newBlocked ? "They will be logged out immediately." : "They will be able to log in again."}`)) return;

    await fetch(`/api/users/${u.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isBlocked: newBlocked }),
    });
    load();
  }

  if (!isOwner) return null;

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
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
              <Plus className="h-4 w-4" /> Add User
            </>
          )}
        </Button>
      </div>

      {/* Role legend */}
      <div className="flex gap-4 text-xs text-muted-foreground mb-4">
        <span className="flex items-center gap-1">
          <ShieldCheck className="h-3 w-3" /> Owner — full access
        </span>
        <span className="flex items-center gap-1">
          <Shield className="h-3 w-3" /> Coordinator — manage projects
        </span>
        <span className="flex items-center gap-1">
          <Eye className="h-3 w-3" /> Worker — view only
        </span>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardContent className="p-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="user-name">Name *</Label>
                <Input
                  id="user-name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="e.g., Jose"
                />
              </div>
              <div>
                <Label htmlFor="user-email">Email</Label>
                <Input
                  id="user-email"
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  placeholder="optional"
                />
              </div>
              <div>
                <Label htmlFor="user-pin">
                  PIN {editingId ? "(leave blank to keep)" : "*"}
                </Label>
                <Input
                  id="user-pin"
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={form.pin}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, pin: e.target.value }))
                  }
                  placeholder="6-digit PIN"
                />
              </div>
              <div>
                <Label htmlFor="user-role">Role</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Owner</SelectItem>
                    <SelectItem value="coordinator">Coordinator</SelectItem>
                    <SelectItem value="worker">Worker</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {crewMembers.length > 0 && (
              <div>
                <Label htmlFor="user-crew">Link to Crew Member</Label>
                <Select
                  value={form.crewId || "__none__"}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      crewId: v === "__none__" ? "" : v,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {crewMembers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button onClick={handleSave} className="w-full sm:w-auto">
              {editingId ? "Update User" : "Add User"}
            </Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : users.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No users yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((u) => {
            const RoleIcon = ROLE_ICONS[u.role ?? "worker"] ?? Eye;
            const crewLink = crewMembers.find((c) => c.id === u.crewId);
            const isSelf = u.id === currentUser?.id;

            return (
              <Card
                key={u.id}
                className={u.isBlocked ? "opacity-60" : ""}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <RoleIcon className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{u.name}</p>
                      {u.isBlocked && (
                        <Badge variant="destructive" className="text-xs">
                          Blocked
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {ROLE_LABELS[u.role ?? "worker"] ?? u.role}
                      {crewLink && ` · Crew: ${crewLink.name}`}
                      {u.email && ` · ${u.email}`}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {/* Block/Unblock — can't block yourself */}
                    {!isSelf && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className={`h-7 w-7 ${u.isBlocked ? "text-green-600" : "text-amber-600"}`}
                        onClick={() => toggleBlock(u)}
                        title={u.isBlocked ? "Unblock user" : "Block user"}
                      >
                        {u.isBlocked ? (
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
                      onClick={() => startEdit(u)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    {!isSelf && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        onClick={() => handleDelete(u.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
