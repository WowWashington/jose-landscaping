# My Work Page + Project Search Enhancement

**Date:** 2026-02-24
**Status:** Approved

---

## Feature 1: "My Work" Page

### Overview

A personal dashboard page at `/my-work` that shows the logged-in user their currently assigned work. Visible to all roles via a new nav item. Uses the existing `users.crewId` → `projectActivities.crewId` / `projects.leadCrewId` relationship to determine assignment.

### Data Source

A user's assigned work is determined by their linked `crewId`:
- **Activities:** `projectActivities.crewId = user.crewId`
- **Lead projects:** `projects.leadCrewId = user.crewId`

### Page Layout

**Section: "Today's Work"**
- Active projects (`status = 'active'`) where the user is lead or has assigned activities
- Each project shows as a card with:
  - Project name, division icon, address
  - **My pending tasks** — the user's assigned activities that are not yet complete, with checkboxes
  - Hours for their tasks
  - Other crew members on the same project (for context)
- Sorted by due date (soonest first)

**Section: "Upcoming"**
- Confirmed projects (`confirmed = true`) with `startDate` in the future, or `status = 'quoted'` + confirmed
- Simpler cards: project name, start date, task count assigned to user
- Gives the worker visibility into what's coming next

**Edge case: No crewId linked**
- Shows message: "No crew profile linked to your account. Ask the owner to link your user to a crew member."

### API

**`GET /api/my-work`** — returns the logged-in user's assigned projects + activities

Response shape:
```typescript
{
  today: [{
    project: { id, name, division, address, dueDate, leadCrewName },
    myActivities: [{ id, name, hours, isComplete }],
    otherCrew: string[],
    myHours: number,
  }],
  upcoming: [{
    project: { id, name, division, startDate },
    taskCount: number,
  }]
}
```

### Navigation

Add to `app-shell.tsx` nav items:
```typescript
{ href: "/my-work", label: "My Work", icon: Briefcase, minRole: "worker" }
```

Position: first item in nav (before Projects), since it's the most relevant for workers.

### Task Completion

Workers can check off their tasks directly from the My Work page. This fires the existing `PUT /api/activities/[id]` endpoint to toggle `isComplete`, with the same change logging already in place.

---

## Feature 2: Enhanced Project Search (Crew Names)

### Overview

Expand the existing search filter on the Projects page (`/`) to also match against assigned crew member names and lead crew name.

### Current Behavior

The search box on `src/app/page.tsx` filters projects by name and contact name (client-side).

### Enhancement

Add crew fields to the filter predicate. The data is already available — the API returns `assignedCrew: string[]` and `leadCrewName: string | null` per project.

In the existing filter function, add:
```typescript
|| p.assignedCrew.some(name => name.toLowerCase().includes(query))
|| (p.leadCrewName?.toLowerCase().includes(query) ?? false)
```

### No new UI needed

Same search box, same behavior — just matches more fields. Typing "Carlos" now surfaces all projects where Carlos is assigned or is lead.
