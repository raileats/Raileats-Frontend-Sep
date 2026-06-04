"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Clock, TrainFront, Utensils } from "lucide-react";
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
              width: 32,
              height: 32,
              border: "3px solid #f97316",
              borderTopColor: "transparent",
              borderRadius: 999,
              margin: "0 auto 10px",
              animation: "spin 1s linear infinite",
            }}
          />

          <div
            style={{
              fontWeight: 700,
              color: "#475569",
              fontSize: 14,
            }}
          >
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
        maxWidth: 720,
        margin: "0 auto",
        padding: "8px 10px 92px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <SaveOrderData data={orderData} />

      <section
  style={{
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 18,
    padding: 12,
    boxShadow: "0 2px 10px rgba(15,23,42,0.04)",
  }}
>
  <div
    style={{
      fontSize: 10,
      fontWeight: 800,
      color: "#64748b",
      letterSpacing: 0.5,
      marginBottom: 7,
      textTransform: "uppercase",
    }}
  >
    Train Food Delivery
  </div>

  <div
    style={{
      display: "grid",
      gridTemplateColumns: "30px minmax(0, 1fr)",
      gap: 9,
      alignItems: "start",
    }}
  >
    <span
      style={{
        width: 30,
        height: 30,
        borderRadius: 11,
        background: "#fff7ed",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        border: "1px solid #fed7aa",
        color: "#f97316",
      }}
    >
      <TrainFront size={16} strokeWidth={2.2} />
    </span>

    <div style={{ minWidth: 0 }}>
      <h1
        style={{
          margin: 0,
          fontSize: "clamp(13px, 3.5vw, 18px)",
          lineHeight: 1.18,
          fontWeight: 800,
          color: "#1e293b",
          letterSpacing: "-0.15px",
        }}
      >
        Food in Train {trainNumber}
        {displayTrainName ? ` - ${displayTrainName}` : ""}
      </h1>

      <div
        style={{
          marginTop: 9,
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 7,
        }}
      >
        <div
          style={{
            border: "1px solid #f3e8c5",
            borderRadius: 11,
            padding: "7px 9px",
            background: "#fffdf7",
          }}
        >
          <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700 }}>
            Boarding
          </div>

          <div
            style={{
              marginTop: 1,
              fontSize: 13,
              fontWeight: 800,
              color: "#1e293b",
            }}
          >
            {boarding || "-"}
          </div>
        </div>

        <div
          style={{
            border: "1px solid #f3e8c5",
            borderRadius: 11,
            padding: "7px 9px",
            background: "#fffdf7",
          }}
        >
          <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700 }}>
            Journey Date
          </div>

          <div
            style={{
              marginTop: 1,
              fontSize: 13,
              fontWeight: 800,
              color: "#1e293b",
              wordBreak: "break-word",
            }}
          >
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
              border: "1px solid #e2e8f0",
              borderRadius: 20,
              padding: 12,
              boxShadow: "0 2px 10px rgba(15,23,42,0.04)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                marginBottom: 10,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <h2
                  style={{
                    margin: 0,
                    fontSize: 15,
                    lineHeight: 1.25,
                    fontWeight: 700,
                    color: "#1e293b",
                  }}
                >
                  📍 {stationName} ({stationCode})
                </h2>

                {state ? (
                  <div
                    style={{
                      marginTop: 3,
                      fontSize: 11,
                      color: "#64748b",
                      fontWeight: 600,
                    }}
                  >
                    {state}
                  </div>
                ) : null}

                <div
                  style={{
                    marginTop: 3,
                    fontSize: 11,
                    color: "#94a3b8",
                    fontWeight: 500,
                  }}
                >
                  Delivery date: {deliveryDate}
                </div>
              </div>

              <div
                style={{
                  flexShrink: 0,
                  textAlign: "right",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                <div style={{ color: "#2563eb" }}>Arrival {arrives}</div>

                <div
                  style={{
                    marginTop: 3,
                    color: "#64748b",
                  }}
                >
                  Halt: {halt || "-"}
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
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
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 18,
    padding: 11,
    boxShadow: "0 1px 6px rgba(15,23,42,0.04)",
  }}
>
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "minmax(0, 1fr) 96px",
      gap: 10,
      alignItems: "stretch",
    }}
  >
    {/* LEFT DETAILS */}
    <div style={{ minWidth: 0 }}>
      <h3
        style={{
          margin: 0,
          fontSize: 16,
          lineHeight: 1.18,
          fontWeight: 800,
          color: "#1e293b",
          display: "flex",
          alignItems: "flex-start",
          gap: 6,
          overflowWrap: "anywhere",
        }}
      >
        <Utensils
          size={15}
          strokeWidth={2.2}
          style={{ color: "#64748b", flexShrink: 0, marginTop: 2 }}
        />
        <span>{r.RestroName || "Restaurant"}</span>
      </h3>

      <div
        style={{
          marginTop: 8,
          display: "inline-flex",
          alignItems: "center",
          borderRadius: 999,
          background: Number(r.IsPureVeg) === 1 ? "#ecfdf5" : "#f8fafc",
          color: Number(r.IsPureVeg) === 1 ? "#16a34a" : "#64748b",
          border:
            Number(r.IsPureVeg) === 1
              ? "1px solid #bbf7d0"
              : "1px solid #e2e8f0",
          padding: "4px 8px",
          fontSize: 10,
          lineHeight: 1,
          fontWeight: 800,
          whiteSpace: "nowrap",
        }}
      >
        {Number(r.IsPureVeg) === 1 ? "Pure Veg" : "Veg & Non-Veg"}
      </div>

      <div
        style={{
          marginTop: 9,
          fontSize: 12,
          color: "#64748b",
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          gap: 6,
          flexWrap: "wrap",
        }}
      >
        <span style={{ color: "#475569", fontWeight: 800 }}>Min Order:</span>
        <span>Rs {r.MinimumOrderValue || 0}</span>
      </div>

      <div
        style={{
          marginTop: 7,
          color: isClosingSoon ? "#dc2626" : "#2563eb",
          display: "flex",
          alignItems: "flex-start",
          gap: 6,
          lineHeight: 1.25,
          fontSize: 11,
          fontWeight: 800,
        }}
      >
        <Clock size={13} strokeWidth={2.2} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>Order before: {timeText}</span>
      </div>
    </div>

    {/* RIGHT PHOTO + BUTTON */}
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        gap: 8,
      }}
    >
      <div
        style={{
          width: "100%",
          height: 86,
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
            }}
          >
            <Utensils size={24} strokeWidth={2.1} />
          </div>
        )}
      </div>

      <a
        href={`/Stations/${stationSlug}/${restroSlug}?deliveryDate=${encodeURIComponent(
          deliveryDate
        )}${
          cleanArrival
            ? `&deliveryTime=${encodeURIComponent(cleanArrival)}`
            : ""
        }${
          cleanArrival ? `&arrival=${encodeURIComponent(cleanArrival)}` : ""
        }&train=${encodeURIComponent(trainNumber)}&trainName=${encodeURIComponent(
          finalTrainName
        )}&boarding=${encodeURIComponent(boarding)}&minOrder=${encodeURIComponent(
          r.MinimumOrderValue || 0
        )}`}
        style={{
          width: "100%",
          textAlign: "center",
          background: "#f97316",
          color: "#fff",
          borderRadius: 12,
          padding: "9px 8px",
          fontSize: 12,
          fontWeight: 800,
          textDecoration: "none",
          whiteSpace: "nowrap",
          boxShadow: "0 4px 12px rgba(249,115,22,0.16)",
        }}
      >
        Order Now
      </a>
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
