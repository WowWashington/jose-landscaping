import type { ProjectActivity, ProjectSummary } from "@/types";

export function calculateActivityTotal(activity: ProjectActivity): number {
  const cost = activity.cost ?? 0;
  const quantity = activity.quantity ?? 1;
  return cost * quantity;
}

export function calculateProjectSummary(
  activities: ProjectActivity[]
): ProjectSummary {
  let totalCost = 0;
  let totalHours = 0;
  let maxManpower = 0;
  let activityCount = 0;

  function walk(items: ProjectActivity[]) {
    for (const item of items) {
      // Only count leaf nodes (no children) or items without children array
      const hasChildren = item.children && item.children.length > 0;
      if (!hasChildren) {
        const qty = item.quantity ?? 1;
        totalCost += (item.cost ?? 0) * qty;
        totalHours += (item.hours ?? 0) * qty;
        maxManpower = Math.max(maxManpower, item.manpower ?? 0);
        activityCount++;
      }
      if (item.children) {
        walk(item.children);
      }
    }
  }

  walk(activities);

  return { totalCost, totalHours, maxManpower, activityCount };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatHours(hours: number): string {
  if (hours < 1) {
    const mins = Math.round(hours * 60);
    return `${mins}min`;
  }
  if (Number.isInteger(hours)) {
    return `${hours}h`;
  }
  return `${hours.toFixed(1)}h`;
}
