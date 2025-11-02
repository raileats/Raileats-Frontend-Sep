// app/lib/restroSlug.ts
export function makeRestroSlug(code: string | number, name: string) {
  const cleanName = (name || "")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
  return `${String(code)}-${cleanName || "restaurant"}-menu`;
}

export function extractRestroCode(restroSlug: string) {
  // e.g. "1004-mizaz-e-bhopal-menu" -> "1004"
  return (restroSlug || "").split("-")[0];
}
