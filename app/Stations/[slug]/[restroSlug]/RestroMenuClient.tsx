"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../lib/useAuth";
import { useCart } from "../../../lib/useCart";
import CartPillMobile from "../../../components/CartPillMobile";

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

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 760,
        margin: "0 auto",
        padding: "14px 12px 96px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <section
        style={{
          background: "#fff",
          border: "1px solid #dbe4ef",
          borderRadius: 18,
          boxShadow: "0 10px 28px rgba(15,23,42,0.06)",
          padding: 18,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "flex-start",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#64748b",
              }}
            >
              Journey
            </div>

            <div
              style={{
                marginTop: 4,
                fontSize: 15,
                fontWeight: 900,
                color: "#f97316",
              }}
            >
              {displayTrainName
                ? `${displayTrainName} #${displayTrainNumber || "-"}`
                : `Train #${displayTrainNumber || "-"}`}
            </div>

            <div
              style={{
                marginTop: 5,
                fontSize: 14,
                color: "#475569",
                fontWeight: 600,
              }}
            >
              {nextParams?.stationName || header?.stationName || "-"} (
              {header?.stationCode || nextParams?.stationCode || "-"})
            </div>

            <div
              style={{
                marginTop: 5,
                fontSize: 14,
                color: "#2563eb",
                fontWeight: 800,
              }}
            >
              {nextParams?.deliveryDate || "-"}
              {nextParams?.deliveryTime ? ` at ${nextParams.deliveryTime}` : ""}
            </div>
          </div>

          <label
            style={{
              flexShrink: 0,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 14,
              color: "#334155",
              fontWeight: 700,
            }}
          >
            <input
              type="checkbox"
              checked={vegOnly}
              onChange={(e) => setVegOnly(e.target.checked)}
            />
            Veg only
          </label>
        </div>

        <div
          style={{
            marginTop: 18,
            fontSize: 22,
            lineHeight: 1.2,
            color: "#0f172a",
            fontWeight: 950,
          }}
        >
          {header?.outletName || nextParams?.vendorName || "Restaurant"}
        </div>

        <div
          style={{
            marginTop: 8,
            fontSize: 15,
            color: "#475569",
            fontWeight: 700,
          }}
        >
          Min Order: Rs {Number(header?.minimumOrder || 0)}
        </div>
      </section>

      <section
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          overflowX: "auto",
          paddingBottom: 2,
        }}
      >
        <button
          type="button"
          onClick={() => setVegOnly(false)}
          style={{
            border: !vegOnly ? "1px solid #f97316" : "1px solid #dbe4ef",
            background: !vegOnly ? "#fff7ed" : "#fff",
            color: !vegOnly ? "#ea580c" : "#334155",
            borderRadius: 999,
            padding: "9px 15px",
            fontSize: 14,
            fontWeight: 900,
            whiteSpace: "nowrap",
            cursor: "pointer",
          }}
        >
          All Items
        </button>

        <button
          type="button"
          onClick={() => setVegOnly(true)}
          style={{
            border: vegOnly ? "1px solid #16a34a" : "1px solid #dbe4ef",
            background: vegOnly ? "#f0fdf4" : "#fff",
            color: vegOnly ? "#15803d" : "#334155",
            borderRadius: 999,
            padding: "9px 15px",
            fontSize: 14,
            fontWeight: 900,
            whiteSpace: "nowrap",
            cursor: "pointer",
          }}
        >
          Veg Only
        </button>

        <span
          style={{
            flexShrink: 0,
            fontSize: 14,
            fontWeight: 700,
            color: "#475569",
          }}
        >
          {visible.length} item{visible.length === 1 ? "" : "s"} available
        </span>
      </section>

      {visible.length === 0 && (
        <section
          style={{
            background: "#fff",
            border: "1px solid #dbe4ef",
            borderRadius: 18,
            padding: 20,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 17, fontWeight: 900, color: "#0f172a" }}>
            No items available
          </div>
          <div style={{ marginTop: 6, fontSize: 14, color: "#64748b" }}>
            Items may be unavailable for this train arrival time.
          </div>
        </section>
      )}

      <section
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {visible.map((it: any) => {
          const existing = getCartEntry(cart, it.id);
          const isVeg = isVegItem(it);
          const category = getItemCategory(it);
          const menuType = getMenuType(it);

          return (
            <article
              key={it.id}
              style={{
                background: "#fff",
                border: "1px solid #dbe4ef",
                borderRadius: 18,
                boxShadow: "0 8px 22px rgba(15,23,42,0.05)",
                padding: 16,
                display: "block",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 16,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 999,
                        background: isVeg ? "#16a34a" : "#dc2626",
                        flexShrink: 0,
                        marginTop: 5,
                      }}
                    />

                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 17,
                          lineHeight: 1.25,
                          fontWeight: 900,
                          color: "#0f172a",
                          wordBreak: "break-word",
                        }}
                      >
                        {it.item_name}
                      </div>

                      <div
                        style={{
                          marginTop: 5,
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#64748b",
                        }}
                      >
                        {category} • {menuType}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: 10,
                      fontSize: 13,
                      color: "#64748b",
                      fontWeight: 700,
                    }}
                  >
                    {cleanTime(it.start_time) && cleanTime(it.end_time)
                      ? `${cleanTime(it.start_time)} - ${cleanTime(it.end_time)}`
                      : "All day"}
                  </div>

                  {it.item_description ? (
                    <div
                      style={{
                        marginTop: 7,
                        fontSize: 14,
                        lineHeight: 1.35,
                        color: "#475569",
                        wordBreak: "break-word",
                      }}
                    >
                      {it.item_description}
                    </div>
                  ) : null}

                  <div
                    style={{
                      marginTop: 12,
                      fontSize: 18,
                      fontWeight: 950,
                      color: "#0f172a",
                    }}
                  >
                    Rs {Number(it.base_price || 0)}
                  </div>
                </div>

                <div style={{ flexShrink: 0 }}>
                  {!existing ? (
                    <button
                      type="button"
                      onClick={() => handleAdd(it)}
                      style={{
                        minWidth: 68,
                        minHeight: 42,
                        border: 0,
                        borderRadius: 12,
                        background: "#f97316",
                        color: "#fff",
                        fontSize: 15,
                        fontWeight: 950,
                        cursor: "pointer",
                      }}
                    >
                      Add
                    </button>
                  ) : (
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        border: "1px solid #dbe4ef",
                        borderRadius: 12,
                        overflow: "hidden",
                        background: "#fff",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          handleQty(it, Number(existing.qty || 0) - 1)
                        }
                        style={{
                          width: 34,
                          height: 38,
                          border: 0,
                          background: "#fff",
                          fontWeight: 900,
                          cursor: "pointer",
                        }}
                      >
                        -
                      </button>

                      <span
                        style={{
                          minWidth: 24,
                          textAlign: "center",
                          fontWeight: 900,
                          color: "#0f172a",
                        }}
                      >
                        {Number(existing.qty || 0)}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          handleQty(it, Number(existing.qty || 0) + 1)
                        }
                        style={{
                          width: 34,
                          height: 38,
                          border: 0,
                          background: "#fff",
                          fontWeight: 900,
                          cursor: "pointer",
                        }}
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

      <section
        style={{
          background: "#fff",
          border: "1px solid #dbe4ef",
          borderRadius: 18,
          padding: 16,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 18,
            lineHeight: 1.25,
            fontWeight: 950,
            color: "#0f172a",
          }}
        >
          Order food from {header?.outletName || "restaurant"} at{" "}
          {header?.stationName || nextParams?.stationName || "your station"}
        </h1>

        <p
          style={{
            margin: "8px 0 0",
            fontSize: 14,
            lineHeight: 1.5,
            color: "#64748b",
          }}
        >
          Choose fresh meals for your train journey, add items to cart, verify
          your mobile number and place your order for delivery at your seat.
        </p>
      </section>

      <CartPillMobile minOrder={header?.minimumOrder} />
    </div>
  );
}
