import { serviceClient } from "../supabaseServer";

export type StationTrainLink = {
  trainNumber: string;
  trainName: string;
  slug: string;
  stationCode: string;
};

function normalize(value: unknown) {
  return String(value ?? "").trim().toUpperCase();
}

function normalizeTrainNumber(value: unknown) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits ? digits.padStart(5, "0") : "";
}

function slugify(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Returns real trains from TrainRoute for a station.
 * This is intentionally read-only and does not touch booking data.
 */
export async function getStationRelatedTrains(
  stationCode: string,
  limit = 24
): Promise<StationTrainLink[]> {
  const code = normalize(stationCode);
  if (!code) return [];

  const { data, error } = await serviceClient
    .from("TrainRoute")
    .select("trainNumber, trainName, StationCode, StnNumber")
    .eq("StationCode", code)
    .order("StnNumber", { ascending: true });

  if (error || !Array.isArray(data)) return [];

  const seen = new Set<string>();
  const result: StationTrainLink[] = [];

  for (const row of data) {
    const trainNumber = normalizeTrainNumber(row?.trainNumber);
    const trainName = String(row?.trainName ?? "").trim();

    if (!trainNumber || !trainName) continue;
    if (trainName.toLowerCase() === "train" || trainName.toLowerCase() === "undefined") continue;
    if (seen.has(trainNumber)) continue;

    seen.add(trainNumber);
    result.push({
      trainNumber,
      trainName,
      slug: `${trainNumber}-train-food-delivery-in-train`,
      stationCode: code,
    });

    if (result.length >= limit) break;
  }

  return result;
}
