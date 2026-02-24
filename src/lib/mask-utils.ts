/**
 * Partially mask a phone number.
 * Input: "(555) 123-4567" → Output: "(555) ***-**67"
 * Input: "5551234567"     → Output: "555***4567" (last 2 visible)
 * Preserves formatting characters, masks middle digits.
 */
export function maskPhone(phone: string): string {
  // Extract just the digits
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "•••";

  // Keep first 3 (area code) and last 2 visible
  const visible = new Set<number>();
  // First 3 digit positions
  let digitIndex = 0;
  for (let i = 0; i < phone.length && digitIndex < 3; i++) {
    if (/\d/.test(phone[i])) {
      visible.add(i);
      digitIndex++;
    }
  }
  // Last 2 digit positions
  digitIndex = 0;
  for (let i = phone.length - 1; i >= 0 && digitIndex < 2; i--) {
    if (/\d/.test(phone[i])) {
      visible.add(i);
      digitIndex++;
    }
  }

  // Build masked string
  return phone
    .split("")
    .map((ch, i) => {
      if (/\d/.test(ch) && !visible.has(i)) return "*";
      return ch;
    })
    .join("");
}

/**
 * Partially mask an email address.
 * Input: "john@gmail.com" → Output: "j***@gmail.com"
 * Input: "ab@x.co"        → Output: "a***@x.co"
 */
export function maskEmail(email: string): string {
  const atIndex = email.indexOf("@");
  if (atIndex <= 0) return "***@***";
  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex); // includes @
  return local[0] + "***" + domain;
}
