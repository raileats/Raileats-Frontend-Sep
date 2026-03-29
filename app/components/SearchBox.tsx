// app/components/SearchBox.tsx
"use client";

import { useEffect, useState } from "react";
import StationSearchBox from "./StationSearchBox";
import { makeStationSlug } from "../lib/stationSlug";
import TrainAutocomplete from "./TrainAutocomplete";

function makeTrainSlug(trainNoRaw: string) {
  const clean = String(trainNoRaw || "").trim();
  if (!clean) return "";
  const digitsOnly = clean.replace(/\D+/g, "") || clean;
  return `${digitsOnly}-train-food-delivery-in-train`;
}

export default function SearchBox() {
  const [searchType, setSearchType] = useState("pnr");
  const [inputValue, setInputValue] = useState("");
  const [selectedStation, setSelectedStation] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [showTrainModal, setShowTrainModal] = useState(false);
  const [modalTrainNo, setModalTrainNo] = useState("");
  const [modalTrainName, setModalTrainName] = useState<string | null>(null);
  const [modalStations, setModalStations] = useState<any[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalDate, setModalDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [modalBoarding, setModalBoarding] = useState("");

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

  async function fetchTrainRoute(digits: string) {
    setModalLoading(true);
    setModalError(null);
    setModalStations([]);

    try {
      const res = await fetch(`/api/train-routes?train=${encodeURIComponent(digits)}`, { cache: "no-store" });
      const j = await res.json().catch(() => null);

      if (!res.ok || !j?.ok) {
        const r2 = await fetch(`/api/home/train-search?train=${encodeURIComponent(digits)}`, { cache: "no-store" });
        const j2 = await r2.json().catch(() => null);

        if (!r2.ok || !j2?.ok) {
          setModalError(j?.error || j2?.error || "Train not found");
          setModalStations([]);
          return;
        } else {
          const stationsRaw = Array.isArray(j2.stations) ? j2.stations : [];

          const stations = stationsRaw.map((s: any) => ({
            stationCode: (s.stationCode || s.StationCode || "").toUpperCase(),
            stationName: s.stationName || s.StationName || "",
            state: s.state || s.State || null,
            arrivalTime: (s.arrivalTime || s.Arrives || s.Arrival || "").slice(0,5) || null,
            restroCount: s.restroCount || 0 // ✅ ADD
          }));

          setModalStations(stations);
          setModalTrainName((j2.train && (j2.train.trainName || j2.trainName)) ?? null);

          if (stations.length) setModalBoarding((prev) => prev || stations[0].stationCode);
          return;
        }
      }

      const trainName = j.trainName || j.train?.trainName || j.train?.name || j.trainNameRaw || null;
      const rows = j.rows || [];

      const stations = rows.map((r: any) => ({
        stationCode: (r.StationCode || "").toUpperCase(),
        stationName: r.StationName || "",
        state: r.State || null,
        arrivalTime: (r.Arrives || "").slice(0,5),
        restroCount: r.restroCount || 0 // ✅ ADD
      }));

      setModalTrainName(trainName ?? null);
      setModalStations(stations);

      if (stations.length) setModalBoarding((prev) => prev || stations[0].stationCode);

    } catch (err) {
      console.error(err);
      setModalError("Failed to search train");
    } finally {
      setModalLoading(false);
    }
  }

  const handleSearch = async () => {
    if (!inputValue.trim()) return alert("Enter value");

    setLoading(true);

    if (searchType === "train") {
      const digits = inputValue.replace(/\D+/g, "");

      if (!digits) {
        alert("Enter valid train");
        setLoading(false);
        return;
      }

      setModalTrainNo(digits);
      setShowTrainModal(true);
      await fetchTrainRoute(digits);
      setLoading(false);
    }
  };

  const onModalSearchSubmit = () => {
    const slug = makeTrainSlug(modalTrainNo);

    const qs = new URLSearchParams({
      date: modalDate,
      boarding: modalBoarding,
    }).toString();

    window.location.href = `/trains/${slug}?${qs}`;
  };

  return (
    <div className="mt-4 w-full max-w-xl mx-auto bg-white rounded-lg shadow p-4">

      {/* TRAIN */}
      <div className="flex gap-2">
        <TrainAutocomplete
          value={inputValue}
          onChange={setInputValue}
        />

        <button onClick={handleSearch} className="bg-black text-white px-4">
          Search
        </button>
      </div>

      {/* MODAL */}
      {showTrainModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-4 w-[500px]">

            <h2>{modalTrainNo} {modalTrainName}</h2>

            <input
              type="date"
              value={modalDate}
              onChange={(e) => setModalDate(e.target.value)}
            />

            {/* 🔥 FILTERED STATIONS */}
            <select
              value={modalBoarding}
              onChange={(e) => setModalBoarding(e.target.value)}
            >
              {modalStations
                .filter((s: any) => (s.restroCount ?? 0) > 0)
                .map((s: any) => (
                  <option key={s.stationCode} value={s.stationCode}>
                    {s.stationName} ({s.stationCode}) - {s.restroCount} outlets
                  </option>
                ))}
            </select>

            <button onClick={onModalSearchSubmit}>
              Search
            </button>

          </div>
        </div>
      )}
    </div>
  );
}
