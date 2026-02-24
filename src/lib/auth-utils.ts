import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

/**
 * Hash a plain-text PIN using bcrypt.
 * Returns the hash string to store in the database.
 */
export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, SALT_ROUNDS);
}

/**
 * Verify a plain-text PIN against a stored bcrypt hash.
 * Also handles legacy plain-text PINs for migration compatibility:
 * if the stored value isn't a bcrypt hash, falls back to direct comparison.
 */
export async function verifyPin(
  pin: string,
  storedHash: string
): Promise<boolean> {
  // Bcrypt hashes always start with "$2a$" or "$2b$"
  if (storedHash.startsWith("$2")) {
    return bcrypt.compare(pin, storedHash);
  }

  // Legacy plain-text PIN — direct comparison
  return pin === storedHash;
}

/**
 * Check if a stored PIN value is already hashed (bcrypt).
 * Used during migration to skip already-hashed PINs.
 */
export function isHashed(value: string): boolean {
  return value.startsWith("$2");
}

/**
 * Generate a random 6-digit numeric PIN for invites.
 */
export function generatePin(): string {
  const pin = Math.floor(100000 + Math.random() * 900000);
  return String(pin);
}
