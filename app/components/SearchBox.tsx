"use client";

import { useState } from "react";
import StationSearchBox, { Station } from "./StationSearchBox";
import { makeStationSlug } from "../lib/stationSlug";

// ✅ Train slug helper: only number + SEO words
function makeTrainSlug(trainNoRaw: string) {
  const clean = String(trainNoRaw || "").trim();
  if (!clean) return "";

  // sirf digits nikaal lo, agar user beech me space / text daal de
  const digitsOnly = clean.replace(/\D+/g, "") || clean;
  const base = digitsOnly;

  // final slug → 11016-train-food-delivery-in-train
  return `${base}-train-food-delivery-in-train`;
}

export default function SearchBox() {
  const [searchType, setSearchType] = useState<"pnr" | "train" | "station">(
    "pnr",
  );
  const [inputValue, setInputValue] = useState("");
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [loading, setLoading] = useState(false);

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

  const handleSearch = () => {
    if (!inputValue || inputValue.trim() === "") {
      alert("Please enter value");
      return;
    }

    // start spinner ONLY on search click
    setLoading(true);

    /* =============== STATION SEARCH =============== */
    if (searchType === "station") {
      const rawCode =
        selectedStation?.StationCode ?? extractStationCode(inputValue);
      if (!rawCode) {
        alert("Please enter a valid station code");
        setLoading(false);
        return;
      }

      let slug: string;

      // ✅ agar user ne dropdown se station select kiya hai
      if (selectedStation?.StationCode && selectedStation?.StationName) {
        slug = makeStationSlug(
          String(selectedStation.StationCode),
          selectedStation.StationName,
        );
      } else {
        // fallback: sirf code se slug (BPL-bpl-food-delivery-in-train)
        const upper = String(rawCode).toUpperCase();
        const lower = upper.toLowerCase();
        slug = `${upper}-${lower}-food-delivery-in-train`;
      }

      const target = `/Stations/${slug}`;

      // small timeout so spinner gets a render before navigation
      setTimeout(() => {
        window.location.href = target;
      }, 50);
      return;
    }

    /* =============== PNR SEARCH =============== */
    if (searchType === "pnr") {
      setTimeout(
        () =>
          (window.location.href = `/pnr/${encodeURIComponent(
            inputValue.trim(),
          )}`),
        50,
      );
      return;
    }

    /* =============== TRAIN SEARCH (SEO SLUG) =============== */
    if (searchType === "train") {
      const raw = inputValue.trim();

      // basic validation – at least 3 digits
      const digits = raw.replace(/\D+/g, "");
      if (!digits || digits.length < 3) {
        alert("Please enter a valid train number");
        setLoading(false);
        return;
      }

      const slug = makeTrainSlug(digits);
      const target = `/trains/${encodeURIComponent(slug)}`;

      setTimeout(() => {
        window.location.href = target;
      }, 50);
      return;
    }
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
        {/* removed overflow-hidden to avoid clipping dropdown */}
        <div className="w-full rounded-md border p-3">
          {searchType === "station" ? (
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <StationSearchBox
                  initialValue={inputValue}
                  onSelect={(s) => {
                    const val = s ? (s.StationCode ?? s.StationName ?? "") : "";
                    const display = s
                      ? `${s.StationName}${
                          s.StationCode ? ` (${s.StationCode})` : ""
                        }`
                      : "";
                    setInputValue(display || val);
                    setSelectedStation(s || null);
                  }}
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setInputValue("");
                    setSelectedStation(null);
                  }}
                  disabled={loading}
                  className="px-3 py-2 border rounded bg-white hover:bg-gray-50 text-sm"
                >
                  Clear
                </button>

                <div className="relative">
                  <button
                    onClick={handleSearch}
                    disabled={loading}
                    className={`px-4 py-2 bg-black text-white rounded text-sm ${
                      loading ? "opacity-70 cursor-wait" : ""
                    }`}
                  >
                    Search
                  </button>

                  {/* spinner */}
                  {loading && (
                    <div
                      aria-hidden
                      className="absolute -right-12 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center"
                      style={{ pointerEvents: "none" }}
                    >
                      <div
                        className="absolute inset-0 rounded-full"
                        style={{
                          border: "3px solid rgba(0,0,0,0.08)",
                          borderTopColor: "#111",
                          boxSizing: "border-box",
                          animation: "re-loader-spin 900ms linear infinite",
                        }}
                      />

                      <div
                        className="relative w-8 h-8 rounded-full flex items-center justify-center bg-white"
                        style={{ overflow: "hidden", borderRadius: "50%" }}
                      >
                        <img
                          src="/raileats-logo.png"
                          alt="RailEats"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              "none";
                          }}
                          style={{
                            width: 28,
                            height: 28,
                            objectFit: "contain",
                            transform: "translateZ(0)",
                          }}
                        />
                        <div
                          className="fallback-dot"
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            background: "#111",
                            display: "none",
                          }}
                        />
                      </div>

                      <style>{`
                        @keyframes re-loader-spin {
                          from { transform: rotate(0deg); }
                          to { transform: rotate(360deg); }
                        }
                      `}</style>
                    </div>
                  )}
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
    </div>
  );
}
