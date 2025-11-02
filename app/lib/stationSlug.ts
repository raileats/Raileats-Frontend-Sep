export function makeStationSlug(code: string, name: string) {
  const cleanName = name
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .trim()
    .replace(/\s+/g, "-");

  return `${code.toLowerCase()}-${cleanName.toLowerCase()}-food-delivery-in-train`;
}

export function extractStationCode(stationSlug: string) {
  return stationSlug.split("-")[0].toUpperCase();
}
