import { db } from "@/db";
import { appSettings } from "@/db/schema";

db.insert(appSettings)
  .values({ key: "maskContactsForWorkers", value: "true" })
  .onConflictDoNothing()
  .run();

console.log("Settings seeded.");
