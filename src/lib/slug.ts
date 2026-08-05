/**
 * Kept out of validation.ts so Client Components can import it without
 * pulling every Zod schema into the browser bundle.
 *
 * "Bound Bloom T-Shirt — Black" -> "bound-bloom-t-shirt-black"
 */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip combining accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
