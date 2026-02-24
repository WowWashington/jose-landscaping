# Contact Masking + Enhanced Project Cards — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add role-based contact info masking with audit logging, a global owner toggle, and enhance project cards with start date + total man hours.

**Architecture:** Client-side `<MaskedField>` component checks user role + app setting to mask/reveal phone & email. New `appSettings` table stores the global toggle. Existing `changeLog` table gets a new `contact_viewed` action. Project cards get `startDate` and `totalHours` from API enrichment.

**Tech Stack:** Next.js 14 (App Router), Drizzle ORM (SQLite), React context, Tailwind CSS, Lucide icons

---

## Task 1: Add `appSettings` Table to Schema

**Files:**
- Modify: `src/db/schema.ts` (after line 150, end of file)

**Step 1: Add the appSettings table definition**

Add after the `changeLog` table in `src/db/schema.ts`:

```typescript
// ─── App Settings ────────────────────────────────────────────
export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});
```

**Step 2: Push the schema change**

Run: `cd /Users/automator/Projects/jose-landscaping && npx drizzle-kit push`
Expected: Table `app_settings` created successfully

**Step 3: Seed the default setting**

Create a seed script or run inline. Add a small seed file `src/db/seed-settings.ts`:

```typescript
import { db } from "@/db";
import { appSettings } from "@/db/schema";

db.insert(appSettings)
  .values({ key: "maskContactsForWorkers", value: "true" })
  .onConflictDoNothing()
  .run();

console.log("Settings seeded.");
```

Run: `cd /Users/automator/Projects/jose-landscaping && npx tsx src/db/seed-settings.ts`
Expected: "Settings seeded."

**Step 4: Commit**

```bash
git add src/db/schema.ts src/db/seed-settings.ts
git commit -m "feat: add appSettings table with maskContactsForWorkers default"
```

---

## Task 2: Settings API Endpoints

**Files:**
- Create: `src/app/api/settings/route.ts`

**Step 1: Create the settings API**

Create `src/app/api/settings/route.ts`:

```typescript
import { db } from "@/db";
import { appSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/get-session-user";

// GET /api/settings — returns all settings as { key: value } object
export async function GET() {
  try {
    const rows = db.select().from(appSettings).all();
    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    return NextResponse.json(settings);
  } catch (error) {
    console.error("GET /api/settings error:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

// PUT /api/settings — update a setting (Owner only)
export async function PUT(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "owner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { key, value } = await request.json();
    if (!key || value === undefined) {
      return NextResponse.json({ error: "key and value required" }, { status: 400 });
    }

    db.insert(appSettings)
      .values({ key, value: String(value) })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { value: String(value), updatedAt: new Date() },
      })
      .run();

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PUT /api/settings error:", error);
    return NextResponse.json({ error: "Failed to update setting" }, { status: 500 });
  }
}
```

**Step 2: Verify the API works**

Run: `curl http://localhost:3000/api/settings`
Expected: `{"maskContactsForWorkers":"true"}`

**Step 3: Commit**

```bash
git add src/app/api/settings/route.ts
git commit -m "feat: add GET/PUT /api/settings endpoints"
```

---

## Task 3: Log-View API Endpoint

**Files:**
- Create: `src/app/api/log-view/route.ts`

**Step 1: Create the log-view API**

Create `src/app/api/log-view/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/get-session-user";
import { logChange } from "@/lib/log-change";

// POST /api/log-view — log that a worker revealed masked contact info
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { contactName, field, projectId } = await request.json();

    logChange({
      projectId: projectId ?? null,
      userId: user.id,
      userName: user.name,
      action: "contact_viewed",
      entity: "contact",
      entityName: contactName ?? null,
      details: `Viewed ${field}`, // "Viewed phone" or "Viewed email"
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/log-view error:", error);
    return NextResponse.json({ error: "Failed to log view" }, { status: 500 });
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/log-view/route.ts
git commit -m "feat: add POST /api/log-view for contact_viewed audit logging"
```

---

## Task 4: Masking Utility Functions

**Files:**
- Create: `src/lib/mask-utils.ts`

**Step 1: Create masking utility**

Create `src/lib/mask-utils.ts`:

```typescript
/**
 * Partially mask a phone number.
 * Input: "(555) 123-4567" → Output: "(555) ***-**67"
 * Input: "5551234567"     → Output: "555***4567" (last 2 visible)
 * Preserves formatting characters, masks middle digits.
 */
export function maskPhone(phone: string): string {
  // Extract just the digits
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "•••";

  // Keep first 3 (area code) and last 2 visible
  const visible = new Set<number>();
  // First 3 digit positions
  let digitIndex = 0;
  for (let i = 0; i < phone.length && digitIndex < 3; i++) {
    if (/\d/.test(phone[i])) {
      visible.add(i);
      digitIndex++;
    }
  }
  // Last 2 digit positions
  digitIndex = 0;
  for (let i = phone.length - 1; i >= 0 && digitIndex < 2; i--) {
    if (/\d/.test(phone[i])) {
      visible.add(i);
      digitIndex++;
    }
  }

  // Build masked string
  return phone
    .split("")
    .map((ch, i) => {
      if (/\d/.test(ch) && !visible.has(i)) return "*";
      return ch;
    })
    .join("");
}

/**
 * Partially mask an email address.
 * Input: "john@gmail.com" → Output: "j***@gmail.com"
 * Input: "ab@x.co"        → Output: "a***@x.co"
 */
export function maskEmail(email: string): string {
  const atIndex = email.indexOf("@");
  if (atIndex <= 0) return "***@***";
  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex); // includes @
  return local[0] + "***" + domain;
}
```

**Step 2: Commit**

```bash
git add src/lib/mask-utils.ts
git commit -m "feat: add maskPhone and maskEmail utility functions"
```

---

## Task 5: `<MaskedField>` Component

**Files:**
- Create: `src/components/ui/masked-field.tsx`

**Step 1: Create the MaskedField component**

Create `src/components/ui/masked-field.tsx`:

```typescript
"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { maskPhone, maskEmail } from "@/lib/mask-utils";

type MaskedFieldProps = {
  value: string;
  type: "phone" | "email";
  contactName?: string | null;
  projectId?: string | null;
  maskEnabled: boolean; // from appSettings
  /** Render function for the unmasked value (e.g., as a tel: link) */
  children?: (value: string) => React.ReactNode;
};

export function MaskedField({
  value,
  type,
  contactName,
  projectId,
  maskEnabled,
  children,
}: MaskedFieldProps) {
  const { isWorker } = useAuth();
  const [revealed, setRevealed] = useState(false);

  const shouldMask = isWorker && maskEnabled && !revealed;

  async function handleReveal() {
    setRevealed(true);
    // Fire audit log (fire-and-forget)
    fetch("/api/log-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contactName: contactName ?? null,
        field: type, // "phone" or "email"
        projectId: projectId ?? null,
      }),
    }).catch(() => {}); // swallow errors silently
  }

  if (!shouldMask) {
    // Unmasked: render via children render prop or plain text
    return <>{children ? children(value) : value}</>;
  }

  // Masked view
  const maskedValue = type === "phone" ? maskPhone(value) : maskEmail(value);

  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-muted-foreground">{maskedValue}</span>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleReveal();
        }}
        className="inline-flex items-center gap-0.5 text-xs text-blue-600 hover:text-blue-800 hover:underline"
        title="Show contact info"
      >
        <Eye className="h-3 w-3" />
        Show
      </button>
    </span>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/ui/masked-field.tsx
git commit -m "feat: add MaskedField component with reveal + audit logging"
```

---

## Task 6: Settings Context Hook

**Files:**
- Create: `src/lib/use-settings.ts`

**Step 1: Create the useSettings hook**

Create `src/lib/use-settings.ts`:

```typescript
"use client";

import { useState, useEffect } from "react";

type AppSettings = {
  maskContactsForWorkers: boolean;
};

const defaultSettings: AppSettings = {
  maskContactsForWorkers: true,
};

export function useSettings(): { settings: AppSettings; loading: boolean; refresh: () => void } {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  function load() {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setSettings({
          maskContactsForWorkers: data.maskContactsForWorkers !== "false",
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  return { settings, loading, refresh: load };
}
```

**Step 2: Commit**

```bash
git add src/lib/use-settings.ts
git commit -m "feat: add useSettings hook for app settings"
```

---

## Task 7: Apply Masking to Contact Card

**Files:**
- Modify: `src/components/contacts/contact-card.tsx`

**Step 1: Update ContactCard to use MaskedField**

Replace the phone and email display sections. The component needs to accept `maskEnabled` as a prop (the parent page will provide it from `useSettings`).

In `src/components/contacts/contact-card.tsx`, update the imports and component:

Add imports at top:
```typescript
import { MaskedField } from "@/components/ui/masked-field";
```

Update props type to:
```typescript
export function ContactCard({ contact, maskEnabled }: { contact: Contact; maskEnabled: boolean }) {
```

Replace phone block (lines 24-29):
```typescript
{contact.phone && (
  <div className="flex items-center gap-2">
    <Phone className="h-3.5 w-3.5" />
    <MaskedField
      value={contact.phone}
      type="phone"
      contactName={contact.name}
      maskEnabled={maskEnabled}
    />
  </div>
)}
```

Replace email block (lines 30-35):
```typescript
{contact.email && (
  <div className="flex items-center gap-2">
    <Mail className="h-3.5 w-3.5" />
    <MaskedField
      value={contact.email}
      type="email"
      contactName={contact.name}
      maskEnabled={maskEnabled}
    />
  </div>
)}
```

**Step 2: Commit**

```bash
git add src/components/contacts/contact-card.tsx
git commit -m "feat: apply MaskedField to ContactCard phone and email"
```

---

## Task 8: Apply Masking to Contact Detail Page

**Files:**
- Modify: `src/app/contacts/[id]/page.tsx`

**Step 1: Add imports and hook**

Add to imports in `src/app/contacts/[id]/page.tsx`:
```typescript
import { MaskedField } from "@/components/ui/masked-field";
import { useSettings } from "@/lib/use-settings";
```

Add inside the component, after existing state declarations:
```typescript
const { settings } = useSettings();
```

**Step 2: Replace phone display (lines 161-171)**

Replace:
```typescript
{contact.phone && (
  <div>
    <span className="text-muted-foreground">Phone:</span>{" "}
    <a
      href={`tel:${contact.phone}`}
      className="text-blue-600 underline"
    >
      {contact.phone}
    </a>
  </div>
)}
```

With:
```typescript
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
```

**Step 3: Replace email display (lines 172-182)**

Replace:
```typescript
{contact.email && (
  <div>
    <span className="text-muted-foreground">Email:</span>{" "}
    <a
      href={`mailto:${contact.email}`}
      className="text-blue-600 underline"
    >
      {contact.email}
    </a>
  </div>
)}
```

With:
```typescript
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
```

**Step 4: Commit**

```bash
git add src/app/contacts/[id]/page.tsx
git commit -m "feat: apply MaskedField to contact detail phone and email"
```

---

## Task 9: Update Contacts List Page to Pass maskEnabled

**Files:**
- Modify: `src/app/contacts/page.tsx`

**Step 1: Add useSettings hook**

Add import:
```typescript
import { useSettings } from "@/lib/use-settings";
```

Add inside the component:
```typescript
const { settings } = useSettings();
```

**Step 2: Pass maskEnabled to ContactCard**

Where `<ContactCard contact={contact} />` is rendered, change to:
```typescript
<ContactCard contact={contact} maskEnabled={settings.maskContactsForWorkers} />
```

**Step 3: Commit**

```bash
git add src/app/contacts/page.tsx
git commit -m "feat: pass maskEnabled to ContactCard from contacts list"
```

---

## Task 10: Apply Masking to Project Detail Page

**Files:**
- Modify: `src/app/projects/[id]/page.tsx`

**Step 1: Add imports and hook**

Add imports:
```typescript
import { MaskedField } from "@/components/ui/masked-field";
import { useSettings } from "@/lib/use-settings";
```

Add inside component:
```typescript
const { settings } = useSettings();
```

**Step 2: Replace contact phone (lines 363-367)**

Replace:
```typescript
{project.contact?.phone && (
  <span className="flex items-center gap-1">
    <Phone className="h-3.5 w-3.5" /> {project.contact.phone}
  </span>
)}
```

With:
```typescript
{project.contact?.phone && (
  <span className="flex items-center gap-1">
    <Phone className="h-3.5 w-3.5" />
    <MaskedField
      value={project.contact.phone}
      type="phone"
      contactName={project.contact.name}
      projectId={project.id}
      maskEnabled={settings.maskContactsForWorkers}
    />
  </span>
)}
```

**Step 3: Replace lead crew phone (lines 389-397)**

Replace:
```typescript
{leadMember?.phone && (
  <a
    href={`tel:${leadMember.phone}`}
    className="flex items-center gap-1 text-blue-600 hover:underline shrink-0"
  >
    <Phone className="h-3.5 w-3.5" />
    {leadMember.phone}
  </a>
)}
```

With:
```typescript
{leadMember?.phone && (
  <span className="flex items-center gap-1 shrink-0">
    <Phone className="h-3.5 w-3.5 text-blue-600" />
    <MaskedField
      value={leadMember.phone}
      type="phone"
      contactName={leadMember.name}
      projectId={project.id}
      maskEnabled={settings.maskContactsForWorkers}
    >
      {(val) => (
        <a href={`tel:${val}`} className="text-blue-600 hover:underline">
          {val}
        </a>
      )}
    </MaskedField>
  </span>
)}
```

**Step 4: Commit**

```bash
git add src/app/projects/[id]/page.tsx
git commit -m "feat: apply MaskedField to project detail contact and crew phone"
```

---

## Task 11: Settings Page UI

**Files:**
- Create: `src/app/settings/page.tsx`
- Modify: `src/components/layout/app-shell.tsx` (line 24, add nav item)

**Step 1: Create Settings page**

Create `src/app/settings/page.tsx`:

```typescript
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
```

**Step 2: Add Settings nav item**

In `src/components/layout/app-shell.tsx`, add import for Settings icon and add nav item.

Add `Settings` to the lucide import (line 5):
```typescript
import { FolderKanban, ListTree, Users, HardHat, ShieldCheck, LogOut, ClipboardList, Settings } from "lucide-react";
```

Add nav item after the Users entry (after line 24):
```typescript
{ href: "/settings", label: "Settings", icon: Settings, minRole: "owner" },
```

**Step 3: Verify the Switch component exists**

Run: `ls /Users/automator/Projects/jose-landscaping/src/components/ui/switch.tsx`

If missing, create it from shadcn:
Run: `cd /Users/automator/Projects/jose-landscaping && npx shadcn@latest add switch`

**Step 4: Commit**

```bash
git add src/app/settings/page.tsx src/components/layout/app-shell.tsx
git commit -m "feat: add Settings page with mask contacts toggle (owner only)"
```

---

## Task 12: Enhanced Project Cards — API Enrichment

**Files:**
- Modify: `src/app/api/projects/route.ts` (lines 74-77 and 90-98)

**Step 1: Add totalHours calculation**

In `src/app/api/projects/route.ts`, after the `totalCost` calculation (line 77), add:

```typescript
const totalHours = leafActivities.reduce(
  (sum, a) => sum + (a.hours ?? 0),
  0
);
```

**Step 2: Add totalHours and startDate to return object**

In the return object (lines 90-98), add `totalHours` and `startDate`:

Change:
```typescript
return {
  ...project,
  contact: contact ?? null,
  activityCount,
  totalCost: Math.round(totalCost * 100) / 100,
  assignedCrew: assignedCrewNames,
  leadCrewName: project.leadCrewId ? crewMap.get(project.leadCrewId) ?? null : null,
  createdByName: project.createdBy ? userMap.get(project.createdBy) ?? null : null,
};
```

To:
```typescript
return {
  ...project,
  contact: contact ?? null,
  activityCount,
  totalCost: Math.round(totalCost * 100) / 100,
  totalHours: Math.round(totalHours * 10) / 10,
  assignedCrew: assignedCrewNames,
  leadCrewName: project.leadCrewId ? crewMap.get(project.leadCrewId) ?? null : null,
  createdByName: project.createdBy ? userMap.get(project.createdBy) ?? null : null,
};
```

(Note: `startDate` is already in `...project` spread, no need to add explicitly.)

**Step 3: Commit**

```bash
git add src/app/api/projects/route.ts
git commit -m "feat: add totalHours to project list API enrichment"
```

---

## Task 13: Enhanced Project Cards — UI Update

**Files:**
- Modify: `src/components/projects/project-card.tsx` (lines 10-26 type, and lines 138-186 display)

**Step 1: Update ProjectCardData type**

In `src/components/projects/project-card.tsx`, add to the type (after line 19 `activityCount`):

```typescript
startDate: string | null;
totalHours: number;
```

Add `Calendar, Clock` to imports (line 7):
```typescript
import { MapPin, User, CalendarClock, CheckCircle2, HardHat, Calendar, Clock } from "lucide-react";
```

**Step 2: Add start date and hours display**

In the card component, add formatted labels after the existing `dueDateLabel` (after line 105):

```typescript
const startDateLabel = project.startDate
  ? new Date(project.startDate + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
  : null;
```

Add start date display after the contact name block (after line 143, after the contactName div):

```typescript
{startDateLabel && (
  <div className="flex items-center gap-1.5">
    <Calendar className="h-3.5 w-3.5" />
    <span>Start: {startDateLabel}</span>
  </div>
)}
```

Add hours display after the due date / confirmed section (after line 169, after the confirmed-only block):

```typescript
{project.totalHours > 0 && (
  <div className="flex items-center gap-1.5">
    <Clock className="h-3.5 w-3.5" />
    <span>{project.totalHours} hrs</span>
  </div>
)}
```

**Step 3: Commit**

```bash
git add src/components/projects/project-card.tsx
git commit -m "feat: add start date and total hours to project cards"
```

---

## Task 14: Update Projects List to Pass Card Data

**Files:**
- Modify: `src/app/page.tsx` (or wherever projects are mapped to ProjectCard)

**Step 1: Ensure startDate and totalHours are passed to ProjectCard**

Check where `<ProjectCard>` is rendered. The project data from the API already includes `startDate` (from spread) and `totalHours` (newly added). Make sure the mapping includes these fields.

Find the mapping that creates `ProjectCardData` and add:
```typescript
startDate: p.startDate ?? null,
totalHours: p.totalHours ?? 0,
```

**Step 2: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: pass startDate and totalHours to ProjectCard"
```

---

## Task 15: Build and Verify

**Step 1: Run the build**

Run: `cd /Users/automator/Projects/jose-landscaping && npm run build`
Expected: Build succeeds with no type errors

**Step 2: Manual verification checklist**

1. Login as Owner → contacts show phone/email unmasked
2. Login as Worker → contacts show partial mask with "Show" button
3. Click "Show" → data reveals, check changeLog for `contact_viewed` entry
4. Settings page → toggle masking off → worker sees unmasked data
5. Project cards → show start date and total hours
6. Project detail → contact phone and lead crew phone masked for workers

**Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address any build/type issues from masking + cards feature"
```
