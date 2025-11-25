"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "../lib/useCart";
import { priceStr } from "../lib/priceUtil";

function timeToMinutes(str: string | null | undefined): number | null {
  if (!str) return null;
  const parts = String(str).split(":");
  if (parts.length < 2) return null;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { lines, count, total, changeQty, remove, clearCart } = useCart();

  // journey fields
  const [pnr, setPnr] = useState("");
  const [coach, setCoach] = useState("");
  const [seat, setSeat] = useState("");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");

  // outlet + station
  const [stationCode, setStationCode] = useState("");
  const [restroCode, setRestroCode] = useState("");

  // train selection
  const [trainQuery, setTrainQuery] = useState("");
  const [trainOptions, setTrainOptions] = useState<any[]>([]);
  const [selectedTrain, setSelectedTrain] = useState<any | null>(null);

  // delivery date/time (train se auto)
  const [deliveryDate, setDeliveryDate] = useState<string>("");
  const [deliveryTime, setDeliveryTime] = useState<string>("");

  const [validationError, setValidationError] = useState<string>("");

  // cart lines memo
  const items = useMemo(() => lines || [], [lines]);

  // load station + restro from sessionStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const st = sessionStorage.getItem("raileats_current_station_code") || "";
      const rc = sessionStorage.getItem("raileats_current_restro_code") || "";
      setStationCode(st);
      setRestroCode(rc);

      // default delivery date = today
      const today = new Date();
      setDeliveryDate(today.toISOString().slice(0, 10));
    } catch {
      // ignore
    }
  }, []);

  /* ------------ journey field validation (PNR, Coach, Seat, Name, Mobile) ------------ */
  function canProceedJourneyFields() {
    return (
      count > 0 &&
      pnr.trim().length >= 6 &&
      coach.trim().length >= 1 &&
      seat.trim().length >= 1 &&
      name.trim().length >= 2 &&
      /^\d{10}$/.test(mobile.trim())
    );
  }

  /* ------------ Train search + selection ------------ */
  async function searchTrain() {
    setValidationError("");
    setTrainOptions([]);
    setSelectedTrain(null);

    if (!stationCode) {
      setValidationError("Station not detected. Please go back and select outlet again.");
      return;
    }
    if (!trainQuery.trim()) {
      setValidationError("Please enter train number or name.");
      return;
    }

    try {
      const params = new URLSearchParams();
      params.set("stationCode", stationCode);
      params.set("query", trainQuery.trim());

      const res = await fetch(`/api/train-routes?${params.toString()}`, {
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({} as any));

      if (!res.ok || !json?.ok) {
        console.error("train search failed", json);
        setValidationError("Unable to search trains. Please try again.");
        return;
      }

      if (!Array.isArray(json.trains) || json.trains.length === 0) {
        setValidationError(
          `Selected train not found for station ${stationCode}.`
        );
        return;
      }

      setTrainOptions(json.trains);
      setValidationError("");
    } catch (e) {
      console.error("train search error", e);
      setValidationError("Something went wrong while searching train.");
    }
  }

  function selectTrain(t: any) {
    setSelectedTrain(t);
    setTrainOptions([]);
    setTrainQuery(String(t.trainNumber ?? t.train_no ?? ""));
    const arrive = String(t.Arrives ?? t.arrival_time ?? "").slice(0, 5);
    setDeliveryTime(arrive);
    setValidationError("");
  }

  /* ------------ extra validations before going to review ------------ */
  function runExtraChecks(): boolean {
    // must have selected train
    if (!selectedTrain) {
      setValidationError("Please select a train for this station.");
      return false;
    }

    // delivery time valid?
    const arrMin = timeToMinutes(deliveryTime);
    if (arrMin == null) {
      setValidationError("Invalid arrival time for selected train.");
      return false;
    }

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    // train already passed (if same date)
    if (deliveryDate === todayStr) {
      const nowMin = now.getHours() * 60 + now.getMinutes();
      if (arrMin <= nowMin) {
        setValidationError("Selected train has already passed this station for today.");
        return false;
      }
    }

    // ⚠️ TODO (next step):
    // - outlet open/close time + cutoff minutes check (Supabase / Admin API se)
    // - each menu item's start_time/end_time vs arrivalTime check
    // Abhi ke liye unhe skip kar rahe hain taaki flow chal sake.

    setValidationError("");
    return true;
  }

  /* ------------ final canProceed for button ------------ */
  const canProceed = canProceedJourneyFields() && !!selectedTrain && !validationError;

  /* ------------ draft create + navigation ------------ */
  function goToReview() {
    if (!canProceedJourneyFields()) {
      alert("कृपया PNR, Coach, Seat, Name और 10-digit Mobile सही भरें।");
      return;
    }

    if (!runExtraChecks()) {
      // error message validationError me aa chuka hoga
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
        pnr: pnr.trim(),
        coach: coach.trim(),
        seat: seat.trim(),
        name: name.trim(),
        mobile: mobile.trim(),
      },
      outlet: {
        stationCode,
        restroCode,
        trainNo: selectedTrain ? String(selectedTrain.trainNumber ?? "") : "",
        deliveryDate,
        deliveryTime,
      },
      createdAt: Date.now(),
    };

    if (typeof window !== "undefined") {
      sessionStorage.setItem("raileats_order_draft", JSON.stringify(draft));
    }

    router.push("/checkout/review");
  }

  /* ------------ UI ------------ */

  return (
    <main className="site-container page-safe-bottom">
      <div className="checkout-header-actions" style={{ marginBottom: ".6rem" }}>
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

          {/* JOURNEY + TRAIN */}
          <aside className="card-safe checkout-card">
            <h2 className="font-semibold mb-3">Journey Details</h2>

            <div className="space-y-3">
              {/* Train selection */}
              <div>
                <label className="text-sm block mb-1">
                  Train number (at {stationCode || "station"})
                </label>
                <div className="flex gap-2">
                  <input
                    className="input flex-1"
                    value={trainQuery}
                    onChange={(e) => setTrainQuery(e.target.value)}
                    placeholder="Enter train no. or name"
                  />
                  <button
                    type="button"
                    className="rounded border px-3 py-2 text-sm"
                    onClick={searchTrain}
                  >
                    Search
                  </button>
                </div>

                {trainOptions.length > 0 && (
                  <div className="mt-2 border rounded max-h-40 overflow-auto text-sm bg-white">
                    {trainOptions.map((t: any, idx: number) => (
                      <button
                        key={`${t.trainNumber ?? idx}-${t.StationCode ?? idx}`}
                        type="button"
                        onClick={() => selectTrain(t)}
                        className="block w-full text-left px-2 py-1 hover:bg-gray-100"
                      >
                        {t.trainNumber} – {t.trainName} (
                        {String(t.Arrives).slice(0, 5)})
                      </button>
                    ))}
                  </div>
                )}

                {selectedTrain && (
                  <div className="mt-1 text-xs text-gray-600">
                    Selected: {selectedTrain.trainNumber} –{" "}
                    {selectedTrain.trainName} • Arr{" "}
                    {String(selectedTrain.Arrives).slice(0, 5)}
                  </div>
                )}
              </div>

              {/* Delivery date/time (read-only for now) */}
              <div className="flex gap-3 text-xs text-gray-600">
                <div className="flex-1">
                  <div className="font-medium">Delivery date</div>
                  <div>{deliveryDate || "—"}</div>
                </div>
                <div className="flex-1">
                  <div className="font-medium">Delivery time</div>
                  <div>{deliveryTime || "—"}</div>
                </div>
              </div>

              {/* Journey fields */}
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

              {validationError && (
                <div className="text-xs text-red-600 mt-1">
                  {validationError}
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

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
