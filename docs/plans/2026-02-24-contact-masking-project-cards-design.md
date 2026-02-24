# Contact Masking + Enhanced Project Cards

**Date:** 2026-02-24
**Status:** Approved

---

## Feature 1: Contact Data Masking for Workers

### Overview

Contact PII (phone, email) is masked for Worker-role users behind a "Show Info" reveal button. A global toggle controlled by the Owner enables/disables this behavior. When a Worker reveals masked data, the action is logged to the existing changeLog table.

### Global Setting

- **Setting name:** `maskContactsForWorkers`
- **Type:** boolean, default `true`
- **Storage:** New `appSettings` table — single-row key/value store
- **Access:** Only Owners can toggle (Settings page)

### Schema Change

```sql
CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Seed row:
INSERT INTO app_settings (key, value) VALUES ('maskContactsForWorkers', 'true');
```

### Behavior Matrix

| Role        | Toggle ON (default)                | Toggle OFF            |
| ----------- | ---------------------------------- | --------------------- |
| Owner       | Full access, no masking            | Same                  |
| Coordinator | Full access, no masking            | Same                  |
| Worker      | Masked + "Show Info" button + logged | Full access, no logging |

### Masking Format (Partial Mask)

- **Phone:** `(555) ***-**67` — area code visible, last 2 digits visible
- **Email:** `j***@gmail.com` — first character + full domain visible

### Masking Locations

| Page / Component            | Phone    | Email    |
| --------------------------- | -------- | -------- |
| Contact card (contacts list)| Masked   | Masked   |
| Contact detail page         | Masked   | Masked   |
| Project detail (contact)    | Masked   | N/A      |
| Project detail (lead crew)  | Masked   | N/A      |

### Implementation: `<MaskedField>` Component

Client-side masking approach:

1. API returns full data (no backend changes to existing endpoints)
2. `<MaskedField>` component wraps phone/email display
3. Reads user role from `useAuth()` context
4. Reads `maskContactsForWorkers` setting from a new API endpoint or app context
5. For Workers when toggle is ON:
   - Renders partial-masked value
   - Shows eye/reveal icon button
   - On click: reveals real value (React state, persists for page session)
   - Fires `POST /api/log-view` to record the reveal
6. For Owner/Coordinator or when toggle is OFF:
   - Renders value normally, no button

### Logging

Uses existing `changeLog` table with new action type:

```
action: "contact_viewed"
entity: "contact"
entityName: "<contact name>"
details: "Viewed phone" | "Viewed email"
userId: <worker user id>
userName: <worker name>
projectId: <project id if viewing from project context, null otherwise>
```

### Settings UI

A simple settings page (or section in existing admin area) accessible to Owner only:
- Toggle switch: "Mask customer contact info for Workers"
- Label explains: "When enabled, workers must click 'Show Info' to see customer phone numbers and email addresses. All views are logged."

### API Endpoints

- `GET /api/settings` — returns all app settings (public to authenticated users)
- `PUT /api/settings` — update a setting (Owner only)
- `POST /api/log-view` — log a contact_viewed event (authenticated, any role)

---

## Feature 2: Enhanced Project Cards

### Overview

Add missing fields to project cards on the main projects list: start date and total man hours. Project lead, due date, and confirmed status are already displayed.

### New Fields on Card

| Field      | Source                              | Display Format       | Icon         |
| ---------- | ----------------------------------- | -------------------- | ------------ |
| Start Date | `project.startDate`                 | "Start: Mar 15"      | Calendar     |
| Man Hours  | SUM of `activities.hours` (leaves)  | "12.5 hrs"           | Clock        |

### Already Displayed (no change needed)

- Project Lead (`leadCrewName`) — HardHat icon, blue
- Due Date (`dueDate`) — CalendarClock icon
- Confirmed (`confirmed`) — Green CheckCircle2 badge

### API Changes

In `GET /api/projects` (list endpoint), add `totalHours` to the enrichment:

```typescript
// Same pattern as existing totalCost calculation
const totalHours = leafActivities.reduce(
  (sum, a) => sum + (a.hours ?? 0), 0
);
```

Return `totalHours` and `startDate` in the project card data shape.

### Card Layout Update

Add start date and hours to the metadata grid in `ProjectCard`:

```
[Division Icon] Project Name          [Status Badge]
[Cover Photo]
[$1,234.00]  [Start: Mar 15]  [Due: Apr 1]  [12.5 hrs]
[Contact Name]  [Lead: Jose]  [Confirmed badge]
```

### Type Changes

Add to `ProjectCardData`:
```typescript
startDate: string | null;
totalHours: number;
```
