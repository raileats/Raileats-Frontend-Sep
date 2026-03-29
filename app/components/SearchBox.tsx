"use client";

import { useState } from "react";
import StationSearchBox from "./StationSearchBox";
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
  const [selectedTrain, setSelectedTrain] = useState<any>(null);

  const [stations, setStations] = useState<any[]>([]);
  const [boarding, setBoarding] = useState("");
  const [date, setDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  // 🚀 FETCH STATIONS
  async function fetchStations(trainNo: string) {
    try {
      const res = await fetch(`/api/train-routes?train=${trainNo}`);
      const j = await res.json();

      const list = (j.rows || [])
        .map((r: any) => ({
          code: r.StationCode,
          name: r.StationName,
          restro: r.restroCount || 0,
        }))
        .filter((s: any) => s.restro > 0);

      setStations(list);

      if (list.length > 0) {
        setBoarding(list[0].code);
      } else {
        setBoarding("");
      }

    } catch (err) {
      console.error(err);
    }
  }

  // 🔥 IMPORTANT: TRAIN SELECT HANDLER
  function handleTrainSelect(t: any) {
    setSelectedTrain(t);
    setInputValue(`${t.train_no} - ${t.train_name}`);
    fetchStations(t.train_no);
  }

  // 🔍 SEARCH
  const handleSearch = () => {
    if (searchType === "pnr") {
      window.location.href = `/pnr/${inputValue}`;
      return;
    }

    if (searchType === "station") {
      window.location.href = `/stations/${inputValue}`;
      return;
    }

    if (searchType === "train") {
      if (!selectedTrain) return alert("Select train first");
      if (!boarding) return alert("Select station");

      const slug = makeTrainSlug(selectedTrain.train_no);

      window.location.href =
        `/trains/${slug}?date=${date}&boarding=${boarding}`;
    }
  };

  return (
    <div className="mt-4 w-full max-w-xl mx-auto bg-white rounded-lg shadow p-4">

      {/* RADIO */}
      <div className="flex justify-center gap-6 mb-4">
        {["pnr", "train", "station"].map((type) => (
          <label key={type}>
            <input
              type="radio"
              checked={searchType === type}
              onChange={() => {
                setSearchType(type);
                setInputValue("");
                setSelectedTrain(null);
                setStations([]);
              }}
            />
            {type}
          </label>
        ))}
      </div>

      {/* INPUT */}
      {searchType === "train" ? (
        <TrainAutocomplete
          value={inputValue}
          onChange={setInputValue}
          onSelect={handleTrainSelect}   // ✅ FIX HERE
        />
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

      {/* EXPAND PANEL */}
      {searchType === "train" && selectedTrain && (
        <div className="mt-4 border p-3 rounded">

          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border p-2 w-full mb-2"
          />

          <div className="max-h-40 overflow-y-auto border">
            {stations.map((s) => (
              <div
                key={s.code}
                onClick={() => setBoarding(s.code)}
                className={`p-2 cursor-pointer ${
                  boarding === s.code ? "bg-black text-white" : ""
                }`}
              >
                {s.name} ({s.code}) - {s.restro} outlets
              </div>
            ))}
          </div>

        </div>
      )}

      <button
        onClick={handleSearch}
        className="bg-black text-white px-4 py-2 mt-2 w-full"
      >
        Search
      </button>

    </div>
  );
}
