"use client";

import { useRef, useState } from "react";
import StationSearchBox from "./StationSearchBox";
import TrainAutocomplete from "./TrainAutocomplete";
import { useCart } from "../lib/useCart";

function makeTrainSlug(trainNoRaw: string) {
  const clean = String(trainNoRaw || "").trim();
  if (!clean) return "";

  const digitsOnly = clean.replace(/\D+/g, "") || clean;
  return `${digitsOnly}-train-food-delivery-in-train`;
}

function makeStationSlug(stationNameRaw: string, stationCodeRaw: string) {
  const stationName = String(stationNameRaw || "").trim();
  const stationCode = String(stationCodeRaw || "").trim();

  return `${stationName}-${stationCode}-food-delivery`
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function SearchBox() {
  const { clearCart } = useCart();

  const [searchType, setSearchType] = useState("train");
  const [inputValue, setInputValue] = useState("");
  const [selectedTrain, setSelectedTrain] = useState<any>(null);
  const [selectedStationData, setSelectedStationData] = useState<any>(null);
  const [stations, setStations] = useState<any[]>([]);
  const [boarding, setBoarding] = useState("");
  const [date, setDate] = useState(todayIso());
  const [showStationList, setShowStationList] = useState(false);
  const [loadingStations, setLoadingStations] = useState(false);

  const searchBtnRef = useRef<HTMLButtonElement | null>(null);
  const boardingBoxRef = useRef<HTMLDivElement | null>(null);

  const scrollSearchButtonIntoView = () => {
    setTimeout(() => {
      searchBtnRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 250);
  };

  const scrollBoardingListIntoView = () => {
    setTimeout(() => {
      boardingBoxRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      setTimeout(() => {
        window.scrollBy({ top: 90, behavior: "smooth" });
      }, 250);
    }, 100);
  };

  async function fetchStations(trainNo: string) {
    try {
      setLoadingStations(true);

      const res = await fetch(`/api/train-routes?train=${trainNo}`);
      const j = await res.json();

      const list = (j.rows || []).map((r: any) => ({
        code: r.StationCode,
        name: r.StationName,
      }));

      setStations(list);
      setBoarding(list.length > 0 ? list[0].code : "");
      scrollSearchButtonIntoView();
    } catch (err) {
      console.error(err);
      setStations([]);
      setBoarding("");
    } finally {
      setLoadingStations(false);
    }
  }

  function handleTrainSelect(t: any) {
    const trainNo = t.train_no || t.trainNumber;
    const trainName = t.train_name || t.trainName || "Train";

    setSelectedTrain(t);
    setInputValue(`${trainNo} - ${trainName}`);
    setDate(todayIso());
    fetchStations(trainNo);
  }

  const resetSearch = (type: string) => {
    setSearchType(type);
    setInputValue("");
    setSelectedTrain(null);
    setSelectedStationData(null);
    setStations([]);
    setBoarding("");
    setShowStationList(false);
    setDate(todayIso());
  };

  const clearCartBeforeNewSearch = () => {
    clearCart();

    if (typeof window !== "undefined") {
      localStorage.removeItem("raileats_min_order");
      localStorage.removeItem("pendingCartItem");
      localStorage.removeItem("pendingJourney");
    }
  };

  const handleSearch = () => {
    const cleanInput = inputValue.trim();

    if (searchType === "pnr") {
      if (!cleanInput) return alert("Enter PNR first");

      clearCartBeforeNewSearch();
      window.location.href = `/pnr/${encodeURIComponent(cleanInput)}`;
      return;
    }

    if (searchType === "station") {
      if (!selectedStationData?.StationName || !selectedStationData?.StationCode) {
        return alert("Select station first");
      }

      const slug = makeStationSlug(
        selectedStationData.StationName,
        selectedStationData.StationCode
      );

      clearCartBeforeNewSearch();
      window.location.href = `/stations/${slug}`;
      return;
    }

    if (searchType === "train") {
      if (!selectedTrain) return alert("Select train first");
      if (!boarding) return alert("Select boarding station");

      const trainNo = selectedTrain.train_no || selectedTrain.trainNumber;
      const slug = makeTrainSlug(trainNo);

      clearCartBeforeNewSearch();
      window.location.href = `/trains/${slug}?date=${date}&boarding=${boarding}`;
    }
  };

  const selectedStation =
    stations.find((s) => String(s.code) === String(boarding)) || null;

  return (
    <section className="container-app">
      <div className="app-card overflow-visible p-4">
        <div className="mb-4">
          <h1 className="text-[22px] font-black leading-tight text-slate-950">
            Order food on train
          </h1>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Search by train, PNR, or station.
          </p>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2 rounded-2xl bg-slate-100 p-1">
          {[
            { key: "pnr", label: "PNR" },
            { key: "train", label: "Train" },
            { key: "station", label: "Station" },
          ].map((item) => {
            const active = searchType === item.key;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => resetSearch(item.key)}
                className={[
                  "min-h-[40px] rounded-xl text-sm font-black transition",
                  active
                    ? "bg-white text-orange-600 shadow-sm"
                    : "text-slate-500",
                ].join(" ")}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="space-y-3">
          {searchType === "train" ? (
            <TrainAutocomplete
              value={inputValue}
              onChange={setInputValue}
              onSelect={handleTrainSelect}
            />
          ) : searchType === "station" ? (
            <div className="[&_input]:w-full [&_button]:font-semibold">
              <StationSearchBox
                onSelect={(s: any) => {
                  setSelectedStationData(s);
                  setInputValue(
                    s?.StationName && s?.StationCode
                      ? `${s.StationName} (${s.StationCode})`
                      : s?.StationName || s?.StationCode || ""
                  );
                }}
              />
            </div>
          ) : (
            <input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Enter 10 digit PNR"
              className="app-input"
            />
          )}

          {searchType === "train" && selectedTrain && (
            <div className="grid gap-3">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="app-input"
              />

              <div ref={boardingBoxRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowStationList((prev) => {
                      const next = !prev;
                      if (next) scrollBoardingListIntoView();
                      return next;
                    });
                  }}
                  className="app-input flex items-center justify-between text-left"
                >
                  <span>
                    {selectedStation
                      ? `${selectedStation.name} (${selectedStation.code})`
                      : loadingStations
                      ? "Loading route stations..."
                      : "Select boarding station"}
                  </span>
                  <span className="text-slate-400">v</span>
                </button>

                {showStationList && (
                  <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-64 overflow-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
                    {stations.length === 0 && (
                      <div className="p-3 text-sm font-semibold text-slate-500">
                        No stations found
                      </div>
                    )}

                    {stations.map((s) => (
                      <button
                        key={s.code}
                        type="button"
                        onClick={() => {
                          setBoarding(s.code);
                          setShowStationList(false);
                          scrollSearchButtonIntoView();
                        }}
                        className="flex w-full items-center justify-between border-b border-slate-100 px-4 py-3 text-left hover:bg-orange-50"
                      >
                        <span className="font-bold text-slate-800">
                          {s.name}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-black text-slate-600">
                          {s.code}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <button
            ref={searchBtnRef}
            type="button"
            onClick={handleSearch}
            className="app-btn-primary w-full"
          >
            Search Food
          </button>
        </div>
      </div>
    </section>
  );
}
