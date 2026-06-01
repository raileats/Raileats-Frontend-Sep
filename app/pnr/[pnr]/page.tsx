// app/pnr/[pnr]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

function formatDateForTrainPage(value: string) {
  if (!value) return "";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}

export default function PnrPage() {
  const params: any = useParams();
  const router = useRouter();

  const pnr = params?.pnr;
  const [message, setMessage] = useState("Fetching PNR details...");

  useEffect(() => {
    if (!pnr) return;

    async function run() {
      try {
        const res = await fetch(`/api/pnr/${encodeURIComponent(pnr)}`, {
          cache: "no-store",
        });

        const data = await res.json();

        if (!data?.ok) {
          setMessage(data?.error || "PNR details not found");
          return;
        }

        const trainNo = data.trainNo || data.trainNumber || data.raw?.trainNumber || "";
        const trainName = data.trainName || data.raw?.trainName || "Train";
        const boarding =
          data.boardingPoint || data.source || data.raw?.boardingPoint || "";

        const journeyDate = formatDateForTrainPage(
          data.dateOfJourney || data.raw?.dateOfJourney || ""
        );

        const passenger = data.passengers?.[0] || data.raw?.passengerList?.[0] || {};

        const coach =
          passenger.currentCoachId ||
          passenger.coachId ||
          passenger.bookingCoachId ||
          passenger.BookingCoachId ||
          "";

        const berth =
          passenger.currentBerthNo ||
          passenger.berthNo ||
          passenger.bookingBerthNo ||
          passenger.BookingBerthNo ||
          "";

        const berthCode =
          passenger.currentBerthCode ||
          passenger.bookingBerthCode ||
          "";

        localStorage.setItem(
          "raileats_pnr_details",
          JSON.stringify({
            pnr,
            trainNo,
            trainName,
            boarding,
            journeyDate,
            source: data.source || data.raw?.sourceStation || "",
            destination: data.destination || data.raw?.destinationStation || "",
            chartStatus: data.chartStatus || data.raw?.chartStatus || "",
            coach,
            berth,
            berthCode,
            passengersCount: data.passengersCount || data.raw?.numberOfpassenger || 1,
            passengers: data.passengers || data.raw?.passengerList || [],
            raw: data.raw || data,
          })
        );

        if (!trainNo || !journeyDate || !boarding) {
          setMessage("PNR data incomplete. Train, date or boarding station missing.");
          return;
        }

        router.replace(
          `/trains/${trainNo}-train-food-delivery-in-train?date=${encodeURIComponent(
            journeyDate
          )}&boarding=${encodeURIComponent(boarding)}&pnr=${encodeURIComponent(
            pnr
          )}&trainName=${encodeURIComponent(trainName)}`
        );
      } catch (e) {
        setMessage("Something went wrong while fetching PNR.");
      }
    }

    run();
  }, [pnr, router]);

  return (
    <main
      style={{
        minHeight: "70vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <div style={{ textAlign: "center", fontWeight: 700, color: "#334155" }}>
        {message}
      </div>
    </main>
  );
}
