// app/orders/checkout/CheckoutClient.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";

type CartLine = {
  id: number;
  name: string;
  qty: number;
  price: number; // base_price
};

function money(n: number) {
  return `₹${n.toFixed(2).replace(/\.00$/, "")}`;
}

const ADMIN_BASE =
  process.env.NEXT_PUBLIC_ADMIN_APP_URL || "https://admin.raileats.in";

export default function CheckoutClient({ restroCode }: { restroCode: string | number }) {
  const storageKey = `re-cart:${restroCode}`;
  const [cart, setCart] = useState<Record<number, CartLine>>({});
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // simple address form
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [trainNo, setTrainNo] = useState("");
  const [coach, setCoach] = useState("");
  const [seat, setSeat] = useState("");
  const [pnr, setPnr] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<number, CartLine>;
        if (parsed && typeof parsed === "object") setCart(parsed);
      }
    } catch {}
    setLoading(false);
  }, [storageKey]);

  const lines = useMemo(() => Object.values(cart), [cart]);

  const summary = useMemo(() => {
    const subtotal = lines.reduce((a, b) => a + b.qty * b.price, 0);
    const deliveryFee = subtotal > 0 && subtotal < 300 ? 30 : 0; // example rule
    const total = subtotal + deliveryFee;
    return { subtotal, deliveryFee, total, count: lines.reduce((a, b) => a + b.qty, 0) };
  }, [lines]);

  function changeQty(id: number, qty: number) {
    setCart((c) => {
      const line = c[id];
      if (!line) return c;
      const next =
        qty <= 0
          ? (() => {
              const { [id]: _, ...rest } = c;
              return rest;
            })()
          : { ...c, [id]: { ...line, qty } };
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  function clearCart() {
    setCart({});
    try {
      localStorage.removeItem(storageKey);
    } catch {}
  }

  async function placeOrder() {
    setError(null);

    // validations
    if (!fullName.trim()) return setError("Please enter your full name.");
    if (!/^\d{10}$/.test(phone.trim())) return setError("Please enter a valid 10-digit phone number.");
    if (!trainNo.trim()) return setError("Please enter your Train No.");
    if (!coach.trim() || !seat.trim()) return setError("Please enter Coach and Seat.");
    if (lines.length === 0) return setError("Your cart is empty.");

    // build payload expected by Admin (adjust fields later if API differs)
    const payload = {
      restro_code: String(restroCode),
      customer: {
        full_name: fullName.trim(),
        phone: phone.trim(),
        pnr: pnr.trim() || null,
      },
      delivery: {
        train_no: trainNo.trim(),
        coach: coach.trim(),
        seat: seat.trim(),
        note: note.trim() || null,
      },
      pricing: {
        subtotal: summary.subtotal,
        delivery_fee: summary.deliveryFee,
        total: summary.total,
        currency: "INR",
      },
      items: lines.map((l) => ({
        item_id: l.id,
        name: l.name,
        qty: l.qty,
        base_price: l.price,
        line_total: l.qty * l.price,
      })),
      // meta space if you want to pass UTM/referrer later
      meta: {
        source: "web",
      },
    };

    setPosting(true);
    try {
      const url = `${ADMIN_BASE.replace(/\/$/, "")}/api/orders`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // expected response formats supported:
      // 1) { ok:true, order_id:"xxx" }
      // 2) { id:"xxx" }
      // 3) { data:{ id:"xxx" } }
      const j = await res.json().catch(() => ({} as any));
      const orderId =
        j?.order_id || j?.id || j?.data?.id || j?.data?.order_id || null;

      if (!res.ok || !orderId) {
        const msg = j?.error || j?.message || `Failed (${res.status})`;
        throw new Error(msg);
      }

      // success → clear cart & redirect
      try {
        localStorage.removeItem(storageKey);
      } catch {}
      window.location.href = `/orders/success?orderId=${encodeURIComponent(orderId)}`;
    } catch (e: any) {
      setError(e?.message || "Failed to place order. Please try again.");
    } finally {
      setPosting(false);
    }
  }

  if (loading) {
    return (
      <main className="max-w-5xl mx-auto px-3 sm:px-6 py-6">
        <div className="p-4 bg-white rounded shadow">Loading…</div>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-3 sm:px-6 py-6">
      <div className="mb-4">
        <h1 className="text-2xl sm:text-3xl font-bold leading-tight">Checkout</h1>
        <p className="mt-1 text-sm text-gray-600">
          Outlet Code: <strong>{restroCode || "—"}</strong>
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: form */}
        <section className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded shadow p-4">
            <h2 className="font-semibold mb-3">Passenger Details</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm">Full Name</label>
                <input className="mt-1 w-full rounded border px-3 py-2" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div>
                <label className="text-sm">Phone (10 digits)</label>
                <input
                  className="mt-1 w-full rounded border px-3 py-2"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, "").slice(0, 10))}
                />
              </div>
              <div>
                <label className="text-sm">PNR (optional)</label>
                <input className="mt-1 w-full rounded border px-3 py-2" value={pnr} onChange={(e) => setPnr(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded shadow p-4">
            <h2 className="font-semibold mb-3">Delivery in Train</h2>
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="text-sm">Train No.</label>
                <input className="mt-1 w-full rounded border px-3 py-2" value={trainNo} onChange={(e) => setTrainNo(e.target.value)} />
              </div>
              <div>
                <label className="text-sm">Coach</label>
                <input className="mt-1 w-full rounded border px-3 py-2" value={coach} onChange={(e) => setCoach(e.target.value)} />
              </div>
              <div>
                <label className="text-sm">Seat</label>
                <input className="mt-1 w-full rounded border px-3 py-2" value={seat} onChange={(e) => setSeat(e.target.value)} />
              </div>
            </div>
            <div className="mt-3">
              <label className="text-sm">Note to Restaurant (optional)</label>
              <input className="mt-1 w-full rounded border px-3 py-2" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Extra instructions, allergies, etc." />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </section>

        {/* Right: summary */}
        <aside className="space-y-4">
          <div className="bg-white rounded shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold">Your Items</h2>
              {lines.length > 0 && (
                <button className="text-sm rounded border px-2 py-1" onClick={clearCart} disabled={posting}>
                  Clear
                </button>
              )}
            </div>

            {lines.length === 0 ? (
              <p className="text-sm text-gray-600">Cart is empty.</p>
            ) : (
              <div className="space-y-3">
                {lines.map((ln) => (
                  <div key={ln.id} className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{ln.name}</div>
                      <div className="text-xs text-gray-500">
                        {money(ln.price)} × {ln.qty}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="inline-flex items-center border rounded overflow-hidden">
                        <button className="px-2 py-1" onClick={() => changeQty(ln.id, ln.qty - 1)} disabled={posting}>
                          −
                        </button>
                        <span className="px-3 py-1 border-l border-r">{ln.qty}</span>
                        <button className="px-2 py-1" onClick={() => changeQty(ln.id, ln.qty + 1)} disabled={posting}>
                          +
                        </button>
                      </div>
                      <div className="w-20 text-right font-medium">{money(ln.qty * ln.price)}</div>
                    </div>
                  </div>
                ))}

                <div className="pt-3 border-t text-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span>Subtotal</span>
                    <span>{money(summary.subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Delivery Fee</span>
                    <span>{summary.deliveryFee ? money(summary.deliveryFee) : "FREE"}</span>
                  </div>
                  <div className="flex items-center justify-between font-semibold text-base pt-1 border-t">
                    <span>Total</span>
                    <span>{money(summary.total)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="w-full mt-2 rounded bg-green-600 text-white py-2 disabled:opacity-60"
                  onClick={placeOrder}
                  disabled={posting}
                >
                  {posting ? "Placing Order…" : "Place Order"}
                </button>

                <button
                  type="button"
                  className="w-full mt-2 rounded border py-2"
                  onClick={() => history.back()}
                  disabled={posting}
                >
                  ← Back to Menu
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
