"use client";

import React, { useEffect, useState } from "react";
import { MapPin, Star, Store, Utensils } from "lucide-react";
import PnrSearchBox from "@/components/PnrSearchBox";

type Restaurant = {
  RestroCode: string | number;
  RestroName: string;
  StationCode: string;
  StationName: string;
  RestroDisplayPhoto?: string | null;
  RaileatsStatus?: number | null;
  RestroRating?: number | null;
  MinimumOrderValue?: number | null;
};

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function toSlug(value: unknown) {
  return cleanText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createMenuUrl(restaurant: Restaurant) {
  const restroCode = cleanText(restaurant.RestroCode);
  const restroName = cleanText(restaurant.RestroName);
  const stationCode = cleanText(restaurant.StationCode).toUpperCase();
  const stationName = cleanText(restaurant.StationName);

  /*
   * Same slug order as the working train page:
   * StationCode-StationName
   * RestroCode-RestroName
   */
  const stationSlug = `${stationCode}-${toSlug(stationName)}`;
  const restroSlug = `${restroCode}-${toSlug(restroName)}`;

  const query = new URLSearchParams({
    mode: "station",
    stationCode,
    stationName,
    minOrder: String(restaurant.MinimumOrderValue ?? 0),
  });

  return `/Stations/${encodeURIComponent(
    stationSlug
  )}/${encodeURIComponent(restroSlug)}?${query.toString()}`;
}

function RestaurantCard({
  restaurant,
}: {
  restaurant: Restaurant;
}) {
  const menuUrl = createMenuUrl(restaurant);

  const rating =
    restaurant.RestroRating !== null &&
    restaurant.RestroRating !== undefined
      ? Number(restaurant.RestroRating)
      : null;

  const minimumOrder = Number(
    restaurant.MinimumOrderValue ?? 0
  );

  return (
    <article
      style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 18,
        padding: 11,
        boxShadow: "0 2px 10px rgba(15,23,42,0.05)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 110px",
          gap: 12,
          alignItems: "stretch",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h2
            style={{
              margin: 0,
              display: "flex",
              alignItems: "flex-start",
              gap: 7,
              color: "#1e293b",
              fontSize: 16,
              lineHeight: 1.25,
              fontWeight: 800,
              overflowWrap: "anywhere",
            }}
          >
            <Utensils
              size={16}
              strokeWidth={2.3}
              style={{
                color: "#f97316",
                flexShrink: 0,
                marginTop: 2,
              }}
            />

            <span>{restaurant.RestroName}</span>
          </h2>

          <div
            style={{
              marginTop: 9,
              display: "flex",
              alignItems: "flex-start",
              gap: 6,
              color: "#64748b",
              fontSize: 12,
              lineHeight: 1.4,
              fontWeight: 700,
            }}
          >
            <MapPin
              size={14}
              strokeWidth={2.2}
              style={{
                flexShrink: 0,
                marginTop: 1,
                color: "#2563eb",
              }}
            />

            <span>
              {restaurant.StationName || "Railway Station"}
              {restaurant.StationCode
                ? ` (${restaurant.StationCode})`
                : ""}
            </span>
          </div>

          <div
            style={{
              marginTop: 10,
              display: "flex",
              alignItems: "center",
              gap: 7,
              flexWrap: "wrap",
            }}
          >
            {rating !== null && Number.isFinite(rating) ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  borderRadius: 999,
                  padding: "5px 8px",
                  background: "#ecfdf5",
                  border: "1px solid #bbf7d0",
                  color: "#15803d",
                  fontSize: 11,
                  lineHeight: 1,
                  fontWeight: 800,
                }}
              >
                <Star
                  size={12}
                  fill="currentColor"
                  strokeWidth={2}
                />
                {rating.toFixed(1)}
              </span>
            ) : null}

            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                borderRadius: 999,
                padding: "5px 8px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                color: "#475569",
                fontSize: 11,
                lineHeight: 1,
                fontWeight: 800,
              }}
            >
              Min Order: ₹{minimumOrder}
            </span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div
            style={{
              width: "100%",
              height: 88,
              overflow: "hidden",
              borderRadius: 14,
              border: "1px solid #e2e8f0",
              background: "#f1f5f9",
            }}
          >
            {restaurant.RestroDisplayPhoto ? (
              <img
                src={restaurant.RestroDisplayPhoto}
                alt={`${restaurant.RestroName} at ${restaurant.StationName}`}
                loading="lazy"
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = "/raileats-logo.png";
                }}
                style={{
                  width: "100%",
                  height: "100%",
                  display: "block",
                  objectFit: "cover",
                }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "grid",
                  placeItems: "center",
                  color: "#94a3b8",
                }}
              >
                <Store size={28} strokeWidth={2} />
              </div>
            )}
          </div>

          <a
            href={menuUrl}
            style={{
              width: "100%",
              boxSizing: "border-box",
              textAlign: "center",
              textDecoration: "none",
              whiteSpace: "nowrap",
              background: "#f97316",
              color: "#ffffff",
              borderRadius: 12,
              padding: "10px 8px",
              fontSize: 12,
              lineHeight: 1,
              fontWeight: 800,
              boxShadow: "0 4px 12px rgba(249,115,22,0.18)",
            }}
          >
            View Menu
          </a>
        </div>
      </div>
    </article>
  );
}

export default function PopularRestaurantsPage() {
  const [restaurants, setRestaurants] = useState<
    Restaurant[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadRestaurants() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          "/api/home/popular-restaurants",
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const result = await response.json();

        if (!response.ok || result?.success !== true) {
          throw new Error(
            result?.error || "Restaurants could not be loaded"
          );
        }

        const rows = Array.isArray(result?.data)
          ? result.data
          : [];

        const activeRows = rows.filter(
          (restaurant: Restaurant) =>
            Number(restaurant?.RaileatsStatus) === 1 &&
            cleanText(restaurant?.RestroCode) &&
            cleanText(restaurant?.RestroName) &&
            cleanText(restaurant?.StationCode)
        );

        if (mounted) {
          setRestaurants(activeRows);
        }
      } catch (loadError) {
        console.error(
          "Popular restaurants API error:",
          loadError
        );

        if (mounted) {
          setRestaurants([]);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Restaurants could not be loaded"
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadRestaurants();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main
      style={{
        width: "100%",
        maxWidth: 720,
        minHeight: "70vh",
        margin: "0 auto",
        padding: "8px 10px 92px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <section
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: 18,
          padding: 14,
          boxShadow: "0 2px 10px rgba(15,23,42,0.04)",
        }}
      >
        <div
          style={{
            color: "#64748b",
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: 0.5,
            textTransform: "uppercase",
          }}
        >
          RailEats Restaurant Partners
        </div>

        <h1
          style={{
            margin: "7px 0 0",
            color: "#1e293b",
            fontSize: "clamp(19px, 5vw, 27px)",
            lineHeight: 1.2,
            fontWeight: 800,
            letterSpacing: "-0.3px",
          }}
        >
          Popular Restaurants for Your Train Journey
        </h1>

        <p
          style={{
            margin: "8px 0 0",
            color: "#64748b",
            fontSize: 13,
            lineHeight: 1.55,
          }}
        >
          Explore active RailEats restaurants available at
          railway stations. Enter your PNR to check restaurants
          available for your actual train journey.
        </p>
      </section>

      {/* Same PNR search box used on the train page */}
      <PnrSearchBox />

      {!loading && !error && restaurants.length > 0 ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            padding: "2px 2px 0",
          }}
        >
          <h2
            style={{
              margin: 0,
              color: "#1e293b",
              fontSize: 18,
              lineHeight: 1.3,
              fontWeight: 800,
            }}
          >
            Active Restaurants
          </h2>

          <span
            style={{
              flexShrink: 0,
              borderRadius: 999,
              padding: "5px 9px",
              background: "#fff7ed",
              border: "1px solid #fed7aa",
              color: "#ea580c",
              fontSize: 11,
              fontWeight: 800,
            }}
          >
            {restaurants.length} Restaurants
          </span>
        </div>
      ) : null}

      {loading ? (
        <section
          style={{
            minHeight: 220,
            display: "grid",
            placeItems: "center",
            borderRadius: 18,
            border: "1px solid #e2e8f0",
            background: "#ffffff",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                width: 34,
                height: 34,
                margin: "0 auto 10px",
                border: "3px solid #fed7aa",
                borderTopColor: "#f97316",
                borderRadius: 999,
                animation: "popularRestaurantSpin 0.8s linear infinite",
              }}
            />

            <div
              style={{
                color: "#475569",
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              Loading active restaurants...
            </div>
          </div>
        </section>
      ) : null}

      {!loading && error ? (
        <section
          style={{
            padding: 20,
            textAlign: "center",
            borderRadius: 18,
            border: "1px solid #fecaca",
            background: "#fff7f7",
          }}
        >
          <div
            style={{
              color: "#b91c1c",
              fontSize: 14,
              fontWeight: 800,
            }}
          >
            Restaurants could not be loaded
          </div>

          <div
            style={{
              marginTop: 6,
              color: "#64748b",
              fontSize: 12,
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        </section>
      ) : null}

      {!loading && !error && restaurants.length === 0 ? (
        <section
          style={{
            padding: 22,
            textAlign: "center",
            borderRadius: 18,
            border: "1px solid #e2e8f0",
            background: "#ffffff",
          }}
        >
          <Store
            size={30}
            strokeWidth={2}
            style={{ color: "#94a3b8" }}
          />

          <div
            style={{
              marginTop: 8,
              color: "#475569",
              fontSize: 14,
              fontWeight: 800,
            }}
          >
            No active restaurants found
          </div>
        </section>
      ) : null}

      {!loading && !error
        ? restaurants.map((restaurant) => (
            <RestaurantCard
              key={String(restaurant.RestroCode)}
              restaurant={restaurant}
            />
          ))
        : null}

      <section
        style={{
          marginTop: 4,
          padding: "18px 15px",
          borderRadius: 18,
          border: "1px solid #e2e8f0",
          background: "#ffffff",
          boxShadow: "0 2px 10px rgba(15,23,42,0.04)",
        }}
      >
        <h2
          style={{
            margin: 0,
            color: "#1e293b",
            fontSize: 18,
            lineHeight: 1.35,
            fontWeight: 800,
          }}
        >
          Order Food from Popular Restaurants in Train
        </h2>

        <p
          style={{
            margin: "9px 0 0",
            color: "#475569",
            fontSize: 13,
            lineHeight: 1.65,
          }}
        >
          Enter your valid 10-digit PNR to find eligible
          delivery stations and restaurants for your journey.
          Restaurant availability depends on the train route,
          journey date, arrival time and order cut-off.
        </p>
      </section>

      <style jsx>{`
        @keyframes popularRestaurantSpin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </main>
  );
}
