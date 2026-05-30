"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../lib/useAuth";
import { useCart } from "../../../lib/useCart";
import CartPillMobile from "../../../components/CartPillMobile";

/* ================= HELPERS ================= */

const toMin = (t?: string | null) => {
  if (!t) return null;

  const clean = String(t).slice(0, 5);
  const [h, m] = clean.split(":").map(Number);

  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
};

const cleanTime = (value?: string | null) => {
  if (!value) return "";
  return String(value).slice(0, 5);
};

const cleanTrainName = (value?: string | null) => {
  const v = String(value || "").trim();

  if (!v || v.toLowerCase() === "train" || v.toLowerCase() === "undefined") {
    return "";
  }

  return v;
};

/* ================= CATEGORY HELPERS ================= */

const getItemCategory = (it: any) => {
  const category = String(it?.item_category || "")
    .trim()
    .toLowerCase();

  if (category === "veg" || category === "jain") return "Veg";

  if (
    category === "non-veg" ||
    category === "non veg" ||
    category === "nonveg"
  ) {
    return "Non-Veg";
  }

  const name = String(it?.item_name || "").toLowerCase();

  if (
    name.includes("chicken") ||
    name.includes("egg") ||
    name.includes("fish") ||
    name.includes("mutton")
  ) {
    return "Non-Veg";
  }

  return "Veg";
};

const getMenuType = (it: any) => {
  return String(it?.menu_type || "Other").trim();
};

const isVegItem = (it: any) => {
  return getItemCategory(it) === "Veg";
};

const isItemActive = (it: any) => {
  const raw =
    it?.status ??
    it?.item_status ??
    it?.is_active ??
    it?.active ??
    "ON";

  return String(raw).trim().toUpperCase() === "ON";
};

const getCartEntry = (cart: any, itemId: any) => {
  if (!cart) return null;

  if (Array.isArray(cart)) {
    return cart.find((x: any) => String(x?.id) === String(itemId)) || null;
  }

  return cart[itemId] || cart[String(itemId)] || null;
};

export default function RestroMenuClient({
  items = [],
  header = {},
  nextParams = {},
}: any) {
  const { user } = useAuth();
  const { add, changeQty, cart, setJourney } = useCart();

  const [vegOnly, setVegOnly] = useState(false);
  const [trainMin, setTrainMin] = useState<number | null>(null);

  const [urlJourney, setUrlJourney] = useState({
    trainNumber: "",
    trainName: "",
  });

  /* ================= URL FALLBACK ================= */

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const arrival =
      params.get("deliveryTime") ||
      params.get("arrival") ||
      params.get("arrivalTime");

    if (arrival && arrival.includes(":")) {
      setTrainMin(toMin(arrival.slice(0, 5)));
    }

    const trainNumber =
      params.get("train") ||
      params.get("trainNumber") ||
      params.get("trainNo") ||
      "";

    setUrlJourney({
      trainNumber,
      trainName: cleanTrainName(params.get("trainName")),
    });
  }, []);

  const displayTrainNumber =
    nextParams?.trainNumber ||
    nextParams?.train ||
    urlJourney.trainNumber ||
    "";

  const displayTrainName =
    cleanTrainName(nextParams?.trainName) ||
    urlJourney.trainName ||
    "";

  /* ================= FILTER ================= */

  const visible = useMemo(() => {
    return (items || []).filter((it: any) => {
      if (!isItemActive(it)) return false;

      const s = toMin(it?.start_time);
      const e = toMin(it?.end_time);

      if (trainMin !== null && s !== null && e !== null) {
        if (e >= s) {
          if (trainMin < s || trainMin > e) return false;
        } else if (trainMin < s && trainMin > e) {
          return false;
        }
      }

      if (vegOnly && !isVegItem(it)) return false;

      return true;
    });
  }, [items, vegOnly, trainMin]);

  /* ================= JOURNEY / CART ================= */

  const saveJourney = () => {
    setJourney({
      trainNumber: displayTrainNumber,
      trainName: displayTrainName,
      stationName: nextParams?.stationName || header?.stationName || "",
      stationCode: nextParams?.stationCode || header?.stationCode || "",
      deliveryDate: nextParams?.deliveryDate || "",
      deliveryTime: nextParams?.deliveryTime || "",
      vendorName: nextParams?.vendorName || header?.outletName || "",
      restroCode: Number(header?.restroCode || nextParams?.restroCode || 0),
    });
  };

  const buildCartItem = (it: any) => {
    return {
      id: it.id,
      name: it.item_name,
      price: Number(it.base_price || 0),
      qty: 1,

      restro_code: String(header?.restroCode || nextParams?.restroCode || ""),
      restro_name: nextParams?.vendorName || header?.outletName || "",

      station_code: nextParams?.stationCode || header?.stationCode || "",
      station_name: nextParams?.stationName || header?.stationName || "",

      description: it.item_description || null,
      category: getItemCategory(it),
      cuisine: it.item_cuisine || null,
      menu_type: getMenuType(it),
    };
  };

  const handleAdd = (it: any) => {
    const cartItem = buildCartItem(it);

    if (!user) {
      window.dispatchEvent(
        new CustomEvent("raileats:open-login", {
          detail: {
            item: it,
            cartItem,
            afterLogin: "add-to-cart",
          },
        })
      );

      return;
    }

    saveJourney();
    add(cartItem as any);
  };

  const handleQty = (it: any, nextQty: number) => {
    if (nextQty < 0) return;
    changeQty(it.id, nextQty);
  };

  /* ================= UI ================= */

  return (
    <div className="w-full max-w-[760px] mx-auto px-3 pb-24 space-y-4">
      {/* HEADER */}
      <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-slate-500">Journey</div>

            <div className="mt-1 text-sm font-extrabold text-orange-600">
              {displayTrainName
                ? `${displayTrainName} #${displayTrainNumber || "-"}`
                : `Train #${displayTrainNumber || "-"}`}
            </div>

            <div className="mt-1 text-sm text-slate-600">
              {nextParams?.stationName || header?.stationName || "-"} (
              {header?.stationCode || nextParams?.stationCode || "-"})
            </div>

            <div className="mt-1 text-sm font-bold text-blue-600">
              {nextParams?.deliveryDate || "-"}
              {nextParams?.deliveryTime ? ` at ${nextParams.deliveryTime}` : ""}
            </div>
          </div>

          <label className="shrink-0 inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={vegOnly}
              onChange={(e) => setVegOnly(e.target.checked)}
              className="h-4 w-4"
            />
            <span>Veg only</span>
          </label>
        </div>

        <div className="mt-4 text-xl font-black text-slate-900">
          {header?.outletName || nextParams?.vendorName || "Restaurant"}
        </div>

        <div className="mt-2 text-sm font-semibold text-slate-600">
          Min Order: Rs {Number(header?.minimumOrder || 0)}
        </div>
      </section>

      {/* FILTER */}
      <section className="flex items-center gap-2 overflow-x-auto">
        <button
          type="button"
          className={`shrink-0 rounded-full border px-4 py-2 text-sm font-extrabold ${
            !vegOnly
              ? "border-orange-500 bg-orange-50 text-orange-600"
              : "border-slate-200 bg-white text-slate-700"
          }`}
          onClick={() => setVegOnly(false)}
        >
          All Items
        </button>

        <button
          type="button"
          className={`shrink-0 rounded-full border px-4 py-2 text-sm font-extrabold ${
            vegOnly
              ? "border-green-500 bg-green-50 text-green-700"
              : "border-slate-200 bg-white text-slate-700"
          }`}
          onClick={() => setVegOnly(true)}
        >
          Veg Only
        </button>

        <span className="shrink-0 text-sm font-semibold text-slate-700">
          {visible.length} item{visible.length === 1 ? "" : "s"} available
        </span>
      </section>

      {/* EMPTY */}
      {visible.length === 0 && (
        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 text-center">
          <div className="text-base font-black text-slate-900">
            No items available
          </div>
          <div className="mt-1 text-sm text-slate-500">
            Items may be unavailable for this train arrival time.
          </div>
        </section>
      )}

      {/* ITEMS */}
      <section className="space-y-3">
        {visible.map((it: any) => {
          const existing = getCartEntry(cart, it.id);
          const isVeg = isVegItem(it);
          const category = getItemCategory(it);
          const menuType = getMenuType(it);

          return (
            <article
              key={it.id}
              className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2">
                    <span
                      className={`mt-1.5 h-3 w-3 shrink-0 rounded-full ${
                        isVeg ? "bg-green-600" : "bg-red-600"
                      }`}
                    />

                    <div className="min-w-0">
                      <h2 className="text-base font-black leading-snug text-slate-900 break-words">
                        {it.item_name}
                      </h2>

                      <div className="mt-1 text-xs font-semibold text-slate-500">
                        {category} • {menuType}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 text-xs font-semibold text-slate-500">
                    {cleanTime(it.start_time) && cleanTime(it.end_time)
                      ? `${cleanTime(it.start_time)} - ${cleanTime(it.end_time)}`
                      : "All day"}
                  </div>

                  {it.item_description ? (
                    <p className="mt-2 text-sm leading-snug text-slate-600 break-words">
                      {it.item_description}
                    </p>
                  ) : null}

                  <div className="mt-3 text-lg font-black text-slate-950">
                    Rs {Number(it.base_price || 0)}
                  </div>
                </div>

                <div className="shrink-0">
                  {!existing ? (
                    <button
                      type="button"
                      className="min-w-[68px] rounded-xl bg-orange-500 px-4 py-3 text-sm font-black text-white shadow-sm"
                      onClick={() => handleAdd(it)}
                    >
                      Add
                    </button>
                  ) : (
                    <div className="inline-flex items-center overflow-hidden rounded-xl border border-slate-200 bg-white text-sm font-black text-slate-900">
                      <button
                        type="button"
                        className="h-10 w-9"
                        onClick={() =>
                          handleQty(it, Number(existing.qty || 0) - 1)
                        }
                      >
                        -
                      </button>

                      <span className="min-w-[26px] text-center">
                        {Number(existing.qty || 0)}
                      </span>

                      <button
                        type="button"
                        className="h-10 w-9"
                        onClick={() =>
                          handleQty(it, Number(existing.qty || 0) + 1)
                        }
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {/* SEO CONTENT */}
      <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
        <h1 className="text-lg font-black text-slate-900">
          Order food from {header?.outletName || "restaurant"} at{" "}
          {header?.stationName || nextParams?.stationName || "your station"}
        </h1>

        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Choose fresh meals for your train journey, add items to cart, verify
          your mobile number and place your order for delivery at your seat.
        </p>
      </section>

      <CartPillMobile minOrder={header?.minimumOrder} />
    </div>
  );
}
