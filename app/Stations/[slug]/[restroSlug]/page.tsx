"use client";

import React, { useEffect } from "react";
import { extractStationCode } from "../../../lib/stationSlug";
import { extractRestroCode } from "../../../lib/restroSlug";
import RestroMenuClient from "./RestroMenuClient";
import SaveOrderData from "@/components/SaveOrderData";

export const revalidate = 60;
export const runtime = "nodejs";

/* ------------ HELPERS ------------ */
function humanizeFromSlug(restroSlug: string) {
  return decodeURIComponent(restroSlug)
    .replace(/^\d+-/, "")
    .replace(/-\d+$/, "")
    .replace(/-/g, " ")
    .trim()
    .split(" ")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}

/* ------------ FETCH ------------ */
async function fetchOnMenu(
  restroCode: string | number,
  arrivalTime: string
) {
  try {
    const res = await fetch(
      `https://raileats.in/api/restro-menu?restro=${restroCode}&arrivalTime=${arrivalTime}`,
      { cache: "no-store" }
    );

    const json = await res.json();
    return json?.items || [];
  } catch (e) {
    return [];
  }
}

/* ------------ PAGE ------------ */
export default function Page({ params, searchParams }: any) {

  const stationCode = extractStationCode(params.slug) || "";
  const restroCode = extractRestroCode(params.restroSlug) || "";
  const outletName = humanizeFromSlug(params.restroSlug);

  const stationName =
    params.slug?.split("-")?.slice(1)?.join(" ") || stationCode;

  const deliveryDate =
    searchParams?.deliveryDate || searchParams?.date || "";

  const deliveryTime =
    searchParams?.deliveryTime ||
    searchParams?.arrival?.slice(0, 5) ||
    searchParams?.arrivalTime?.slice(0, 5) ||
    "";

  const trainName = searchParams?.trainName || "";

  /* 🔥 SAVE ORDER DATA */
  const orderData = {
    train_number: searchParams?.train || "",
    train_name: trainName,
    date: deliveryDate,
    station_code: stationCode,
    station_name: stationName,
    vendor_name: outletName,
    arrival_time: deliveryTime,
    delivery_date: deliveryDate,
  };

  return (
    <main className="max-w-5xl mx-auto px-3 sm:px-6 py-6">

      {/* 🔥 SAVE ORDER DATA */}
      <SaveOrderData data={orderData} />

      {/* HEADER */}
      <div className="mb-6 rounded-lg border-2 border-orange-300 bg-gradient-to-r from-orange-50 to-yellow-50 p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

          <div>
            <div className="text-xs font-semibold text-gray-500">
              Journey
            </div>

            <div className="mt-2">
              <div className="text-lg font-bold text-orange-700">
                {trainName || "Train"}
              </div>

              <div className="text-sm text-gray-600">
                #{searchParams?.train || ""}
              </div>

              <div className="mt-2 text-gray-800 font-medium">
                {stationName} ({stationCode})
              </div>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-gray-500">
              Delivery
            </div>

            <div className="mt-2">
              <div className="text-lg font-bold text-blue-700">
                {deliveryDate} {deliveryTime && `at ${deliveryTime}`}
              </div>

              <div className="mt-2 font-medium">
                {outletName}
              </div>
            </div>
          </div>

        </div>
      </div>

      <RestroMenuClient
        header={{
          stationCode,
          restroCode: String(restroCode),
          outletName,
          stationName,
        }}
        items={[]}
        nextParams={{
          stationName,
          stationCode,
          deliveryDate,
          deliveryTime,
          trainName,
          vendorName: outletName,
        }}
      />

    </main>
  );
}
