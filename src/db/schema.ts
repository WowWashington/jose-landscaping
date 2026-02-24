import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";

// ─── Contacts ───────────────────────────────────────────────
export const contacts = sqliteTable("contacts", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text("name"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  notes: text("notes"),
  lastContactDate: text("last_contact_date"), // ISO date string e.g. "2025-03-15"
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date()
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(
    () => new Date()
  ),
});

// ─── Task Template Library (hierarchical) ───────────────────
export const taskTemplates = sqliteTable("task_templates", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  parentId: text("parent_id"),
  name: text("name").notNull(),
  description: text("description"),
  division: text("division").default("yard_care"), // yard_care, general_contracting
  category: text("category"), // green, hardscape, irrigation, tree_care, specialized, interior, exterior, structural
  depth: integer("depth").default(0), // 0=category, 1=service, 2=sub-task
  defaultCost: real("default_cost"),
  defaultHours: real("default_hours"),
  defaultManpower: integer("default_manpower"),
  unit: text("unit"), // each, sqft, linear_ft, hour, load, yard
  sortOrder: integer("sort_order").default(0),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date()
  ),
});

// ─── Projects ───────────────────────────────────────────────
export const projects = sqliteTable("projects", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  contactId: text("contact_id"),
  quoteNumber: text("quote_number"), // e.g. Q-2602-4A7K
  division: text("division").default("yard_care"), // yard_care, general_contracting
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").default("draft"), // draft, quoted, active, completed, cancelled
  address: text("address"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  dueDate: text("due_date"), // ISO date string
  confirmed: integer("confirmed", { mode: "boolean" }).default(false),
  statusNotes: text("status_notes"), // free-text notes about job timing, progress
  coverPhoto: text("cover_photo"), // filename in /public/uploads/
  leadCrewId: text("lead_crew_id"), // crew member assigned as project lead
  createdBy: text("created_by"), // user id who created this project
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date()
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(
    () => new Date()
  ),
});

// ─── Crew Members ────────────────────────────────────────────
export const crew = sqliteTable("crew", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text("name").notNull(),
  city: text("city"),
  phone: text("phone"),
  availability: text("availability"), // free text e.g. "Mon-Fri", "Weekends only"
  tasks: text("tasks"), // free text e.g. "Mowing, trimming, heavy lifting"
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date()
  ),
});

// ─── Project Activities (instances of tasks in a project) ───
export const projectActivities = sqliteTable("project_activities", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  projectId: text("project_id").notNull(),
  parentActivityId: text("parent_activity_id"),
  templateId: text("template_id"), // null = free-text one-off
  crewId: text("crew_id"), // assigned crew member (null = unassigned)
  name: text("name").notNull(),
  description: text("description"),
  cost: real("cost"),
  hours: real("hours"),
  manpower: integer("manpower"),
  quantity: real("quantity").default(1),
  unit: text("unit"),
  isComplete: integer("is_complete", { mode: "boolean" }).default(false),
  completedBy: text("completed_by"), // user id who marked this complete
  completedAt: integer("completed_at", { mode: "timestamp" }), // when it was marked complete
  sortOrder: integer("sort_order").default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date()
  ),
});

// ─── Activity Photos ────────────────────────────────────────
export const activityPhotos = sqliteTable("activity_photos", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  activityId: text("activity_id").notNull(),
  fileName: text("file_name").notNull(),
  note: text("note"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// ─── Users ──────────────────────────────────────────────────
export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: text("name").notNull(),
  email: text("email"),
  pin: text("pin"), // bcrypt-hashed PIN
  role: text("role").default("worker"), // owner, coordinator, worker
  crewId: text("crew_id"), // optional link to crew member
  isBlocked: integer("is_blocked", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// ─── Change Log (audit trail) ────────────────────────────────
export const changeLog = sqliteTable("change_log", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  projectId: text("project_id"), // which project (null for non-project changes)
  activityId: text("activity_id"), // which activity (null for project-level)
  userId: text("user_id"), // who made the change
  userName: text("user_name"), // denormalized for display
  action: text("action").notNull(), // created, updated, completed, uncompleted, deleted, photo_added, status_changed, etc.
  entity: text("entity").notNull(), // project, activity, photo, contact, etc.
  entityName: text("entity_name"), // name of the thing changed (for display)
  details: text("details"), // JSON or free text with extra info (e.g., "status: draft → active")
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// ─── App Settings ────────────────────────────────────────────
export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});
