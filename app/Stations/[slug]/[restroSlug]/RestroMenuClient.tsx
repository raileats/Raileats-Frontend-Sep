"use client";

import { useAuth } from "../../../lib/useAuth";
import { useState, useMemo, useEffect } from "react";
import { useCart } from "../../../lib/useCart";
import CartPillMobile from "../../../components/CartPillMobile";

/* ================= HELPERS ================= */

const toMin = (t?: string | null) => {

  if (!t) return null;

  const [h, m] = t
    .slice(0, 5)
    .split(":")
    .map(Number);

  return h * 60 + m;
};

/* ================= CATEGORY HELPERS ================= */

const getItemCategory = (it: any) => {

  const category = String(
    it?.item_category || ""
  )
    .trim()
    .toLowerCase();

  if (
    category === "veg" ||
    category === "jain"
  ) {
    return "Veg";
  }

  if (
    category === "non-veg" ||
    category === "non veg"
  ) {
    return "Non-Veg";
  }

  /* AUTO FALLBACK */

  const name = String(
    it?.item_name || ""
  ).toLowerCase();

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

  return String(
    it?.menu_type || "Other"
  ).trim();

};

/* ================= VEG CHECK ================= */

const isVegItem = (it: any) => {

  const category =
    getItemCategory(it);

  return category === "Veg";

};

/* ================= STATUS ================= */

const isItemActive = (it: any) => {

  const raw =
    it.status ??
    it.item_status ??
    it.is_active ??
    it.active;

  return String(raw || "")
    .trim()
    .toUpperCase() === "ON";

};

export default function RestroMenuClient({
  items,
  header,
  nextParams,
}: any) {

  const { user } = useAuth();

  const {
    add,
    changeQty,
    cart,
    setJourney,
  } = useCart();

  /* ================= STATES ================= */

  const [vegOnly, setVegOnly] =
    useState(false);

  const [trainMin, setTrainMin] =
    useState<number | null>(null);

  /* ================= ARRIVAL ================= */

  useEffect(() => {

    const params =
      new URLSearchParams(
        window.location.search
      );

    const arrival =
      params.get("deliveryTime") ||
      params.get("arrival") ||
      params.get("arrivalTime");

    if (
      arrival &&
      arrival.includes(":")
    ) {

      setTrainMin(
        toMin(
          arrival.slice(0, 5)
        )
      );

    }

  }, []);

  /* ================= FILTER ================= */

  const visible = useMemo(() => {

    return items.filter((it: any) => {

      /* STATUS */

      if (!isItemActive(it)) {
        return false;
      }

      /* TIME */

      const s =
        toMin(it.start_time);

      const e =
        toMin(it.end_time);

      if (
        trainMin !== null &&
        s !== null &&
        e !== null
      ) {

        /* NORMAL */

        if (e >= s) {

          if (
            trainMin < s ||
            trainMin > e
          ) {
            return false;
          }

        }

        /* OVERNIGHT */

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

  /* ================= ADD ================= */

  const handleAdd = (it: any) => {

    if (!user) {

      window.dispatchEvent(
        new CustomEvent(
          "raileats:open-login",
          {
            detail: {
              item: it,
            },
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

      restroCode: Number(
  header?.restroCode ||
  nextParams?.restroCode ||
  0
),

    });

    const trueFields = {
      item_category:
        getItemCategory(it),

      menu_type:
        getMenuType(it),
    };

    /* ADD TO CART */

    add({

      id: it.id,

      name: it.item_name,

      price: it.base_price,

      qty: 1,

      restro_code: String(
  header?.restroCode ||
  nextParams?.restroCode ||
  ""
),

      restro_name:
        nextParams?.vendorName || "",

      station_code:
        nextParams?.stationCode || "",

      station_name:
        nextParams?.stationName || "",

      description:
        it.item_description || null,

      category:
        trueFields.item_category,

      cuisine:
        it.item_cuisine || null,

      menu_type:
        trueFields.menu_type,

    } as any);

  };

  /* ================= UI ================= */

  return (

    <div className="container-app space-y-4">

      {/* HEADER */}

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

              (
              {header?.stationCode ||
                nextParams?.stationCode}
              )

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

      {/* EMPTY */}

      {visible.length === 0 && (

        <div className="card text-center text-sub">
          No items available
        </div>

      )}

      {/* ITEMS */}

      <div className="space-y-3">

        {visible.map((it: any) => {

          const existing =
            cart[it.id];

          const isVeg =
            isVegItem(it);

          const category =
            getItemCategory(it);

          return (

            <div
              key={it.id}
              className="card flex justify-between items-start"
            >

              {/* LEFT */}

              <div className="flex-1 pr-3">

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

                {/* CATEGORY */}

                <div className="text-[11px] text-gray-500 mt-1">

                  {category}

                  {" • "}

                  {getMenuType(it)}

                </div>

                {/* TIME */}

                <div className="text-sub text-xs mt-1">

                  ⏱

                  {" "}

                  {it.start_time &&
                  it.end_time
                    ? `${it.start_time} - ${it.end_time}`
                    : "All day"}

                </div>

                {/* DESCRIPTION */}

                {it.item_description && (

                  <div className="text-sub text-xs mt-1">
                    {it.item_description}
                  </div>

                )}

                {/* PRICE */}

                <div className="text-main font-semibold mt-2">
                  ₹{it.base_price}
                </div>

              </div>

              {/* RIGHT */}

              <div className="shrink-0">

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

      {/* FLOATING CART */}

      <CartPillMobile
        minOrder={
          header?.minimumOrder
        }
      />

    </div>

  );
}
