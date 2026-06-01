"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Clock, TrainFront, Utensils } from "lucide-react";
import { useBooking } from "../../../lib/useBooking";
import SaveOrderData from "@/components/SaveOrderData";

const SUPABASE_URL = "https://ygisiztmuzwxpnvhwrmr.supabase.co";

function toSlug(str: string) {
  return String(str || "").trim().replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-]/g, "");
}

function cleanTime(t: string) {
  return String(t || "").slice(0, 5);
}

function formatJourneyDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value || "";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).replace(/ /g, " ");
}

function parseDateParts(date: string) {
  const d = new Date(date);
  if (!Number.isNaN(d.getTime())) {
    return { y: d.getFullYear(), m: d.getMonth(), d: d.getDate() };
  }

  const [day, mon, year] = String(date || "").split(" ");
  const months: any = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
  return { y: Number(year), m: months[mon] ?? 0, d: Number(day) };
}

function parseTimeParts(t: string) {
  const p = String(t || "").split(":").map(Number);
  return { h: p[0] ?? 0, m: p[1] ?? 0, s: p[2] ?? 0 };
}

function getRemaining(arrival: string, date: string, cutoffMin: number) {
  try {
    const dp = parseDateParts(date);
    const tp = parseTimeParts(arrival);
    const arrivalDT = new Date(dp.y, dp.m, dp.d, tp.h, tp.m, tp.s);
    const deadlineDT = new Date(arrivalDT.getTime() - cutoffMin * 60000);
    return deadlineDT.getTime() - Date.now();
  } catch {
    return 0;
  }
}

function toMin(t: string) {
  const [h, m] = String(t || "").slice(0, 5).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function getRestroImage(path?: string | null) {
  if (!path) return "";
  const file = String(path).split("/").pop();
  if (!file) return "";
  return `${SUPABASE_URL}/storage/v1/object/public/RestroDisplayPhoto/${file}`;
}

export default function PnrPage() {
  const params: any = useParams();
  const pnr = params?.pnr;

  const { setTrain, setJourney } = useBooking();

  const [pnrData, setPnrData] = useState<any>(null);
  const [stations, setStations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const trainNumber = pnrData?.trainNo || pnrData?.trainNumber || "";
  const trainName = pnrData?.trainName || "";
  const boarding = String(pnrData?.boardingPoint || pnrData?.source || "").toUpperCase();
  const journeyDate = formatJourneyDate(pnrData?.dateOfJourney || pnrData?.journeyDate || "");
  const passenger = pnrData?.passengers?.[0] || {};
  const coach = passenger?.coachId || passenger?.currentCoachId || passenger?.BookingCoachId || "";
  const berth = passenger?.berthNo || passenger?.currentBerthNo || passenger?.BookingBerthNo || "";

  useEffect(() => {
    if (!pnr) return;

    async function load() {
      try {
        setLoading(true);

        const pnrRes = await fetch(`/api/pnr/${encodeURIComponent(pnr)}`, {
          cache: "no-store",
        });

        const pnrJson = await pnrRes.json();
        setPnrData(pnrJson);

        if (!pnrJson?.ok) return;

        const nextTrain = pnrJson.trainNo || pnrJson.trainNumber || "";
        const nextBoarding = String(pnrJson.boardingPoint || pnrJson.source || "").toUpperCase();
        const nextDate = formatJourneyDate(pnrJson.dateOfJourney || pnrJson.journeyDate || "");

        setTrain({
          number: nextTrain,
          name: pnrJson.trainName || "",
        });

        setJourney(nextDate, nextBoarding);

        localStorage.setItem(
          "raileats_pnr_details",
          JSON.stringify({
            pnr,
            trainNumber: nextTrain,
            trainName: pnrJson.trainName || "",
            boarding: nextBoarding,
            journeyDate: nextDate,
            coach:
              pnrJson?.passengers?.[0]?.coachId ||
              pnrJson?.passengers?.[0]?.currentCoachId ||
              "",
            berth:
              pnrJson?.passengers?.[0]?.berthNo ||
              pnrJson?.passengers?.[0]?.currentBerthNo ||
              "",
          })
        );

        const restroRes = await fetch(
          `/api/train-restros?train=${encodeURIComponent(nextTrain)}&date=${encodeURIComponent(nextDate)}&boarding=${encodeURIComponent(nextBoarding)}&full=1`,
          { cache: "no-store" }
        );

        const restroJson = await restroRes.json();
        setStations(restroJson?.stations || []);
      } catch (e) {
        setPnrData({ ok: false, error: String(e) });
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [pnr, setTrain, setJourney]);

  const orderData = {
    pnr_number: pnr,
    train_number: trainNumber,
    train_name: trainName,
    date: journeyDate,
    station_code: boarding,
    coach,
    berth,
  };

  if (loading) return <main style={{ padding: 24 }}>Loading restaurants...</main>;
  if (!pnrData?.ok) return <main style={{ padding: 24 }}>Error: {String(pnrData?.error || "PNR not found")}</main>;

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

      <section style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 20, padding: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 8 }}>
          PNR FOOD DELIVERY
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <span style={{ width: 34, height: 34, borderRadius: 12, background: "#fff7ed", display: "grid", placeItems: "center", color: "#f97316" }}>
            <TrainFront size={18} />
          </span>

          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 17, lineHeight: 1.25, fontWeight: 700, color: "#1e293b" }}>
              {trainNumber} - {trainName}
            </h1>

            <div style={{ marginTop: 8, fontSize: 12, color: "#475569", lineHeight: 1.6 }}>
              <div>PNR: {pnr}</div>
              <div>Boarding: {boarding || "-"}</div>
              <div>Journey Date: {journeyDate || "-"}</div>
              <div>Coach/Seat: {coach || "-"} {berth || ""}</div>
            </div>
          </div>
        </div>
      </section>

      {stations.map((st: any, index: number) => {
        const stationCode = st.StationCode;
        const stationName = st.StationName;
        const arrives = st.Arrives;
        const halt = st.HaltTime;
        const deliveryDate = st.date || journeyDate;
        const vendors = st.vendors || [];

        const validVendors = vendors.filter((r: any) => {
          const cutoff = parseInt(String(r.CutOffTime ?? r.cutoff_time ?? "0"), 10) || 0;
          const remaining = getRemaining(arrives, deliveryDate, cutoff);
          const arrivalMin = toMin(cleanTime(arrives));
          const start = r.OpenTime || r.open_time;
          const end = r.ClosedTime || r.closed_time;

          let timeValid = true;
          if (start && end) {
            const s = toMin(start);
            const e = toMin(end);
            timeValid = e >= s ? arrivalMin >= s && arrivalMin <= e : arrivalMin >= s || arrivalMin <= e;
          }

          return remaining > 0 && timeValid;
        });

        if (!validVendors.length) return null;

        return (
          <section key={index} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 20, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 15, lineHeight: 1.25, fontWeight: 700, color: "#1e293b" }}>
                  📍 {stationName} ({stationCode})
                </h2>
                <div style={{ marginTop: 3, fontSize: 11, color: "#94a3b8" }}>
                  Delivery date: {deliveryDate}
                </div>
              </div>

              <div style={{ textAlign: "right", fontSize: 11, fontWeight: 700 }}>
                <div style={{ color: "#2563eb" }}>Arrival {arrives}</div>
                <div style={{ marginTop: 3, color: "#64748b" }}>Halt: {halt || "-"}</div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {validVendors.map((r: any) => {
                const cutoff = parseInt(String(r.CutOffTime ?? r.cutoff_time ?? "0"), 10) || 0;
                const remaining = getRemaining(arrives, deliveryDate, cutoff);
                const totalSec = Math.max(0, Math.floor(remaining / 1000));
                const days = Math.floor(totalSec / 86400);
                const hrs = Math.floor((totalSec % 86400) / 3600);
                const mins = Math.floor((totalSec % 3600) / 60);
                const secs = totalSec % 60;
                const timeText = `Day${days} ${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

                const img = getRestroImage(r.RestroDisplayPhoto);
                const stationSlug = `${stationCode}-${toSlug(stationName)}`;
                const restroSlug = `${r.RestroCode}-${toSlug(r.RestroName)}`;
                const cleanArrival = cleanTime(arrives);

                return (
                  <article key={r.RestroCode} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 18, padding: 11 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "82px minmax(0, 1fr)", gap: 10 }}>
                      <div style={{ width: 82, height: 82, background: "#f1f5f9", borderRadius: 14, overflow: "hidden" }}>
                        {img ? <img src={img} alt={r.RestroName} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Utensils size={24} />}
                      </div>

                      <div>
                        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1e293b" }}>
                          {r.RestroName}
                        </h3>

                        <div style={{ marginTop: 7, fontSize: 12, color: "#64748b" }}>
                          Min Order: Rs {r.MinimumOrderValue || 0}
                        </div>

                        <div style={{ marginTop: 6, color: "#2563eb", fontSize: 11, fontWeight: 700 }}>
                          <Clock size={13} /> Order before: {timeText}
                        </div>

                        <a
                          href={`/Stations/${stationSlug}/${restroSlug}?deliveryDate=${encodeURIComponent(deliveryDate)}&deliveryTime=${encodeURIComponent(cleanArrival)}&arrival=${encodeURIComponent(cleanArrival)}&train=${encodeURIComponent(trainNumber)}&trainName=${encodeURIComponent(trainName || "Train")}&boarding=${encodeURIComponent(boarding)}&minOrder=${encodeURIComponent(r.MinimumOrderValue || 0)}&pnr=${encodeURIComponent(String(pnr))}&coach=${encodeURIComponent(String(coach || ""))}&berth=${encodeURIComponent(String(berth || ""))}`}
                          style={{ marginTop: 10, display: "inline-block", background: "#f97316", color: "#fff", borderRadius: 11, padding: "9px 14px", fontSize: 12, fontWeight: 700, textDecoration: "none" }}
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
