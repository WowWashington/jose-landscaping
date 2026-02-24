/**
 * Generate quote numbers in format: Q-YYMM-XXXX
 *
 * - Q prefix identifies it as a quote
 * - YYMM = year + month for rough chronological grouping
 * - XXXX = 4-char unambiguous alphanumeric suffix
 *
 * Alphabet excludes characters that cause confusion:
 *   Visual:  0/O (zero vs O), 1/I/L (one vs I vs L)
 *   Spanish: V removed (B and V are identical sounds — "be"/"ve")
 *
 * 29 chars ^ 4 = 707,281 unique combos per month — plenty for a solo operator.
 *
 * Examples: Q-2602-4A7K, Q-2603-H9NW, Q-2601-3R5D
 */

// 29 unambiguous characters: digits 2-9, letters A-Z minus I, L, O, V
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUWXYZ";

export function generateQuoteNumber(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");

  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }

  return `Q-${yy}${mm}-${suffix}`;
}
