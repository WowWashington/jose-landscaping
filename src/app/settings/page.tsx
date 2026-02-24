"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { Settings, Shield } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function SettingsPage() {
  const { isOwner, loading: authLoading } = useAuth();
  const router = useRouter();
  const [maskContacts, setMaskContacts] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setMaskContacts(data.maskContactsForWorkers !== "false");
        setLoaded(true);
      });
  }, []);

  useEffect(() => {
    if (!authLoading && !isOwner) {
      router.push("/");
    }
  }, [authLoading, isOwner, router]);

  async function toggleMask(checked: boolean) {
    setMaskContacts(checked);
    setSaving(true);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "maskContactsForWorkers", value: String(checked) }),
    });
    setSaving(false);
  }

  if (authLoading || !loaded) {
    return <div className="p-6 text-sm text-muted-foreground">Loading...</div>;
  }

  if (!isOwner) return null;

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold flex items-center gap-2 mb-6">
        <Settings className="h-5 w-5" /> Settings
      </h1>

      <div className="rounded-lg border p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-medium">Privacy & Security</h2>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <Label htmlFor="mask-contacts" className="text-sm font-medium">
              Mask customer contact info for Workers
            </Label>
            <p className="text-xs text-muted-foreground">
              When enabled, workers must click &quot;Show&quot; to see customer phone numbers
              and email addresses. All views are logged.
            </p>
          </div>
          <Switch
            id="mask-contacts"
            checked={maskContacts}
            onCheckedChange={toggleMask}
            disabled={saving}
          />
        </div>
      </div>
    </div>
  );
}
