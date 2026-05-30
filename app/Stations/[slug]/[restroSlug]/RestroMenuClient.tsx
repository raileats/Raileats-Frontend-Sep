"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../lib/useAuth";
import { useCart } from "../../../lib/useCart";
import CartPillMobile from "../../../components/CartPillMobile";

function toMin(time: string) {
  const [h = "0", m = "0"] = String(time || "00:00").split(":");
  return Number(h) * 60 + Number(m);
}

function isTimeInRange(arrival: string, start: string, end: string) {
  if (!arrival || !start || !end) return true;

  const a = toMin(arrival);
  const s = toMin(start);
  const e = toMin(end);

  if (s <= e) return a >= s && a <= e;
  return a >= s || a <= e;
}

function getItemCategory(item: any) {
  return String(item.item_category ?? item.ItemCategory ?? item.category ?? "Veg");
}

function getMenuType(item: any) {
  return String(item.menu_type ?? item.MenuType ?? item.type ?? "All").trim() || "All";
}

function getCuisine(item: any) {
  return String(item.item_cuisine ?? item.ItemCuisine ?? item.cuisine ?? "").trim();
}

function isVegItem(item: any) {
  const category = getItemCategory(item).toLowerCase();
  const name = String(item.item_name ?? item.ItemName ?? "").toLowerCase();

  if (category.includes("non") || /chicken|mutton|fish|egg/.test(name)) {
    return false;
  }

  return true;
}

function isItemActive(item: any) {
  const status = String(item.status ?? item.Status ?? "ON").toUpperCase();
  return ["ON", "ACTIVE", "TRUE", "1"].includes(status);
}

function formatTime(value: string) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return raw.slice(0, 5);
}

function formatDate(value: string) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  try {
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return raw;

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return raw;
  }
}

function priceOf(item: any) {
  return Number(item.base_price ?? item.BasePrice ?? item.price ?? 0);
}

export default function RestroMenuClient({
  header,
  items,
  nextParams,
}: {
  header: any;
  items: any[];
  nextParams: any;
}) {
  const { user } = useAuth();
  const { add, changeQty, cart, setJourney } = useCart();

  const [vegOnly, setVegOnly] = useState(false);
  const [selectedType, setSelectedType] = useState("All");
  const [trainMin, setTrainMin] = useState<number | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const time =
      params.get("deliveryTime") ||
      params.get("arrival") ||
      params.get("arrivalTime") ||
      nextParams?.deliveryTime ||
      "";

    if (time) setTrainMin(toMin(time));
  }, [nextParams?.deliveryTime]);

  const menuTypes = useMemo(() => {
    const unique = Array.from(
      new Set(
        (items || [])
          .map((item) => getMenuType(item))
          .filter((value) => value && value !== "All")
      )
    );

    return ["All", ...unique];
  }, [items]);

  const visibleItems = useMemo(() => {
    return (items || []).filter((item) => {
      if (!isItemActive(item)) return false;

      if (
        trainMin !== null &&
        item.start_time &&
        item.end_time &&
        !isTimeInRange(String(nextParams?.deliveryTime || ""), item.start_time, item.end_time)
      ) {
        return false;
      }

      if (vegOnly && !isVegItem(item)) return false;

      if (selectedType !== "All" && getMenuType(item) !== selectedType) {
        return false;
      }

      return true;
    });
  }, [items, trainMin, vegOnly, selectedType, nextParams?.deliveryTime]);

  const cartQty = (item: any) => {
    const id = String(item.id ?? item.item_code ?? item.ItemCode ?? item.item_name);
    const found = cart.find((cartItem: any) => String(cartItem.id) === id);
    return Number(found?.qty || 0);
  };

  function applyJourney() {
    setJourney({
      deliveryDate: nextParams?.deliveryDate || "",
      deliveryTime: nextParams?.deliveryTime || "",
      arrival: nextParams?.arrival || nextParams?.deliveryTime || "",
      train: nextParams?.train || "",
      trainName: nextParams?.trainName || "Train",
      boarding: nextParams?.boarding || "",
      minOrder: nextParams?.minOrder || header?.minimumOrder || "",
      restroCode: header?.restroCode || nextParams?.restroCode || "",
      restroName: header?.outletName || nextParams?.restroName || "",
      stationCode: header?.stationCode || nextParams?.stationCode || "",
      stationName: header?.stationName || nextParams?.stationName || "",
    });
  }

  function addItem(item: any) {
    const id = String(item.id ?? item.item_code ?? item.ItemCode ?? item.item_name);
    const name = String(item.item_name ?? item.ItemName ?? "");
    const price = priceOf(item);

    const cartItem = {
      id,
      item_code: id,
      item_name: name,
      name,
      price,
      base_price: price,
      qty: 1,
      restro_code: header?.restroCode || nextParams?.restroCode || "",
      restro_name: header?.outletName || nextParams?.restroName || "",
      station_code: header?.stationCode || nextParams?.stationCode || "",
      station_name: header?.stationName || nextParams?.stationName || "",
      item_description: item.item_description || "",
      item_category: getItemCategory(item),
      item_cuisine: getCuisine(item),
      menu_type: getMenuType(item),
    };

    if (!user) {
      window.dispatchEvent(
        new CustomEvent("raileats:open-login", {
          detail: {
            item: cartItem,
            afterLogin: "add-to-cart",
          },
        })
      );
      return;
    }

    applyJourney();
    add(cartItem);
  }

  function updateQty(item: any, delta: number) {
    const id = String(item.id ?? item.item_code ?? item.ItemCode ?? item.item_name);
    changeQty(id, delta);
  }

  const journeyDate = formatDate(nextParams?.deliveryDate);
  const journeyTime = String(nextParams?.deliveryTime || nextParams?.arrival || "").slice(0, 5);
  const minOrder = Number(header?.minimumOrder || nextParams?.minOrder || 0);

  return (
    <div className="menu-page">
      <section className="app-card menu-hero-card">
        <div className="menu-hero-top">
          <div>
            <span className="eyebrow">Journey</span>
            <h1>{header?.outletName}</h1>
            <p>
              {header?.stationName} ({header?.stationCode})
            </p>
          </div>

          <label className="veg-toggle">
            <input
              type="checkbox"
              checked={vegOnly}
              onChange={(e) => setVegOnly(e.target.checked)}
            />
            <span>Veg only</span>
          </label>
        </div>

        <div className="journey-strip">
          <div>
            <span>Train</span>
            <strong>{nextParams?.train ? `#${nextParams.train}` : "N/A"}</strong>
          </div>
          <div>
            <span>Delivery</span>
            <strong>
              {journeyDate || "Date N/A"}
              {journeyTime ? ` at ${journeyTime}` : ""}
            </strong>
          </div>
          <div>
            <span>Min Order</span>
            <strong>{minOrder ? `₹${minOrder}` : "N/A"}</strong>
          </div>
        </div>
      </section>

      {menuTypes.length > 1 && (
        <div className="menu-chip-row" aria-label="Menu categories">
          {menuTypes.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setSelectedType(type)}
              className={selectedType === type ? "menu-chip active" : "menu-chip"}
            >
              {type}
            </button>
          ))}
        </div>
      )}

      <section className="menu-list">
        {visibleItems.length === 0 ? (
          <div className="app-card empty-menu-card">
            <h2>No items available right now</h2>
            <p>
              Menu items are shown only when they match the train arrival time and restaurant
              availability.
            </p>
          </div>
        ) : (
          visibleItems.map((item) => {
            const qty = cartQty(item);
            const veg = isVegItem(item);
            const price = priceOf(item);
            const cuisine = getCuisine(item);
            const menuType = getMenuType(item);
            const category = getItemCategory(item);

            return (
              <article className="app-card menu-item-card" key={String(item.id)}>
                <div className="menu-item-main">
                  <div className={veg ? "food-dot veg" : "food-dot nonveg"} />

                  <div className="menu-item-copy">
                    <h2>{item.item_name}</h2>
                    <p className="item-meta">
                      {category}
                      {menuType && menuType !== "All" ? ` • ${menuType}` : ""}
                      {cuisine ? ` • ${cuisine}` : ""}
                    </p>

                    {(item.start_time || item.end_time) && (
                      <p className="item-time">
                        {formatTime(item.start_time)} - {formatTime(item.end_time)}
                      </p>
                    )}

                    {item.item_description && (
                      <p className="item-desc">{item.item_description}</p>
                    )}

                    <strong className="item-price">₹{price}</strong>
                  </div>
                </div>

                <div className="menu-item-action">
                  {qty > 0 ? (
                    <div className="qty-control" aria-label={`${item.item_name} quantity`}>
                      <button type="button" onClick={() => updateQty(item, -1)}>
                        -
                      </button>
                      <span>{qty}</span>
                      <button type="button" onClick={() => updateQty(item, 1)}>
                        +
                      </button>
                    </div>
                  ) : (
                    <button type="button" className="add-btn" onClick={() => addItem(item)}>
                      Add
                    </button>
                  )}
                </div>
              </article>
            );
          })
        )}
      </section>

      <section className="app-card seo-content-card">
        <h2>
          Order food from {header?.outletName} at {header?.stationName}
        </h2>
        <p>
          RailEats helps passengers order fresh train food from available restaurants on their
          route. Menu items shown here are filtered by restaurant timing, train arrival time and
          delivery availability.
        </p>
        <p>
          Choose your meal, verify your mobile number, add coach and seat details at checkout,
          and place your order for delivery at {header?.stationName}.
        </p>
      </section>

      <CartPillMobile minOrder={minOrder} />
    </div>
  );
}
