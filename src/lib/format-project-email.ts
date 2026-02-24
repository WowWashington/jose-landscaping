/**
 * Generates a plain-text email summarizing a project's status.
 * Designed for mailto: links — works with any mail client, zero dependencies.
 * Useful as an offline reference for field workers.
 */

import type { Project, ProjectActivity } from "@/types";
import { STATUS_LABELS, DIVISION_LABELS, UNIT_LABELS } from "@/types";

export function formatProjectEmailText(project: Project): string {
  const activities = project.activities ?? [];
  const summary = computeSummary(activities);
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const lines: string[] = [];

  // Header
  lines.push(`PROJECT: ${project.name}`);
  if (project.quoteNumber) {
    lines.push(`Quote #: ${project.quoteNumber}`);
  }
  if (project.division) {
    lines.push(`Division: ${DIVISION_LABELS[project.division] ?? project.division}`);
  }
  lines.push(`Status: ${STATUS_LABELS[project.status ?? "draft"] ?? project.status ?? "Draft"}`);
  lines.push(`Status as of ${dateStr}`);
  lines.push("");

  // Customer info
  lines.push("── CUSTOMER ──");
  if (project.contact?.name) lines.push(`Name: ${project.contact.name}`);
  if (project.contact?.phone) lines.push(`Phone: ${project.contact.phone}`);
  if (project.contact?.email) lines.push(`Email: ${project.contact.email}`);

  const address = buildAddressText(project);
  if (address) lines.push(`Address: ${address}`);

  if (project.startDate) lines.push(`Start: ${project.startDate}`);
  if (project.dueDate) lines.push(`Due: ${project.dueDate}`);
  if (project.confirmed != null) {
    lines.push(`Confirmed: ${project.confirmed ? "Yes ✓" : "Not yet"}`);
  }
  lines.push("");

  // Summary
  lines.push("── SUMMARY ──");
  lines.push(`Total Cost: $${summary.totalCost.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`);
  lines.push(`Total Hours: ${summary.totalHours}h`);
  lines.push(`Completion: ${summary.completed}/${summary.total} tasks done`);
  lines.push("");

  // Activities
  lines.push("── ACTIVITIES ──");
  if (activities.length === 0) {
    lines.push("  No activities yet.");
  } else {
    renderActivitiesText(activities, 0, lines);
  }

  // Status notes
  if (project.statusNotes) {
    lines.push("");
    lines.push("── STATUS NOTES ──");
    lines.push(project.statusNotes);
  }

  // Project notes
  if (project.notes) {
    lines.push("");
    lines.push("── NOTES ──");
    lines.push(project.notes);
  }

  lines.push("");
  lines.push("---");
  lines.push("Jose's Yard Care Project Estimator");

  return lines.join("\n");
}

export function formatProjectEmailSubject(project: Project): string {
  const status = STATUS_LABELS[project.status ?? "draft"] ?? "Draft";
  const qn = project.quoteNumber ? ` (${project.quoteNumber})` : "";
  return `Project Status: ${project.name}${qn} [${status}]`;
}

function renderActivitiesText(activities: ProjectActivity[], depth: number, lines: string[]): void {
  for (const act of activities) {
    const hasChildren = act.children && act.children.length > 0;
    const isLeaf = !hasChildren;
    const complete = act.isComplete ?? false;
    const indent = "  ".repeat(depth);
    const check = complete ? "✓" : "☐";

    let line = `${indent}${check} ${act.name}`;

    // Cost info for leaf nodes
    if (isLeaf && act.cost) {
      const qty = act.quantity ?? 1;
      const total = act.cost * qty;
      line += ` — $${total.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
      if (qty > 1) {
        const unitLabel = act.unit ? (UNIT_LABELS[act.unit] ?? act.unit) : "";
        line += ` (${qty} ${unitLabel})`;
      }
    }
    if (isLeaf && act.hours) {
      line += ` · ${act.hours}h`;
    }
    if (act.crewName) {
      line += ` [${act.crewName}]`;
    }
    lines.push(line);

    // Completion info
    if (complete && act.completedByName) {
      const completedDate = act.completedAt
        ? new Date(typeof act.completedAt === "string" ? act.completedAt : act.completedAt).toLocaleDateString("en-US", { day: "2-digit", month: "2-digit" })
        : "";
      lines.push(`${indent}  ↳ Completed by ${act.completedByName}${completedDate ? `, ${completedDate}` : ""}`);
    }

    if (hasChildren) {
      renderActivitiesText(act.children!, depth + 1, lines);
    }
  }
}

function computeSummary(activities: ProjectActivity[]) {
  let totalCost = 0;
  let totalHours = 0;
  let completed = 0;
  let total = 0;

  function walk(items: ProjectActivity[]) {
    for (const item of items) {
      const hasChildren = item.children && item.children.length > 0;
      if (!hasChildren) {
        const qty = item.quantity ?? 1;
        totalCost += (item.cost ?? 0) * qty;
        totalHours += (item.hours ?? 0) * qty;
        total++;
        if (item.isComplete) completed++;
      }
      if (item.children) walk(item.children);
    }
  }

  walk(activities);
  return { totalCost, totalHours, completed, total };
}

function buildAddressText(project: Project): string {
  const parts: string[] = [];
  if (project.address) parts.push(project.address);
  const contact = project.contact;
  if (contact) {
    const cityStateZip: string[] = [];
    if (contact.city) cityStateZip.push(contact.city);
    if (contact.state) cityStateZip.push(contact.state);
    if (cityStateZip.length > 0 || contact.zip) {
      let line = cityStateZip.join(", ");
      if (contact.zip) line += (line ? " " : "") + contact.zip;
      parts.push(line);
    }
  }
  return parts.join(", ");
}
