"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import StationSearchBox, { Station } from "./StationSearchBox";

export default function SearchBox() {
  const router = useRouter();
  const [searchType, setSearchType] = useState<"pnr" | "train" | "station">("pnr");
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

  const handleSearch = async () => {
    if (!inputValue || inputValue.trim() === "") {
      alert("Please enter value");
      return;
    }

    const q = inputValue.trim();

    try {
      setLoading(true);

      if (searchType === "station") {
        // prefer selectedStation if present
        const rawCode = selectedStation?.StationCode ?? extractStationCode(q);
        const safe = encodeURIComponent(String(rawCode).toUpperCase());
        // await navigation so we can show loader until page loads
        await router.push(`/Stations/${safe}`);
        return;
      }

      if (searchType === "pnr") {
        await router.push(`/pnr/${encodeURIComponent(q)}`);
        return;
      }

      await router.push(`/trains/${encodeURIComponent(q)}`);
    } catch (err) {
      console.error("Navigation error:", err);
    } finally {
      // small delay to avoid abrupt hide (optional)
      setTimeout(() => setLoading(false), 300);
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
        <div className="w-full rounded-md border overflow-hidden p-3">
          {searchType === "station" ? (
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <StationSearchBox
                  onSelect={(s) => {
                    const val = s ? (s.StationCode ?? s.StationName ?? "") : "";
                    const display = s ? `${s.StationName}${s.StationCode ? ` (${s.StationCode})` : ""}` : "";
                    setInputValue(display || val);
                    setSelectedStation(s);
                  }}
                  initialValue={inputValue}
                />
              </div>

              {/* buttons right to the input (aligned) */}
              <div className="flex flex-col items-end gap-2">
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
                    className={`px-4 py-2 bg-black text-white rounded text-sm ${loading ? "opacity-70 cursor-wait" : ""}`}
                  >
                    Search
                  </button>

                  {/* spinner bubble (shows while loading) */}
                  {loading && (
                    <div
                      aria-hidden
                      className="absolute -right-10 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center shadow animate-spin"
                      style={{ background: "#fff" }}
                    >
                      {/* put logo image in public/logo.png for best effect */}
                      <img
                        src="/raileats-logo.png"
                        alt="RE"
                        style={{ width: 26, height: 26, objectFit: "contain" }}
                        onError={(e) => {
                          // if logo missing show short text fallback
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                      {/* fallback small dot if image fails */}
                      <span style={{ fontSize: 10, color: "#111", fontWeight: 700 }}>RE</span>
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
                className="shrink-0 w-20 sm:w-24 px-3 py-2 text-sm bg-black text-white hover:bg-gray-800 ml-2 rounded"
              >
                {loading ? "..." : "Search"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
