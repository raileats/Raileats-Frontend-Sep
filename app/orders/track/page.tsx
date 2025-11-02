// app/orders/track/page.tsx
"use client";

import React, { useMemo, useState } from "react";

const ADMIN_BASE =
  process.env.NEXT_PUBLIC_ADMIN_APP_URL || "https://admin.raileats.in";

type OrderLite = {
  id: string;
  created_at?: string;
  status?: string;
  pricing?: { total?: number; currency?: string };
};

function money(n?: number, currency = "INR") {
  if (typeof n !== "number") return "—";
  const v = n.toFixed(2).replace(/\.00$/, "");
  return (currency === "INR" ? "₹" : "") + v;
}

export default function TrackOrdersPage() {
  const [phone, setPhone] = useState("");
  const [pnr, setPnr] = useState("");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<OrderLite[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const valid = useMemo(() => /^\d{10}$/.test(phone.trim()), [phone]);

  async function search() {
    setErr(null);
    if (!valid) {
      setErr("Enter a valid 10-digit phone number.");
      return;
    }
    setLoading(true);
    setRows(null);
    try {
      // Support multiple Admin shapes:
      // 1) GET /api/orders?phone=xxxxxxxxxx&pnr=YYYY (returns array or {rows})
      const url = new URL(`${ADMIN_BASE.replace(/\/$/, "")}/api/orders`);
      url.searchParams.set("phone", phone.trim());
      if (pnr.trim()) url.searchParams.set("pnr", pnr.trim());

      const res = await fetch(url.toString(), { cache: "no-store" });
      const j = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        throw new Error(j?.error || j?.message || `Failed (${res.status})`);
      }

      const list: OrderLite[] = (j?.rows ?? j?.data ?? (Array.isArray(j) ? j : [])) as any[];
      setRows(list ?? []);
    } catch (e: any) {
      setErr(e?.message || "Failed to fetch orders.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-3xl mx-auto px-3 sm:px-6 py-10">
      <h1 className="text-2xl sm:text-3xl font-bold leading-tight">Track my order</h1>
      <p className="mt-1 text-sm text-gray-600">Enter your phone (and optional PNR) to see recent orders.</p>

      <div className="mt-4 bg-white rounded shadow p-4 space-y-3">
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="text-sm">Phone</label>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, "").slice(0, 10))}
              placeholder="10-digit phone"
            />
          </div>
          <div>
            <label className="text-sm">PNR (optional)</label>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={pnr}
              onChange={(e) => setPnr(e.target.value)}
            />
          </div>
        </div>

        {err && <p className="text-sm text-red-600">{err}</p>}

        <div className="flex gap-2">
          <button
            type="button"
            className="rounded bg-blue-600 text-white px-4 py-2 disabled:opacity-60"
            onClick={search}
            disabled={!valid || loading}
          >
            {loading ? "Searching…" : "Search"}
          </button>
          <a href="/" className="rounded border px-4 py-2">Home</a>
        </div>
      </div>

      {rows && (
        <div className="mt-6 bg-white rounded shadow p-4">
          <h2 className="font-semibold mb-3">Results</h2>
          {rows.length === 0 ? (
            <p className="text-sm text-gray-600">No orders found.</p>
          ) : (
            <div className="divide-y">
              {rows.map((o) => (
                <a
                  key={o.id}
                  href={`/orders/${encodeURIComponent(o.id)}`}
                  className="flex items-center justify-between py-3 hover:bg-gray-50 rounded px-2 -mx-2"
                >
                  <div>
                    <div className="font-medium">Order #{o.id}</div>
                    <div className="text-xs text-gray-500">
                      {o.created_at ? new Date(o.created_at).toLocaleString() : "—"} • {o.status || "PLACED"}
                    </div>
                  </div>
                  <div className="text-sm font-medium">
                    {money(o.pricing?.total, o.pricing?.currency)}
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
