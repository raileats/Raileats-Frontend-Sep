// app/components/SearchBox.tsx
"use client";

import { useEffect, useState } from "react";
import StationSearchBox, { Station } from "./StationSearchBox";
import { makeStationSlug } from "../lib/stationSlug";

type TrainStation = {
  stationCode: string;
  stationName: string;
  state?: string | null;
  arrivalTime?: string | null;
};

function makeTrainSlug(trainNoRaw: string) {
  const clean = String(trainNoRaw || "").trim();
  if (!clean) return "";
  const digitsOnly = clean.replace(/\D+/g, "") || clean;
  return `${digitsOnly}-train-food-delivery-in-train`;
}

export default function SearchBox() {
  const [searchType, setSearchType] = useState<"pnr" | "train" | "station">(
    "pnr",
  );
  const [inputValue, setInputValue] = useState("");
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [loading, setLoading] = useState(false);

  // train modal state
  const [showTrainModal, setShowTrainModal] = useState(false);
  const [modalTrainNo, setModalTrainNo] = useState("");
  const [modalStations, setModalStations] = useState<TrainStation[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalDate, setModalDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [modalBoarding, setModalBoarding] = useState<string>("");

  const extractStationCode = (val: string) => {
    const m = val.match(/\(([^)]+)\)$/);
    if (m && m[1]) return m[1].trim();
    const hyphenMatch = val.match(/- *([A-Za-z0-9]+)/);
    if (hyphenMatch && hyphenMatch[1]) return hyphenMatch[1].trim();
    const parts = val.trim().split(/\s+/);
    const last = parts[parts.length - 1];
    if (last && last.length <= 6) return last.trim();
    return val.trim();
  };

  const handleSearch = async () => {
    if (!inputValue || inputValue.trim() === "") {
      alert("Please enter value");
      return;
    }
    setLoading(true);

    if (searchType === "station") {
      const rawCode =
        selectedStation?.StationCode ?? extractStationCode(inputValue);
      if (!rawCode) {
        alert("Please enter a valid station code");
        setLoading(false);
        return;
      }
      let slug: string;
      if (selectedStation?.StationCode && selectedStation?.StationName) {
        slug = makeStationSlug(String(selectedStation.StationCode), selectedStation.StationName);
      } else {
        const upper = String(rawCode).toUpperCase();
        const lower = upper.toLowerCase();
        slug = `${upper}-${lower}-food-delivery-in-train`;
      }
      setTimeout(() => (window.location.href = `/Stations/${slug}`), 50);
      return;
    }

    if (searchType === "pnr") {
      setTimeout(() => (window.location.href = `/pnr/${encodeURIComponent(inputValue.trim())}`), 50);
      return;
    }

    if (searchType === "train") {
      const raw = inputValue.trim();
      const digits = raw.replace(/\D+/g, "");
      if (!digits || digits.length < 3) {
        alert("Please enter a valid train number");
        setLoading(false);
        return;
      }

      // show modal and load train route
      setModalTrainNo(digits);
      setModalStations([]);
      setModalError(null);
      setModalLoading(true);
      setShowTrainModal(true);

      try {
        const res = await fetch(`/api/home/train-search?train=${encodeURIComponent(digits)}`, { cache: "no-store" });
        const j = await res.json().catch(() => null);
        if (!res.ok || !j?.ok) {
          setModalError(j?.error || "Train not found");
          setModalStations([]);
        } else {
          const stationsRaw = Array.isArray(j.stations) ? j.stations : [];
          const stations: TrainStation[] = stationsRaw.map((s: any) => ({
            stationCode: s.stationCode || s.StationCode || "",
            stationName: s.stationName || s.StationName || "",
            state: s.state || s.State || null,
            arrivalTime: s.arrivalTime || s.Arrives || s.Arrival || null,
          }));
          setModalStations(stations);
          if (stations.length) setModalBoarding((prev) => prev || stations[0].stationCode);
        }
      } catch (err) {
        console.error("train search error", err);
        setModalError("Failed to search train. Try again.");
        setModalStations([]);
      } finally {
        setModalLoading(false);
        setLoading(false);
      }
      return;
    }
  };

  // <-- IMPORTANT: set sessionStorage flag before navigation -->
  const onModalSearchSubmit = () => {
    if (!modalTrainNo) return alert("Train missing");
    if (!modalBoarding) return alert("Please pick boarding station");
    try {
      localStorage.setItem("re_lastSearchType", "train");
      localStorage.setItem("re_lastTrainNumber", modalTrainNo);
    } catch {}

    // new: session flag so trains page knows we came from modal selection
    try {
      const payload = { train: modalTrainNo, date: modalDate, boarding: modalBoarding };
      sessionStorage.setItem("raileats_train_search", JSON.stringify(payload));
    } catch {}

    const slug = makeTrainSlug(modalTrainNo);
    const qs = new URLSearchParams({
      date: modalDate,
      boarding: modalBoarding,
    }).toString();

    setShowTrainModal(false);
    setTimeout(() => {
      window.location.href = `/trains/${encodeURIComponent(slug)}?${qs}`;
    }, 50);
  };

  return (
    <div className="mt-4 w-full max-w-xl mx-auto bg-white rounded-lg shadow p-4">
      <div className="flex justify-center gap-6 mb-4">
        {(["pnr", "train", "station"] as const).map((type) => (
          <label key={type} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="searchType"
              value={type}
              checked={searchType === type}
              onChange={(e) => {
                setSearchType(e.target.value as any);
                setInputValue("");
                setSelectedStation(null);
              }}
            />
            <span className="capitalize">{type}</span>
          </label>
        ))}
      </div>

      <div className="px-3">
        <div className="w-full rounded-md border p-3">
          {searchType === "station" ? (
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <StationSearchBox
                  initialValue={inputValue}
                  onSelect={(s) => {
                    const val = s ? (s.StationCode ?? s.StationName ?? "") : "";
                    const display = s ? `${s.StationName}${s.StationCode ? ` (${s.StationCode})` : ""}` : "";
                    setInputValue(display || val);
                    setSelectedStation(s || null);
                  }}
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setInputValue(""); setSelectedStation(null); }}
                  disabled={loading}
                  className="px-3 py-2 border rounded bg-white hover:bg-gray-50 text-sm"
                >
                  Clear
                </button>

                <div className="relative">
                  <button
                    onClick={handleSearch}
                    disabled={loading}
                    className={`px-4 py-2 bg-black text-white rounded text-sm ${loading ? "opacity-70 cursor-wait" : ""}`}
                  >
                    Search
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-stretch">
              <input
                type={searchType === "pnr" ? "tel" : "text"}
                inputMode={searchType === "pnr" ? "numeric" : "text"}
                maxLength={searchType === "pnr" ? 10 : undefined}
                placeholder={
                  searchType === "pnr"
                    ? "Enter 10-digit PNR"
                    : searchType === "train"
                    ? "Enter Train Number"
                    : "Enter Station Code"
                }
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="min-w-0 flex-1 px-2 py-2 text-sm outline-none border rounded"
              />
              <button
                onClick={handleSearch}
                disabled={loading}
                className="shrink-0 ml-2 w-24 px-3 py-2 text-sm bg-black text-white hover:bg-gray-800 rounded"
              >
                Search
              </button>
            </div>
          )}
        </div>
      </div>

      {/* TRAIN MODAL */}
      {showTrainModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl bg-white rounded-lg shadow p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-gray-600">Train</div>
                <div className="text-lg font-semibold">{modalTrainNo}</div>
              </div>
              <button onClick={() => setShowTrainModal(false)} className="text-sm px-2 py-1 border rounded">✕</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
              <div>
                <label className="text-xs text-gray-600 block mb-1">Journey date</label>
                <input
                  type="date"
                  value={modalDate}
                  onChange={(e) => setModalDate(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs text-gray-600 block mb-1">Boarding station</label>
                <select
                  value={modalBoarding}
                  onChange={(e) => setModalBoarding(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="" disabled>Select boarding station</option>
                  {modalStations.map((s) => (
                    <option key={s.stationCode} value={s.stationCode}>
                      {s.stationName} ({s.stationCode}){s.state ? ` • ${s.state}` : ""}
                    </option>
                  ))}
                </select>

                <div className="text-xs text-gray-500 mt-2">
                  Dropdown lists full route. Pick the station from where you'll board.
                </div>
              </div>
            </div>

            <div className="mt-4">
              {modalLoading && <div className="text-sm text-gray-500">Loading route…</div>}
              {modalError && <div className="text-sm text-red-600">{modalError}</div>}
            </div>

            <div className="mt-4 flex justify-end gap-3">
              <button className="px-4 py-2 rounded border" onClick={() => setShowTrainModal(false)}>Cancel</button>
              <button
                className="px-4 py-2 rounded bg-green-600 text-white"
                onClick={onModalSearchSubmit}
                disabled={modalLoading || !modalBoarding}
              >
                Search & Open
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
