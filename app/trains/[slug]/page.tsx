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

/** LOCAL helper (NOT exported) to create slug */
function makeTrainSlugLocal(trainNoRaw: string, trainNameRaw?: string | null) {
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

  const [rows, setRows] = useState<any[]>([]); // full route rows from train-routes (fallback)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // visibleRestros holds the vendor groups we show in UI (stationCode/stationName/restros[])
  const [visibleRestros, setVisibleRestros] = useState<
    { stationCode: string; stationName: string; restros: any[] }[]
  >([]);

  const STATION_LIMIT = 6;

  // compute restros from full route rows (existing logic)
  function computeRestrosFromBoarding(boardingCode: string, mappedRowsParam?: any[]) {
    const mappedRows = mappedRowsParam ?? rows ?? [];
    if (!boardingCode) {
      setVisibleRestros([]);
      return;
    }
    const idx = mappedRows.findIndex((r) => (String(r.StationCode || r.stationCode || "") || "").toUpperCase() === boardingCode.toUpperCase());
    if (idx === -1) {
      setVisibleRestros([]);
      return;
    }

    const slice = mappedRows.slice(idx, idx + STATION_LIMIT);
    const grouped = slice.map((r) => {
      const sc = (r.StationCode || r.stationCode || "").toUpperCase();
      const restrosRaw = r.restros || r.RestroMaster || r.restro || [];
      const restros = Array.isArray(restrosRaw)
        ? restrosRaw.filter((x: any) => {
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

    const nonEmpty = grouped.filter((g) => Array.isArray(g.restros) && g.restros.length > 0);
    setVisibleRestros(nonEmpty);
  }

  // fetch both endpoints. train-restros for active vendor stations; train-routes for full route rows (fallback)
  async function loadData(trainNo: string, d: string, boardingCode: string | null = null) {
    if (!trainNo) {
      setRows([]);
      setVisibleRestros([]);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const restrosUrl = `/api/train-restros?train=${encodeURIComponent(String(trainNo))}&date=${encodeURIComponent(String(d))}${boardingCode ? `&boarding=${encodeURIComponent(boardingCode)}` : ""}`;
      const routeUrl = `/api/train-routes?train=${encodeURIComponent(String(trainNo))}&date=${encodeURIComponent(String(d))}${boardingCode ? `&boarding=${encodeURIComponent(boardingCode)}` : ""}`;

      // run in parallel
      const [restrosResSettled, routeResSettled] = await Promise.allSettled([
        fetch(restrosUrl, { cache: "no-store" }),
        fetch(routeUrl, { cache: "no-store" }),
      ]);

      let restrosJson: any = null;
      let routesJson: any = null;

      // parse train-routes
      if (routeResSettled.status === "fulfilled") {
        try {
          routesJson = await routeResSettled.value.json().catch(() => null);
        } catch (e) {
          routesJson = null;
        }
      }

      // parse train-restros
      if (restrosResSettled.status === "fulfilled") {
        try {
          restrosJson = await restrosResSettled.value.json().catch(() => null);
        } catch (e) {
          restrosJson = null;
        }
      }

      // process train-routes (rows) for boarding select and fallback compute
      if (routesJson && (routesJson.rows || routesJson.stations || Array.isArray(routesJson))) {
        const mappedRows = Array.isArray(routesJson.rows)
          ? routesJson.rows
          : Array.isArray(routesJson.stations)
          ? routesJson.stations
          : Array.isArray(routesJson)
          ? routesJson
          : [];

        setRows(mappedRows);
        const tname = routesJson?.train?.trainName ?? routesJson?.trainName ?? "";
        setTrainName(String(tname || ""));
        const pickBoard = boardingCode || (mappedRows[0] && (mappedRows[0].StationCode || mappedRows[0].stationCode || "")) || "";
        setBoarding((prev) => prev || pickBoard);
      } else {
        setRows([]);
      }

      // process train-restros (primary)
      if (restrosJson && Array.isArray(restrosJson.stations) && restrosJson.stations.length) {
        const stations = restrosJson.stations;
        const mappedVisible = stations.map((s: any) => ({
          stationCode: (s.StationCode || s.station_code || s.stationCode || "").toUpperCase(),
          stationName: s.StationName || s.station_name || s.stationName || (s.StationCode || s.station_code || s.stationCode || ""),
          restros: Array.isArray(s.restros) ? s.restros : (s.vendors || []),
        }));
        setVisibleRestros(mappedVisible);
        // set train name if available
        if (!trainName && restrosJson?.train) {
          const tname = restrosJson.train.trainName ?? restrosJson.train.train_name ?? "";
          if (tname) setTrainName(String(tname));
        }
        if (!boarding && mappedVisible.length > 0) {
          setBoarding((prev) => prev || mappedVisible[0].stationCode);
        }
        setLoading(false);
        return; // primary shown — exit early
      }

      // fallback: compute using full route rows
      if (rows && rows.length) {
        const pickBoard = boardingCode || boarding || ((rows[0] && (rows[0].StationCode || rows[0].stationCode)) || "");
        setBoarding((prev) => prev || pickBoard);
        computeRestrosFromBoarding(pickBoard, rows);
      } else {
        setVisibleRestros([]);
      }
    } catch (e) {
      console.error("loadData error", e);
      setError("Failed to load train data. Try again.");
      setRows([]);
      setVisibleRestros([]);
    } finally {
      setLoading(false);
    }
  }

  // on initial slug change or first mount
  useEffect(() => {
    const fromSlug = extractTrainNumberFromSlug(slug);
    const tr = fromSlug || trainNumber;
    loadData(tr, date, boarding || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // when date or boarding changes, refetch
  useEffect(() => {
    if (!trainNumber) return;
    loadData(trainNumber, date, boarding || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, boarding]);

  // keep computeRestrosFromBoarding in sync if rows change (fallback scenario)
  useEffect(() => {
    computeRestrosFromBoarding(boarding, rows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, boarding]);

  function chooseVendor(restro: any) {
    try {
      const payload = {
        train: trainNumber,
        trainName,
        date,
        boarding,
        restro: restro?.RestroCode ?? restro?.restroCode ?? restro?.restro_id ?? restro?.RestroId ?? restro?.id ?? restro?.code,
      };
      sessionStorage.setItem("raileats_train_search", JSON.stringify(payload));
    } catch (e) {
      console.warn("session storage failed", e);
    }

    const slugForNav = makeTrainSlugLocal(trainNumber, trainName || undefined);
    const q = new URLSearchParams({ date, boarding: boarding || "" , restro: String(restro?.RestroCode ?? restro?.restroCode ?? restro?.id ?? "") }).toString();
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
            {/* NEW: show only stations that have active restros */}
            <div className="card-safe p-4">
              <h3 className="font-semibold mb-3">Available Restaurants on Your Route</h3>

              {visibleRestros.length === 0 ? (
                <div className="text-sm text-gray-600">No active restaurants found for your journey.</div>
              ) : (
                <div className="space-y-4">
                  {visibleRestros.map((grp) => (
                    <div key={grp.stationCode} className="p-3 border rounded bg-gray-50">
                      
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="font-semibold text-lg">
                            {grp.stationName} ({grp.stationCode})
                          </div>
                          <div className="text-xs text-gray-500">Active Restaurants at this station</div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {grp.restros.map((r) => {
                          const restroCode = r.RestroCode ?? r.restroCode ?? r.id ?? r.code ?? "";
                          const restroName = r.RestroName ?? r.restroName ?? r.name ?? "Vendor";
                          const minOrder = r.MinimumOrdermValue ?? r.minOrder ?? "N/A";
                          const openTime = r["0penTime"] ?? r.openTime ?? "—";
                          const closeTime = r.ClosedTime ?? r.closeTime ?? "—";

                          return (
                            <div key={restroCode || restroName} className="flex items-center justify-between bg-white p-3 rounded shadow-sm">
                              <div>
                                <div className="font-medium text-base">{restroName}</div>
                                <div className="text-xs text-gray-500">
                                  Min Order: {minOrder} • {openTime}–{closeTime}
                                </div>
                              </div>

                              <button
                                className="px-4 py-1.5 text-sm bg-green-600 text-white rounded"
                                onClick={() => chooseVendor(r)}
                              >
                                Book Now
                              </button>
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
