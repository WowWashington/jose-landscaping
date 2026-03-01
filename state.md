# Jose's Services - Project State

> Resume instruction: "Read STATE.md to understand where we are in the project and what needs to happen next. Do not review the previous chat history."

## Project Overview

**Jose's Services** — Field-management web app for a small landscaping and general contracting business. Handles project estimation, crew assignment, task tracking, photo documentation, contacts, and personal work dashboards. Built mobile-first for field workers with no subscription fees. Designed for a solo operator (Jose) + small crew (3-5 people).

- **Language/Stack**: Next.js 16, React 19, TypeScript, Tailwind CSS 4, SQLite (better-sqlite3), Drizzle ORM, shadcn/ui
- **Dependencies**: @react-pdf/renderer, bcryptjs, cmdk, lucide-react, @paralleldrive/cuid2
- **Local path**: `/Users/automator/Projects/jose-landscaping/`
- **GitHub**: `https://github.com/WowWashington/jose-landscaping`
- **Live URL**: `https://jose-services-app.azurewebsites.net`
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
│   │   ├── get-settings.ts           # Server-side settings reader (for layout.tsx)
│   │   ├── log-change.ts             # logChange() audit trail utility
│   │   ├── mask-utils.ts             # maskPhone(), maskEmail()
│   │   ├── use-settings.ts           # useSettings() hook (client-side)
│   │   ├── calculations.ts           # Cost/hours aggregation from activity tree
│   │   ├── template-to-activities.ts # Copy template hierarchy to project
│   │   ├── quote-number.ts           # generateQuoteNumber() Q-YYMM-XXXX
│   │   ├── compress-image.ts         # Client-side image compression
│   │   ├── format-estimate.ts        # PDF data preparation
│   │   ├── format-project-email.ts   # Plain-text project status email
│   │   └── uploads.ts                # File upload utilities
│   │
│   └── types/index.ts                # Shared TypeScript types + constants
│
├── drizzle/                          # Database migrations (11 SQL files)
├── scripts/
│   ├── start.sh                      # Docker startup (migrations + seeding + server)
│   └── hash-existing-pins.ts         # One-time PIN migration utility
├── .github/workflows/deploy.yml      # CI/CD: build → push to ACR → deploy to Azure
├── Dockerfile                        # Multi-stage build (deps → builder → runner)
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
10. **Configurable branding** — Business name, subtitle, and division toggles stored in `appSettings` table. Changeable via Settings page without code changes. Supports multi-tenant deployment (one codebase, many instances).

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

- **Database**: `data/jose.db` locally (auto-created on first run, gitignored)
- **Env vars**:
  - `DB_PATH` — overrides default database location (default: `data/jose.db`)
  - `UPLOADS_DIR` — overrides upload directory (default: `public/uploads/`)
- **No other env vars** — no external services, API keys, or secrets
- **Uploads**: stored in `public/uploads/` locally (gitignored)
- **next.config.ts**: output set to `"standalone"` for Docker deployment

---

## Running Locally

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

---

## Deployment (Azure)

### How It Works

The app deploys automatically via GitHub Actions. Every push to `main` triggers:

```
git push origin main
  → GitHub Actions (.github/workflows/deploy.yml)
    → Builds Docker image
    → Pushes to Azure Container Registry (ACR)
    → Deploys to Azure App Service
```

**No manual steps needed after initial setup.** Typical deploy time: ~2-3 minutes.

### Azure Resources

| Resource | Name | SKU | Cost |
|----------|------|-----|------|
| Resource Group | `jose-services` | — | — |
| Container Registry | `joseservicesacr` | Basic | ~$5/mo |
| App Service Plan | `jose-services-plan` | B1 Linux | ~$13/mo |
| App Service | `jose-services-app` | — | (shared plan) |

**Total: ~$18/mo** — well within the $150/mo Microsoft benefit credit.

**Region**: West US 2

### Persistent Storage

Azure App Service persists the `/home` directory across container restarts:
- **Database**: `/home/data/app.db`
- **Uploads**: `/home/uploads/` (symlinked to `/app/public/uploads` by `start.sh`)

### Container Startup (scripts/start.sh)

On every container start:
1. Creates `/home/data` and `/home/uploads` directories
2. Symlinks uploads into Next.js public dir
3. Runs Drizzle migrations (safe to repeat — only applies new ones)
4. On first run only: seeds the database with templates and default settings
5. Starts the Next.js standalone server

### GitHub Secrets

These are set in the GitHub repo (Settings → Secrets → Actions):

| Secret | Description |
|--------|-------------|
| `ACR_LOGIN_SERVER` | `joseservicesacr.azurecr.io` |
| `ACR_USERNAME` | `joseservicesacr` |
| `ACR_PASSWORD` | ACR admin password |
| `AZURE_CREDENTIALS` | Service principal JSON for `azure/login` action |

To retrieve credentials again if needed:
```bash
# ACR credentials
az acr credential show -n joseservicesacr

# Service principal (creates a new one)
SUB_ID=$(az account show --query id -o tsv)
az ad sp create-for-rbac --name "jose-services-deploy" \
  --role contributor \
  --scopes "/subscriptions/$SUB_ID/resourceGroups/jose-services" \
  --sdk-auth
```

### Adding a New Instance (e.g., for another contractor)

1. Create the App Service:
```bash
ACR_URL=$(az acr show -n joseservicesacr --query loginServer -o tsv)
az webapp create --resource-group jose-services --plan jose-services-plan \
  --name brian-services-app \
  --container-image-name "${ACR_URL}/field-service:latest" \
  --container-registry-url "https://$ACR_URL" \
  --container-registry-user joseservicesacr \
  --container-registry-password "$(az acr credential show -n joseservicesacr --query 'passwords[0].value' -o tsv)"

az webapp config appsettings set --resource-group jose-services --name brian-services-app \
  --settings WEBSITES_ENABLE_APP_SERVICE_STORAGE=true DB_PATH=/home/data/app.db UPLOADS_DIR=/home/uploads
```

2. Add a deploy step to `.github/workflows/deploy.yml`:
```yaml
      - name: Deploy to brian-services-app
        uses: azure/webapps-deploy@v2
        with:
          app-name: brian-services-app
          images: ${{ secrets.ACR_LOGIN_SERVER }}/field-service:${{ github.sha }}
```

3. Push to `main` — both instances update from the same image. Each has its own database + settings.

### Manual Deploy / Re-deploy

To trigger a deploy without code changes:
```bash
# From GitHub CLI
gh workflow run deploy.yml

# Or from the GitHub web UI:
# Actions tab → "Deploy to Azure" → "Run workflow"
```

---

## What's Complete

- Project management: CRUD, status workflow (draft→quoted→active→completed→cancelled)
- Activity tree: 3-level hierarchy, template or free-text tasks, inline editing, completion tracking
- Task template library: 60+ yard care sub-tasks, general contracting templates, search, reorder
- Contacts: CRUD, picker combobox, last contact date
- Crew management: CRUD, assignment to tasks + project lead, "last seen" indicator
- Authentication: PIN login (bcrypt), cookie sessions, rate limiting, user invite flow
- Authorization: 3-tier roles (owner/coordinator/worker), block/unblock users
- Contact data masking: toggle, masked display, reveal audit logging
- My Work dashboard: personal assigned tasks, completion checkboxes, upcoming projects
- Enhanced project cards: rich data display, multi-field search, sort, status filter
- PDF estimate generation: in-browser, line-item table, download/email
- Activity log: cross-project audit trail, per-project timeline, manual notes, login/logout logging
- Photo documentation: upload, compress, gallery, delete
- Mobile-responsive UI: sidebar + bottom nav
- Project start time: date + time selector, displayed on project cards
- Configurable branding: business name, subtitle, division toggles via Settings page
- Azure deployment: Docker container, auto-deploy from GitHub, persistent storage

---

## What's NOT Implemented (Future Work)

- PWA setup (manifest, service worker, "Add to Home Screen")
- Push notifications for task assignments
- Recurring project templates
- Multi-photo upload per activity
- Estimate approval workflow (client-facing)
- Dashboard analytics (revenue, hours, project pipeline)
- Data export/backup
- Logo/image upload for branding
- Color theme per instance

---

## Design Documents

All in `docs/plans/`:
- `2026-02-24-contact-masking-project-cards-design.md` — UX design for masking + cards
- `2026-02-24-contact-masking-project-cards-plan.md` — 15 tasks, all completed
- `2026-02-24-my-work-page-design.md` — UX design for My Work + search
- `2026-02-24-my-work-page-plan.md` — 5 tasks, all completed

---

## Current Status

**Last updated**: 2026-03-01
**State**: Deployed and live on Azure
**Live URL**: https://jose-services-app.azurewebsites.net
**Recent changes**: Audit logging, project start times, crew last-seen, configurable branding, Azure CI/CD deployment
**Next steps**: Test live app on mobile, add PWA support, consider logo upload
