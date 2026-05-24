"use client";

import { useAuth } from "../../../lib/useAuth";
import { useState, useMemo, useEffect } from "react";
import { useCart } from "../../../lib/useCart";
import CartPillMobile from "../../../components/CartPillMobile";

/* ================= FAST HELPERS ================= */

const toMin = (t?: string | null) => {
  if (!t) return null;

  const [h, m] = t.slice(0, 5).split(":").map(Number);

  return h * 60 + m;
};

// 🏛️ SUPABASE HEADINGS RECONSTRUCTION MAPPER
// Yeh function backend ke galat/swapped columns ko Supabase table heading ke anusar 100% correct karta hai.
const getTrueFields = (it: any) => {
  const code = Number(it?.id || 0); // Frontend JSON ki 'id' database ka 'item_code' hai
  const name = String(it?.item_name || "").toLowerCase().trim();
  
  // Default fallbacks matching frontend schema
  let trueItemCategory = "Veg"; // Supabase Heading: item_category (Veg/Non-Veg/Jain)
  let trueMenuType = it?.item_category || ""; // Supabase Heading: menu_type (Thalis/Combos/etc.)

  // Exact Supabase Row-by-Row mapping based on uploaded table
  if (code === 1 || name.includes("navratri") || name.includes("vrat")) {
    trueItemCategory = "Non-Veg"; // Supabase table me explicit "Non-Veg" mapped hai
    trueMenuType = "Thalis";
  } else if (code === 4 || name.includes("chicken rice combo")) {
    trueItemCategory = "Non-Veg";
    trueMenuType = "Combos";
  } else if (code === 5 || name.includes("dal fry")) {
    trueItemCategory = "Veg";
    trueMenuType = "Rice And Biryani";
  } else if (code === 6 || name.includes("tawa rotis")) {
    trueItemCategory = "Jain";
    trueMenuType = "Roti Paratha";
  } else if (code === 7 || name.includes("chicken curry")) {
    trueItemCategory = "Non-Veg";
    trueMenuType = "Combos";
  } else if (code === 8 || name.includes("veg special thali")) {
    trueItemCategory = "Jain";
    trueMenuType = "Thalis";
  } else if (code === 9 || code === 10 || code === 11 || code === 15 || name.includes("veg mini thali")) {
    trueItemCategory = "Veg";
    trueMenuType = "Thalis";
  } else if (code === 12 || name.includes("veg combo")) {
    trueItemCategory = "Veg";
    trueMenuType = "Thalis";
  } else if (code === 14) {
    trueItemCategory = "Veg";
    trueMenuType = "Beverages";
  } else {
    // Future safe keywords logic if new items are added
    if (name.includes("chicken") || name.includes("egg") || name.includes("mutton") || name.includes("fish")) {
      trueItemCategory = "Non-Veg";
    } else if (name.includes("jain")) {
      trueItemCategory = "Jain";
    } else {
      trueItemCategory = "Veg";
    }
  }

  return {
    item_category: trueItemCategory,
    menu_type: trueMenuType
  };
};

// 🔥 SMART VEG CHECKER (Uses correct Supabase item_category values)
const isVegItem = (it: any) => {
  const fields = getTrueFields(it);
  // Veg aur Jain items Green Dot show karenge, Non-Veg items Red Dot show karenge
  return fields.item_category === "Veg" || fields.item_category === "Jain";
};

const isItemActive = (it: any) => {
  const raw =
    it.status ??
    it.item_status ??
    it.is_active ??
    it.active;

  return String(raw || "").toUpperCase() === "ON";
};

export default function RestroMenuClient({
  items,
  header,
  nextParams,
}: any) {

  const minOrder = header?.minimumOrder || 0;

  const { user } = useAuth();

  const {
    add,
    changeQty,
    cart,
    setJourney,
  } = useCart();

  /* ================= CART TOTAL ================= */

  const cartTotal = useMemo(() => {
    return Object.values(cart).reduce(
      (sum: number, item: any) =>
        sum + item.price * item.qty,
      0
    );
  }, [cart]);

  /* ================= STATES ================= */

  const [vegOnly, setVegOnly] = useState(false);

  const [trainMin, setTrainMin] =
    useState<number | null>(null);

  /* ================= ARRIVAL TIME ================= */

  useEffect(() => {
    const params = new URLSearchParams(
      window.location.search
    );

    const arrival =
      params.get("deliveryTime") ||
      params.get("arrival") ||
      params.get("arrivalTime");

    if (arrival && arrival.includes(":")) {
      setTrainMin(
        toMin(arrival.slice(0, 5))
      );
    }
  }, []);

  /* ================= FILTER ITEMS ================= */

  const visible = useMemo(() => {
    return items.filter((it: any) => {

      /* STATUS CHECK */
      if (!isItemActive(it)) return false;

      const s = toMin(it.start_time);
      const e = toMin(it.end_time);

      /* TIME CHECK */
      if (
        trainMin !== null &&
        s !== null &&
        s !== undefined &&
        e !== null &&
        e !== undefined
      ) {

        /* NORMAL RANGE */
        if (e >= s) {
          if (
            trainMin < s ||
            trainMin > e
          ) {
            return false;
          }
        }
        /* OVERNIGHT RANGE */
        else {
          if (
            trainMin < s &&
            trainMin > e
          ) {
            return false;
          }
        }
      }

      /* VEG FILTER */
      if (
        vegOnly &&
        !isVegItem(it)
      ) {
        return false;
      }

      return true;
    });
  }, [
    items,
    vegOnly,
    trainMin,
  ]);

  /* ================= ADD TO CART ================= */

  const handleAdd = (it: any) => {
    if (!user) {
      window.dispatchEvent(
        new CustomEvent(
          "raileats:open-login",
          {
            detail: { item: it },
          }
        )
      );
      return;
    }

    /* SAVE JOURNEY */

    setJourney({
      trainNumber:
        nextParams?.trainNumber || "",

      trainName:
        nextParams?.trainName || "",

      stationName:
        nextParams?.stationName || "",

      stationCode:
        nextParams?.stationCode || "",

      deliveryDate:
        nextParams?.deliveryDate || "",

      deliveryTime:
        nextParams?.deliveryTime || "",

      vendorName:
        nextParams?.vendorName || "",

      restroCode:
        header?.restroCode ||
        nextParams?.restroCode ||
        "",
    });

    const trueFields = getTrueFields(it);

    /* ADD ITEM WITH CORRECTED SUPABASE HEADINGS */

    add({
      id: it.id,
      name: it.item_name,
      price: it.base_price,
      qty: 1,

      restro_code:
        header?.restroCode ||
        nextParams?.restroCode ||
        "",

      restro_name:
        nextParams?.vendorName || "",

      station_code:
        nextParams?.stationCode || "",

      station_name:
        nextParams?.stationName || "",

      description: it.item_description || null,
      category: trueFields.item_category, // Corrected Heading: "Veg" / "Non-Veg" / "Jain"
      cuisine: it.item_cuisine || null,
      menu_type: trueFields.menu_type,    // Corrected Heading: "Thalis" / "Combos" etc.
    } as any);
  };

  /* ================= UI ================= */

  return (
    <div className="container-app space-y-4">

      {/* ================= HEADER ================= */}

      <div className="card bg-white p-4 space-y-2">

        <div className="flex justify-between items-start">

          <div>
            <div className="text-xs text-gray-500">
              Journey
            </div>

            <div className="text-sm font-semibold text-orange-600">
              {nextParams?.trainName
                ? `${nextParams.trainName} #${nextParams.trainNumber}`
                : `Train #${nextParams?.trainNumber}`}
            </div>

            <div className="text-xs text-gray-500">
              {nextParams?.stationName}
              {" "}
              ({header?.stationCode || nextParams?.stationCode})
            </div>

            <div className="text-xs text-blue-600 font-semibold">
              {nextParams?.deliveryDate}
              {nextParams?.deliveryTime &&
                ` at ${nextParams.deliveryTime}`}
            </div>
          </div>

          {/* VEG TOGGLE */}

          <label className="text-sm flex gap-1 items-center">
            <input
              type="checkbox"
              checked={vegOnly}
              onChange={(e) =>
                setVegOnly(
                  e.target.checked
                )
              }
            />
            Veg only
          </label>

        </div>

        {/* RESTAURANT */}

        <div className="text-lg font-bold text-gray-800">
          {header?.outletName}
        </div>

        {/* MIN ORDER */}

        <div className="text-sm text-gray-600">
          Min Order:
          {" "}
          ₹{header?.minimumOrder}
        </div>

      </div>

      {/* ================= EMPTY ================= */}

      {visible.length === 0 && (
        <div className="card text-center text-sub">
          No items available
        </div>
      )}

      {/* ================= ITEMS ================= */}

      <div className="space-y-3">
        {visible.map((it: any) => {
          const existing = cart[it.id];
          const isVeg = isVegItem(it);

          return (
            <div
              key={it.id}
              className="card flex justify-between items-start"
            >
              {/* LEFT */}

              <div>
                <div className="flex gap-2 items-center">
                  <span
                    className={`w-3 h-3 rounded-full shrink-0 ${
                      isVeg
                        ? "bg-green-600"
                        : "bg-red-600"
                    }`}
                  />

                  <span className="text-main text-sm font-medium">
                    {it.item_name}
                  </span>
                </div>

                {/* TIME */}

                <div className="text-sub text-xs">
                  ⏱{" "}
                  {it.start_time &&
                  it.end_time
                    ? `${it.start_time} - ${it.end_time}`
                    : "All day"}
                </div>

                {/* DESCRIPTION */}

                {it.item_description && (
                  <div className="text-sub text-xs">
                    {it.item_description}
                  </div>
                )}

                {/* PRICE */}

                <div className="text-main font-semibold">
                  ₹{it.base_price}
                </div>
              </div>

              {/* RIGHT */}

              <div>
                {!existing ? (
                  <button
                    className="btn-primary text-sm"
                    onClick={() =>
                      handleAdd(it)
                    }
                  >
                    Add
                  </button>
                ) : (
                  <div className="flex gap-2 border px-2 py-1 rounded text-sm">
                    <button
                      onClick={() =>
                        changeQty(
                          it.id,
                          existing.qty - 1
                        )
                      }
                    >
                      -
                    </button>

                    <span>
                      {existing.qty}
                    </span>

                    <button
                      onClick={() =>
                        changeQty(
                          it.id,
                          existing.qty + 1
                        )
                      }
                    >
                      +
                    </button>
                  </div>
                )}
              </div>

            </div>
          );
        })}
      </div>

      {/* ================= FLOATING CART ================= */}

      <CartPillMobile
        minOrder={header?.minimumOrder}
      />

    </div>
  );
}
