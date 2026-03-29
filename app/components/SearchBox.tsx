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
    return val.trim();
  };

  async function fetchTrainRoute(digits: string) {
    setModalLoading(true);
    setModalStations([]);

    try {
      const res = await fetch(`/api/train-routes?train=${digits}`);
      const j = await res.json();

      const stations = (j.rows || []).map((r: any) => ({
        stationCode: r.StationCode,
        stationName: r.StationName,
        restroCount: r.restroCount || 0
      }));

      setModalStations(stations);
      setModalTrainName(j.train?.trainName || null);

    } catch (err) {
      console.error(err);
    } finally {
      setModalLoading(false);
    }
  }

  const handleSearch = async () => {
    if (!inputValue.trim()) return alert("Enter value");

    if (searchType === "pnr") {
      window.location.href = `/pnr/${inputValue}`;
      return;
    }

    if (searchType === "station") {
      const code = extractStationCode(inputValue);
      window.location.href = `/Stations/${code}`;
      return;
    }

    if (searchType === "train") {
      const digits = inputValue.replace(/\D+/g, "");
      setModalTrainNo(digits);
      setShowTrainModal(true);
      await fetchTrainRoute(digits);
    }
  };

  return (
    <div className="mt-4 w-full max-w-xl mx-auto bg-white rounded-lg shadow p-4">

      {/* 🔥 RADIO BUTTONS BACK */}
      <div className="flex justify-center gap-6 mb-4">
        {["pnr", "train", "station"].map((type) => (
          <label key={type} className="flex items-center gap-2">
            <input
              type="radio"
              checked={searchType === type}
              onChange={() => {
                setSearchType(type);
                setInputValue("");
              }}
            />
            {type}
          </label>
        ))}
      </div>

      {/* INPUT SWITCH */}
      {searchType === "station" ? (
        <StationSearchBox onSelect={(s: any) => setInputValue(s?.StationCode || "")} />
      ) : searchType === "train" ? (
        <TrainAutocomplete value={inputValue} onChange={setInputValue} />
      ) : (
        <input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Enter PNR"
          className="w-full border p-2"
        />
      )}

      <button onClick={handleSearch} className="bg-black text-white px-4 py-2 mt-2">
        Search
      </button>

      {/* MODAL */}
      {showTrainModal && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center">
          <div className="bg-white p-4">

            <h3>{modalTrainNo} {modalTrainName}</h3>

            <select
              value={modalBoarding}
              onChange={(e) => setModalBoarding(e.target.value)}
            >
              {modalStations
                .filter((s) => s.restroCount > 0)
                .map((s) => (
                  <option key={s.stationCode} value={s.stationCode}>
                    {s.stationName} ({s.stationCode}) - {s.restroCount}
                  </option>
                ))}
            </select>

          </div>
        </div>
      )}
    </div>
  );
}
