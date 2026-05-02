"use client";

import { useAuth } from "../../../lib/useAuth";
import { useState, useMemo } from "react";
import { useCart } from "../../../lib/useCart";
import CartPillMobile from "../../../components/CartPillMobile";

/* ================= FAST HELPERS ================= */

const toMin = (t?: string | null) => {
  if (!t) return null;
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
};

const vegRegex = /dal|roti|rice|paneer|veg|thali|chapati|paratha/i;

const isVegItem = (it: any) => {
  return (
    String(it.item_category || "").toLowerCase() === "veg" ||
    String(it.item_category || "").toLowerCase() === "jain" ||
    vegRegex.test(it.item_name)
  );
};

const isItemActive = (it: any) => {
  const raw =
    it.status ??
    it.item_status ??
    it.is_active ??
    it.active;

  return String(raw || "").toUpperCase() === "ON";
};

export default function RestroMenuClient({ items, header }: any) {
  const { user } = useAuth();
  const { add, changeQty, cart } = useCart();

  const [vegOnly, setVegOnly] = useState(false);

  /* 🔥 COMPUTE ONLY ONCE */
  const trainMin = useMemo(() => {
    if (typeof window === "undefined") return null;

    const params = new URLSearchParams(window.location.search);
    const arrival = params.get("arrival");

    if (arrival && arrival.includes(":")) {
      return toMin(arrival.slice(0, 5));
    }
    return null;
  }, []);

  /* 🔥 HEAVY FILTER OPTIMIZED */
  const visible = useMemo(() => {
    return items.filter((it: any) => {
      if (!isItemActive(it)) return false;

      const s = toMin(it.start_time);
      const e = toMin(it.end_time);

      if (trainMin !== null && s !== null && e !== null) {
        if (e >= s) {
          if (trainMin < s || trainMin > e) return false;
        } else {
          if (trainMin < s && trainMin > e) return false;
        }
      }

      if (vegOnly && !isVegItem(it)) return false;

      return true;
    });
  }, [items, vegOnly, trainMin]);

  /* ================= ADD ================= */

  const handleAdd = (it: any) => {
    if (!user) {
      window.dispatchEvent(
        new CustomEvent("raileats:open-login", {
          detail: { item: it },
        })
      );
      return;
    }

    add({
      id: it.id,
      name: it.item_name,
      price: it.base_price,
      qty: 1,
    });
  };

  return (
    <div className="container-app space-y-4">

      {/* HEADER */}
     <div className="card flex justify-between items-center">
        <div>
          <h1 className="text-main font-semibold">{header.outletName}</h1>
          <div className="text-sub text-xs">
            {header.stationCode}
          </div>
        </div>

        <label className="text-sm flex gap-1">
          <input
            type="checkbox"
            checked={vegOnly}
            onChange={(e) => setVegOnly(e.target.checked)}
          />
          Veg only
        </label>
      </div>

      {/* EMPTY */}
      {visible.length === 0 && (
        <div className="card text-center text-sub">
          No items available
        </div>
      )}

      {/* ITEMS */}
      <div className="space-y-3">
        {visible.map((it: any) => {
          const existing = cart[it.id];
          const isVeg = isVegItem(it);

          return (
            <div
              key={it.id}
              className="card flex justify-between items-start"
            >
              <div>
                <div className="flex gap-2 items-center">
                  <span
                    className={`w-3 h-3 rounded-full ${
                      isVeg ? "bg-green-600" : "bg-red-600"
                    }`}
                  />
                  <span className="text-main text-sm font-medium">
                    {it.item_name}
                  </span>
                </div>

                <div className="text-sub text-xs">
                  ⏱{" "}
                  {it.start_time && it.end_time
                    ? `${it.start_time} - ${it.end_time}`
                    : "All day"}
                </div>

                {it.item_description && (
                  <div className="text-sub text-xs">
                    {it.item_description}
                  </div>
                )}

                <div className="text-main font-semibold">
                  ₹{it.base_price}
                </div>
              </div>

              <div>
                {!existing ? (
                  <button
                    className="btn-primary text-sm"
                    onClick={() => handleAdd(it)}
                  >
                    ADD
                  </button>
                ) : (
                  className="flex gap-2 border border-borderLight px-2 py-1 rounded text-sm"
                    <button onClick={() => changeQty(it.id, existing.qty - 1)}>
                      -
                    </button>
                    <span>{existing.qty}</span>
                    <button onClick={() => changeQty(it.id, existing.qty + 1)}>
                      +
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <CartPillMobile />
    </div>
  );
}
