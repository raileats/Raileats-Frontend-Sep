// app/lib/restroSlug.ts
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

/** Extract the numeric/actual code from "...-1004" */
export function extractRestroCode(restroSlug: string) {
  const m = String(restroSlug || "").match(/(\d+)(?:\/)?$/);
  return m ? m[1] : "";
}
