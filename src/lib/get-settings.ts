import { db } from "@/db";
import { appSettings } from "@/db/schema";

const DEFAULTS = {
  businessName: "Landscaping and Services",
  businessSubtitle: "Landscaping & Outdoor Services",
};

/**
 * Server-side settings reader. Use this in server components (e.g., layout.tsx)
 * where the useSettings() client hook is not available.
 */
export function getSettings(): { businessName: string; businessSubtitle: string } {
  try {
    const rows = db.select().from(appSettings).all();
    const map: Record<string, string> = {};
    for (const row of rows) {
      map[row.key] = row.value;
    }
    return {
      businessName: map.businessName || DEFAULTS.businessName,
      businessSubtitle: map.businessSubtitle || DEFAULTS.businessSubtitle,
    };
  } catch {
    return DEFAULTS;
  }
}
