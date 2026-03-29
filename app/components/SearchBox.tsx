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

  async function fetchTrainRoute(digits: string) {
    setModalLoading(true);
    setModalError(null);
    setModalStations([]);

    try {
      const res = await fetch(`/api/train-routes?train=${encodeURIComponent(digits)}`, { cache: "no-store" });
      const j = await res.json();

      const rows = j.rows || [];

      const stations = rows.map((r: any) => ({
        stationCode: r.StationCode,
        stationName: r.StationName,
        state: r.state,
        arrivalTime: r.Arrives,
        restroCount: r.restroCount || 0, // 🔥 IMPORTANT
      }));

      setModalStations(stations);
      setModalTrainName(j.train?.trainName || null);

      if (stations.length) setModalBoarding(stations[0].stationCode);

    } catch (err) {
      console.error(err);
      setModalError("Failed to fetch train");
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

      {/* SEARCH TYPE */}
      <div className="flex justify-center gap-6 mb-4">
        {["pnr", "train", "station"].map((type) => (
          <label key={type}>
            <input
              type="radio"
              checked={searchType === type}
              onChange={() => setSearchType(type)}
            />
            {type}
          </label>
        ))}
      </div>

      {/* TRAIN SEARCH */}
      {searchType === "train" && (
        <div className="flex gap-2">
          <TrainAutocomplete
            value={inputValue}
            onChange={setInputValue}
          />

          <button onClick={handleSearch} className="bg-black text-white px-4">
            Search
          </button>
        </div>
      )}

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
                .filter((s) => s.restroCount > 0) // ✅ MAIN LOGIC
                .map((s) => (
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
