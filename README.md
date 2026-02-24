# Jose's Yard Care

A field-management web app built for a small landscaping and general contracting business. Handles the full lifecycle — quoting jobs, assigning crew, tracking tasks in the field, documenting work with photos, and managing customer contacts.

Built mobile-first for use on phones in the field. No subscription fees, no bloat.

## Why This Exists

Existing tools like Jobber, LMN, and Yardbook are over-engineered and expensive for a solo operator running a small crew. This app focuses on what actually matters day-to-day: know what jobs are happening, who's doing what, and how much it costs.

## Features

### Project Management
- Create and manage projects through a full status workflow (Draft → Quoted → Active → Completed)
- Hierarchical activity trees — nest tasks 3 levels deep with cost, hours, and crew assignment per task
- Auto-generated quote numbers (Q-YYMM-XXXX format)
- Cover photo uploads with client-side image compression
- Task completion tracking with who/when audit trail

### Task Template Library
- Pre-built library of 60+ landscaping sub-tasks across 5 categories (Landscaping, Hardscape, Irrigation, Tree Care, Specialized)
- General contracting templates with 5 additional categories
- Search templates via command palette and add to projects with one click
- Full hierarchy: Category → Service → Sub-task with default costs, hours, and units

### My Work — Personal Dashboard
- Each crew member sees their own assigned active projects and tasks
- Inline task completion checkboxes
- Upcoming confirmed jobs section
- Shows other crew assigned to the same project for coordination

### Crew & Contact Management
- Manage crew members with availability and skill tracking
- Customer contacts with phone, email, address
- Assign crew to individual tasks or as project lead

### Contact Data Masking
- Owner-controlled toggle to mask customer phone/email from Workers
- Partial masking format: `(555) ***-**67`, `j***@gmail.com`
- "Show" button reveals real data with full audit logging
- Owner and Coordinator roles always see unmasked data

### PDF Estimates
- Generate professional PDF estimates in-browser
- Line-item tables with quantities, unit costs, totals
- Business header, client info, terms and notes

### Activity Log & Audit Trail
- Every action is logged: creates, edits, completions, deletions, photo uploads, status changes
- Cross-project daily log view for coordinators
- Per-project timeline on detail page
- Manual notes can be added to any project log

### Photo Documentation
- Upload photos to individual activities for before/after documentation
- Client-side compression before upload
- Photo gallery per activity with notes

## Roles & Permissions

| Role | Access |
|------|--------|
| **Owner** | Everything — manage users, settings, all data |
| **Coordinator** | Manage projects, crew, contacts, library, daily log |
| **Worker** | View projects, My Work page, complete assigned tasks |

Authentication uses simple PINs (bcrypt hashed) — designed for field workers who need fast access, not corporate SSO.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 16](https://nextjs.org) (App Router) |
| UI | [shadcn/ui](https://ui.shadcn.com) + [Tailwind CSS 4](https://tailwindcss.com) |
| Database | SQLite via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) |
| ORM | [Drizzle](https://orm.drizzle.team) 0.45 |
| PDF | [@react-pdf/renderer](https://react-pdf.org) |
| Icons | [Lucide React](https://lucide.dev) |
| IDs | [CUID2](https://github.com/paralleldrive/cuid2) |

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install & Run

```bash
# Install dependencies
npm install

# Seed the database (run each once)
npx tsx src/db/seed.ts              # Yard care task library
npx tsx src/db/seed-contracting.ts  # General contracting templates
npx tsx src/db/seed-settings.ts     # Default app settings

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
```

## Project Structure

```
src/
├── app/                    # Pages + API routes (Next.js App Router)
│   ├── page.tsx            # Projects list (home)
│   ├── my-work/            # Personal work dashboard
│   ├── projects/           # Project detail + new project form
│   ├── contacts/           # Contact list + detail
│   ├── crew/               # Crew management
│   ├── library/            # Task template library
│   ├── settings/           # App settings (owner only)
│   ├── admin/users/        # User management (owner only)
│   ├── activity-log/       # Cross-project audit log
│   └── api/                # 26 REST API endpoints
├── components/
│   ├── layout/             # App shell (sidebar + mobile nav)
│   ├── ui/                 # shadcn primitives (20+ components)
│   ├── projects/           # Project card, form, summary
│   ├── activities/         # Activity tree, row, add sheet
│   ├── contacts/           # Contact card, form, picker
│   ├── crew/               # Crew picker
│   ├── library/            # Template tree, search, form
│   ├── estimate/           # PDF generation
│   └── auth/               # PIN login screen
├── db/
│   ├── schema.ts           # 9-table Drizzle schema
│   └── seed*.ts            # Database seeders
├── lib/                    # Shared utilities (auth, masking, calculations, etc.)
└── types/                  # TypeScript types + constants
```

## Database

SQLite with 9 tables: `contacts`, `taskTemplates`, `projects`, `crew`, `projectActivities`, `activityPhotos`, `users`, `changeLog`, `appSettings`.

Key relationships:
- Projects belong to a contact (client) and have a lead crew member
- Activities form a tree (parent/child) within a project, each assignable to a crew member
- Activities can reference a template or be free-text one-offs
- Users optionally link to a crew member for "My Work" functionality
- All significant actions are logged to the changeLog for audit

Database file lives at `data/jose.db` (gitignored). Migrations are in `drizzle/`.

## API

26 RESTful endpoints covering auth, projects, activities, contacts, crew, templates, users, settings, and audit logging. All mutations require authentication; write operations require coordinator or owner role.

See [`state.md`](./state.md) for the full API route table.

## License

Private — not open source.
