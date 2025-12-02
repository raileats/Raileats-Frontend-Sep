// app/trains/[slug]/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

function todayYMD() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function extractTrainNumberFromSlug(slug?: string | null) {
  if (!slug) return "";
  const m = slug.match(/^(\d+)/);
  return m ? m[1] : slug.replace(/[^0-9]/g, "");
}

/** Small helper to create same slug format you use elsewhere (optional) */
export function makeTrainSlug(trainNoRaw: string, trainNameRaw?: string | null) {
  const clean = String(trainNoRaw || "").trim();
  if (!clean) return "";
  const digits = clean.replace(/\D+/g, "") || clean;
  let trainPart = "";
  if (trainNameRaw) {
    trainPart = String(trainNameRaw)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
  return trainPart ? `${digits}-${trainPart}-train-food-delivery-in-train` : `${digits}-train-food-delivery-in-train`;
}

export default function TrainPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const slug = (params && (params as any).slug) || "";
  const initialTrainNumber = extractTrainNumberFromSlug(slug);
  const initialDate = (searchParams && searchParams.get("date")) || todayYMD();
  const initialBoarding = (searchParams && searchParams.get("boarding")) || "";

  const [trainNumber, setTrainNumber] = useState(initialTrainNumber);
  const [trainName, setTrainName] = useState<string>("");
  const [date, setDate] = useState(initialDate);
  const [boarding, setBoarding] = useState(initialBoarding);

  const [rows, setRows] = useState<any[]>([]); // mapped rows returned by API (each row has restros)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // vendors grouped per station (from boarding onwards)
  const [visibleRestros, setVisibleRestros] = useState<
    { stationCode: string; stationName: string; restros: any[] }[]
  >([]);

  // limit number of stations to show from boarding onward
  const STATION_LIMIT = 6;

  async function fetchRoute(trainNo: string, d: string, boardingCode: string | null = null) {
    if (!trainNo) {
      setRows([]);
      setVisibleRestros([]);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const url = `/api/train-routes?train=${encodeURIComponent(String(trainNo))}&date=${encodeURIComponent(String(d))}${boardingCode ? `&boarding=${encodeURIComponent(boardingCode)}` : ""}`;
      const res = await fetch(url, { cache: "no-store" });
      const j = await res.json().catch(() => null);

      if (!res.ok || !j || !j.ok) {
        setRows([]);
        setVisibleRestros([]);
        setError(j?.error || `Train not found or server error`);
      } else {
        // j.rows should be the "mapped rows" your route.ts returns (includes restros)
        const mappedRows = Array.isArray(j.rows) ? j.rows : [];
        setRows(mappedRows);

        // set train name if returned by API
        const tname = j?.train?.trainName ?? j?.trainName ?? "";
        setTrainName(String(tname || ""));

        // if boarding was not provided, default to first station
        const pickBoard = boardingCode || (mappedRows[0] && (mappedRows[0].StationCode || mappedRows[0].stationCode || "")) || "";
        setBoarding((prev) => prev || pickBoard);

        // compute visible restros from boarding
        computeRestrosFromBoarding(pickBoard, mappedRows);
      }
    } catch (e) {
      console.error("fetchRoute error", e);
      setError("Failed to fetch route. Try again.");
      setRows([]);
      setVisibleRestros([]);
    } finally {
      setLoading(false);
    }
  }

  function computeRestrosFromBoarding(boardingCode: string, mappedRowsParam?: any[]) {
    const mappedRows = mappedRowsParam ?? rows ?? [];
    if (!boardingCode) {
      setVisibleRestros([]);
      return;
    }
    const idx = mappedRows.findIndex((r) => (String(r.StationCode || r.stationCode || "") || "").toUpperCase() === boardingCode.toUpperCase());
    if (idx === -1) {
      // if boarding not found, start from first row
      setVisibleRestros([]);
      return;
    }

    const slice = mappedRows.slice(idx, idx + STATION_LIMIT);
    const grouped = slice.map((r) => {
      const sc = (r.StationCode || r.stationCode || "").toUpperCase();
      const restrosRaw = r.restros || r.RestroMaster || r.restro || [];
      const restros = Array.isArray(restrosRaw)
        ? restrosRaw.filter((x: any) => {
            // support multiple possible active flags
            if (x.isActive === false) return false;
            if (typeof x.IsActive !== "undefined" && x.IsActive === false) return false;
            return true;
          })
        : [];

      return {
        stationCode: sc,
        stationName: r.StationName || r.stationName || sc,
        restros,
      };
    });

    // keep only stations that have at least one restro
    const nonEmpty = grouped.filter((g) => Array.isArray(g.restros) && g.restros.length > 0);
    setVisibleRestros(nonEmpty);
  }

  // initial load: fetch route when component mounts or slug/train/date changes
  useEffect(() => {
    // If URL slug has digits, prefer that; else use trainNumber state
    const fromSlug = extractTrainNumberFromSlug(slug);
    const tr = fromSlug || trainNumber;
    fetchRoute(tr, date, boarding || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // refetch whenever date or boarding changes (user action)
  useEffect(() => {
    if (!trainNumber) return;
    // delay a bit or call immediately
    fetchRoute(trainNumber, date, boarding || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, boarding]);

  // When rows change and boarding changes, recompute
  useEffect(() => {
    computeRestrosFromBoarding(boarding, rows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, boarding]);

  // choose vendor handler: store session and navigate
  function chooseVendor(restro: any) {
    try {
      const payload = {
        train: trainNumber,
        trainName,
        date,
        boarding,
        restro: restro?.RestroCode ?? restro?.restroCode ?? restro?.restro_id ?? restro?.RestroId ?? restro?.RestroCode,
      };
      sessionStorage.setItem("raileats_train_search", JSON.stringify(payload));
    } catch (e) {
      console.warn("session storage failed", e);
    }

    // navigate to trains page with restro filter (you can change destination)
    const slugForNav = makeTrainSlug(trainNumber, trainName || undefined);
    const q = new URLSearchParams({ date, boarding: boarding || "" , restro: String(restro?.RestroCode ?? restro?.restroCode ?? "") }).toString();
    router.push(`/trains/${encodeURIComponent(slugForNav)}?${q}`);
  }

  return (
    <main className="site-container page-safe-bottom py-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">{trainNumber ? `Train ${trainNumber}` : "Train" } {trainName ? `— ${trainName}` : ""}</h1>
          <p className="text-sm text-gray-600 mt-1">Choose boarding station & date, then pick a vendor from boarding onward.</p>
        </div>

        <div className="card-safe p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div>
              <label className="text-xs text-gray-600 block mb-1">Journey date</label>
              <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs text-gray-600 block mb-1">Boarding station</label>
              <select
                value={boarding}
                onChange={(e) => setBoarding(e.target.value)}
                className="w-full border rounded px-3 py-2"
              >
                <option value="" disabled>Select boarding station</option>
                {rows.map((r: any) => (
                  <option key={r.StationCode || r.stationCode || r.StnNumber} value={(r.StationCode || r.stationCode || "").toUpperCase()}>
                    {(r.StationName || r.stationName || (r.StationCode || r.stationCode || "") )} {(r.StationCode || r.stationCode) ? `(${(r.StationCode || r.stationCode).toUpperCase()})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="card-safe p-4 text-center">Loading route…</div>
        ) : error ? (
          <div className="card-safe p-4 text-red-600">{error}</div>
        ) : (
          <>
            <div className="card-safe p-4 mb-4">
              <h3 className="font-semibold mb-2">Route (up to next {STATION_LIMIT} stations from boarding)</h3>
              <div className="space-y-2 max-h-72 overflow-auto">
                {rows.slice(0, 200).map((r: any, idx: number) => (
                  <div key={r.StationCode ?? `${idx}`} className="flex items-center justify-between gap-3 p-2 border rounded">
                    <div>
                      <div className="font-medium">{r.StationName || r.stationName || r.StationCode}</div>
                      <div className="text-xs text-gray-500">{(r.Arrives || r.Arrival || r.arrivalTime || "").slice(0,5)} • Day: {r.Day ?? "-"}</div>
                    </div>
                    <div className="text-xs text-gray-500">{r.restroCount ? `${r.restroCount} vendors` : (r.restros && r.restros.length) ? `${r.restros.length} vendors` : "0 vendors"}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card-safe p-4">
              <h3 className="font-semibold mb-3">Available vendors (boarding → next {STATION_LIMIT} stations)</h3>

              {visibleRestros.length === 0 ? (
                <div className="text-sm text-gray-600">No active vendors found on selected boarding / next stations.</div>
              ) : (
                <div className="space-y-4">
                  {visibleRestros.map((grp) => (
                    <div key={grp.stationCode} className="p-3 border rounded bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="font-medium">{grp.stationName} ({grp.stationCode})</div>
                          <div className="text-xs text-gray-500">Vendors at this station</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        {grp.restros.map((r: any) => {
                          const restroCode = r.RestroCode ?? r.restroCode ?? r.RestroCode ?? r.restroCode ?? r.restro_id ?? r.RestroId;
                          const restroName = r.RestroName ?? r.restroName ?? r.restroName ?? r.name ?? "Vendor";
                          const minOrder = r.MinimumOrdermValue ?? r.minOrder ?? r.MinimumOrderValue ?? "N/A";
                          const openTime = r["0penTime"] ?? r.openTime ?? r.OpenTime ?? "—";
                          const closeTime = r.ClosedTime ?? r.closeTime ?? r.CloseTime ?? "—";

                          return (
                            <div key={restroCode ?? restroName} className="flex items-center justify-between gap-3 p-2 bg-white rounded shadow-sm">
                              <div>
                                <div className="font-medium">{restroName}</div>
                                <div className="text-xs text-gray-500">Min order: {minOrder} • {openTime} - {closeTime}</div>
                              </div>
                              <div>
                                <button
                                  className="px-3 py-1 bg-green-600 text-white rounded"
                                  onClick={() => chooseVendor(r)}
                                >
                                  Choose
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
