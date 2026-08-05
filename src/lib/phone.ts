/**
 * Indonesian mobile numbers.
 *
 * Customers type 0812…, +62 812…, 62812… and "0812-3456-7890" interchangeably.
 * Midtrans and the WhatsApp gateway both want one canonical form, so normalise
 * once at the trust boundary and store only that.
 */

/** Canonical form: 628xxxxxxxxx (no plus, no spaces). Null when not valid. */
export function normalizeIndonesianPhone(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, "");

  let national: string;
  if (digits.startsWith("+62")) national = digits.slice(3);
  else if (digits.startsWith("62")) national = digits.slice(2);
  else if (digits.startsWith("0")) national = digits.slice(1);
  else national = digits;

  // Indonesian mobile numbers start with 8 and run 9–12 digits after the 0/62.
  if (!/^8\d{8,11}$/.test(national)) return null;

  return `62${national}`;
}

export function isIndonesianPhone(input: string): boolean {
  return normalizeIndonesianPhone(input) !== null;
}

/** 628123456789 -> "+62 812-3456-789", for display only. */
export function formatPhone(canonical: string): string {
  const national = canonical.startsWith("62") ? canonical.slice(2) : canonical;
  const parts = [national.slice(0, 3), national.slice(3, 7), national.slice(7)];
  return `+62 ${parts.filter(Boolean).join("-")}`;
}
