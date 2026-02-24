/**
 * One-time migration: hash existing plain-text PINs with bcrypt.
 *
 * Run with: npx tsx scripts/hash-existing-pins.ts
 *
 * Safe to re-run — skips PINs that are already hashed.
 */

import { db } from "../src/db";
import { users } from "../src/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

async function main() {
  const allUsers = db.select().from(users).all();
  let migrated = 0;
  let skipped = 0;

  for (const user of allUsers) {
    if (!user.pin) {
      console.log(`  ⏭ ${user.name} — no PIN set, skipping`);
      skipped++;
      continue;
    }

    if (user.pin.startsWith("$2")) {
      console.log(`  ✓ ${user.name} — already hashed, skipping`);
      skipped++;
      continue;
    }

    const hashed = await bcrypt.hash(user.pin, SALT_ROUNDS);
    db.update(users)
      .set({ pin: hashed })
      .where(eq(users.id, user.id))
      .run();

    console.log(`  🔒 ${user.name} — PIN hashed`);
    migrated++;
  }

  console.log(`\nDone: ${migrated} migrated, ${skipped} skipped.`);
}

main().catch(console.error);
