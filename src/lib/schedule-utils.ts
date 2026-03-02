export type ScheduleDay = {
  date: string; // "YYYY-MM-DD"
  projectIds: string[];
};

type ScheduleProject = {
  id: string;
  startDate: string | null;
  dueDate: string | null;
  status: string | null;
  confirmed: boolean | null;
};

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDate(s: string): string {
  // Strip time portion if present (matches existing pattern)
  return s.split("T")[0];
}

/**
 * Build a rolling schedule of days with project IDs mapped to each.
 * Range: today - 7 days through today + 84 days (12 weeks).
 */
export function buildScheduleDays(
  projects: ScheduleProject[]
): ScheduleDay[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startOffset = -7;
  const endOffset = 84;

  // Build empty day map
  const dayMap = new Map<string, string[]>();
  for (let i = startOffset; i <= endOffset; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    dayMap.set(toDateStr(d), []);
  }

  for (const p of projects) {
    const start = p.startDate ? parseDate(p.startDate) : null;
    const due = p.dueDate ? parseDate(p.dueDate) : null;

    if (start && due) {
      // Mark every day in range
      const s = new Date(start + "T00:00:00");
      const e = new Date(due + "T00:00:00");
      const cur = new Date(s);
      while (cur <= e) {
        const key = toDateStr(cur);
        if (dayMap.has(key)) {
          dayMap.get(key)!.push(p.id);
        }
        cur.setDate(cur.getDate() + 1);
      }
    } else if (start) {
      if (dayMap.has(start)) {
        dayMap.get(start)!.push(p.id);
      }
    } else if (due) {
      if (dayMap.has(due)) {
        dayMap.get(due)!.push(p.id);
      }
    }
  }

  // Convert to sorted array
  const days: ScheduleDay[] = [];
  const sortedKeys = Array.from(dayMap.keys()).sort();
  for (const key of sortedKeys) {
    days.push({ date: key, projectIds: dayMap.get(key)! });
  }

  return days;
}
