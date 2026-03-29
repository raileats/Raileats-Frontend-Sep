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

  const [showStationList, setShowStationList] = useState(false);

  async function fetchStations(trainNo: string) {
    console.log("Fetching stations for:", trainNo);

    const res = await fetch(`/api/train-routes?train=${trainNo}`);
    const j = await res.json();

    console.log("API DATA:", j);

    const list = (j.rows || [])
      .map((r: any) => ({
        code: r.StationCode,
        name: r.StationName,
        restro: r.restroCount || 0,
      }))
      .filter((s: any) => s.restro > 0);

    setStations(list);
  }

  // 🔥 FIX HERE (IMPORTANT)
  function handleTrainSelect(t: any) {
    console.log("Selected train:", t);

    setSelectedTrain(t);

    // ✅ support both formats
    const trainNo = t.train_no || t.trainNumber;

    setInputValue(`${trainNo} - ${t.train_name || t.trainName}`);

    fetchStations(trainNo);
  }

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

      const trainNo =
        selectedTrain.train_no || selectedTrain.trainNumber;

      const slug = makeTrainSlug(trainNo);

      window.location.href =
        `/trains/${slug}?date=${date}&boarding=${boarding}`;
    }
  };

  return (
    <div className="mt-4 w-full max-w-xl mx-auto bg-white rounded-lg shadow p-4">

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
                setBoarding("");
              }}
            />
            {type}
          </label>
        ))}
      </div>

      {searchType === "train" ? (
        <TrainAutocomplete
          value={inputValue}
          onChange={setInputValue}
          onSelect={handleTrainSelect}
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

      {searchType === "train" && selectedTrain && (
        <div className="mt-4">

          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border p-2 w-full mb-2"
          />

          <div className="relative">
            <div
              onClick={() => setShowStationList(!showStationList)}
              className="border p-2 cursor-pointer bg-white"
            >
              {boarding
                ? `Selected: ${boarding}`
                : "Select Station"}
            </div>

            {showStationList && (
              <div className="absolute w-full bg-white border max-h-48 overflow-auto z-50">
                {stations.length === 0 && (
                  <div className="p-2 text-gray-500">
                    No stations available
                  </div>
                )}

                {stations.map((s) => (
                  <div
                    key={s.code}
                    onClick={() => {
                      setBoarding(s.code);
                      setShowStationList(false);
                    }}
                    className="p-2 hover:bg-gray-200 cursor-pointer"
                  >
                    {s.name} ({s.code}) - {s.restro} outlets
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      <button
        onClick={handleSearch}
        className="bg-black text-white px-4 py-2 mt-3 w-full"
      >
        Search
      </button>

    </div>
  );
}
