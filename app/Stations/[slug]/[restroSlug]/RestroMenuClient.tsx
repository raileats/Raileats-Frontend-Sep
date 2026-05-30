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

  /* ================= ARRIVAL + URL FALLBACK ================= */

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

    const trainName = cleanTrainName(params.get("trainName"));

    setUrlJourney({
      trainNumber,
      trainName,
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
      stationName: nextParams?.stationName || "",
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
    <div className="menu-page space-y-4">
      <section className="app-card menu-hero-card">
        <div className="menu-journey-row">
          <div>
            <div className="menu-eyebrow">Journey</div>

            <div className="menu-train">
              {displayTrainName
                ? `${displayTrainName} #${displayTrainNumber || "-"}`
                : `Train #${displayTrainNumber || "-"}`}
            </div>

            <div className="menu-muted">
              {nextParams?.stationName || header?.stationName || "-"} (
              {header?.stationCode || nextParams?.stationCode || "-"})
            </div>

            <div className="menu-date">
              {nextParams?.deliveryDate || "-"}
              {nextParams?.deliveryTime ? ` at ${nextParams.deliveryTime}` : ""}
            </div>
          </div>

          <label className="menu-veg-toggle">
            <input
              type="checkbox"
              checked={vegOnly}
              onChange={(e) => setVegOnly(e.target.checked)}
            />
            <span>Veg only</span>
          </label>
        </div>

        <div className="menu-restro-name">
          {header?.outletName || nextParams?.vendorName || "Restaurant"}
        </div>

        <div className="menu-min-order">
          Min Order: Rs {Number(header?.minimumOrder || 0)}
        </div>
      </section>

      <section className="menu-filter-strip">
        <button
          type="button"
          className={!vegOnly ? "menu-chip active" : "menu-chip"}
          onClick={() => setVegOnly(false)}
        >
          All Items
        </button>

        <button
          type="button"
          className={vegOnly ? "menu-chip active veg" : "menu-chip veg"}
          onClick={() => setVegOnly(true)}
        >
          Veg Only
        </button>

        <span className="menu-count">
          {visible.length} item{visible.length === 1 ? "" : "s"} available
        </span>
      </section>

      {visible.length === 0 && (
        <section className="app-card menu-empty">
          <div className="menu-empty-title">No items available</div>
          <div className="menu-muted">
            Items may be unavailable for this train arrival time.
          </div>
        </section>
      )}

      <section className="menu-list">
        {visible.map((it: any) => {
          const existing = getCartEntry(cart, it.id);
          const isVeg = isVegItem(it);
          const category = getItemCategory(it);
          const menuType = getMenuType(it);

          return (
            <article key={it.id} className="menu-item-card app-card">
              <div className="menu-item-main">
                <div className="menu-title-row">
                  <span
                    className={
                      isVeg
                        ? "menu-food-dot menu-food-dot-veg"
                        : "menu-food-dot menu-food-dot-nonveg"
                    }
                  />

                  <div className="menu-item-title">{it.item_name}</div>
                </div>

                <div className="menu-item-meta">
                  {category} • {menuType}
                </div>

                <div className="menu-item-time">
                  {cleanTime(it.start_time) && cleanTime(it.end_time)
                    ? `${cleanTime(it.start_time)} - ${cleanTime(it.end_time)}`
                    : "All day"}
                </div>

                {it.item_description ? (
                  <div className="menu-item-description">
                    {it.item_description}
                  </div>
                ) : null}

                <div className="menu-item-price">
                  Rs {Number(it.base_price || 0)}
                </div>
              </div>

              <div className="menu-item-action">
                {!existing ? (
                  <button
                    type="button"
                    className="menu-add-btn"
                    onClick={() => handleAdd(it)}
                  >
                    Add
                  </button>
                ) : (
                  <div className="menu-qty-control">
                    <button
                      type="button"
                      onClick={() => handleQty(it, Number(existing.qty || 0) - 1)}
                    >
                      -
                    </button>

                    <span>{Number(existing.qty || 0)}</span>

                    <button
                      type="button"
                      onClick={() => handleQty(it, Number(existing.qty || 0) + 1)}
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </section>

      <section className="app-card menu-seo-copy">
        <h1>
          Order food from {header?.outletName || "restaurant"} at{" "}
          {header?.stationName || nextParams?.stationName || "your station"}
        </h1>

        <p>
          Choose fresh meals for your train journey, add items to cart, verify
          your mobile number and place your order for delivery at your seat.
        </p>
      </section>

      <CartPillMobile minOrder={header?.minimumOrder} />
    </div>
  );
}
