"use client";
import { canPlaceOrder } from "../utils/checkCutoff";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "../lib/useCart";
import { priceStr } from "../lib/priceUtil";
import TrainAutocomplete from "@/components/TrainAutocomplete"; // <-- added

type OutletMeta = {
  stationCode: string;
  stationName?: string;
  restroCode?: string | number;
  RestroCode?: string | number;
  outletName?: string;

  // cutoff info (RestroMaster se sessionStorage me aa sakta hai)
  CutOffTime?: number;
  cutOffTime?: number;
  cutoffMinutes?: number;

  // train context (optional)
  source?: string;
  trainNumber?: string;
  trainName?: string;
  journeyDate?: string; // yyyy-mm-dd
  arrivalTime?: string; // HH:MM
};

type TrainRouteRow = {
  trainId: number;
  trainNumber: number | null;
  trainName: string | null;
  StationCode: string | null;
  StationName: string | null;
  Arrives: string | null;
  Departs: string | null;
  Day: number | null;
};

function todayYMD() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { lines, count, total, changeQty, remove, clearCart } = useCart();

  // cart → items
  const items = useMemo(() => lines || [], [lines]);

  // outlet meta (station + restro)
  const [outlet, setOutlet] = useState<OutletMeta | null>(null);
  const [metaError, setMetaError] = useState<string>("");

  // train search state
  const [trainNo, setTrainNo] = useState("");
  const [trainName, setTrainName] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(todayYMD());
  const [deliveryTime, setDeliveryTime] = useState<string>("");
  const [trainOptions, setTrainOptions] = useState<TrainRouteRow[]>([]);
  const [trainLoading, setTrainLoading] = useState(false);
  const [trainMsg, setTrainMsg] = useState<string>("");
  const [trainMsgType, setTrainMsgType] = useState<"ok" | "error" | "">("");

  // journey details
  const [pnr, setPnr] = useState("");
  const [coach, setCoach] = useState("");
  const [seat, setSeat] = useState("");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");

  // whether this checkout was prefilled by train flow (non-editable fields)
  const [lockedTrainFlow, setLockedTrainFlow] = useState(false);

  // ✅ outlet meta load (station + restro)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = sessionStorage.getItem("raileats_current_outlet");
      if (!raw) {
        setMetaError(
          "Station not detected. Please go back to the restaurant and open checkout again.",
        );
        setOutlet(null);
        return;
      }
      const meta = JSON.parse(raw) as OutletMeta;
      if (!meta?.stationCode) {
        setMetaError(
          "Station not detected. Please go back to the restaurant and open checkout again.",
        );
        setOutlet(null);
        return;
      }
      setOutlet(meta);
      setMetaError("");

      // If meta.source === "train", prefill train fields and lock them
      if (meta.source === "train") {
        if (meta.trainNumber) setTrainNo(String(meta.trainNumber));
        if (meta.trainName) setTrainName(String(meta.trainName));
        if (meta.journeyDate) setDeliveryDate(String(meta.journeyDate));
        if (meta.arrivalTime) setDeliveryTime(String(meta.arrivalTime));
        setLockedTrainFlow(true);
      }
    } catch {
      setMetaError(
        "Could not read station details. Please go back and select outlet again.",
      );
      setOutlet(null);
    }
  }, []);

  // ✅ last train search se auto-fill (sirf jab user Train search se aaya ho and not already locked by session)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (lockedTrainFlow) return; // don't override locked train flow
      const lastType = window.localStorage.getItem("re_lastSearchType");
      const lastTrain = window.localStorage.getItem("re_lastTrainNumber");
      if (lastType === "train" && lastTrain && !trainNo) {
        setTrainNo(lastTrain);
      }
    } catch (e) {
      console.warn("Failed to read stored train number", e);
    }
  }, [trainNo, lockedTrainFlow]);

  const canProceed =
    count > 0 &&
    trainNo.trim().length >= 3 &&
    deliveryDate &&
    deliveryTime &&
    pnr.trim().length >= 6 &&
    coach.trim().length >= 1 &&
    seat.trim().length >= 1 &&
    name.trim().length >= 2 &&
    /^[6789]\d{9}$/.test(mobile.trim());

  /* ------------ TRAIN SEARCH ------------ */
  // Accept optional trainQuery so we can call searchTrain(selectedNumber) immediately after selecting from autocomplete.
  async function searchTrain(trainQuery?: string) {
    if (lockedTrainFlow) return; // do not allow searching when locked by train flow
    if (!outlet?.stationCode) {
      setMetaError(
        "Station not detected. Please go back and select the outlet again.",
      );
      return;
    }
    const t = (trainQuery ?? trainNo).trim();
    if (!t) {
      alert("Please enter train number.");
      return;
    }

    try {
      setTrainLoading(true);
      setTrainMsg("");
      setTrainMsgType("");
      setTrainOptions([]);

      const params = new URLSearchParams();
      params.set("train", t);
      params.set("station", outlet.stationCode);
      params.set("date", deliveryDate);

      const itemNames = items.map((l) => l.name).filter(Boolean);
      if (itemNames.length) {
        params.set("items", JSON.stringify(itemNames));
      }

      params.set("subtotal", String(total || 0));

      const restroCodeForApi =
        outlet.restroCode ??
        outlet.RestroCode ??
        (outlet as any).restro_id ??
        (outlet as any).RestroID;

      if (restroCodeForApi) {
        params.set("restro", String(restroCodeForApi));
      }

      const res = await fetch(`/api/train-routes?${params.toString()}`, {
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({} as any));

      if (!json?.ok) {
        const err = json?.error as string | undefined;
        const meta = json?.meta || {};

        if (err === "train_not_found") {
          alert("Train not found. Please check train number.");
          setTrainNo("");
          setDeliveryTime("");
          setTrainOptions([]);
          setTrainMsg("");
          setTrainMsgType("error");
          return;
        }

        if (err === "station_not_on_route") {
          const stName = outlet.stationName || outlet.stationCode;
          alert(
            `Selected train does not belong to station ${stName}. Please choose correct train.`,
          );
          setTrainNo("");
          setDeliveryTime("");
          setTrainOptions([]);
          setTrainMsg("");
          setTrainMsgType("error");
          return;
        }

        if (err === "not_running_on_date") {
          alert("This train does not run on selected date.");
          setDeliveryTime("");
          setTrainOptions([]);
          setTrainMsg("");
          setTrainMsgType("error");
          return;
        }

        if (err === "weekly_off") {
          const dayName = meta.dayName || meta.dayCode || "this day";
          alert(`This Restaurant Closed on ${dayName}.`);
          setDeliveryTime("");
          setTrainOptions([]);
          setTrainMsg("");
          setTrainMsgType("error");
          return;
        }

        if (err === "holiday_closed") {
          alert("Restro Marked Holiday At Arriving Train Time.");
          setDeliveryTime("");
          setTrainOptions([]);
          setTrainMsg("");
          setTrainMsgType("error");
          return;
        }

        if (err === "restro_cutoff" || err === "cutoff_exceeded") {
          alert("Selected Restro Booking closed for this train.");
          setDeliveryTime("");
          setTrainOptions([]);
          setTrainMsg("");
          setTrainMsgType("error");
          return;
        }

        if (err === "restro_time_mismatch") {
          const arr = meta.arrival || "";
          const o = meta.restroOpen || "";
          const c = meta.restroClose || "";
          alert(
            `Selected outlet service time not matched with train time.\n\nTrain arrival: ${arr}\nOutlet time: ${o} - ${c}`,
          );
          setDeliveryTime("");
          setTrainOptions([]);
          setTrainMsg("");
          setTrainMsgType("error");
          return;
        }

        if (err === "item_time_mismatch") {
          const arr = meta.arrival || "";
          const badItems: any[] = meta.items || [];
          const lines = badItems.map(
            (it) => `• ${it.name} (${it.start} - ${it.end})`,
          );
          alert(
            `Selected item time not matched with train time.\n\nTrain arrival: ${arr}\n\nItems:\n${lines.join(
              "\n",
            )}`,
          );
          setDeliveryTime("");
          setTrainOptions([]);
          setTrainMsg("");
          setTrainMsgType("error");
          return;
        }

        if (err === "min_order_not_met") {
          const minOrder = meta.minOrder;
          setTrainMsgType("error");
          setTrainMsg(
            `MinimumOrdermValue is ₹${minOrder}. Kindly add more item to complete your order.`,
          );
          return;
        }

        console.error("train search failed", json);
        setTrainMsg("Train search failed. Please try again.");
        setTrainMsgType("error");
        return;
      }

      const rows: TrainRouteRow[] = json.rows || [];
      if (!rows.length) {
        setTrainMsg("No matching schedule found.");
        setTrainMsgType("error");
        return;
      }

      setTrainOptions(rows);

      const first = rows[0];
      const arr = (first.Arrives || first.Departs || "").slice(0, 5);
      setDeliveryTime(arr);

      // also fill trainName if provided by API meta (or leave existing)
      if (json.train?.trainName) setTrainName(String(json.train.trainName));

      const stationLabel =
        (first.StationCode || outlet.stationCode || "") +
        (first.StationName ? ` • ${first.StationName}` : "");

      setTrainMsg(
        `Train & station matched successfully. Arrival at ${stationLabel}: ${arr || "time not set"}.`,
      );
      setTrainMsgType("ok");
    } catch (e) {
      console.error("train search error", e);
      setTrainMsg("Train search error. Please try again.");
      setTrainMsgType("error");
    } finally {
      setTrainLoading(false);
    }
  }

  /* ------------ Proceed to review ------------ */
  function goToReview() {
    if (!canProceed) {
      alert("Please fill all details correctly before proceeding.");
      return;
    }

    const anyOutlet = outlet as any;
    const cutoffRaw =
      anyOutlet?.CutOffTime ??
      anyOutlet?.cutOffTime ??
      anyOutlet?.cutoffMinutes ??
      0;
    const cutoff = Number(cutoffRaw) || 0;

    const { ok, message } = canPlaceOrder(deliveryDate, deliveryTime, cutoff);

    if (!ok) {
      alert(message || "Booking closed for this delivery time.");
      return;
    }

    const draft = {
      id: "DRAFT_" + Date.now(),
      items: items.map((l) => ({
        id: l.id,
        name: l.name,
        price: l.price,
        qty: l.qty,
      })),
      count,
      subtotal: total,
      journey: {
        trainNo: trainNo.trim(),
        deliveryDate,
        deliveryTime,
        pnr: pnr.trim(),
        coach: coach.trim(),
        seat: seat.trim(),
        name: name.trim(),
        mobile: mobile.trim(),
      },
      outlet,
      createdAt: Date.now(),
    };

    if (typeof window !== "undefined") {
      sessionStorage.setItem("raileats_order_draft", JSON.stringify(draft));
    }

    router.push("/checkout/review");
  }

  /* ------------ UI ------------ */

  // callback when user selects from TrainAutocomplete
  function onTrainSelectFromAutocomplete(item: any) {
    // item expected to have trainNumber and trainName (from your TrainAutocomplete)
    const number = item?.trainNumber ?? item?.trainNumber_text ?? item?.trainId ?? "";
    const nameVal = item?.trainName ?? "";
    // prefer numeric string if available
    const numberStr = String(number);
    setTrainNo(numberStr);
    setTrainName(nameVal);

    // store last search locally (keeps previous behaviour)
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("re_lastSearchType", "train");
        window.localStorage.setItem("re_lastTrainNumber", numberStr);
      }
    } catch (e) {
      /* ignore */
    }

    // immediately run search to fetch train route/schedule for the station
    // pass the selected number to avoid state update timing issues
    searchTrain(numberStr);
  }

  return (
    <main className="site-container page-safe-bottom">
      <div
        className="checkout-header-actions"
        style={{ marginBottom: ".6rem" }}
      >
        <div>
          <h1 className="text-2xl font-bold">Checkout</h1>
          <p className="text-sm text-gray-600 mt-1">
            Review items, train &amp; journey details
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="card-safe">
          <p className="text-sm text-gray-600">
            Your cart is empty.{" "}
            <Link href="/" className="text-blue-600 underline">
              Continue shopping
            </Link>
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* ITEMS */}
          <section
            className="md:col-span-2 card-safe"
            aria-label="Cart items"
            style={{
              maxHeight:
                "calc(100vh - (var(--nav-h,64px) + var(--bottom-h,56px) + 140px))",
              overflow: "auto",
            }}
          >
            <div className="space-y-3">
              {items.map((line) => (
                <div
                  key={line.id}
                  className="w-full border-b pb-3 last:border-b-0 last:pb-0"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 pr-3">
                      <div
                        className="font-medium text-base truncate"
                        title={line.name}
                        style={{
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {line.name}
                      </div>

                      <div className="flex items-center gap-3 mt-2">
                        <div
                          className="inline-flex items-center border rounded overflow-hidden"
                          role="group"
                          aria-label={`Quantity controls for ${line.name}`}
                        >
                          <button
                            className="px-2 py-1 text-sm"
                            onClick={() =>
                              changeQty(line.id, Math.max(0, line.qty - 1))
                            }
                          >
                            −
                          </button>
                          <span className="px-3 py-1 border-l border-r text-sm">
                            {line.qty}
                          </span>
                          <button
                            className="px-2 py-1 text-sm"
                            onClick={() => changeQty(line.id, line.qty + 1)}
                          >
                            +
                          </button>
                        </div>

                        <div className="text-xs text-gray-500">
                          {priceStr(line.price)} × {line.qty}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end flex-shrink-0">
                      <div className="font-medium text-base">
                        {priceStr(line.price * line.qty)}
                      </div>
                      <button
                        className="text-rose-600 text-sm mt-2"
                        onClick={() => remove(line.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <div className="pt-3 border-t flex items-center justify-between">
                <div className="font-semibold">Subtotal</div>
                <div className="font-semibold">{priceStr(total)}</div>
              </div>

              <div className="mt-2">
                <button
                  className="text-sm text-gray-600 underline"
                  onClick={clearCart}
                >
                  Clear cart
                </button>
              </div>
            </div>
          </section>

          {/* JOURNEY + TRAIN DETAILS */}
          <aside className="card-safe checkout-card">
            <h2 className="font-semibold mb-3">Journey Details</h2>

            {/* Train number + autocomplete */}
            <div className="space-y-3 mb-3">
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-sm block mb-1">Train number (at station)</label>

                  {/* If lockedTrainFlow, keep read-only inputs like before */}
                  {lockedTrainFlow ? (
                    <input
                      className="input"
                      value={trainNo}
                      readOnly
                      placeholder="e.g. 11016"
                    />
                  ) : (
                    // Use TrainAutocomplete component for search + dropdown
                    <TrainAutocomplete
                      onSelect={onTrainSelectFromAutocomplete}
                    />
                  )}
                </div>

                {/* Keep search button for manual numeric entry (if user pastes number) */}
                {!lockedTrainFlow && (
                  <button
                    type="button"
                    className="rounded px-3 py-2 text-sm bg-blue-600 text-white"
                    onClick={() => searchTrain()}
                    disabled={trainLoading}
                  >
                    {trainLoading ? "Searching…" : "Search"}
                  </button>
                )}
              </div>

              {/* Train name (read-only if train flow) */}
              <div>
                <label className="text-sm block mb-1">Train name</label>
                <input
                  className="input"
                  value={trainName}
                  onChange={(e) => setTrainName(e.target.value)}
                  placeholder="Train name"
                  readOnly={lockedTrainFlow}
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-sm block mb-1">Delivery date</label>
                  <input
                    type="date"
                    className="input"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    readOnly={lockedTrainFlow}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-sm block mb-1">Delivery time</label>
                  <input
                    className="input"
                    value={deliveryTime}
                    onChange={(e) => setDeliveryTime(e.target.value)}
                    placeholder="HH:MM"
                    readOnly={lockedTrainFlow}
                  />
                </div>
              </div>

              {trainMsg && (
                <p
                  className={`text-xs mt-1 ${
                    trainMsgType === "error"
                      ? "text-red-600"
                      : trainMsgType === "ok"
                      ? "text-green-600"
                      : "text-gray-600"
                  }`}
                >
                  {trainMsg}
                </p>
              )}
            </div>

            {/* PNR + passenger details */}
            <div className="space-y-3">
              <div>
                <label className="text-sm block mb-1">PNR</label>
                <input
                  className="input"
                  value={pnr}
                  onChange={(e) => setPnr(e.target.value)}
                  placeholder="10-digit or 6+ chars"
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-sm block mb-1">Coach</label>
                  <input
                    className="input"
                    value={coach}
                    onChange={(e) => setCoach(e.target.value)}
                    placeholder="e.g. B3"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-sm block mb-1">Seat</label>
                  <input
                    className="input"
                    value={seat}
                    onChange={(e) => setSeat(e.target.value)}
                    placeholder="e.g. 42"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm block mb-1">Name</label>
                <input
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Passenger name"
                />
              </div>

              <div>
                <label className="text-sm block mb-1">Mobile</label>
                <input
                  className="input"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="10-digit mobile"
                  inputMode="numeric"
                />
              </div>
            </div>

            {(metaError || !outlet) && (
              <p className="mt-3 text-xs text-red-600">
                {metaError ||
                  "Station not detected. Please go back and select outlet again."}
              </p>
            )}
          </aside>
        </div>
      )}

      {/* bottom panel */}
      {items.length > 0 && (
        <div
          className="bottom-action-elevated"
          style={{
            width: "min(1024px, calc(100% - 2rem))",
            margin: "1rem auto",
            padding: ".6rem",
            boxSizing: "border-box",
            borderRadius: 10,
            background: "#fff",
            marginBottom: "calc(var(--bottom-h) + 12px)",
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs text-gray-600">Subtotal</div>
              <div className="font-semibold">{priceStr(total)}</div>
            </div>

            <div className="flex items-center gap-3">
              <button
                className="rounded border px-3 py-2 text-sm"
                onClick={() =>
                  typeof window !== "undefined" ? window.history.back() : null
                }
              >
                Add More Items
              </button>

              <button
                className={`rounded px-4 py-2 text-sm text-white ${
                  canProceed ? "bg-green-600" : "bg-gray-400 cursor-not-allowed"
                }`}
                onClick={goToReview}
                disabled={!canProceed}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
