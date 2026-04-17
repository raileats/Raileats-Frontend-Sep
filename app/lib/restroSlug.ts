export function slugifyName(name: string) {
  return String(name || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

/** e.g.
 * makeRestroSlug("Mizaz E Bhopal Restaurant", "1004")
 * -> "mizaz-e-bhopal-restaurant-1004"
 */
export function makeRestroSlug(
  restroName: string,
  restroCode: string | number
) {
  const base = slugifyName(restroName || "restaurant");
  return `${base}-${restroCode}`;
}

/**
 * ✅ FINAL FIXED VERSION
 * Supports:
 * - "1004-mizaz-e-bhopal"
 * - "mizaz-e-bhopal-1004"
 * - "mizaz-1004-bhopal" (rare but safe)
 */
export function extractRestroCode(restroSlug: string) {
  const s = String(restroSlug || "");

  // 🔥 get ALL numbers
  const matches = s.match(/\d+/g);

  if (!matches || matches.length === 0) return "";

  // ✅ ALWAYS take LAST number (correct restro code)
  return matches[matches.length - 1];
}
