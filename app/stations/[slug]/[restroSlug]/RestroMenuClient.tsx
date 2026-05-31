"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../lib/useAuth";
import { useCart } from "../../../lib/useCart";
import CartPillMobile from "../../../components/CartPillMobile";

type UrlJourney = {
  trainNumber: string;
  trainName: string;
  deliveryDate: string;
  deliveryTime: string;
};

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
  const lower = v.toLowerCase();

  if (!v || lower === "train" || lower === "undefined" || lower === "null") {
    return "";
  }

  return v;
};

const getItemCategory = (it: any) => {
  const category = String(it?.item_category || "").trim().toLowerCase();

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

const getPrice = (it: any) => {
  return Number(it?.base_price || it?.selling_price || it?.price || 0);
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
  const [urlJourney, setUrlJourney] = useState<UrlJourney>({
    trainNumber: "",
    trainName: "",
    deliveryDate: "",
    deliveryTime: "",
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

    const deliveryTime =
      params.get("deliveryTime") ||
      params.get("arrival") ||
      params.get("arrivalTime") ||
      "";

    setUrlJourney({
      trainNumber:
        params.get("train") ||
        params.get("trainNumber") ||
        params.get("trainNo") ||
        "",
      trainName: cleanTrainName(params.get("trainName")),
      deliveryDate: params.get("deliveryDate") || params.get("date") || "",
      deliveryTime: cleanTime(deliveryTime),
    });
  }, []);

  const displayTrainNumber =
    nextParams?.trainNumber ||
    nextParams?.train ||
    urlJourney.trainNumber ||
    "";

  const displayTrainName =
    cleanTrainName(nextParams?.trainName) || urlJourney.trainName || "";

  const displayStationName =
    nextParams?.stationName || header?.stationName || "";

  const displayStationCode =
    nextParams?.stationCode || header?.stationCode || "";

  const displayDeliveryDate =
    nextParams?.deliveryDate || urlJourney.deliveryDate || "";

  const displayDeliveryTime =
    cleanTime(nextParams?.deliveryTime) || urlJourney.deliveryTime || "";

  const displayVendorName =
    nextParams?.vendorName || header?.outletName || "Restaurant";
  const isStationOnlyView =
  nextParams?.mode === "station" || !nextParams?.trainNumber;
  
  const minimumOrder = Number(
    header?.minimumOrder || nextParams?.minOrder || 0
  );

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
      stationName: displayStationName,
      stationCode: displayStationCode,
      deliveryDate: displayDeliveryDate,
      deliveryTime: displayDeliveryTime,
      vendorName: displayVendorName,
      restroCode: Number(header?.restroCode || nextParams?.restroCode || 0),
    });

    if (typeof window !== "undefined") {
      localStorage.setItem("raileats_min_order", String(minimumOrder || 0));
    }
  };

  const buildCartItem = (it: any) => {
    return {
      id: it.id,
      name: it.item_name,
      price: getPrice(it),
      qty: 1,
      restro_code: String(header?.restroCode || nextParams?.restroCode || ""),
      restro_name: displayVendorName,
      station_code: displayStationCode,
      station_name: displayStationName,
      description: it.item_description || null,
      category: getItemCategory(it),
      cuisine: it.item_cuisine || null,
      menu_type: getMenuType(it),
      minimumOrder,
      minOrder: minimumOrder,
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
        maxWidth: 560,
        margin: "0 auto",
        padding: "12px 12px 104px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <section
        style={{
          background: "#fff",
          border: "1px solid #dbe4ef",
          borderRadius: 18,
          boxShadow: "0 8px 22px rgba(15,23,42,0.06)",
          padding: 16,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 800,
            color: "#64748b",
            marginBottom: 10,
          }}
        >
          Journey
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
            gap: "10px 14px",
            alignItems: "start",
          }}
        >
          <div style={{ minWidth: 0, display: "grid", gap: 7 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "#f97316",
                fontWeight: 900,
                fontSize: 11,
                lineHeight: 1.2,
              }}
            >
              <span style={{ width: 18, textAlign: "center" }}>🚆</span>
              <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>
                {displayTrainNumber || displayTrainName
                  ? `${displayTrainNumber || "Train"}${
                      displayTrainName ? ` - ${displayTrainName}` : ""
                    }`
                  : "Train"}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "#334155",
                fontWeight: 800,
                fontSize: 12,
                lineHeight: 1.25,
              }}
            >
              <span style={{ width: 18, textAlign: "center" }}>📍</span>
              <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>
                {displayStationName || "-"}
                {displayStationCode ? ` (${displayStationCode})` : ""}
              </span>
            </div>
          </div>

          <div
            style={{
              minWidth: 0,
              display: "grid",
              gap: 7,
              justifyItems: "end",
              textAlign: "right",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 8,
                color: "#0f172a",
                fontWeight: 900,
                fontSize: 12,
                lineHeight: 1.2,
              }}
            >
              <span>🍴</span>
              <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>
                {displayVendorName}
              </span>
            </div>

            <div
              style={{
                color: "#dc2626",
                fontSize: 12,
                fontWeight: 900,
              }}
            >
              Min Order: Rs {minimumOrder}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            marginTop: 13,
            color: "#2563eb",
            fontSize: 13,
            fontWeight: 900,
          }}
        >
          <span>📅 {displayDeliveryDate || "-"}</span>
          <span>⏰ {displayDeliveryTime || "-"}</span>
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "auto auto minmax(0, 1fr)",
          alignItems: "center",
          gap: 8,
          overflow: "hidden",
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
            padding: "8px 13px",
            fontSize: 13,
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
            padding: "8px 13px",
            fontSize: 12,
            fontWeight: 900,
            whiteSpace: "nowrap",
            cursor: "pointer",
          }}
        >
          Veg Only
        </button>

        <span
          style={{
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontSize: 12,
            fontWeight: 800,
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
            padding: 18,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 900, color: "#0f172a" }}>
            No items available
          </div>
          <div style={{ marginTop: 6, fontSize: 13, color: "#64748b" }}>
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
                boxShadow: "0 7px 18px rgba(15,23,42,0.05)",
                padding: 14,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 12,
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
                        width: 11,
                        height: 11,
                        borderRadius: 999,
                        background: isVeg ? "#16a34a" : "#dc2626",
                        flexShrink: 0,
                        marginTop: 5,
                      }}
                    />

                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 15,
                          lineHeight: 1.16,
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
                          fontSize: 12,
                          fontWeight: 750,
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
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 13,
                      color: "#64748b",
                      fontWeight: 800,
                    }}
                  >
                    <span>⏰</span>
                    <span>
                      {cleanTime(it.start_time) && cleanTime(it.end_time)
                        ? `${cleanTime(it.start_time)} - ${cleanTime(
                            it.end_time
                          )}`
                        : "All day"}
                    </span>
                  </div>

                  {it.item_description ? (
                    <div
                      style={{
                        marginTop: 7,
                        fontSize: 13,
                        lineHeight: 1.32,
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
                      fontSize: 15,
                      fontWeight: 900,
                      color: "#0f172a",
                    }}
                  >
                    Rs {getPrice(it)}
                  </div>
                </div>

                <div style={{ flexShrink: 0 }}>
  {!isStationOnlyView && (
    <>
      {!existing ? (
        <button
          type="button"
          onClick={() => handleAdd(it)}
          style={{
            minWidth: 64,
            minHeight: 42,
            border: 0,
            borderRadius: 13,
            background: "#f97316",
            color: "#fff",
            fontSize: 15,
            fontWeight: 900,
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
              width: 32,
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
              minWidth: 22,
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
              width: 32,
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
    </>
  )}
</div>              </div>
            </article>
          );
        })}
      </section>

            <section
        style={{
          background: "#fff",
          border: "1px solid #dbe4ef",
          borderRadius: 18,
          padding: 14,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 16,
            lineHeight: 1.25,
            fontWeight: 900,
            color: "#f97316",
          }}
        >
          {isStationOnlyView
            ? `${displayVendorName} Menu at ${displayStationName || "Railway Station"}`
            : `Order food from ${displayVendorName} at ${
                displayStationName || "your station"
              }`}
        </h1>

        <p
          style={{
            margin: "8px 0 0",
            fontSize: 13,
            lineHeight: 1.45,
            color: "#64748b",
          }}
        >
          {isStationOnlyView
            ? `View ${displayVendorName} menu at ${
                displayStationName || "this railway station"
              } with item price, food category, description, veg or non-veg type and available serving time.`
            : "Choose fresh meals for your train journey, add items to cart, verify your mobile number and place your order for delivery at your seat."}
        </p>
      </section>

      {!isStationOnlyView && <CartPillMobile minOrder={minimumOrder} />}
    </div>
  );
}
