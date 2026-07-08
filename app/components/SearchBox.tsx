"use client";

import { useRef, useState } from "react";
import StationSearchBox from "./StationSearchBox";
import TrainAutocomplete from "./TrainAutocomplete";

async function trackEvent(
  event_name: string,
  payload: {
    section?: string;
    metadata?: Record<string, any>;
  } = {}
) {
  try {
    if (typeof window === "undefined") return;

    const key = "raileats_session_id";
    let sessionId = localStorage.getItem(key);

    if (!sessionId) {
      sessionId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(key, sessionId);
    }

    await fetch("/api/website-events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      keepalive: true,
      body: JSON.stringify({
        event_name,
        section: payload.section || null,
        page_url: window.location.href,
        page_path: window.location.pathname,
        session_id: sessionId,
        device:
          window.innerWidth < 640
            ? "mobile"
            : window.innerWidth < 1024
            ? "tablet"
            : "desktop",
        browser: navigator.userAgent.includes("Edg")
          ? "Edge"
          : navigator.userAgent.includes("Chrome")
          ? "Chrome"
          : navigator.userAgent.includes("Firefox")
          ? "Firefox"
          : navigator.userAgent.includes("Safari")
          ? "Safari"
          : "Other",
        metadata: payload.metadata || {},
      }),
    });
  } catch (err) {
    console.error("trackEvent failed:", err);
  }
}

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
  const [searchType, setSearchType] = useState("pnr");
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

    trackEvent("home_train_suggestion_select", {
      section: "home_search_box",
      metadata: {
        trainNo,
        trainName,
      },
    });

    setSelectedTrain(t);
    setInputValue(`${trainNo} - ${trainName}`);
    setDate(todayIso());
    fetchStations(trainNo);
  }

  const resetSearch = (type: string) => {
    trackEvent(`home_${type}_tab_click`, {
      section: "home_search_tabs",
    });

    setSearchType(type);
    setInputValue("");
    setSelectedTrain(null);
    setSelectedStationData(null);
    setStations([]);
    setBoarding("");
    setShowStationList(false);
    setDate(todayIso());
  };

  const handleSearch = () => {
    const cleanInput = inputValue.trim();

    trackEvent("home_search_food_click", {
      section: "home_search_box",
      metadata: {
        searchType,
        inputValue: cleanInput,
        trainNo: selectedTrain?.train_no || selectedTrain?.trainNumber || null,
        boarding,
        date,
        stationCode: selectedStationData?.StationCode || null,
      },
    });

    if (searchType === "pnr") {
  const cleanPnr = cleanInput.replace(/\D/g, "");

  if (!/^[2468][0-9]{9}$/.test(cleanPnr)) {
    return alert("Please enter a valid 10-digit PNR starting with 2, 4, 6, or 8.");
  }

  window.location.href = `/pnr/${encodeURIComponent(cleanPnr)}`;
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

      window.location.href = `/stations/${slug}`;
      return;
    }

    if (searchType === "train") {
  if (!selectedTrain) return alert("Select train first");
  if (!boarding) return alert("Select boarding station");

  const trainNo = String(
    selectedTrain.train_no || selectedTrain.trainNumber || ""
  ).replace(/\D/g, "");

  if (!/^\d{5}$/.test(trainNo)) {
    return alert("Please select a valid 5-digit train number.");
  }

  const slug = makeTrainSlug(trainNo);

  window.location.href = `/trains/${slug}?date=${date}&boarding=${boarding}`;
}
  };

  const selectedStation =
    stations.find((s) => String(s.code) === String(boarding)) || null;

  return (
    <section className="container-app searchbox-shell" aria-label="Order food search">
      <div className="app-card searchbox-card overflow-visible p-3 sm:p-4">
        <div className="mb-3 searchbox-heading">
          <h2 className="text-[20px] font-black leading-tight text-slate-950 sm:text-[22px]">
            Order food on train
          </h2>
          <p className="mt-1 text-xs font-semibold text-slate-500 sm:text-sm">
            Search by train, PNR, or station.
          </p>
        </div>

        <div className="mb-3 grid grid-cols-3 gap-2 rounded-2xl bg-slate-100 p-1 searchbox-tabs">
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
                  "min-h-[36px] rounded-xl text-sm font-black transition active:scale-95 sm:min-h-[40px]",
                  active
                    ? "bg-white text-orange-600 shadow-sm searchbox-tab-active"
                    : "text-slate-500",
                ].join(" ")}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="space-y-2.5 searchbox-controls">
          {searchType === "train" ? (
            <div className="searchbox-field-wrap">
              <TrainAutocomplete
  value={inputValue}
  onChange={setInputValue}
  onSelect={handleTrainSelect}
/>
            </div>
          ) : searchType === "station" ? (
            <div className="searchbox-field-wrap [&_input]:w-full [&_button]:font-semibold">
              <StationSearchBox
                onSelect={(s: any) => {
                  trackEvent("home_station_suggestion_select", {
                    section: "home_search_box",
                    metadata: {
                      stationName: s?.StationName || null,
                      stationCode: s?.StationCode || null,
                    },
                  });

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
  onChange={(e) => {
  let value = e.target.value.replace(/\D/g, "");

  // First digit must be 2,4,6,8
  if (value.length > 0 && !["2", "4", "6", "8"].includes(value.charAt(0))) {
    return;
  }

  setInputValue(value.slice(0, 10));
}}
  inputMode="numeric"
  maxLength={10}
  placeholder="Enter 10 digit PNR starting with 2, 4, 6, or 8"
  className="app-input searchbox-input"
/>
          )}

          {searchType === "train" && selectedTrain && (
            <div className="grid gap-2.5 searchbox-journey-fields">
              <input
                type="date"
                value={date}
                onChange={(e) => {
                  trackEvent("home_journey_date_change", {
                    section: "home_search_box",
                    metadata: {
                      date: e.target.value,
                    },
                  });

                  setDate(e.target.value);
                }}
                className="app-input searchbox-input"
              />

              <div ref={boardingBoxRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    trackEvent("home_boarding_dropdown_click", {
                      section: "home_search_box",
                    });

                    setShowStationList((prev) => {
                      const next = !prev;
                      if (next) scrollBoardingListIntoView();
                      return next;
                    });
                  }}
                  className="app-input searchbox-input flex items-center justify-between text-left active:scale-[0.99]"
                >
                  <span>
                    {selectedStation
                      ? `${selectedStation.name} (${selectedStation.code})`
                      : loadingStations
                      ? "Loading route stations..."
                      : "Select boarding station"}
                  </span>
                  <span className="text-slate-400">⌄</span>
                </button>

                {showStationList && (
                  <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-64 overflow-auto rounded-2xl border border-slate-200 bg-white shadow-xl searchbox-dropdown">
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
                          trackEvent("home_boarding_station_select", {
                            section: "home_search_box",
                            metadata: {
                              stationName: s.name,
                              stationCode: s.code,
                            },
                          });

                          setBoarding(s.code);
                          setShowStationList(false);
                          scrollSearchButtonIntoView();
                        }}
                        className="flex w-full items-center justify-between border-b border-slate-100 px-4 py-3 text-left transition hover:bg-orange-50 active:scale-[0.99]"
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
            className="app-btn-primary searchbox-submit w-full min-h-[42px] active:scale-[0.99] sm:min-h-[44px]"
          >
            Search Food
          </button>
        </div>
      </div>
    </section>
  );
}
