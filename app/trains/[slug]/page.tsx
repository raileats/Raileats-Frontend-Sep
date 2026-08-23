// app/trains/[slug]/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Clock, TrainFront, Utensils } from "lucide-react";
import { useBooking } from "../../../lib/useBooking";
import SaveOrderData from "@/components/SaveOrderData";
import PnrSearchBox from "@/components/PnrSearchBox";

const SUPABASE_URL = "https://ygisiztmuzwxpnvhwrmr.supabase.co";

function toSlug(str: string) {
  return (str || "").trim().replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-]/g, "");
}

function cleanTrainName(value?: string | null) {
  const v = String(value || "").trim();
  if (!v || v.toLowerCase() === "train" || v.toLowerCase() === "undefined") return "";
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
    const months: any = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
    return { y: Number(year), m: months[mon] ?? 0, d: Number(day) };
  }
  const [y, m, d] = date.split("-").map(Number);
  return { y, m: (m || 1) - 1, d };
}

function parseTimeParts(t: string) {
  if (!t) return { h: 0, m: 0, s: 0 };
  const p = t.split(":").map(Number);
  return { h: p[0] ?? 0, m: p[1] ?? 0, s: p[2] ?? 0 };
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

  const displayTrainName = useMemo(() => cleanTrainName(resolvedTrainName || urlTrainName), [resolvedTrainName, urlTrainName]);
  const isSeoPreview = !urlDate || !boarding;
  const orderData = { train_number: trainNumber, train_name: displayTrainName, date: urlDate, station_code: boarding };

  useEffect(() => {
    if (!trainNumber) return;
    setTrain({ number: trainNumber, name: displayTrainName });
    if (!isSeoPreview) setJourney(urlDate, boarding);
  }, [trainNumber, displayTrainName, urlDate, boarding, isSeoPreview, setTrain, setJourney]);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const res = await fetch(`/api/train-restros?train=${encodeURIComponent(trainNumber)}&date=${encodeURIComponent(urlDate)}&boarding=${encodeURIComponent(boarding)}&preview=${isSeoPreview ? "1" : "0"}`, { cache: "no-store" });
        const json = await res.json();
        const nextStations = json?.stations || [];
        setStations(nextStations);
        const apiTrainName = cleanTrainName(json?.train?.trainName) || cleanTrainName(json?.trainName) || cleanTrainName(nextStations?.[0]?.trainName) || cleanTrainName(nextStations?.[0]?.TrainName);
        if (apiTrainName) setResolvedTrainName(apiTrainName);
      } catch (e) {
        console.error("API ERROR:", e);
      } finally {
        setLoading(false);
      }
    }
    if (trainNumber) fetchData();
  }, [trainNumber, urlDate, boarding, isSeoPreview]);

  if (loading) {
    return (
      <main style={{ minHeight: "70vh", display: "grid", placeItems: "center", padding: 24 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 32, height: 32, border: "3px solid #f97316", borderTopColor: "transparent", borderRadius: 999, margin: "0 auto 10px", animation: "spin 1s linear infinite" }} />
          <div style={{ fontWeight: 700, color: "#475569", fontSize: 14 }}>Loading restaurants...</div>
        </div>
        <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </main>
    );
  }

  return (
    <main style={{ width: "100%", maxWidth: 720, margin: "0 auto", padding: "8px 10px 92px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 12 }}>
      {!isSeoPreview ? <SaveOrderData data={orderData} /> : null}

      <section style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 18, padding: 12, boxShadow: "0 2px 10px rgba(15,23,42,0.04)" }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: "#64748b", letterSpacing: 0.5, marginBottom: 7, textTransform: "uppercase" }}>Train Food Delivery</div>
        <div style={{ display: "grid", gridTemplateColumns: "30px minmax(0, 1fr)", gap: 9, alignItems: "start" }}>
          <span style={{ width: 30, height: 30, borderRadius: 11, background: "#fff7ed", display: "inline-flex", alignItems: "center", justifyContent: "center", border: "1px solid #fed7aa", color: "#f97316" }}><TrainFront size={16} strokeWidth={2.2} /></span>
          <div style={{ minWidth: 0 }}><h1 style={{ margin: 0, fontSize: "clamp(13px, 3.5vw, 18px)", lineHeight: 1.18, fontWeight: 800, color: "#1e293b", letterSpacing: "-0.15px" }}>Food in Train {trainNumber}{displayTrainName ? ` - ${displayTrainName}` : ""}</h1></div>
        </div>
      </section>

      {isSeoPreview ? <PnrSearchBox /> : null}
      {stations.length > 0 ? <h2 style={{ margin: "4px 2px 0", fontSize: 18, lineHeight: 1.3, fontWeight: 800, color: "#1e293b" }}>Stations with Active Restaurants</h2> : null}

      {stations.map((st: any, index: number) => {
        const stationCode = st.StationCode;
        const stationName = st.StationName;
        const arrives = st.Arrives;
        const halt = st.HaltTime;
        const deliveryDate = st.date || urlDate;
        const state = st.State || "";
        const vendors = st.vendors || [];

        const validVendors = vendors.filter((r: any) => {
          if (isSeoPreview) return true;
          const cutoff = parseInt(String(r.CutOffTime ?? r.cutoff_time ?? "0").trim(), 10) || 0;
          const remaining = getRemaining(arrives, deliveryDate, cutoff);
          const arrivalMin = toMin((arrives || "").slice(0, 5));
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
          <section key={index} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 20, padding: 12, boxShadow: "0 2px 10px rgba(15,23,42,0.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ margin: 0, fontSize: 15, lineHeight: 1.25, fontWeight: 700, color: "#1e293b" }}>📍 {stationName} ({stationCode})</h2>
                {state ? <div style={{ marginTop: 3, fontSize: 11, color: "#64748b", fontWeight: 600 }}>{state}</div> : null}
                <div style={{ marginTop: 3, fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>Delivery date: {deliveryDate}</div>
              </div>
              <div style={{ flexShrink: 0, textAlign: "right", fontSize: 11, fontWeight: 700 }}><div style={{ color: "#2563eb" }}>Arrival {arrives}</div><div style={{ marginTop: 3, color: "#64748b" }}>Halt: {halt || "-"}</div></div>
            </div>

            <div className="train-restaurants-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
              {validVendors.map((r: any) => {
                const cutoff = parseInt(String(r.CutOffTime ?? r.cutoff_time ?? "0").trim(), 10) || 0;
                const remaining = getRemaining(arrives, deliveryDate, cutoff);
                const totalSec = Math.max(0, Math.floor(remaining / 1000));
                const days = Math.floor(totalSec / 86400);
                const hrs = Math.floor((totalSec % 86400) / 3600);
                const mins = Math.floor((totalSec % 3600) / 60);
                const secs = totalSec % 60;
                const timeText = `Day${days} ${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
                const isClosingSoon = remaining <= 10 * 60 * 1000;
                const img = getRestroImage(r.RestroDisplayPhoto);
                const rating = Number(r.RestroRating);
                const displayRating = Number.isFinite(rating) && rating > 0 ? rating.toFixed(1) : "";
                const stationSlug = `${stationCode}-${toSlug(stationName)}`;
                const restroSlug = `${r.RestroCode}-${toSlug(r.RestroName)}`;
                const cleanArrival = arrives && arrives.includes(":") ? arrives.slice(0, 5) : "";
                const finalTrainName = displayTrainName || "Train";
                const href = isSeoPreview
                  ? `/stations/${stationSlug}/${restroSlug}?mode=station&stationCode=${encodeURIComponent(stationCode)}&stationName=${encodeURIComponent(stationName)}&train=${encodeURIComponent(trainNumber)}&trainName=${encodeURIComponent(finalTrainName)}&minOrder=${encodeURIComponent(r.MinimumOrderValue || 0)}`
                  : `/stations/${stationSlug}/${restroSlug}?deliveryDate=${encodeURIComponent(deliveryDate)}${cleanArrival ? `&deliveryTime=${encodeURIComponent(cleanArrival)}` : ""}${cleanArrival ? `&arrival=${encodeURIComponent(cleanArrival)}` : ""}&train=${encodeURIComponent(trainNumber)}&trainName=${encodeURIComponent(finalTrainName)}&boarding=${encodeURIComponent(boarding)}&minOrder=${encodeURIComponent(r.MinimumOrderValue || 0)}`;

                return (
                  <article key={r.RestroCode} style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 18, overflow: "hidden", boxShadow: "0 3px 12px rgba(15,23,42,0.07)", minWidth: 0 }}>
                    <div style={{ position: "relative", width: "100%", height: 150, background: "#f1f5f9", overflow: "hidden" }}>
                      {img ? <img src={img} alt={r.RestroName || "Restaurant"} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : <div style={{ height: "100%", display: "grid", placeItems: "center", color: "#94a3b8" }}><Utensils size={32} strokeWidth={2.1} /></div>}
                      {displayRating ? <span style={{ position: "absolute", top: 8, left: 9, zIndex: 2, color: "#ffffff", background: "transparent", fontSize: 13, lineHeight: 1, fontWeight: 900, textShadow: "0 1px 4px rgba(0,0,0,0.85)", pointerEvents: "none", whiteSpace: "nowrap" }}>{displayRating} ★</span> : null}
                    </div>

                    <div style={{ padding: "11px 12px 12px" }}>
                      <h3 style={{ margin: 0, fontSize: 16, lineHeight: 1.2, fontWeight: 850, color: "#1e293b", overflowWrap: "anywhere" }}>{r.RestroName || "Restaurant"}</h3>
                      <div style={{ marginTop: 5, fontSize: 12, lineHeight: 1.35, color: "#64748b", fontWeight: 700 }}>{stationCode} - {stationName}</div>

                      <div style={{ marginTop: 7, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", borderRadius: 999, background: Number(r.IsPureVeg) === 1 ? "#ecfdf5" : "#f8fafc", color: Number(r.IsPureVeg) === 1 ? "#16a34a" : "#64748b", border: Number(r.IsPureVeg) === 1 ? "1px solid #bbf7d0" : "1px solid #e2e8f0", padding: "4px 8px", fontSize: 10, lineHeight: 1, fontWeight: 800, whiteSpace: "nowrap" }}>{Number(r.IsPureVeg) === 1 ? "Pure Veg" : "Veg & Non-Veg"}</div>
                        <div style={{ fontSize: 12, color: "#334155", fontWeight: 800 }}>Min Order Rs {r.MinimumOrderValue || 0}</div>
                      </div>

                      {!isSeoPreview ? <div style={{ marginTop: 8, color: isClosingSoon ? "#dc2626" : "#2563eb", display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 800 }}><Clock size={13} strokeWidth={2.2} /><span>Order before: {timeText}</span></div> : null}

                      <a href={href} style={{ display: "block", width: "100%", marginTop: 10, boxSizing: "border-box", textAlign: "center", background: "#f97316", color: "#fff", borderRadius: 12, padding: "10px 10px", fontSize: 13, fontWeight: 800, textDecoration: "none", whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(249,115,22,0.16)" }}>{isSeoPreview ? "View Menu" : "Order Now"}</a>
                    </div>
                  </article>
                );
              })}
            </div>

            <style jsx>{`@media (max-width: 520px) { .train-restaurants-grid { grid-template-columns: minmax(0, 1fr) !important; } }`}</style>
          </section>
        );
      })}

      {isSeoPreview ? (
        <section style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 20, padding: "18px 15px", boxShadow: "0 2px 10px rgba(15,23,42,0.04)", color: "#334155" }}>
          <h2 style={{ margin: 0, fontSize: 20, lineHeight: 1.3, fontWeight: 800, color: "#1e293b" }}>Order Food in Train {trainNumber}{displayTrainName ? ` - ${displayTrainName}` : ""}</h2>
          <p style={{ margin: "10px 0 0", fontSize: 14, lineHeight: 1.65 }}>Looking for fresh food delivery in train {trainNumber}{displayTrainName ? ` (${displayTrainName})` : ""}? RailEats helps you view active restaurants available on this train route and order meals for delivery at your selected railway station. Enter your 10-digit PNR above to check the correct journey date, route stations and restaurants available for your trip.</p>
          <h2 style={{ margin: "22px 0 0", fontSize: 18, lineHeight: 1.35, fontWeight: 800, color: "#1e293b" }}>How to Book Food on Train {trainNumber}</h2>
          <ol style={{ margin: "10px 0 0", paddingLeft: 21, fontSize: 14, lineHeight: 1.7 }}><li>Enter your valid 10-digit PNR number.</li><li>Choose a delivery station and an active restaurant.</li><li>Select your preferred meals from the restaurant menu.</li><li>Confirm your coach, seat and contact details.</li><li>Place the order and receive food at your train seat.</li></ol>
          <h2 style={{ margin: "22px 0 0", fontSize: 18, lineHeight: 1.35, fontWeight: 800, color: "#1e293b" }}>Food Delivery Stations for Train {trainNumber}</h2>
          <p style={{ margin: "9px 0 0", fontSize: 14, lineHeight: 1.65 }}>Restaurant availability can vary by station, journey date, arrival time and order cut-off. The station and restaurant cards shown above help you explore current food options on the route. Your PNR is verified before booking so RailEats can show delivery choices relevant to your actual journey.</p>
          <h2 style={{ margin: "22px 0 0", fontSize: 18, lineHeight: 1.35, fontWeight: 800, color: "#1e293b" }}>Frequently Asked Questions</h2>
          <div style={{ marginTop: 10, display: "grid", gap: 9 }}>
            {[{ q: `Can I order food online in train ${trainNumber}?`, a: `Yes. Enter your PNR to see eligible delivery stations and active restaurants for train ${trainNumber}.` }, { q: "Is a PNR required to place the order?", a: "Yes. PNR verification helps confirm your train, journey date and eligible delivery stations before you order." }, { q: "Where will my food be delivered?", a: "Your order is delivered at the railway station selected during booking, using the coach and seat details provided with the order." }, { q: "Why can restaurant availability change?", a: "Availability depends on the station, restaurant status, train arrival time, journey date and the restaurant's order cut-off." }].map((faq) => <details key={faq.q} style={{ border: "1px solid #e2e8f0", borderRadius: 13, padding: "11px 12px", background: "#f8fafc" }}><summary style={{ cursor: "pointer", fontSize: 14, lineHeight: 1.45, fontWeight: 800, color: "#1e293b" }}>{faq.q}</summary><p style={{ margin: "8px 0 0", fontSize: 13, lineHeight: 1.6, color: "#475569" }}>{faq.a}</p></details>)}
          </div>
          <p style={{ margin: "18px 0 0", fontSize: 12, lineHeight: 1.6, color: "#64748b" }}>Train timings, route information and restaurant availability may change. Please verify your journey using PNR before placing an order.</p>
        </section>
      ) : null}
    </main>
  );
}
