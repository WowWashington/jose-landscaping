# Jose's Yard Care — Project State

**Last updated:** 2026-02-24
**Build status:** Clean (all passing)
**Commits:** 20 on main
**Hosting:** Not yet deployed (local dev only)

---

## What This Is

A field-management web app for a small landscaping/contracting business. It handles project estimation, crew assignment, task tracking, contacts, photo documentation, and personal work dashboards. Built for a solo operator (Jose) who found existing tools (Jobber, LMN, Yardbook) over-engineered and expensive.

The app is mobile-responsive and designed to be used primarily on phones in the field.

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 16 (App Router) | Single codebase for UI + API |
| UI | shadcn/ui + Tailwind CSS 4 | Mobile-responsive, lightweight |
| Database | SQLite via better-sqlite3 | Zero cost, single file |
| ORM | Drizzle 0.45 | Type-safe, SQLite-native |
| IDs | CUID2 | URL-safe, no collision |
| Auth | PIN-based (bcrypt) | Simple for field workers |
| PDF | @react-pdf/renderer | In-browser estimate generation |
| Icons | Lucide React | Consistent icon set |

## Roles & Permissions

Three-tier role system (numeric levels for comparison):

| Role | Level | Capabilities |
|------|-------|-------------|
| **Owner** | 3 | Full access, user management, settings, all data |
| **Coordinator** | 2 | Manage projects, crew, contacts, library, daily log |
| **Worker** | 1 | View projects, My Work page, complete assigned tasks |

`canEdit` = owner or coordinator. Workers are read-only except for task completion.

## Database Schema (9 tables)

### contacts
Customer/client info. All fields optional except id.
- `id`, `name`, `phone`, `email`, `address`, `city`, `state`, `zip`, `notes`, `lastContactDate`, `createdAt`, `updatedAt`

### taskTemplates
Hierarchical task library (blueprints). Self-referencing via `parentId`.
- `id`, `parentId`, `name`, `description`, `division` (yard_care | general_contracting), `category`, `depth` (0=category, 1=service, 2=sub-task), `defaultCost`, `defaultHours`, `defaultManpower`, `unit`, `sortOrder`, `isActive`, `createdAt`

### projects
Core entity. Links to contact, lead crew, and creator.
- `id`, `contactId`, `quoteNumber` (auto-generated Q-YYMM-XXXX), `division`, `name`, `description`, `status` (draft | quoted | active | completed | cancelled), `address`, `startDate`, `endDate`, `dueDate`, `confirmed`, `statusNotes`, `coverPhoto`, `leadCrewId`, `createdBy`, `notes`, `createdAt`, `updatedAt`

### crew
Team members (separate from user accounts).
- `id`, `name`, `city`, `phone`, `availability`, `tasks`, `createdAt`

### projectActivities
Instances of tasks on a project. Self-referencing via `parentActivityId`. Nullable `templateId` (null = free-text one-off task).
- `id`, `projectId`, `parentActivityId`, `templateId`, `crewId` (assigned crew), `name`, `description`, `cost`, `hours`, `manpower`, `quantity`, `unit`, `isComplete`, `completedBy`, `completedAt`, `sortOrder`, `createdAt`

### activityPhotos
Photos attached to activities (stored in /public/uploads/).
- `id`, `activityId`, `fileName`, `note`, `createdAt`

### users
App users with PIN auth. Optional link to crew member.
- `id`, `name`, `email`, `pin` (bcrypt), `role`, `crewId`, `isBlocked`, `createdAt`

### changeLog
Audit trail for all significant actions.
- `id`, `projectId`, `activityId`, `userId`, `userName`, `action`, `entity`, `entityName`, `details`, `createdAt`

### appSettings
Key-value config store.
- `key` (PK), `value`, `updatedAt`
- Current: `maskContactsForWorkers = "true"`

## Key Relationships

- `users.crewId` -> `crew.id` (links user account to crew member)
- `projects.leadCrewId` -> `crew.id` (project lead)
- `projects.contactId` -> `contacts.id` (client)
- `projectActivities.crewId` -> `crew.id` (task assignment)
- `projectActivities.projectId` -> `projects.id`
- `projectActivities.parentActivityId` -> `projectActivities.id` (hierarchy)
- `projectActivities.templateId` -> `taskTemplates.id` (blueprint reference)

## Features Built

### Core Project Management
- Create/edit/delete projects with contact picker, division, status workflow
- Activity tree with parent/child hierarchy (3 levels deep)
- Add tasks from template library or as free-text one-offs
- Copy template sub-task trees into projects with default values
- Inline cost/hours/manpower editing on activities
- Task completion checkboxes with who/when tracking
- Project status workflow (draft -> quoted -> active -> completed/cancelled)
- Auto-generated quote numbers (Q-YYMM-XXXX)
- Cover photo upload with image compression

### Task Template Library
- Hierarchical tree (category > service > sub-task)
- Two divisions: Yard Care (5 categories, ~35 services, ~60 sub-tasks) and General Contracting (5 categories)
- Search via command palette (cmdk)
- Drag-to-reorder within levels
- Add/edit/delete templates

### Contacts
- CRUD with optional fields (phone, email, address)
- Contact picker combobox in project form
- Last contact date tracking

### Crew Management
- CRUD for crew members
- Crew assignment to activities and as project lead
- Crew picker component

### User & Auth System
- PIN-based login (4+ digit PINs, bcrypt hashed)
- Cookie-based sessions
- User invite flow (owner creates users with temporary PINs)
- Block/unblock users
- Link user accounts to crew members

### Contact Data Masking
- Global toggle `maskContactsForWorkers` (default: on)
- Owner controls via Settings page
- Workers see partially masked phone/email (e.g., `(555) ***-**67`, `j***@gmail.com`)
- "Show" button reveals real data
- Every reveal is audit-logged to changeLog (`contact_viewed` action)
- Owner and Coordinator always see unmasked data

### My Work (Personal Dashboard)
- `/my-work` shows logged-in user's assigned active projects
- Task completion checkboxes (fires existing PUT /api/activities/[id])
- "Today's Work" section: active projects where user is lead or has assigned activities
- "Upcoming" section: confirmed future projects
- Shows other crew on same project for context
- "No crew profile" message if user.crewId is null

### Enhanced Project Cards & Search
- Project list cards show: name, status, division, contact, address, quote number, cost, activity count, due date, confirmed badge, status notes, assigned crew, lead crew, cover photo, start date, total man hours
- Search matches: project name, contact name, address, quote number, assigned crew names, lead crew name
- Sort by: newest, name, due date
- Filter by status chips

### PDF Estimate Generation
- In-browser PDF generation via @react-pdf/renderer
- Line-item table with activities, quantities, unit costs
- Business header, client info, project details
- Summary totals, notes, terms

### Activity Log
- Cross-project audit trail at `/activity-log`
- Per-project log at project detail page
- Manual notes can be added to project log
- Tracks: creates, updates, completions, deletions, photo adds, status changes, contact views

### Photo Documentation
- Upload photos to individual activities
- Image compression before upload
- Photo gallery per activity
- Delete photos

## Navigation

| Position | Item | Route | Min Role | Icon |
|----------|------|-------|----------|------|
| 1 | My Work | `/my-work` | worker | Briefcase |
| 2 | Projects | `/` | worker | FolderKanban |
| 3 | Daily Log | `/activity-log` | coordinator | ClipboardList |
| 4 | Library | `/library` | coordinator | ListTree |
| 5 | Crew | `/crew` | coordinator | HardHat |
| 6 | Contacts | `/contacts` | coordinator | Users |
| 7 | Users | `/admin/users` | owner | ShieldCheck |
| 8 | Settings | `/settings` | owner | Settings |

Desktop: fixed sidebar (w-60). Mobile: sticky header + bottom nav.

## API Routes

| Route | Methods | Auth | Description |
|-------|---------|------|-------------|
| `/api/auth` | POST, DELETE | public | Login / logout |
| `/api/auth/me` | GET | any | Current session user |
| `/api/projects` | GET, POST | any / canEdit | List / create projects |
| `/api/projects/[id]` | GET, PUT, DELETE | any / canEdit | Project CRUD |
| `/api/projects/[id]/activities` | GET, POST | any / canEdit | Project activities |
| `/api/projects/[id]/cover` | POST | canEdit | Upload cover photo |
| `/api/projects/[id]/log` | GET | any | Project change log |
| `/api/projects/[id]/log/note` | POST | canEdit | Add note to log |
| `/api/activities/[id]` | PUT, DELETE | any / canEdit | Activity CRUD + complete toggle |
| `/api/activities/[id]/photos` | GET, POST | any / canEdit | Activity photos |
| `/api/photos/[id]` | DELETE | canEdit | Delete photo |
| `/api/contacts` | GET, POST | any / canEdit | Contacts CRUD |
| `/api/contacts/[id]` | GET, PUT, DELETE | any / canEdit | Contact detail |
| `/api/crew` | GET, POST | any / canEdit | Crew CRUD |
| `/api/crew/[id]` | GET, PUT, DELETE | any / canEdit | Crew detail |
| `/api/templates` | GET, POST | any / canEdit | Template library |
| `/api/templates/[id]` | GET, PUT, DELETE | any / canEdit | Template detail |
| `/api/templates/reorder` | POST | canEdit | Reorder templates |
| `/api/users` | GET | owner | List users |
| `/api/users/[id]` | PUT, DELETE | owner | Manage users |
| `/api/users/invite` | POST | owner | Invite user |
| `/api/activity-log` | GET | coordinator | Cross-project log |
| `/api/my-work` | GET | any | User's assigned work |
| `/api/settings` | GET, PUT | any / owner | App settings |
| `/api/log-view` | POST | any | Audit contact reveals |

## File Structure (key files)

```
src/
  app/
    layout.tsx              # Root layout with AuthProvider + AppShell
    page.tsx                # Projects list (home page)
    my-work/page.tsx        # Personal work dashboard
    projects/
      new/page.tsx          # New project form
      [id]/page.tsx         # Project detail with activity tree
    contacts/
      page.tsx              # Contacts list
      [id]/page.tsx         # Contact detail
    crew/page.tsx           # Crew management
    library/page.tsx        # Task template library
    admin/users/page.tsx    # User management (owner)
    settings/page.tsx       # App settings (owner)
    activity-log/page.tsx   # Cross-project activity log
    activities/[id]/photos/ # Activity photo gallery
    api/                    # All REST API routes (see table above)
  components/
    layout/app-shell.tsx    # Sidebar + bottom nav + auth gate
    ui/                     # shadcn components (20+ primitives)
    ui/masked-field.tsx     # Contact data masking component
    projects/               # project-card, project-form, project-summary, status-badge
    activities/             # activity-tree, activity-row, add-activity-sheet
    contacts/               # contact-card, contact-form, contact-picker
    crew/crew-picker.tsx    # Crew selection combobox
    library/                # task-tree, task-search, task-form
    estimate/               # estimate-pdf, generate-button
    auth/login-screen.tsx   # PIN login form
  db/
    schema.ts               # Drizzle schema (9 tables)
    index.ts                # DB connection singleton
    seed.ts                 # Yard care task library (~60 sub-tasks)
    seed-contracting.ts     # General contracting templates
    seed-settings.ts        # Default app settings
  lib/
    auth-context.tsx        # AuthProvider + useAuth hook
    auth-utils.ts           # Role checking utilities
    get-session-user.ts     # Server-side session from cookie
    log-change.ts           # Audit trail logging utility
    mask-utils.ts           # maskPhone(), maskEmail()
    use-settings.ts         # useSettings() hook
    calculations.ts         # Cost/hours tree calculations
    template-to-activities.ts # Copy template tree to project
    quote-number.ts         # Auto-generate Q-YYMM-XXXX
    compress-image.ts       # Client-side image compression
    format-estimate.ts      # PDF data preparation
    uploads.ts              # File upload utilities
    utils.ts                # cn(), formatCurrency, etc.
  types/index.ts            # Shared TypeScript types + constants
```

## Pending / Future Work

### Deployment (discussed, not started)
- **Hosting:** Vercel (free tier)
- **Database:** Turso (SQLite in the cloud) — requires migrating from local better-sqlite3
- **Decision:** Deploy the web app first; it's already mobile-responsive so serves as the "mobile app" via browser

### Not Yet Built
- PWA setup (manifest, service worker, "Add to Home Screen")
- Push notifications for task assignments
- Recurring project templates
- Multi-photo upload per activity
- Estimate approval workflow (client-facing)
- Dashboard analytics (revenue, hours, project pipeline)
- Data export/backup

## Design Documents

All in `docs/plans/`:
- `2026-02-24-contact-masking-project-cards-design.md` — Contact masking + enhanced cards design
- `2026-02-24-contact-masking-project-cards-plan.md` — Implementation plan (15 tasks, completed)
- `2026-02-24-my-work-page-design.md` — My Work page + search enhancement design
- `2026-02-24-my-work-page-plan.md` — Implementation plan (5 tasks, completed)

## Git History (20 commits)

```
b9d0159 fix: add crewId to SessionUser type for my-work API
bcc0960 feat: expand project search to match crew member names
5e32b35 feat: add My Work to navigation (all roles, first position)
71aa70a feat: add My Work page with task completion
f6c5247 feat: add GET /api/my-work endpoint for personal dashboard
c4837c2 Add implementation plan for My Work page and crew search
aafdade Add design doc for My Work page and project search enhancement
092c48b fix: add missing leadCrewName to ProjectListItem type and mapping
fb5cd79 feat: add start date and total hours to project cards
882fbf8 feat: add Settings page with mask contacts toggle (owner only)
a5b1748 feat: apply contact masking to all UI pages
4e23100 feat: add useSettings hook for app settings
736c202 feat: add MaskedField component with reveal + audit logging
58ce92d feat: add maskPhone and maskEmail utility functions
e650cac Add log-view API endpoint for auditing contact info reveals
deb390e Add settings API endpoints for GET and PUT
4c519d1 Add appSettings table to schema and seed default setting
8beaec4 Add implementation plan for contact masking + enhanced project cards
cb17e7d Add design doc for contact masking and enhanced project cards
1249445 Initial commit from Create Next App
```

## Running Locally

```bash
npm install
npx tsx src/db/seed.ts          # Seed task library (yard care)
npx tsx src/db/seed-contracting.ts  # Seed general contracting templates
npx tsx src/db/seed-settings.ts     # Seed default app settings
npm run dev                     # Start dev server (http://localhost:3000)
```

Build: `npm run build` (clean, no errors)
