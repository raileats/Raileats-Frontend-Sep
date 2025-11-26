// app/checkout/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "../lib/useCart";
import { priceStr } from "../lib/priceUtil";

type OutletMeta = {
  stationCode: string;
  stationName?: string;
  restroCode: string | number;
  outletName?: string;
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
  const [deliveryDate, setDeliveryDate] = useState(todayYMD());
  const [deliveryTime, setDeliveryTime] = useState<string>("");

  const [trainOptions, setTrainOptions] = useState<TrainRouteRow[]>([]);
  const [selectedTrain, setSelectedTrain] = useState<TrainRouteRow | null>(
    null,
  );
  const [selectedTrainIndex, setSelectedTrainIndex] = useState<number>(0);

  const [trainLoading, setTrainLoading] = useState(false);
  const [trainMsg, setTrainMsg] = useState<string>("");

  // journey details
  const [pnr, setPnr] = useState("");
  const [coach, setCoach] = useState("");
  const [seat, setSeat] = useState("");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");

  // ✅ outlet meta load
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
    } catch {
      setMetaError(
        "Could not read station details. Please go back and select outlet again.",
      );
      setOutlet(null);
    }
  }, []);

  const canProceed =
    count > 0 &&
    trainNo.trim().length >= 4 &&
    deliveryDate &&
    deliveryTime &&
    pnr.trim().length >= 6 &&
    coach.trim().length >= 1 &&
    seat.trim().length >= 1 &&
    name.trim().length >= 2 &&
    /^\d{10}$/.test(mobile.trim());

  /* ------------ TRAIN SEARCH ------------ */
  async function searchTrain() {
    if (!outlet?.stationCode) {
      setMetaError(
        "Station not detected. Please go back and select the outlet again.",
      );
      return;
    }
    const t = trainNo.trim();
    if (!t) {
      alert("Please enter train number.");
      return;
    }

    try {
      setTrainLoading(true);
      setTrainMsg("");
      setTrainOptions([]);
      setSelectedTrain(null);

      const params = new URLSearchParams();
      params.set("train", t);
      params.set("station", outlet.stationCode);
      params.set("date", deliveryDate);

      const res = await fetch(`/api/train-routes?${params.toString()}`, {
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({} as any));

      if (!res.ok || !json?.ok) {
        console.error("train search failed", json);
        setTrainMsg("Train search failed. Please try again.");
        return;
      }

      const rows: TrainRouteRow[] = json.rows || [];
      if (!rows.length) {
        // 👉 yahi message station-not-belongs-to-train ke jaisa hai
        setTrainMsg(
          `Selected station (${outlet.stationCode}) does not belong to this train or schedule not found.`,
        );
        return;
      }

      setTrainOptions(rows);

      // first matching row select as default
      const first = rows[0];
      setSelectedTrain(first);
      setSelectedTrainIndex(0);

      const arrTime = (first.Arrives || first.Departs || "").slice(0, 5);
      setDeliveryTime(arrTime);

      // input me bhi actual train number set kar do
      setTrainNo(String(first.trainNumber ?? t));

      setTrainMsg(
        `Found ${
          rows.length
        } schedule(s). Arrival at ${outlet.stationCode}: ${
          arrTime || "time not set"
        }.`,
      );
    } catch (e) {
      console.error("train search error", e);
      setTrainMsg("Train search error. Please try again.");
    } finally {
      setTrainLoading(false);
    }
  }

  // user agar dropdown se koi aur schedule choose kare
  function handleTrainSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const idx = Number(e.target.value);
    if (!Number.isFinite(idx)) return;
    setSelectedTrainIndex(idx);

    const tr = trainOptions[idx];
    if (!tr) return;

    setSelectedTrain(tr);
    const arrTime = (tr.Arrives || tr.Departs || "").slice(0, 5);
    setDeliveryTime(arrTime || deliveryTime);
    setTrainNo(String(tr.trainNumber ?? trainNo));
  }

  /* ------------ Proceed to review ------------ */
  function goToReview() {
    if (!canProceed) {
      alert("Please fill all details correctly before proceeding.");
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
        trainName: selectedTrain?.trainName || null, // ✅ name bhi save
        stationCode: outlet?.stationCode || null,
        stationName: outlet?.stationName || null,
        deliveryDate,
        deliveryTime,
        pnr: pnr.trim(),
        coach: coach.trim(),
        seat: seat.trim(),
        name: name.trim(),
        mobile: mobile.trim(),
      },
      outlet, // ✅ outlet + station meta
      createdAt: Date.now(),
    };

    if (typeof window !== "undefined") {
      sessionStorage.setItem("raileats_order_draft", JSON.stringify(draft));
    }

    router.push("/checkout/review");
  }

  /* ------------ UI (cart part same as pehle) ------------ */

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
          {/* ITEMS (unchanged) */}
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

            {/* Train number + search */}
            <div className="space-y-3 mb-3">
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-sm block mb-1">
                    Train number (at station)
                  </label>
                  <input
                    className="input"
                    value={trainNo}
                    onChange={(e) => setTrainNo(e.target.value)}
                    placeholder="e.g. 11016"
                  />
                </div>
                <button
                  type="button"
                  className="rounded px-3 py-2 text-sm bg-blue-600 text-white"
                  onClick={searchTrain}
                  disabled={trainLoading}
                >
                  {trainLoading ? "Searching…" : "Search"}
                </button>
              </div>

              {/* 👉 Train name + details */}
              {selectedTrain && (
                <p className="text-xs text-green-700 mt-1">
                  Selected:{" "}
                  <strong>
                    {selectedTrain.trainNumber} –{" "}
                    {selectedTrain.trainName || "Train"}
                  </strong>{" "}
                  at{" "}
                  {selectedTrain.StationCode || outlet?.stationCode || ""} (
                  {(selectedTrain.Arrives || selectedTrain.Departs || "")
                    .slice(0, 5)
                    .trim() || "--"}
                  )
                </p>
              )}

              {/* Agar multiple schedule rows aaye to simple dropdown */}
              {trainOptions.length > 1 && (
                <div className="mt-2">
                  <label className="text-xs block mb-1">
                    Select schedule (if multiple)
                  </label>
                  <select
                    className="input"
                    value={String(selectedTrainIndex)}
                    onChange={handleTrainSelect}
                  >
                    {trainOptions.map((tr, idx) => {
                      const tno = tr.trainNumber ?? "-";
                      const nm = tr.trainName || "Train";
                      const arr = (tr.Arrives || tr.Departs || "").slice(0, 5);
                      return (
                        <option key={`${tr.trainId}-${idx}`} value={idx}>
                          {tno} – {nm} • {tr.StationCode} {arr}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              <div className="flex gap-3 mt-2">
                <div className="flex-1">
                  <label className="text-sm block mb-1">Delivery date</label>
                  <input
                    type="date"
                    className="input"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-sm block mb-1">Delivery time</label>
                  <input
                    className="input"
                    value={deliveryTime}
                    onChange={(e) => setDeliveryTime(e.target.value)}
                    placeholder="HH:MM"
                  />
                </div>
              </div>

              {trainMsg && (
                <p className="text-xs text-gray-600 mt-1">{trainMsg}</p>
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
