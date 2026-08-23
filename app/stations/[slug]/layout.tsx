import Link from "next/link";
import type { ReactNode } from "react";
import { getStationRelatedTrains } from "../../../lib/seo/station-trains";

function getStationIdentity(slugValue: string) {
  const slug = decodeURIComponent(String(slugValue || "")).trim();
  const withoutSuffix = slug.replace(/-food-delivery-in-train$/i, "");
  const parts = withoutSuffix.split("-").filter(Boolean);
  const code = String(parts.pop() || "").toUpperCase();
  const name = parts
    .join(" ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

  return {
    code,
    name: name || code || "Railway Station",
  };
}

export default async function StationLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { slug: string };
}) {
  const { code: stationCode, name: stationName } = getStationIdentity(
    params?.slug || ""
  );
  const trains = stationCode
    ? await getStationRelatedTrains(stationCode, 24)
    : [];

  return (
    <>
      {children}

      {trains.length > 0 ? (
        <section
          aria-labelledby="station-related-trains"
          style={{
            width: "100%",
            maxWidth: 720,
            margin: "0 auto",
            padding: "0 10px 40px",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 18,
              padding: 14,
            }}
          >
            <h2
              id="station-related-trains"
              style={{
                margin: "0 0 10px",
                fontSize: 18,
                lineHeight: 1.3,
                fontWeight: 800,
                color: "#1e293b",
              }}
            >
              Trains Serving {stationName} ({stationCode})
            </h2>

            <p
              style={{
                margin: "0 0 12px",
                fontSize: 12,
                lineHeight: 1.5,
                color: "#64748b",
              }}
            >
              Check real trains stopping at {stationName} and open their food
              delivery pages.
            </p>

            <nav aria-label={`Trains serving ${stationName} station`}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 8,
                }}
              >
                {trains.map((train) => (
                  <Link
                    key={train.trainNumber}
                    href={`/trains/${train.slug}`}
                    aria-label={`Order food in train ${train.trainNumber} ${train.trainName}`}
                    style={{
                      display: "block",
                      padding: "10px 11px",
                      border: "1px solid #e2e8f0",
                      borderRadius: 12,
                      textDecoration: "none",
                      color: "#1e293b",
                      background: "#f8fafc",
                    }}
                  >
                    <span
                      style={{
                        display: "block",
                        fontSize: 13,
                        fontWeight: 800,
                        lineHeight: 1.3,
                      }}
                    >
                      Order Food in Train {train.trainNumber}
                    </span>
                    <span
                      style={{
                        display: "block",
                        marginTop: 3,
                        fontSize: 11,
                        color: "#64748b",
                      }}
                    >
                      {train.trainName} · Food delivery in train
                    </span>
                  </Link>
                ))}
              </div>
            </nav>

            <div
              style={{
                marginTop: 12,
                paddingTop: 12,
                borderTop: "1px solid #e2e8f0",
              }}
            >
              <Link
                href="/popular-restaurants-train-journey"
                aria-label={`Explore popular restaurants for train food delivery near ${stationName}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 800,
                  color: "#c2410c",
                  textDecoration: "none",
                }}
              >
                Explore popular train food restaurants →
              </Link>
            </div>

            <div
              style={{
                marginTop: 12,
                paddingTop: 12,
                borderTop: "1px solid #e2e8f0",
              }}
            >
              <h3
                style={{
                  margin: "0 0 8px",
                  fontSize: 13,
                  lineHeight: 1.4,
                  fontWeight: 800,
                  color: "#1e293b",
                }}
              >
                Popular Food Options for Train Journeys
              </h3>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 7,
                }}
              >
                {[
                  ["Pure Veg Food in Train", "/food/pure-veg-food-in-train"],
                  ["Jain Food in Train", "/food/jain-food-in-train"],
                  ["Biryani in Train", "/food/biryani-in-train"],
                  ["Pizza in Train", "/food/pizza-in-train"],
                  ["South Indian Food", "/food/south-indian-food-in-train"],
                  ["Chinese Food in Train", "/food/chinese-food-in-train"],
                  ["Thali in Train", "/food/thali-in-train"],
                  ["Breakfast in Train", "/food/breakfast-in-train"],
                  ["Non-Veg Food in Train", "/food/non-veg-food-in-train"],
                ].map(([label, href]) => (
                  <Link
                    key={href}
                    href={href}
                    style={{
                      padding: "7px 9px",
                      border: "1px solid #e2e8f0",
                      borderRadius: 999,
                      background: "#fff7ed",
                      color: "#c2410c",
                      fontSize: 11,
                      fontWeight: 800,
                      textDecoration: "none",
                    }}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
