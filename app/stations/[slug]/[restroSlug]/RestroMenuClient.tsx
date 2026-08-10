// app/stations/[slug]/[restroSlug]/RestroMenuClient.tsx
"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../../lib/useAuth";
import { useCart } from "../../../lib/useCart";
import CartPillMobile from "../../../components/CartPillMobile";
import BookingFlowShell from "../../../components/BookingFlowShell";
import PnrSearchBox from "../../../components/PnrSearchBox";
import {
  CUSTOMER_MENU_TYPES,
  getCustomerMenuTypeRank,
  sortCustomerMenuItems,
  sortCustomerMenuItemsWithPriority,
} from "../../../lib/customerMenuSort";

const SUPABASE_PUBLIC_STORAGE =
  "https://ygisiztmuzwxpnvhwrmr.supabase.co/storage/v1/object/public";
const DEFAULT_MENU_IMAGE =
  "https://ygisiztmuzwxpnvhwrmr.supabase.co/storage/v1/object/public/menu_item_image/default-food.webp";

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
  if (!v || v.toLowerCase() === "train" || v.toLowerCase() === "undefined") {
    return "";
  }
  return v;
};

const getItemCategory = (it: any) => {
  const category = String(it?.item_category || "").trim().toLowerCase();

  if (category === "veg" || category === "jain") return "Veg";
  if (category === "non-veg" || category === "non veg" || category === "nonveg") {
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

const getMenuType = (it: any) => String(it?.menu_type || "Other").trim();

const isVegItem = (it: any) => getItemCategory(it) === "Veg";

const isItemActive = (it: any) => {
  const raw = it?.status ?? it?.item_status ?? it?.is_active ?? it?.active ?? "ON";
  return String(raw).trim().toUpperCase() === "ON";
};

const getPrice = (it: any) => Number(it?.base_price || it?.selling_price || it?.price || 0);

const getCartEntry = (cart: any, itemId: any) => {
  if (!cart) return null;
  if (Array.isArray(cart)) {
    return cart.find((x: any) => String(x?.id) === String(itemId)) || null;
  }
  return cart[itemId] || cart[String(itemId)] || null;
};

const getItemImage = (it: any) => {
  const raw =
    it?.menu_item_image ||
    it?.MenuItemImage ||
    it?.item_image ||
    it?.ItemImage ||
    it?.itemImage ||
    it?.image ||
    it?.Image ||
    it?.image_url ||
    it?.ImageUrl ||
    it?.item_image_url ||
    it?.ItemImageUrl ||
    it?.menu_image ||
    it?.MenuImage ||
    it?.photo ||
    it?.Photo ||
    it?.photo_url ||
    it?.PhotoUrl ||
    it?.ItemPhoto ||
    it?.item_photo ||
    "";

  const file = String(raw || "").trim();
  if (!file) return DEFAULT_MENU_IMAGE;

  if (/^https?:\/\//i.test(file) || file.startsWith("data:") || file.startsWith("blob:")) {
    return file;
  }

  if (file.startsWith("/")) return file;

  const clean = file.replace(/^\/+/, "");
  const objectPath = clean.startsWith("menu_item_image/")
    ? clean
    : `menu_item_image/${clean}`;

  return encodeURI(`${SUPABASE_PUBLIC_STORAGE}/${objectPath}`);
};

const getRealItemImage = (it: any) => {
  const image = getItemImage(it);
  return image === DEFAULT_MENU_IMAGE ? "" : image;
};

const getMenuTypeFallbackImage = (menuType: string) =>
  encodeURI(
    `${SUPABASE_PUBLIC_STORAGE}/menu_item_image/menu_item_image_${menuType}.webp`
  );

function CategoryImage({ src, label }: { src: string; label: string }) {
  const [primaryFailed, setPrimaryFailed] = useState(false);
  const [fallbackFailed, setFallbackFailed] = useState(false);
  const fallbackSrc = getMenuTypeFallbackImage(label);
  const resolvedSrc = src && !primaryFailed ? src : !fallbackFailed ? fallbackSrc : "";

  if (!resolvedSrc) {
    return (
      <span
        aria-hidden="true"
        style={{
          display: "grid",
          width: 58,
          height: 58,
          placeItems: "center",
          borderRadius: 999,
          background: "#fff7ed",
          color: "#ea580c",
          fontSize: 24,
        }}
      >
        🍽️
      </span>
    );
  }

  return (
    <Image
      src={resolvedSrc}
      alt={`${label} menu`}
      width={58}
      height={58}
      loading="lazy"
      quality={55}
      sizes="58px"
      onError={() => {
        if (src && resolvedSrc === src) {
          setPrimaryFailed(true);
        } else {
          setFallbackFailed(true);
        }
      }}
      style={{
        width: 58,
        height: 58,
        borderRadius: 999,
        objectFit: "cover",
        background: "#fff",
      }}
    />
  );
}

export default function RestroMenuClient({
  items = [],
  header = {},
  nextParams = {},
}: any) {
  const { user } = useAuth();
  const { add, changeQty, cart, setJourney, clearCart } = useCart();
  const [vegOnly, setVegOnly] = useState(false);
  const [bulkOnly, setBulkOnly] = useState(false);
  const [selectedMenuType, setSelectedMenuType] = useState("");
  const [trainMin, setTrainMin] = useState<number | null>(null);
  const categorySliderRef = useRef<HTMLDivElement | null>(null);
  const categoryAutoScrollPausedRef = useRef(false);
  const categoryResumeTimerRef = useRef<number | null>(null);

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

    setUrlJourney({
      trainNumber:
        params.get("train") ||
        params.get("trainNumber") ||
        params.get("trainNo") ||
        "",
      trainName: cleanTrainName(params.get("trainName")),
      deliveryDate: params.get("deliveryDate") || params.get("date") || "",
      deliveryTime: cleanTime(
        params.get("deliveryTime") ||
          params.get("arrival") ||
          params.get("arrivalTime") ||
          ""
      ),
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

  const displayStationName =
    nextParams?.stationName ||
    header?.stationName ||
    "";

  const displayStationCode =
    nextParams?.stationCode ||
    header?.stationCode ||
    "";

  const displayDeliveryDate =
    nextParams?.deliveryDate ||
    urlJourney.deliveryDate ||
    "";

  const displayDeliveryTime =
    cleanTime(nextParams?.deliveryTime) ||
    urlJourney.deliveryTime ||
    "";

  const displayRestroName =
    nextParams?.vendorName ||
    header?.outletName ||
    "Restaurant";

  const minimumOrder = Number(header?.minimumOrder || nextParams?.minOrder || 0);
  const currentRestroCode = String(header?.restroCode || nextParams?.restroCode || "");

const currentCartContextKey = [
  currentRestroCode,
  displayTrainNumber,
  displayStationCode,
  displayDeliveryDate,
  displayDeliveryTime,
].join("|");

useEffect(() => {
  if (!currentRestroCode) return;

  const cartItems = Array.isArray(cart) ? cart : Object.values(cart || {});
  if (cartItems.length === 0) return;

  const firstItem: any = cartItems[0];

  const savedRestroCode = String(
    firstItem?.restro_code ||
      firstItem?.restroCode ||
      ""
  );

  const savedContextKey = [
    savedRestroCode,
    firstItem?.trainNumber || "",
    firstItem?.station_code || firstItem?.stationCode || "",
    firstItem?.deliveryDate || "",
    firstItem?.deliveryTime || "",
  ].join("|");

  if (savedContextKey !== currentCartContextKey) {
    clearCart();
  }
}, [cart, clearCart, currentRestroCode, currentCartContextKey]);

  const isStationOnlyView = nextParams?.mode === "station" || !displayTrainNumber;

  const availableItems = useMemo(() => {
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

  const menuCategories = useMemo(() => {
    const representatives = new Map<string, { image: string }>();

    for (const item of sortCustomerMenuItems(availableItems)) {
      const rank = getCustomerMenuTypeRank(item);
      if (!rank || rank > 16) continue;

      const canonicalMenuType = CUSTOMER_MENU_TYPES[rank - 1];
      const existing = representatives.get(canonicalMenuType);
      const image = getRealItemImage(item);

      if (!existing || (!existing.image && image)) {
        representatives.set(canonicalMenuType, { image });
      }
    }

    return CUSTOMER_MENU_TYPES.slice(0, 16)
      .map((menuType) => {
        const representative = representatives.get(menuType);
        return representative ? { menuType, image: representative.image } : null;
      })
      .filter(Boolean) as Array<{ menuType: string; image: string }>;
  }, [availableItems]);

  useEffect(() => {
    const slider = categorySliderRef.current;
    if (!slider || menuCategories.length < 4) return;

    let frameId = 0;
    let previousTime = performance.now();
    let virtualScrollLeft = slider.scrollLeft;
    let wasPaused = false;

    const moveCategories = (time: number) => {
      const elapsed = Math.min(time - previousTime, 64);
      previousTime = time;

      if (categoryAutoScrollPausedRef.current) {
        virtualScrollLeft = slider.scrollLeft;
        wasPaused = true;
      } else {
        if (wasPaused) {
          virtualScrollLeft = slider.scrollLeft;
          wasPaused = false;
        }

        const firstDuplicate = slider.children[menuCategories.length] as HTMLElement | undefined;
        const loopWidth = firstDuplicate?.offsetLeft || slider.scrollWidth / 2;

        if (loopWidth > slider.clientWidth) {
          virtualScrollLeft += (elapsed * 14) / 1000;

          if (virtualScrollLeft >= loopWidth) {
            virtualScrollLeft -= loopWidth;
          }

          slider.scrollLeft = virtualScrollLeft;
        }
      }

      frameId = window.requestAnimationFrame(moveCategories);
    };

    frameId = window.requestAnimationFrame(moveCategories);

    return () => window.cancelAnimationFrame(frameId);
  }, [menuCategories.length]);

  useEffect(() => {
    return () => {
      if (categoryResumeTimerRef.current !== null) {
        window.clearTimeout(categoryResumeTimerRef.current);
      }
    };
  }, []);

  const pauseCategoryAutoScroll = () => {
    categoryAutoScrollPausedRef.current = true;
    if (categoryResumeTimerRef.current !== null) {
      window.clearTimeout(categoryResumeTimerRef.current);
    }
  };

  const resumeCategoryAutoScroll = () => {
    if (categoryResumeTimerRef.current !== null) {
      window.clearTimeout(categoryResumeTimerRef.current);
    }

    categoryResumeTimerRef.current = window.setTimeout(() => {
      categoryAutoScrollPausedRef.current = false;
      categoryResumeTimerRef.current = null;
    }, 1200);
  };

  useEffect(() => {
    if (
      selectedMenuType &&
      !menuCategories.some((category) => category.menuType === selectedMenuType)
    ) {
      setSelectedMenuType("");
    }
  }, [menuCategories, selectedMenuType]);

  const visible = useMemo(() => {
    if (bulkOnly) {
      return sortCustomerMenuItemsWithPriority(availableItems, "Bulk");
    }

    return sortCustomerMenuItemsWithPriority(availableItems, selectedMenuType);
  }, [availableItems, bulkOnly, selectedMenuType]);

  const saveJourney = () => {
    const journeyPayload = {
      trainNumber: displayTrainNumber,
      trainName: displayTrainName,
      stationName: displayStationName,
      stationCode: displayStationCode,
      deliveryDate: displayDeliveryDate,
      deliveryTime: displayDeliveryTime,
      vendorName: displayRestroName,
      restroCode: Number(header?.restroCode || nextParams?.restroCode || 0),
    };

    setJourney(journeyPayload);

    if (typeof window !== "undefined") {
      localStorage.setItem("raileats_min_order", String(minimumOrder || 0));
    }

    return journeyPayload;
  };

  const buildCartItem = (it: any) => {
  const itemImage = getItemImage(it);

  const urlPnr =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("pnr") || ""
      : "";

  return {
    id: it.id,
    name: it.item_name,
    price: getPrice(it),
    qty: 1,

    pnr: urlPnr,

      restro_code: String(header?.restroCode || nextParams?.restroCode || ""),
      restro_name: displayRestroName,

      station_code: displayStationCode,
      station_name: displayStationName,

      trainNumber: displayTrainNumber,
      trainName: displayTrainName,
      deliveryDate: displayDeliveryDate,
      deliveryTime: displayDeliveryTime,
      vendorName: displayRestroName,
      restroCode: Number(header?.restroCode || nextParams?.restroCode || 0),

      description: it.item_description || null,
      category: getItemCategory(it),
      cuisine: it.item_cuisine || null,
      menu_type: getMenuType(it),

      image: itemImage,
      menu_item_image: itemImage,

      minimumOrder,
      minOrder: minimumOrder,
    };
  };

  const handleAdd = (it: any) => {
    const journeyPayload = saveJourney();
    const cartItem = buildCartItem(it);

    if (!user) {
      window.dispatchEvent(
        new CustomEvent("raileats:open-login", {
          detail: {
            item: it,
            cartItem,
            journey: journeyPayload,
            afterLogin: "add-to-cart",
          },
        })
      );
      return;
    }

    add(cartItem as any);
  };

  const handleQty = (it: any, nextQty: number) => {
    if (nextQty < 0) return;
    changeQty(it.id, nextQty);
  };

  return (
    <BookingFlowShell>
      <div
        style={{
          width: "100%",
          maxWidth: 520,
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
    borderRadius: 14,
    boxShadow: "0 5px 14px rgba(15,23,42,0.05)",
    padding: 11,
  }}
>
  <div
    style={{
      fontSize: 11,
      fontWeight: 900,
      color: "#64748b",
      marginBottom: 7,
    }}
  >
    Journey
  </div>

  <div
    style={{
      display: "grid",
      gridTemplateColumns: "minmax(0, 1fr) minmax(118px, 0.82fr)",
      gap: 10,
      alignItems: "start",
    }}
  >
    <div style={{ minWidth: 0, display: "grid", gap: 6 }}>
      {displayTrainNumber ? (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
          <span style={{ width: 17, flexShrink: 0, textAlign: "center", fontSize: 13 }}>
            🚆
          </span>
          <span
            style={{
              color: "#ea580c",
              fontSize: 13,
              lineHeight: 1.15,
              fontWeight: 900,
              overflowWrap: "anywhere",
            }}
          >
            {displayTrainName
              ? `${displayTrainNumber} - ${displayTrainName}`
              : `Train #${displayTrainNumber}`}
          </span>
        </div>
      ) : null}

      <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
        <span style={{ width: 17, flexShrink: 0, textAlign: "center", fontSize: 13 }}>
          📍
        </span>
        <span
          style={{
            fontSize: 13,
            lineHeight: 1.15,
            fontWeight: 850,
            color: "#334155",
            overflowWrap: "anywhere",
          }}
        >
          {displayStationName || "-"}
          {displayStationCode ? ` (${displayStationCode})` : ""}
        </span>
      </div>

      <div
  style={{
    display: "flex",
    alignItems: "center",
    gap: 8,
    color: "#2563eb",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "nowrap",
  }}
>
  {displayDeliveryDate ? (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      <span style={{ fontSize: 12 }}>📅</span>
      {displayDeliveryDate}
    </span>
  ) : null}

  {displayDeliveryTime ? (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      <span style={{ fontSize: 12 }}>⏰</span>
      {displayDeliveryTime}
    </span>
  ) : null}
</div>
    </div>

    <div
      style={{
        minWidth: 0,
        display: "grid",
        gap: 5,
        justifyItems: "end",
        textAlign: "right",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "flex-end",
          gap: 5,
          minWidth: 0,
          width: "100%",
        }}
      >
        <span style={{ flexShrink: 0, fontSize: 13 }}>🍴</span>
        <span
          style={{
            minWidth: 0,
            fontSize: 13,
            lineHeight: 1.15,
            color: "#0f172a",
            fontWeight: 900,
            overflowWrap: "anywhere",
          }}
        >
          {displayRestroName}
        </span>
      </div>

      <div
        style={{
          fontSize: 12,
          lineHeight: 1.15,
          color: "#475569",
          fontWeight: 850,
        }}
      >
        Min Order: Rs {minimumOrder}
      </div>
    </div>
  </div>
</section>
        {isStationOnlyView ? <PnrSearchBox compact /> : null}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "auto auto auto",
            alignItems: "center",
            gap: 8,
            overflow: "hidden",
          }}
        >
          <button
            type="button"
            aria-pressed={!vegOnly && !bulkOnly}
            onClick={() => {
              setVegOnly(false);
              setBulkOnly(false);
              setSelectedMenuType("");
            }}
            style={{
              border: !vegOnly && !bulkOnly ? "1px solid #f97316" : "1px solid #dbe4ef",
              background: !vegOnly && !bulkOnly ? "#fff7ed" : "#fff",
              color: !vegOnly && !bulkOnly ? "#ea580c" : "#334155",
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
            aria-pressed={vegOnly}
            onClick={() => {
              setVegOnly(true);
              setBulkOnly(false);
            }}
            style={{
              border: vegOnly ? "1px solid #16a34a" : "1px solid #dbe4ef",
              background: vegOnly ? "#f0fdf4" : "#fff",
              color: vegOnly ? "#15803d" : "#334155",
              borderRadius: 999,
              padding: "8px 13px",
              fontSize: 13,
              fontWeight: 900,
              whiteSpace: "nowrap",
              cursor: "pointer",
            }}
          >
            Veg Only
          </button>

          <button
            type="button"
            aria-pressed={bulkOnly}
            onClick={() => {
              setVegOnly(false);
              setBulkOnly(true);
              setSelectedMenuType("");
            }}
            style={{
              border: bulkOnly ? "1px solid #7c3aed" : "1px solid #dbe4ef",
              background: bulkOnly ? "#f5f3ff" : "#fff",
              color: bulkOnly ? "#6d28d9" : "#334155",
              borderRadius: 999,
              padding: "8px 13px",
              whiteSpace: "nowrap",
              fontSize: 13,
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Bulk Only
          </button>
        </section>

        {menuCategories.length > 0 ? (
          <section aria-label="Menu categories" style={{ minWidth: 0 }}>
            <div
              ref={categorySliderRef}
              onPointerDown={pauseCategoryAutoScroll}
              onPointerUp={resumeCategoryAutoScroll}
              onPointerCancel={resumeCategoryAutoScroll}
              onPointerLeave={resumeCategoryAutoScroll}
              style={{
                display: "flex",
                gap: 12,
                overflowX: "auto",
                padding: "2px 2px 8px",
                scrollbarWidth: "none",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {[...menuCategories, ...menuCategories].map((category, index) => {
                const selected = selectedMenuType === category.menuType;

                return (
                  <button
                    key={`${category.menuType}-${index}`}
                    type="button"
                    aria-pressed={selected}
                    onClick={() =>
                      setSelectedMenuType((current) =>
                        current === category.menuType ? "" : category.menuType
                      )
                    }
                    style={{
                      width: 76,
                      flex: "0 0 76px",
                      border: 0,
                      background: "transparent",
                      color: selected ? "#ea580c" : "#334155",
                      padding: 0,
                      cursor: "pointer",
                      textAlign: "center",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-grid",
                        padding: 3,
                        borderRadius: 999,
                        border: selected ? "2px solid #f97316" : "1px solid #dbe4ef",
                        background: "#fff",
                        boxShadow: selected ? "0 5px 14px rgba(249,115,22,0.18)" : "none",
                      }}
                    >
                      <CategoryImage src={category.image} label={category.menuType} />
                    </span>
                    <span
                      style={{
                        display: "block",
                        marginTop: 5,
                        fontSize: 11,
                        lineHeight: 1.15,
                        fontWeight: 850,
                        whiteSpace: "normal",
                      }}
                    >
                      {category.menuType}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

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
            <div style={{ fontSize: 16, fontWeight: 900, color: "#0f172a" }}>
              No items available
            </div>
            <div style={{ marginTop: 6, fontSize: 13, color: "#64748b" }}>
              Items may be unavailable for this train arrival time.
            </div>
          </section>
        )}

        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {visible.map((it: any) => {
            const existing = getCartEntry(cart, it.id);
            const isVeg = isVegItem(it);
            const category = getItemCategory(it);
            const menuType = getMenuType(it);
            const itemImage = getItemImage(it);

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
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
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
                            lineHeight: 1.18,
                            fontWeight: 850,
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
                          ? `${cleanTime(it.start_time)} - ${cleanTime(it.end_time)}`
                          : "All day"}
                      </span>
                    </div>

                    {it.item_description ? (
                      <div
                        style={{
                          marginTop: 7,
                          fontSize: 14,
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
                        marginTop: 9,
                        fontSize: 15,
                        fontWeight: 850,
                        color: "#0f172a",
                      }}
                    >
                      Rs {getPrice(it)}
                    </div>
                  </div>

                  <div
                    style={{
                      width: 96,
                      flexShrink: 0,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    {!isStationOnlyView ? (
                      !existing ? (
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
                            onClick={() => handleQty(it, Number(existing.qty || 0) - 1)}
                            style={{
                              width: 30,
                              height: 36,
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
                            onClick={() => handleQty(it, Number(existing.qty || 0) + 1)}
                            style={{
                              width: 30,
                              height: 36,
                              border: 0,
                              background: "#fff",
                              fontWeight: 900,
                              cursor: "pointer",
                            }}
                          >
                            +
                          </button>
                        </div>
                      )
                    ) : null}

                    {itemImage ? (
                      <img
                        src={itemImage}
                        alt={it.item_name || "Menu item"}
                        loading="lazy"
                        onError={(e) => {
  e.currentTarget.src = DEFAULT_MENU_IMAGE;
}}
                        style={{
                          width: 86,
                          height: 86,
                          objectFit: "contain",
padding: 6,
                          borderRadius: 16,
                          border: "1px solid #dbe4ef",
                          background: "#fff",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 86,
                          height: 86,
                          borderRadius: 16,
                          border: "1px solid #dbe4ef",
                          background: "#fff7ed",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 28,
                        }}
                      >
                        🍽️
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
            padding: 14,
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: 16,
              lineHeight: 1.25,
              fontWeight: 950,
              color: "#0f172a",
            }}
          >
            Order food from {displayRestroName} at{" "}
            {displayStationName || "your station"}
          </h1>

          <p
            style={{
              margin: "8px 0 0",
              fontSize: 13,
              lineHeight: 1.45,
              color: "#64748b",
            }}
          >
            Choose fresh meals for your train journey, add items to cart, verify
            your mobile number and place your order for delivery at your seat.
          </p>
        </section>

        <CartPillMobile minOrder={minimumOrder} />
      </div>
    </BookingFlowShell>
  );
}
