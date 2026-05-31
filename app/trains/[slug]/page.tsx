"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useBooking } from "../../../lib/useBooking";
import SaveOrderData from "@/components/SaveOrderData";

const SUPABASE_URL = "https://ygisiztmuzwxpnvhwrmr.supabase.co";

/* ================= HELPERS ================= */

function toSlug(str: string) {
  return (str || "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9-]/g, "");
}

function cleanTrainName(value?: string | null) {
  const v = String(value || "").trim();

  if (!v || v.toLowerCase() === "train" || v.toLowerCase() === "undefined") {
    return "";
  }

  return v;
}

function useNow() {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  return now;
}

function parseDateParts(date: string) {
  if (!date) return null;

  if (date.includes(" ")) {
    const [day, mon, year] = date.split(" ");
    const months: any = {
      Jan: 0,
      Feb: 1,
      Mar: 2,
      Apr: 3,
      May: 4,
      Jun: 5,
      Jul: 6,
      Aug: 7,
      Sep: 8,
      Oct: 9,
      Nov: 10,
      Dec: 11,
    };

    return {
      y: Number(year),
      m: months[mon] ?? 0,
      d: Number(day),
    };
  }

  const [y, m, d] = date.split("-").map(Number);

  return {
    y,
    m: (m || 1) - 1,
    d,
  };
}

function parseTimeParts(t: string) {
  if (!t) return { h: 0, m: 0, s: 0 };

  const p = t.split(":").map(Number);

  return {
    h: p[0] ?? 0,
    m: p[1] ?? 0,
    s: p[2] ?? 0,
  };
}

function getRemaining(arrival: string, date: string, cutoffMin: number) {
  try {
    const dp = parseDateParts(date);
    const tp = parseTimeParts(arrival);

    if (!dp) return 0;

    const arrivalDT = new Date(dp.y, dp.m, dp.d, tp.h, tp.m, tp.s);
    const deadlineDT = new Date(arrivalDT.getTime() - cutoffMin * 60000);

    return deadlineDT.getTime() - Date.now();
  } catch {
    return 0;
  }
}

function toMin(t: string) {
  const [h, m] = (t || "").slice(0, 5).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function getRestroImage(path?: string | null) {
  if (!path) return "";

  const file = String(path).split("/").pop();
  if (!file) return "";

  return `${SUPABASE_URL}/storage/v1/object/public/RestroDisplayPhoto/${file}`;
}

/* ================= PAGE ================= */

export default function TrainPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const { setTrain, setJourney } = useBooking();

  const slug = (params as any)?.slug || "";
  const trainNumber = slug.match(/^(\d+)/)?.[1] || "";

  const urlDate = searchParams.get("date") || "";
  const boarding = (searchParams.get("boarding") || "").toUpperCase();
  const urlTrainName = cleanTrainName(searchParams.get("trainName"));

  const [stations, setStations] = useState<any[]>([]);
  const [resolvedTrainName, setResolvedTrainName] = useState(urlTrainName);
  const [loading, setLoading] = useState(true);

  useNow();

  const displayTrainName = useMemo(() => {
    return cleanTrainName(resolvedTrainName || urlTrainName);
  }, [resolvedTrainName, urlTrainName]);

  const orderData = {
    train_number: trainNumber,
    train_name: displayTrainName,
    date: urlDate,
    station_code: boarding,
  };

  useEffect(() => {
    if (!trainNumber) return;

    setTrain({
      number: trainNumber,
      name: displayTrainName,
    });

    setJourney(urlDate, boarding);
  }, [trainNumber, displayTrainName, urlDate, boarding, setTrain, setJourney]);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        const res = await fetch(
          `/api/train-restros?train=${encodeURIComponent(
            trainNumber
          )}&date=${encodeURIComponent(urlDate)}&boarding=${encodeURIComponent(
            boarding
          )}&full=1`,
          { cache: "no-store" }
        );

        const json = await res.json();
        const nextStations = json?.stations || [];

        setStations(nextStations);

        const apiTrainName =
          cleanTrainName(json?.train?.trainName) ||
          cleanTrainName(json?.trainName) ||
          cleanTrainName(nextStations?.[0]?.trainName) ||
          cleanTrainName(nextStations?.[0]?.TrainName);

        if (apiTrainName) setResolvedTrainName(apiTrainName);
      } catch (e) {
        console.error("API ERROR:", e);
      } finally {
        setLoading(false);
      }
    }

    if (trainNumber) fetchData();
  }, [trainNumber, urlDate, boarding]);

  if (loading) {
    return (
      <main
        style={{
          minHeight: "70vh",
          display: "grid",
          placeItems: "center",
          padding: 24,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 34,
              height: 34,
              border: "4px solid #f97316",
              borderTopColor: "transparent",
              borderRadius: 999,
              margin: "0 auto 12px",
              animation: "spin 1s linear infinite",
            }}
          />

          <div style={{ fontWeight: 800, color: "#334155" }}>
            Loading restaurants...
          </div>
        </div>

        <style jsx>{`
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </main>
    );
  }

  return (
    <main
      style={{
        width: "100%",
        maxWidth: 760,
        margin: "0 auto",
        padding: "14px 12px 92px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <SaveOrderData data={orderData} />

      <section
        style={{
          background: "#fff",
          border: "1px solid #dbe4ef",
          borderRadius: 18,
          padding: 16,
          boxShadow: "0 8px 22px rgba(15,23,42,0.06)",
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 900,
            color: "#64748b",
            letterSpacing: 0.5,
            marginBottom: 9,
          }}
        >
          TRAIN FOOD DELIVERY
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            minWidth: 0,
          }}
        >
          <span
            style={{
              width: 34,
              height: 34,
              borderRadius: 12,
              background: "#fff7ed",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid #fed7aa",
              boxShadow: "0 4px 12px rgba(15,23,42,0.06)",
              flexShrink: 0,
              fontSize: 19,
            }}
          >
            🚆
          </span>

          <div style={{ minWidth: 0 }}>
            <h1
              style={{
                margin: 0,
                fontSize: "clamp(22px, 5vw, 26px)",
                lineHeight: 1.12,
                fontWeight: 950,
                color: "#0f172a",
                letterSpacing: 0,
              }}
            >
              Food in Train {trainNumber}
              {displayTrainName ? ` - ${displayTrainName}` : ""}
            </h1>

            <div
              style={{
                marginTop: 12,
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              <div
                style={{
                  border: "1px solid #f3e8c5",
                  borderRadius: 12,
                  padding: "10px 12px",
                  background: "#fffdf7",
                }}
              >
                <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>
                  Boarding
                </div>
                <div style={{ marginTop: 3, fontSize: 16, fontWeight: 950 }}>
                  {boarding || "-"}
                </div>
              </div>

              <div
                style={{
                  border: "1px solid #f3e8c5",
                  borderRadius: 12,
                  padding: "10px 12px",
                  background: "#fffdf7",
                }}
              >
                <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>
                  Journey Date
                </div>
                <div style={{ marginTop: 3, fontSize: 16, fontWeight: 950 }}>
                  {urlDate || "-"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {stations.map((st: any, index: number) => {
        const stationCode = st.StationCode;
        const stationName = st.StationName;
        const arrives = st.Arrives;
        const halt = st.HaltTime;
        const deliveryDate = st.date || urlDate;
        const state = st.State || "";

        const vendors = st.vendors || [];

        const validVendors = vendors.filter((r: any) => {
          const cutoff =
            parseInt(String(r.CutOffTime ?? r.cutoff_time ?? "0").trim(), 10) ||
            0;

          const remaining = getRemaining(arrives, deliveryDate, cutoff);
          const cleanArrives = (arrives || "").slice(0, 5);
          const arrivalMin = toMin(cleanArrives);

          const start = r.OpenTime || r.open_time;
          const end = r.ClosedTime || r.closed_time;

          let timeValid = true;

          if (start && end) {
            const s = toMin(start);
            const e = toMin(end);

            if (e >= s) {
              timeValid = arrivalMin >= s && arrivalMin <= e;
            } else {
              timeValid = arrivalMin >= s || arrivalMin <= e;
            }
          }

          return remaining > 0 && timeValid;
        });

        if (!validVendors.length) return null;

        return (
          <section
            key={index}
            style={{
              background: "#f8fafc",
              border: "1px solid #dbe4ef",
              borderRadius: 18,
              padding: 13,
              boxShadow: "0 8px 22px rgba(15,23,42,0.05)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 12,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <h2
                  style={{
                    margin: 0,
                    fontSize: 18,
                    lineHeight: 1.18,
                    fontWeight: 950,
                    color: "#0f172a",
                  }}
                >
                  📍 {stationName} ({stationCode})
                </h2>

                {state ? (
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 12,
                      color: "#475569",
                      fontWeight: 800,
                    }}
                  >
                    {state}
                  </div>
                ) : null}

                <div
                  style={{
                    marginTop: 4,
                    fontSize: 12,
                    color: "#64748b",
                    fontWeight: 750,
                  }}
                >
                  Delivery date: {deliveryDate}
                </div>
              </div>

              <div
                style={{
                  flexShrink: 0,
                  textAlign: "right",
                  fontSize: 12,
                  fontWeight: 850,
                }}
              >
                <div style={{ color: "#2563eb" }}>Arrival {arrives}:</div>
                <div style={{ marginTop: 4, color: "#64748b" }}>
                  Halt: {halt || "-"}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {validVendors.map((r: any) => {
                const cutoff =
                  parseInt(
                    String(r.CutOffTime ?? r.cutoff_time ?? "0").trim(),
                    10
                  ) || 0;

                const remaining = getRemaining(arrives, deliveryDate, cutoff);
                const totalSec = Math.max(0, Math.floor(remaining / 1000));

                const days = Math.floor(totalSec / 86400);
                const hrs = Math.floor((totalSec % 86400) / 3600);
                const mins = Math.floor((totalSec % 3600) / 60);
                const secs = totalSec % 60;

                const timeText =
                  `Day${days} ` +
                  `${String(hrs).padStart(2, "0")}:` +
                  `${String(mins).padStart(2, "0")}:` +
                  `${String(secs).padStart(2, "0")}`;

                const isClosingSoon = remaining <= 10 * 60 * 1000;
                const img = getRestroImage(r.RestroDisplayPhoto);

                const stationSlug = `${stationCode}-${toSlug(stationName)}`;
                const restroSlug = `${r.RestroCode}-${toSlug(r.RestroName)}`;
                const cleanArrival =
                  arrives && arrives.includes(":") ? arrives.slice(0, 5) : "";
                const finalTrainName = displayTrainName || "Train";

                return (
                  <article
                    key={r.RestroCode}
                    style={{
                      background: "#fff",
                      border: "1px solid #dbe4ef",
                      borderRadius: 16,
                      padding: 10,
                      display: "grid",
                      gridTemplateColumns: "82px minmax(0,1fr)",
                      gap: 11,
                    }}
                  >
                    <div
                      style={{
                        width: 82,
                        height: 82,
                        background: "#f1f5f9",
                        borderRadius: 14,
                        overflow: "hidden",
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      {img ? (
                        <img
                          src={img}
                          alt={r.RestroName || "Restaurant"}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            height: "100%",
                            display: "grid",
                            placeItems: "center",
                            color: "#94a3b8",
                            fontSize: 22,
                          }}
                        >
                          🍽️
                        </div>
                      )}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: 8,
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 16,
                              lineHeight: 1.18,
                              fontWeight: 950,
                              color: "#0f172a",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            🍴 {r.RestroName}
                          </div>

                          <div
                            style={{
                              marginTop: 4,
                              fontSize: 12,
                              color: "#64748b",
                              fontWeight: 800,
                            }}
                          >
                            Min Order: Rs {r.MinimumOrderValue || 0}
                          </div>
                        </div>

                        <a
                          href={`/Stations/${stationSlug}/${restroSlug}?deliveryDate=${encodeURIComponent(
                            deliveryDate
                          )}${
                            cleanArrival
                              ? `&deliveryTime=${encodeURIComponent(
                                  cleanArrival
                                )}`
                              : ""
                          }${
                            cleanArrival
                              ? `&arrival=${encodeURIComponent(cleanArrival)}`
                              : ""
                          }&train=${encodeURIComponent(
                            trainNumber
                          )}&trainName=${encodeURIComponent(
                            finalTrainName
                          )}&boarding=${encodeURIComponent(
                            boarding
                          )}&minOrder=${encodeURIComponent(
                            r.MinimumOrderValue || 0
                          )}`}
                          style={{
                            flexShrink: 0,
                            background: "#f97316",
                            color: "#fff",
                            borderRadius: 12,
                            padding: "9px 12px",
                            fontSize: 13,
                            fontWeight: 900,
                            textDecoration: "none",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Order Now
                        </a>
                      </div>

                      <div
                        style={{
                          marginTop: 6,
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "5px 10px",
                          alignItems: "center",
                          fontSize: 12,
                          fontWeight: 850,
                        }}
                      >
                        <span style={{ color: "#16a34a" }}>
                          {Number(r.IsPureVeg) === 1 ? "Pure Veg" : "Veg & Non-Veg"}
                        </span>
                        <span
                          style={{
                            color: isClosingSoon ? "#dc2626" : "#2563eb",
                          }}
                        >
                          Order before: {timeText}
                        </span>
                        {isClosingSoon ? (
                          <span style={{ color: "#dc2626" }}>Closing soon</span>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </main>
  );
}
