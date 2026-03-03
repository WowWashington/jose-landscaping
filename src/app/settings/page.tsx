"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { Settings, Shield, Building2, Layers, Check } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const { isOwner, loading: authLoading } = useAuth();
  const router = useRouter();
  const [maskContacts, setMaskContacts] = useState(true);
  const [businessName, setBusinessName] = useState("Landscaping and Services");
  const [businessSubtitle, setBusinessSubtitle] = useState("Landscaping & Outdoor Services");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [enableYardCare, setEnableYardCare] = useState(true);
  const [enableContracting, setEnableContracting] = useState(true);
  const [showBillingRates, setShowBillingRates] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [initialName, setInitialName] = useState("");
  const [initialSubtitle, setInitialSubtitle] = useState("");
  const [initialPhone, setInitialPhone] = useState("");
  const [initialAddress, setInitialAddress] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setMaskContacts(data.maskContactsForWorkers !== "false");
        if (data.businessName) {
          setBusinessName(data.businessName);
          setInitialName(data.businessName);
        }
        if (data.businessSubtitle) {
          setBusinessSubtitle(data.businessSubtitle);
          setInitialSubtitle(data.businessSubtitle);
        }
        if (data.businessPhone != null) {
          setBusinessPhone(data.businessPhone);
          setInitialPhone(data.businessPhone);
        }
        if (data.businessAddress != null) {
          setBusinessAddress(data.businessAddress);
          setInitialAddress(data.businessAddress);
        }
        setEnableYardCare(data.enableYardCare !== "false");
        setEnableContracting(data.enableContracting !== "false");
        setShowBillingRates(data.showBillingRates === "true");
        setLoaded(true);
      });
  }, []);

  useEffect(() => {
    if (!authLoading && !isOwner) {
      router.push("/");
    }
  }, [authLoading, isOwner, router]);

  async function saveSetting(key: string, value: string) {
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
  }

  async function toggleMask(checked: boolean) {
    setMaskContacts(checked);
    await saveSetting("maskContactsForWorkers", String(checked));
  }

  async function toggleYardCare(checked: boolean) {
    if (!checked && !enableContracting) return;
    setEnableYardCare(checked);
    await saveSetting("enableYardCare", String(checked));
  }

  async function toggleContracting(checked: boolean) {
    if (!checked && !enableYardCare) return;
    setEnableContracting(checked);
    await saveSetting("enableContracting", String(checked));
  }

  async function toggleBillingRates(checked: boolean) {
    setShowBillingRates(checked);
    await saveSetting("showBillingRates", String(checked));
  }

  if (authLoading || !loaded) {
    return <div className="p-6 text-sm text-muted-foreground">Loading...</div>;
  }

  if (!isOwner) return null;

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-4">
      <h1 className="text-xl font-semibold flex items-center gap-2 mb-6">
        <Settings className="h-5 w-5" /> Settings
      </h1>

      {/* Business Name */}
      <div className="rounded-lg border p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-medium">Business</h2>
        </div>

        <div className="space-y-3">
          <div>
            <Label htmlFor="businessName" className="text-sm font-medium">
              Business Name
            </Label>
            <Input
              id="businessName"
              value={businessName}
              onChange={(e) => { setBusinessName(e.target.value); setSaved(false); }}
              placeholder="Your business name"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Shown in the sidebar, login page, PDF estimates, and emails.
            </p>
          </div>
          <div>
            <Label htmlFor="businessSubtitle" className="text-sm font-medium">
              Subtitle / Tagline
            </Label>
            <Input
              id="businessSubtitle"
              value={businessSubtitle}
              onChange={(e) => { setBusinessSubtitle(e.target.value); setSaved(false); }}
              placeholder="e.g., Landscaping & Outdoor Services"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Shown below the business name on PDF estimates.
            </p>
          </div>
          <div>
            <Label htmlFor="businessPhone" className="text-sm font-medium">
              Phone
            </Label>
            <Input
              id="businessPhone"
              value={businessPhone}
              onChange={(e) => { setBusinessPhone(e.target.value); setSaved(false); }}
              placeholder="(555) 123-4567"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Shown on PDF estimates so customers can reach you.
            </p>
          </div>
          <div>
            <Label htmlFor="businessAddress" className="text-sm font-medium">
              Address
            </Label>
            <Input
              id="businessAddress"
              value={businessAddress}
              onChange={(e) => { setBusinessAddress(e.target.value); setSaved(false); }}
              placeholder="123 Main St, City, ST 12345"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Shown on PDF estimates.
            </p>
          </div>
          {(businessName !== initialName || businessSubtitle !== initialSubtitle || businessPhone !== initialPhone || businessAddress !== initialAddress) && (
            <Button
              size="sm"
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                if (businessName !== initialName) {
                  await saveSetting("businessName", businessName);
                  setInitialName(businessName);
                }
                if (businessSubtitle !== initialSubtitle) {
                  await saveSetting("businessSubtitle", businessSubtitle);
                  setInitialSubtitle(businessSubtitle);
                }
                if (businessPhone !== initialPhone) {
                  await saveSetting("businessPhone", businessPhone);
                  setInitialPhone(businessPhone);
                }
                if (businessAddress !== initialAddress) {
                  await saveSetting("businessAddress", businessAddress);
                  setInitialAddress(businessAddress);
                }
                setSaving(false);
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
              }}
            >
              {saving ? "Saving..." : saved ? <><Check className="h-4 w-4 mr-1" /> Saved</> : "Save"}
            </Button>
          )}
          {saved && businessName === initialName && businessSubtitle === initialSubtitle && businessPhone === initialPhone && businessAddress === initialAddress && (
            <p className="text-xs text-green-600 flex items-center gap-1">
              <Check className="h-3 w-3" /> Saved
            </p>
          )}
        </div>
      </div>

      {/* Divisions */}
      <div className="rounded-lg border p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Layers className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-medium">Divisions</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Enable or disable service divisions. At least one must remain enabled.
        </p>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="yard-care" className="text-sm font-medium">
              🌿 Yard Care & Landscaping
            </Label>
            <Switch
              id="yard-care"
              checked={enableYardCare}
              onCheckedChange={toggleYardCare}
              disabled={saving || (enableYardCare && !enableContracting)}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="contracting" className="text-sm font-medium">
              🔨 General Contracting
            </Label>
            <Switch
              id="contracting"
              checked={enableContracting}
              onCheckedChange={toggleContracting}
              disabled={saving || (enableContracting && !enableYardCare)}
            />
          </div>
        </div>
      </div>

      {/* Privacy */}
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

        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <Label htmlFor="billing-rates" className="text-sm font-medium">
              Allow Coordinators to see Billing Rates
            </Label>
            <p className="text-xs text-muted-foreground">
              When enabled, coordinators can view worker billing rates on the People page.
              Owners can always see rates.
            </p>
          </div>
          <Switch
            id="billing-rates"
            checked={showBillingRates}
            onCheckedChange={toggleBillingRates}
            disabled={saving}
          />
        </div>
      </div>

      {/* Build version */}
      <p className="text-xs text-muted-foreground text-center pt-2">
        Build {process.env.NEXT_PUBLIC_BUILD_ID}
      </p>
    </div>
  );
}
