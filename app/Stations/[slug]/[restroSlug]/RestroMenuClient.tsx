"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../lib/useAuth";
import { useCart } from "../../../lib/useCart";
import CartPillMobile from "../../../components/CartPillMobile";

/* ================= HELPERS ================= */

const toMin = (t?: string | null) => {
  if (!t) return null;

  const [h, m] = String(t)
    .slice(0, 5)
    .split(":")
    .map(Number);

  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;

  return h * 60 + m;
};

const cleanText = (value: any) => String(value ?? "").trim();

const shortTime = (value: any) => {
  const raw = cleanText(value);
  return raw ? raw.slice(0, 5) : "";
};

const money = (value: any) => {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
};

/* ================= CATEGORY HELPERS ================= */

const getItemCategory = (it: any) => {
  const category = cleanText(
    it?.item_category ??
      it?.ItemCategory ??
      it?.category
  ).toLowerCase();

  if (category === "veg" || category === "jain") return "Veg";

  if (
    category === "non-veg" ||
    category === "non veg" ||
    category === "nonveg"
  ) {
    return "Non-Veg";
  }

  const name = cleanText(
    it?.item_name ??
      it?.ItemName ??
      it?.name
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
  return (
    cleanText(
      it?.menu_type ??
        it?.MenuType ??
        it?.type
    ) || "Other"
  );
};

const getCuisine = (it: any) => {
  return cleanText(
    it?.item_cuisine ??
      it?.ItemCuisine ??
      it?.cuisine
  );
};

const getItemId = (it: any) => {
  return String(
    it?.id ??
      it?.item_code ??
      it?.ItemCode ??
      it?.item_name ??
      ""
  );
};

const getItemName = (it: any) => {
  return cleanText(
    it?.item_name ??
      it?.ItemName ??
      it?.name
  );
};

const getItemPrice = (it: any) => {
  return money(
    it?.base_price ??
      it?.BasePrice ??
      it?.price ??
      it?.selling_price ??
      it?.SellingPrice
  );
};

const isVegItem = (it: any) => {
  return getItemCategory(it) === "Veg";
};

const isItemActive = (it: any) => {
  const raw =
    it?.status ??
    it?.Status ??
    it?.item_status ??
    it?.is_active ??
    it?.active ??
    "ON";

  const normalized = String(raw).trim().toUpperCase();

  return ["ON", "ACTIVE", "TRUE", "1", "YES"].includes(normalized);
};

const getCartEntry = (cart: any, itemId: string) => {
  if (!cart) return null;

  if (Array.isArray(cart)) {
    return cart.find((x: any) => String(x?.id) === String(itemId)) || null;
  }

  return cart[itemId] || null;
};

export default function RestroMenuClient({
  items = [],
  header = {},
  nextParams = {},
}: any) {
  const { user } = useAuth();

  const {
    add,
    changeQty,
    cart,
    setJourney,
  } = useCart();

  const [vegOnly, setVegOnly] = useState(false);
  const [selectedType, setSelectedType] = useState("All");
  const [trainMin, setTrainMin] = useState<number | null>(null);

  /* ================= ARRIVAL TIME ================= */

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const arrival =
      params.get("deliveryTime") ||
      params.get("arrival") ||
      params.get("arrivalTime") ||
      nextParams?.deliveryTime ||
      nextParams?.arrival ||
      "";

    const mins = toMin(arrival);

    if (mins !== null) {
      setTrainMin(mins);
    }
  }, [nextParams?.deliveryTime, nextParams?.arrival]);

  /* ================= NORMALIZED JOURNEY ================= */

  const journey = useMemo(() => {
    const trainNumber =
      nextParams?.trainNumber ||
      nextParams?.train ||
      "";

    const trainName =
      nextParams?.trainName &&
      String(nextParams.trainName).toLowerCase() !== "train"
        ? nextParams.trainName
        : "";

    const stationCode =
      header?.stationCode ||
      nextParams?.stationCode ||
      "";

    const stationName =
      header?.stationName ||
      nextParams?.stationName ||
      "";

    const restroCode =
      header?.restroCode ||
      nextParams?.restroCode ||
      "";

    const restroName =
      header?.outletName ||
      nextParams?.vendorName ||
      nextParams?.restroName ||
      "";

    return {
      trainNumber,
      trainName,
      stationCode,
      stationName,
      restroCode,
      restroName,
      deliveryDate: nextParams?.deliveryDate || "",
      deliveryTime: nextParams?.deliveryTime || nextParams?.arrival || "",
      minimumOrder: header?.minimumOrder || nextParams?.minOrder || "",
      boarding: nextParams?.boarding || "",
    };
  }, [header, nextParams]);

  /* ================= MENU TYPES ================= */

  const menuTypes = useMemo(() => {
    const types = Array.from(
      new Set(
        items
          .map((it: any) => getMenuType(it))
          .filter(Boolean)
      )
    );

    return ["All", ...types.filter((t) => t !== "All")];
  }, [items]);

  /* ================= FILTER ================= */

  const visible = useMemo(() => {
    return items.filter((it: any) => {
      if (!isItemActive(it)) return false;

      const start = toMin(it?.start_time ?? it?.ItemStart);
      const end = toMin(it?.end_time ?? it?.ItemClosed);

      if (
        trainMin !== null &&
        start !== null &&
        end !== null
      ) {
        if (end >= start) {
          if (trainMin < start || trainMin > end) return false;
        } else if (trainMin < start && trainMin > end) {
          return false;
        }
      }

      if (vegOnly && !isVegItem(it)) return false;

      if (selectedType !== "All" && getMenuType(it) !== selectedType) {
        return false;
      }

      return true;
    });
  }, [items, vegOnly, trainMin, selectedType]);

  /* ================= ADD ================= */

  const buildCartItem = (it: any) => {
    const id = getItemId(it);
    const name = getItemName(it);
    const price = getItemPrice(it);

    return {
      id,
      item_code: id,
      name,
      item_name: name,
      price,
      base_price: price,
      qty: 1,

      restro_code: String(journey.restroCode || ""),
      restro_name: journey.restroName || "",

      station_code: journey.stationCode || "",
      station_name: journey.stationName || "",

      description:
        it?.item_description ??
        it?.ItemDescription ??
        null,

      category: getItemCategory(it),
      item_category: getItemCategory(it),

      cuisine: getCuisine(it) || null,
      item_cuisine: getCuisine(it) || null,

      menu_type: getMenuType(it),
    };
  };

  const saveJourney = () => {
    setJourney({
      trainNumber: journey.trainNumber || "",
      trainName: journey.trainName || "",
      stationName: journey.stationName || "",
      stationCode: journey.stationCode || "",
      deliveryDate: journey.deliveryDate || "",
      deliveryTime: journey.deliveryTime || "",
      vendorName: journey.restroName || "",
      restroCode: Number(journey.restroCode || 0),
      restroName: journey.restroName || "",
      boarding: journey.boarding || "",
      minOrder: journey.minimumOrder || "",
    });
  };

  const handleAdd = (it: any) => {
    const cartItem = buildCartItem(it);

    if (!user) {
      window.dispatchEvent(
        new CustomEvent("raileats:open-login", {
          detail: {
            item: cartItem,
            rawItem: it,
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
    const id = getItemId(it);
    changeQty(id, nextQty);
  };

  /* ================= UI ================= */

  return (
    <div className="menu-page">

      {/* HEADER */}

      <section className="app-card menu-hero-card">

        <div className="menu-hero-top">

          <div>

            <span className="eyebrow">
              Journey
            </span>

            <h1>
              {journey.restroName || "Restaurant Menu"}
            </h1>

            <p>
              {journey.stationName || "Station"}

              {journey.stationCode
                ? ` (${journey.stationCode})`
                : ""}
            </p>

          </div>

          <label className="veg-toggle">

            <input
              type="checkbox"
              checked={vegOnly}
              onChange={(e) =>
                setVegOnly(e.target.checked)
              }
            />

            <spa
