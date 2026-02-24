import type { Project, ProjectActivity, ProjectSummary } from "@/types";
import { calculateProjectSummary } from "./calculations";
import { UNIT_LABELS } from "@/types";

export type EstimateLineItem = {
  name: string;
  quantity: number | null;
  unit: string | null;
  unitCost: number | null;
  lineTotal: number;
  depth: number;
  isGroup: boolean;
};

export type EstimateData = {
  projectName: string;
  quoteNumber: string | null;
  projectAddress: string | null;
  projectDescription: string | null;
  projectNotes: string | null;
  startDate: string | null;
  estimatedCompletion: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  contactAddress: string | null;
  date: string;
  lineItems: EstimateLineItem[];
  summary: ProjectSummary;
};

export function formatEstimateData(project: Project): EstimateData {
  const activities = project.activities ?? [];
  const lineItems: EstimateLineItem[] = [];

  function walk(items: ProjectActivity[], depth: number) {
    for (const item of items) {
      const hasChildren = item.children && item.children.length > 0;
      const qty = item.quantity ?? 1;
      const cost = item.cost ?? 0;

      if (hasChildren) {
        // Calculate group total from children
        let groupTotal = 0;
        function sumChildren(children: ProjectActivity[]) {
          for (const c of children) {
            if (c.children && c.children.length > 0) {
              sumChildren(c.children);
            } else {
              groupTotal += (c.cost ?? 0) * (c.quantity ?? 1);
            }
          }
        }
        sumChildren(item.children!);

        lineItems.push({
          name: item.name,
          quantity: null,
          unit: null,
          unitCost: null,
          lineTotal: groupTotal,
          depth,
          isGroup: true,
        });
        walk(item.children!, depth + 1);
      } else {
        lineItems.push({
          name: item.name,
          quantity: qty,
          unit: item.unit ? UNIT_LABELS[item.unit] ?? item.unit : null,
          unitCost: cost,
          lineTotal: cost * qty,
          depth,
          isGroup: false,
        });
      }
    }
  }

  walk(activities, 0);

  const contactAddr = project.contact
    ? [
        project.contact.address,
        project.contact.city,
        project.contact.state,
        project.contact.zip,
      ]
        .filter(Boolean)
        .join(", ")
    : null;

  const fmtDate = (d: string | null) =>
    d
      ? new Date(d + "T00:00:00").toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : null;

  return {
    projectName: project.name,
    quoteNumber: project.quoteNumber ?? null,
    projectAddress: project.address,
    projectDescription: project.description,
    projectNotes: project.notes,
    startDate: fmtDate(project.startDate),
    estimatedCompletion: fmtDate(project.dueDate),
    contactName: project.contact?.name ?? null,
    contactPhone: project.contact?.phone ?? null,
    contactEmail: project.contact?.email ?? null,
    contactAddress: contactAddr || null,
    date: new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    lineItems,
    summary: calculateProjectSummary(activities),
  };
}
