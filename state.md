# Jose's Yard Care - Project State

> Resume instruction: "Read STATE.md to understand where we are in the project and what needs to happen next. Do not review the previous chat history."

## Project Overview

**Jose's Yard Care** — Field-management web app for a small landscaping and general contracting business. Handles project estimation, crew assignment, task tracking, photo documentation, contacts, and personal work dashboards. Built mobile-first for field workers with no subscription fees. Designed for a solo operator (Jose) + small crew (3-5 people).

- **Language/Stack**: Next.js 16, React 19, TypeScript, Tailwind CSS 4, SQLite (better-sqlite3), Drizzle ORM, shadcn/ui
- **Dependencies**: @react-pdf/renderer, bcryptjs, cmdk, lucide-react, @paralleldrive/cuid2
- **Local path**: `/Users/automator/Projects/jose-landscaping/`
- **License**: MIT

---

## Intent & Use

Jose found existing field-service tools (Jobber, LMN, Yardbook) over-engineered and expensive. This app provides just what's needed: create projects from a task library, assign crew, track completion in the field, generate PDF estimates, and manage customer contacts. The app is mobile-responsive — accessed via browser on phones/tablets, no app store needed.

---

## File Structure

```
jose-landscaping/
├── src/
│   ├── app/                          # Next.js 16 App Router
│   │   ├── layout.tsx                # Root layout + AuthProvider + AppShell
│   │   ├── page.tsx                  # Projects list (home)
│   │   ├── my-work/page.tsx          # Personal work dashboard
│   │   ├── projects/new/page.tsx     # Create project form
│   │   ├── projects/[id]/page.tsx    # Project detail + activity tree
│   │   ├── contacts/page.tsx         # Contact list
│   │   ├── contacts/[id]/page.tsx    # Contact detail
│   │   ├── crew/page.tsx             # Crew management
│   │   ├── library/page.tsx          # Task template library
│   │   ├── admin/users/page.tsx      # User management (owner only)
│   │   ├── settings/page.tsx         # App settings (owner only)
│   │   ├── activity-log/page.tsx     # Cross-project audit log
│   │   ├── activities/[id]/photos/   # Photo gallery
│   │   └── api/                      # 25+ REST API endpoints
│   │
│   ├── components/
│   │   ├── layout/app-shell.tsx      # Sidebar + mobile nav + auth gate
│   │   ├── ui/                       # shadcn/ui primitives (19 components)
│   │   ├── projects/                 # project-card, project-form, project-summary, status-badge
│   │   ├── activities/               # activity-tree, activity-row, add-activity-sheet
│   │   ├── contacts/                 # contact-card, contact-form, contact-picker
│   │   ├── crew/crew-picker.tsx      # Crew selection combobox
│   │   ├── library/                  # task-tree, task-search, task-form
│   │   ├── estimate/                 # estimate-pdf, generate-button
│   │   └── auth/login-screen.tsx     # PIN login form
│   │
│   ├── db/
│   │   ├── schema.ts                 # Drizzle schema (9 tables)
│   │   ├── index.ts                  # DB connection (WAL mode, foreign keys)
│   │   ├── seed.ts                   # Yard care task library (~60 sub-tasks)
│   │   ├── seed-contracting.ts       # General contracting templates
│   │   └── seed-settings.ts          # Default app settings
│   │
│   ├── lib/
│   │   ├── auth-context.tsx          # AuthProvider + useAuth hook
│   │   ├── auth-utils.ts             # hashPin(), verifyPin(), role checks
│   │   ├── get-session-user.ts       # Server-side session from cookie
│   │   ├── log-change.ts             # logChange() audit trail utility
│   │   ├── mask-utils.ts             # maskPhone(), maskEmail()
│   │   ├── use-settings.ts           # useSettings() hook
│   │   ├── calculations.ts           # Cost/hours aggregation from activity tree
│   │   ├── template-to-activities.ts # Copy template hierarchy to project
│   │   ├── quote-number.ts           # generateQuoteNumber() Q-YYMM-XXXX
│   │   ├── compress-image.ts         # Client-side image compression
│   │   ├── format-estimate.ts        # PDF data preparation
│   │   └── uploads.ts                # File upload utilities
│   │
│   └── types/index.ts                # Shared TypeScript types + constants
│
├── drizzle/                          # Database migrations (11 SQL files)
├── docs/plans/                       # Design + implementation docs
├── public/uploads/                   # Photo uploads (gitignored)
├── data/jose.db                      # SQLite database (gitignored)
├── package.json
├── drizzle.config.ts
├── next.config.ts                    # output: "standalone"
└── components.json                   # shadcn/ui config (new-york style)
```

---

## Architecture & Key Decisions

1. **PIN-based auth** — 4+ digit PINs, bcrypt hashed, cookie-based sessions (90-day expiry). Rate limited: 5 failed attempts → 15-minute lockout per username.
2. **Three-tier roles**: Owner (full access) > Coordinator (manage projects/crew/contacts) > Worker (view + complete tasks only).
3. **Hierarchical task templates** — 3-level tree: Category → Service → Sub-task. Two divisions: Yard Care + General Contracting. Templates copied into projects preserving hierarchy.
4. **Activity tree calculations** — only leaf nodes count for cost totals. Cost = unit cost × quantity. Prevents double-counting parent groups.
5. **Contact data masking** — global toggle (`maskContactsForWorkers`). Workers see masked phone/email; every reveal is audit-logged.
6. **Quote numbers** — auto-generated Q-YYMM-XXXX format (29^4 = 707K combos/month). Unambiguous chars only (no 0/O/1/I/L/V).
7. **In-browser PDF** — @react-pdf/renderer generates estimates client-side. No server-side rendering needed.
8. **Single SQLite file** — `data/jose.db`, WAL mode, foreign keys enabled. Zero infrastructure cost.
9. **No external services** — no email provider, no cloud storage, no payment processing. Everything local.

### Navigation

| Position | Page | Route | Min Role |
|----------|------|-------|----------|
| 1 | My Work | `/my-work` | worker |
| 2 | Projects | `/` | worker |
| 3 | Daily Log | `/activity-log` | coordinator |
| 4 | Library | `/library` | coordinator |
| 5 | Crew | `/crew` | coordinator |
| 6 | Contacts | `/contacts` | coordinator |
| 7 | Users | `/admin/users` | owner |
| 8 | Settings | `/settings` | owner |

Desktop: fixed sidebar (w-60). Mobile: sticky header + bottom nav.

---

## Configuration & Secrets

- **Database**: `data/jose.db` (auto-created on first run, gitignored)
- **Env var**: `DB_PATH` overrides default database location
- **No other env vars** — no external services, API keys, or secrets
- **Uploads**: stored in `public/uploads/` (gitignored)
- **next.config.ts**: output set to `"standalone"` (Vercel-ready)

---

## Running / Deployment

```bash
cd /Users/automator/Projects/jose-landscaping

# Install
npm install

# Seed database (run each once)
npx tsx src/db/seed.ts              # Yard care task library
npx tsx src/db/seed-contracting.ts  # General contracting templates
npx tsx src/db/seed-settings.ts     # Default settings

# Development
npm run dev    # http://localhost:3000

# Production build
npm run build  # Clean, no errors
npm run start  # Run production build locally
```

**Planned deployment**: Vercel (free tier) + Turso (SQLite-in-cloud). Requires migrating from better-sqlite3 to libsql driver. Not yet started.

---

## What's Complete

- Project management: CRUD, status workflow (draft→quoted→active→completed→cancelled)
- Activity tree: 3-level hierarchy, template or free-text tasks, inline editing, completion tracking
- Task template library: 60+ yard care sub-tasks, general contracting templates, search, reorder
- Contacts: CRUD, picker combobox, last contact date
- Crew management: CRUD, assignment to tasks + project lead
- Authentication: PIN login (bcrypt), cookie sessions, rate limiting, user invite flow
- Authorization: 3-tier roles (owner/coordinator/worker), block/unblock users
- Contact data masking: toggle, masked display, reveal audit logging
- My Work dashboard: personal assigned tasks, completion checkboxes, upcoming projects
- Enhanced project cards: rich data display, multi-field search, sort, status filter
- PDF estimate generation: in-browser, line-item table, download/email
- Activity log: cross-project audit trail, per-project timeline, manual notes
- Photo documentation: upload, compress, gallery, delete
- Mobile-responsive UI: sidebar + bottom nav

---

## What's NOT Implemented (Future Work)

- PWA setup (manifest, service worker, "Add to Home Screen")
- Push notifications for task assignments
- Recurring project templates
- Multi-photo upload per activity
- Estimate approval workflow (client-facing)
- Dashboard analytics (revenue, hours, project pipeline)
- Data export/backup
- Deployment (Vercel + Turso)

---

## Design Documents

All in `docs/plans/`:
- `2026-02-24-contact-masking-project-cards-design.md` — UX design for masking + cards
- `2026-02-24-contact-masking-project-cards-plan.md` — 15 tasks, all completed
- `2026-02-24-my-work-page-design.md` — UX design for My Work + search
- `2026-02-24-my-work-page-plan.md` — 5 tasks, all completed

---

## Git History (22 commits, newest first)

```
0cfb07a docs: add MIT license
c2a2723 docs: replace boilerplate README with comprehensive project documentation
3b481c9 docs: add state.md capturing full project requirements and status
dcd8215 feat: add complete core app (projects, contacts, crew, library, auth, estimates)
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
```

---

## Current Status

**Last updated**: 2026-02-26
**State**: Active — all core features complete, deployment-ready
**Recent changes**: Complete app rebuild (dcd8215), My Work dashboard, contact masking, MIT license
**Next steps**: Deploy to Vercel + Turso, or add PWA support for "Add to Home Screen" experience
