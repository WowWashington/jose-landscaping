import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { appSettings } from "./schema";
import path from "path";
import { mkdirSync } from "fs";

const defaults = [
  { key: "maskContactsForWorkers", value: "true" },
  { key: "businessName", value: "Landscaping and Services" },
  { key: "businessSubtitle", value: "Landscaping & Outdoor Services" },
  { key: "businessPhone", value: "" },
  { key: "businessAddress", value: "" },
  { key: "enableYardCare", value: "true" },
  { key: "enableContracting", value: "true" },
  { key: "showBillingRates", value: "false" },
];

const dbPath = process.env.DB_PATH || path.join(process.cwd(), "data", "jose.db");
mkdirSync(path.dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
const db = drizzle(sqlite);

for (const setting of defaults) {
  db.insert(appSettings)
    .values(setting)
    .onConflictDoNothing()
    .run();
}

console.log("Settings seeded.");
sqlite.close();
