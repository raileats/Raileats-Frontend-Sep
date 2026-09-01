import type { MetadataRoute } from "next";
import { serviceClient } from "./lib/supabaseServer";

export const revalidate = 3600;

const baseUrl = "https://www.raileats.in";
const pageSize = 1000;

type RestroRow = { RestroCode?: string | number | null; RestroName?: string | null; StationCode?: string | null; StationName?: string | null; RaileatsStatus?: unknown; updated_at?: string | null; created_at?: string | null };
type FssaiRow = { RestroCode?: string | number | null; expiry_date?: string | null; status?: unknown; created_at?: string | null; updated_at?: string | null };
type TrainRouteRow = { trainNumber?: string | number | null; StationCode?: string | null; updated_at?: string | null; created_at?: string | null };
type StationMasterRow = { StationCode?: string | null; StationName?: string | null; updated_at?: string | null; created_at?: string | null };

function slugify(value: unknown) { return String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); }
function normalizeRestroCode(value: unknown) { const raw = String(value ?? "").trim(); if (!raw) return ""; const n = Number(raw); return Number.isFinite(n) ? String(n) : raw.toUpperCase(); }
function normalizeStationCode(value: unknown) { return String(value ?? "").trim().toUpperCase(); }
function normalizeTrainNumber(value: unknown) { const raw = String(value ?? "").trim(); return /^\d{5}$/.test(raw) ? raw : ""; }
function isActive(value: unknown) { const n = String(value ?? "").trim().toLowerCase(); return value === true || value === 1 || n === "1" || n === "on" || n === "active" || n === "true" || n === "yes"; }
function isActiveFssaiStatus(value: unknown) { if (value === undefined || value === null || value === "") return true; return ["active", "1", "true", "yes", "on", "valid", "approved"].includes(String(value).trim().toLowerCase()); }
function validDateKey(year: number, month: number, day: number) { const date = new Date(Date.UTC(year, month - 1, day)); return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? year * 10000 + month * 100 + day : null; }
function parseDateKey(value: unknown) { const raw = String(value ?? "").trim(); if (!raw) return null; const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if (iso) return validDateKey(Number(iso[1]), Number(iso[2]), Number(iso[3])); const ind = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/); if (ind) return validDateKey(Number(ind[3]), Number(ind[2]), Number(ind[1])); const d = new Date(raw); return Number.isNaN(d.getTime()) ? null : validDateKey(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()); }
function getIndiaTodayKey() { const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date()).map(x => [x.type, x.value])); return Number(p.year) * 10000 + Number(p.month) * 100 + Number(p.day); }
function getTime(value: unknown) { const t = new Date(String(value ?? "")).getTime(); return Number.isNaN(t) ? 0 : t; }
function latestTime(...values: unknown[]) { return Math.max(...values.map(getTime)); }

async function fetchAllRestros() { const rows: RestroRow[] = []; for (let from = 0;; from += pageSize) { const { data, error } = await serviceClient.from("RestroMaster").select("RestroCode, RestroName, StationCode, StationName, RaileatsStatus, updated_at, created_at").order("RestroCode", { ascending: true }).range(from, from + pageSize - 1); if (error) throw new Error(`RestroMaster fetch failed: ${error.message}`); const page = (data || []) as RestroRow[]; rows.push(...page); if (page.length < pageSize) break; } return rows; }
async function fetchAllFssaiRows() { const rows: FssaiRow[] = []; for (let from = 0;; from += pageSize) { const { data, error } = await serviceClient.from("RestroFSSAI").select("RestroCode, expiry_date, status, created_at, updated_at").order("RestroCode", { ascending: true }).range(from, from + pageSize - 1); if (error) throw new Error(`RestroFSSAI fetch failed: ${error.message}`); const page = (data || []) as FssaiRow[]; rows.push(...page); if (page.length < pageSize) break; } return rows; }
async function fetchAllStations() { const rows: StationMasterRow[] = []; for (let from = 0;; from += pageSize) { const { data, error } = await serviceClient.from("Stations").select("StationCode, StationName, updated_at, created_at").order("StationCode", { ascending: true }).range(from, from + pageSize - 1); if (error) throw new Error(`Stations fetch failed: ${error.message}`); const page = (data || []) as StationMasterRow[]; rows.push(...page); if (page.length < pageSize) break; } return rows; }
async function fetchAllTrainRouteRows() { const rows: TrainRouteRow[] = []; for (let from = 0;; from += pageSize) { const { data, error } = await serviceClient.from("TrainRoute").select("trainNumber, StationCode, updated_at, created_at").order("trainNumber", { ascending: true }).order("StationCode", { ascending: true }).range(from, from + pageSize - 1); if (error) throw new Error(`TrainRoute fetch failed: ${error.message}`); const page = (data || []) as TrainRouteRow[]; rows.push(...page); if (page.length < pageSize) break; } return rows; }
function getLatestFssaiRows(rows: FssaiRow[]) { const map = new Map<string, FssaiRow>(); for (const row of rows) { const code = normalizeRestroCode(row.RestroCode); if (!code) continue; const current = map.get(code); if (!current || latestTime(row.updated_at, row.created_at) >= latestTime(current.updated_at, current.created_at)) map.set(code, row); } return map; }
function hasValidFssai(map: Map<string, FssaiRow>, code: unknown, todayKey: number) { const row = map.get(normalizeRestroCode(code)); if (!row) return false; const expiry = parseDateKey(row.expiry_date); return isActiveFssaiStatus(row.status) && expiry !== null && expiry >= todayKey; }

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const seoContentLastModified = new Date("2026-08-18T00:00:00+05:30");
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/order-food-in-train`, lastModified: seoContentLastModified, changeFrequency: "weekly", priority: .98 },
    { url: `${baseUrl}/book-food-in-train`, lastModified: seoContentLastModified, changeFrequency: "weekly", priority: .98 },
    { url: `${baseUrl}/food-delivery-in-train`, lastModified: seoContentLastModified, changeFrequency: "weekly", priority: .98 },
    { url: `${baseUrl}/train-food-delivery`, lastModified: seoContentLastModified, changeFrequency: "monthly", priority: .96 },
    { url: `${baseUrl}/best-food-delivery-in-train`, lastModified: seoContentLastModified, changeFrequency: "monthly", priority: .96 },
    { url: `${baseUrl}/food-delivery-in-train-from-restaurants`, lastModified: seoContentLastModified, changeFrequency: "weekly", priority: .95 },
    { url: `${baseUrl}/pnr-status`, lastModified: now, changeFrequency: "daily", priority: .95 },
    { url: `${baseUrl}/live-train-status`, lastModified: now, changeFrequency: "daily", priority: .95 },
    { url: `${baseUrl}/popular-restaurants-train-journey`, lastModified: now, changeFrequency: "daily", priority: .9 },
    { url: `${baseUrl}/stations`, lastModified: now, changeFrequency: "daily", priority: .92 },
    { url: `${baseUrl}/offers`, lastModified: now, changeFrequency: "daily", priority: .9 },
    { url: `${baseUrl}/vendor`, lastModified: now, changeFrequency: "weekly", priority: .8 },
    { url: `${baseUrl}/about`, lastModified: now, changeFrequency: "monthly", priority: .7 },
    { url: `${baseUrl}/contact`, lastModified: now, changeFrequency: "monthly", priority: .7 },
    { url: `${baseUrl}/faq`, lastModified: now, changeFrequency: "monthly", priority: .7 },
    { url: `${baseUrl}/cancellation-refund`, lastModified: now, changeFrequency: "monthly", priority: .6 },
    { url: `${baseUrl}/terms`, lastModified: now, changeFrequency: "yearly", priority: .4 },
    { url: `${baseUrl}/privacy-policy`, lastModified: now, changeFrequency: "yearly", priority: .4 },
  ];
  const routeMap = new Map<string, MetadataRoute.Sitemap[number]>(staticRoutes.map(r => [r.url, r]));
  try {
    const [restros, stationRows, fssaiRows, trainRouteRows] = await Promise.all([fetchAllRestros(), fetchAllStations(), fetchAllFssaiRows(), fetchAllTrainRouteRows()]);
    const todayKey = getIndiaTodayKey();
    const latestFssaiRows = getLatestFssaiRows(fssaiRows);
    const stationNames = new Map<string, string>();
    const stationTimes = new Map<string, number>();
    for (const station of stationRows) { const code = normalizeStationCode(station.StationCode); const name = String(station.StationName ?? "").trim(); if (code && name && !stationNames.has(code)) stationNames.set(code, name); if (code) stationTimes.set(code, latestTime(station.updated_at, station.created_at)); }
    const eligibleStationCodes = new Set<string>();
    for (const restro of restros) {
      const restroCode = normalizeRestroCode(restro.RestroCode); const stationCodeRaw = normalizeStationCode(restro.StationCode);
      if (!isActive(restro.RaileatsStatus) || !restroCode || !hasValidFssai(latestFssaiRows, restroCode, todayKey)) continue;
      const stationNameRaw = String(restro.StationName || stationNames.get(stationCodeRaw) || stationCodeRaw).trim();
      const stationName = slugify(stationNameRaw), stationCode = slugify(restro.StationCode), restroName = slugify(restro.RestroName);
      if (!stationName || !stationCode || !stationCodeRaw || !restroName) continue;
      eligibleStationCodes.add(stationCodeRaw);
      const stationUrl = `${baseUrl}/stations/${stationName}-${stationCode}-food-delivery-in-train`;
      const restroUrl = `${stationUrl}/${restroName}-${restroCode}`;
      const restroTime = latestTime(restro.updated_at, restro.created_at, latestFssaiRows.get(restroCode)?.updated_at, latestFssaiRows.get(restroCode)?.created_at);
      routeMap.set(stationUrl, { url: stationUrl, lastModified: new Date(Math.max(stationTimes.get(stationCodeRaw) || 0, restroTime || 0) || now.getTime()), changeFrequency: "daily", priority: .9 });
      routeMap.set(restroUrl, { url: restroUrl, lastModified: new Date(restroTime || stationTimes.get(stationCodeRaw) || now.getTime()), changeFrequency: "daily", priority: .8 });
    }
    const trainTimes = new Map<string, number>();
    for (const row of trainRouteRows) { const train = normalizeTrainNumber(row.trainNumber); const station = normalizeStationCode(row.StationCode); if (!train || !station || !eligibleStationCodes.has(station)) continue; trainTimes.set(train, Math.max(trainTimes.get(train) || 0, latestTime(row.updated_at, row.created_at))); }
    for (const [train, time] of trainTimes) { const trainUrl = `${baseUrl}/trains/${train}-train-food-delivery-in-train`; routeMap.set(trainUrl, { url: trainUrl, lastModified: new Date(time || now.getTime()), changeFrequency: "daily", priority: .85 }); }
  } catch (error) { console.error("Sitemap dynamic routes fetch failed:", error); }
  return Array.from(routeMap.values()).sort((a, b) => a.url.localeCompare(b.url));
}
