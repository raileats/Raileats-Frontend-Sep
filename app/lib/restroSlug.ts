export function slugifyName(name: string) {
  return String(name || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

/** e.g. makeRestroSlug("Mizaz E Bhopal Restaurant", "1004")
 * -> "mizaz-e-bhopal-restaurant-1004"
 */
export function makeRestroSlug(restroName: string, restroCode: string | number) {
  const base = slugifyName(restroName || "restaurant");
  return `${base}-${restroCode}`;
}

/** Extract numeric outlet code from slug.
 * Supports BOTH styles:
 *  - "1004-mizaz-e-bhopal"   (code-first)
 *  - "mizaz-e-bhopal-1004"   (code-last)
 */
export function extractRestroCode(restroSlug: string) {
  const s = String(restroSlug || "");
  const m = s.match(/^(\d{2,})\b/) || s.match(/(\d{2,})$/);
  return m ? m[1] : "";
}
