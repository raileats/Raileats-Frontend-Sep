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

  const [showTrainModal, setShowTrainModal] = useState(false);
  const [modalTrainNo, setModalTrainNo] = useState("");
  const [modalTrainName, setModalTrainName] = useState<string | null>(null);
  const [modalStations, setModalStations] = useState<any[]>([]);
  const [modalBoarding, setModalBoarding] = useState("");
  const [modalDate, setModalDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );

  // 🔥 FETCH TRAIN ROUTE
  async function fetchTrainRoute(digits: string) {
    setModalStations([]);

    try {
      const res = await fetch(`/api/train-routes?train=${digits}`);
      const j = await res.json();

      const stations = (j.rows || []).map((r: any) => ({
        stationCode: r.StationCode,
        stationName: r.StationName,
        restroCount: r.restroCount || 0,
      }));

      setModalTrainName(j.train?.trainName || null);
      setModalStations(stations);

      // ✅ ONLY VALID STATIONS (WITH OUTLETS)
      const validStations = stations.filter(
        (s: any) => (s.restroCount ?? 0) > 0
      );

      if (validStations.length > 0) {
        setModalBoarding(validStations[0].stationCode);
      } else {
        setModalBoarding("");
      }

    } catch (err) {
      console.error(err);
    }
  }

  // 🔍 SEARCH HANDLER
  const handleSearch = async () => {
    if (!inputValue.trim()) return alert("Enter value");

    if (searchType === "pnr") {
      window.location.href = `/pnr/${inputValue}`;
      return;
    }

    if (searchType === "station") {
      window.location.href = `/stations/${inputValue}`;
      return;
    }

    if (searchType === "train") {
      const digits = inputValue.replace(/\D+/g, "");
      if (!digits) return alert("Invalid train");

      setModalTrainNo(digits);
      setShowTrainModal(true);
      await fetchTrainRoute(digits);
    }
  };

  // 🚀 FINAL SUBMIT
  const handleFinalSearch = () => {
    if (!modalBoarding) return alert("Select station");

    const slug = makeTrainSlug(modalTrainNo);

    const qs = new URLSearchParams({
      date: modalDate,
      boarding: modalBoarding,
    }).toString();

    window.location.href = `/trains/${slug}?${qs}`;
  };

  return (
    <div className="mt-4 w-full max-w-xl mx-auto bg-white rounded-lg shadow p-4">

      {/* 🔥 RADIO */}
      <div className="flex justify-center gap-6 mb-4">
        {["pnr", "train", "station"].map((type) => (
          <label key={type}>
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

      {/* 🔍 INPUT */}
      {searchType === "train" ? (
        <TrainAutocomplete value={inputValue} onChange={setInputValue} />
      ) : searchType === "station" ? (
        <StationSearchBox
          onSelect={(s: any) => setInputValue(s?.StationCode)}
        />
      ) : (
        <input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Enter PNR"
          className="w-full border p-2"
        />
      )}

      <button
        onClick={handleSearch}
        className="bg-black text-white px-4 py-2 mt-2"
      >
        Search
      </button>

      {/* 🔥 MODAL */}
      {showTrainModal && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center">
          <div className="bg-white p-4 w-[400px]">

            <h3 className="mb-2">
              {modalTrainNo} {modalTrainName}
            </h3>

            <input
              type="date"
              value={modalDate}
              onChange={(e) => setModalDate(e.target.value)}
              className="border p-2 w-full mb-2"
            />

            {/* ✅ ONLY VALID STATIONS */}
            <select
              value={modalBoarding}
              onChange={(e) => setModalBoarding(e.target.value)}
              className="border p-2 w-full mb-2"
            >
              {modalStations
                .filter((s) => s.restroCount > 0)
                .map((s) => (
                  <option key={s.stationCode} value={s.stationCode}>
                    {s.stationName} ({s.stationCode}) - {s.restroCount} outlets
                  </option>
                ))}
            </select>

            <button
              onClick={handleFinalSearch}
              className="bg-black text-white px-4 py-2 w-full"
            >
              Show Restaurants
            </button>

          </div>
        </div>
      )}
    </div>
  );
}
