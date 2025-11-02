// app/lib/restroSlug.ts
function slugify(s: string) {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")    // remove accents
    .replace(/[^a-zA-Z0-9\s-]/g, "")    // keep letters, numbers, spaces, dashes
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

/** e.g. makeRestroSlug("Mizaz E Bhopal", "1004") -> "mizaz-e-bhopal-restaurant-1004" */
export function makeRestroSlug(name: string, code: string | number) {
  const base = slugify(name || "restaurant");
  return `${base}-restaurant-${String(code)}`;
}

/** e.g. "mizaz-e-bhopal-restaurant-1004" -> "1004" (string) */
export function extractRestroCode(restroSlug: string): string | null {
  const m = /-restaurant-(\d+)$/.exec(restroSlug);
  return m ? m[1] : null;
}
