import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { serviceClient } from "../../lib/supabaseServer";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.raileats.in";

function cleanTrainName(value: any) {
  const name = String(value ?? "").trim();

  if (
    !name ||
    name.toLowerCase() === "train" ||
    name.toLowerCase() === "undefined"
  ) {
    return "";
  }

  return name;
}

function normalize(value: any) {
  return String(value ?? "").trim().toUpperCase();
}

function slugify(value: any) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isActive(value: any) {
  const v = String(value ?? "").trim().toLowerCase();
  return (
    value === true ||
    value === 1 ||
    v === "1" ||
    v === "on" ||
    v === "active" ||
    v === "true" ||
    v === "yes"
  );
}

function getValue(row: Record<string, any>, keys: string[]) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(row, key)) return row[key];
  }
  const rowKeys = Object.keys(row);
  for (const key of keys) {
    const match = rowKeys.find((item) => item.toLowerCase() === key.toLowerCase());
    if (match) return row[match];
  }
  return undefined;
}

function normalizeRestroCode(value: any) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? String(numeric) : raw.toUpperCase();
}

function parseExpiryDate(value: any): Date | null {
  if (value === undefined || value === null || value === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 23, 59, 59, 999);
  }

  const raw = String(value).trim();
  const indian = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (indian) {
    const parsed = new Date(
      Number(indian[3]),
      Number(indian[2]) - 1,
      Number(indian[1]),
      23,
      59,
      59,
      999
    );
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    const parsed = new Date(
      Number(iso[1]),
      Number(iso[2]) - 1,
      Number(iso[3]),
      23,
      59,
      59,
      999
    );
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const fallback = new Date(raw);
  return Number.isNaN(fallback.getTime())
    ? null
    : new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate(), 23, 59, 59, 999);
}

function hasValidFssai(rows: Record<string, any>[], restroCode: any) {
  const code = normalizeRestroCode(restroCode);
  if (!code) return false;

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  return rows.some((row) => {
    if (normalizeRestroCode(getValue(row, ["RestroCode", "restro_code", "restroCode", "RestaurantCode"])) !== code) {
      return false;
    }

    const status = getValue(row, ["Status", "status", "FSSAIStatus", "FssaiStatus", "IsActive", "is_active", "Active", "active"]);
    if (status !== undefined && status !== null && status !== "") {
      const normalized = String(status).trim().toLowerCase();
      if (!["active", "1", "true", "yes", "on", "valid", "approved"].includes(normalized)) return false;
    }

    const expiry = parseExpiryDate(
      getValue(row, ["Expiry", "expiry", "ExpiryDate", "expiry_date", "FSSAIExpiry", "FSSAIExpiryDate", "ValidTill", "valid_till", "ValidUpto", "valid_upto"])
    );
    return !!expiry && expiry.getTime() >= todayStart.getTime();
  });
}

async function getTrainSeoData(trainNumber: string) {
  if (!trainNumber) return { trainName: "", stations: [] as any[] };

  try {
    const numericTrain = Number(trainNumber) || 0;
    const { data: routeRows, error } = await serviceClient
      .from("TrainRoute")
      .select("*")
      .or(`trainNumber.eq.${trainNumber},trainNumber.eq.${numericTrain}`)
      .order("StnNumber", { ascending: true });

    if (error || !routeRows?.length) return { trainName: "", stations: [] };

    const trainName =
      cleanTrainName(routeRows[0]?.trainName) ||
      cleanTrainName(routeRows[0]?.TrainName) ||
      cleanTrainName(routeRows[0]?.train_name);

    const stationCodes = Array.from(
      new Set(
        routeRows
          .map((row: any) => normalize(row?.StationCode))
          .filter(Boolean)
      )
    );

    if (!stationCodes.length) return { trainName, stations: [] };

    const [stationResult, restroResult] = await Promise.all([
      serviceClient
        .from("Stations")
        .select("StationCode, State")
        .in("StationCode", stationCodes),
      serviceClient
        .from("RestroMaster")
        .select("RestroCode, StationCode, RestroName, RaileatsStatus, IsActive")
        .in("StationCode", stationCodes),
    ]);

    if (stationResult.error || restroResult.error) return { trainName, stations: [] };

    const activeRestros = (restroResult.data || []).filter((row: any) =>
      isActive(row?.RaileatsStatus ?? row?.IsActive)
    );
    const restroCodes = Array.from(
      new Set(activeRestros.map((row: any) => normalizeRestroCode(row?.RestroCode)).filter(Boolean))
    );

    let fssaiRows: Record<string, any>[] = [];
    const numericCodes = restroCodes.map(Number).filter(Number.isFinite);
    if (numericCodes.length) {
      const { data } = await serviceClient
        .from("RestroFSSAI")
        .select("*")
        .in("RestroCode", numericCodes);
      fssaiRows = data || [];
    }

    const stateMap = new Map(
      (stationResult.data || []).map((row: any) => [normalize(row.StationCode), String(row.State || "").trim()])
    );

    const eligibleCodes = new Set(
      activeRestros
        .filter((row: any) => hasValidFssai(fssaiRows, row?.RestroCode))
        .map((row: any) => normalize(row?.StationCode))
        .filter(Boolean)
    );

    const stations = routeRows
      .filter((row: any) => eligibleCodes.has(normalize(row?.StationCode)))
      .map((row: any) => {
        const code = normalize(row?.StationCode);
        const name = String(row?.StationName || row?.stationName || code).trim();
        return {
          code,
          name,
          state: stateMap.get(code) || "",
          arrives: String(row?.Arrives || row?.Arrival || "").slice(0, 5),
          halt: String(row?.HaltTime || row?.haltTime || "").trim(),
        };
      })
      .filter((row: any, index: number, list: any[]) =>
        list.findIndex((item) => item.code === row.code) === index
      );

    return { trainName, stations };
  } catch {
    return { trainName: "", stations: [] };
  }
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const slug = String(params?.slug || "");
  const trainNumber = slug.match(/^(\d+)/)?.[1] || "";

  if (!trainNumber) {
    return {
      title: "Train Food Delivery | RailEats",
      robots: { index: false, follow: true },
    };
  }

  const trainName = await getTrainSeoData(trainNumber).then((data) => data.trainName);
  const fullTrain = trainName ? `${trainNumber} - ${trainName}` : trainNumber;
  const canonical = `${SITE_URL}/trains/${trainNumber}-train-food-delivery-in-train`;
  const title = `Order Food in Train ${fullTrain} | RailEats`;
  const description = `Order fresh food in train ${fullTrain}. View active restaurants on the route and enter your PNR for delivery at your seat.`;

  return {
    title: { absolute: title },
    description,
    alternates: { canonical },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "RailEats",
      type: "website",
      locale: "en_IN",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function TrainLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { slug: string };
}) {
  const slug = String(params?.slug || "");
  const trainNumber = slug.match(/^(\d+)/)?.[1] || "";

  if (!trainNumber) return children;

  const { trainName, stations } = await getTrainSeoData(trainNumber);
  const canonical = `${SITE_URL}/trains/${trainNumber}-train-food-delivery-in-train`;
  const fullTrain = trainName ? `${trainNumber} - ${trainName}` : trainNumber;

  const faq = [
    {
      question: `Can I order food online in train ${trainNumber}?`,
      answer: `Yes. Enter your valid 10-digit PNR on RailEats to check eligible delivery stations and active restaurants for train ${trainNumber}.`,
    },
    {
      question: "Why is a PNR required for train food delivery?",
      answer:
        "PNR verification confirms the train, journey date and eligible delivery stations before an order is placed.",
    },
    {
      question: "Where is the food delivered?",
      answer:
        "The order is delivered at the railway station selected during booking using the coach and seat details supplied with the order.",
    },
    {
      question: "Why can restaurant availability change?",
      answer:
        "Availability depends on the delivery station, journey date, train arrival time, restaurant status and order cut-off time.",
    },
  ];

  const stationItems = stations.slice(0, 30).map((station: any, index: number) => {
    const stationSlug = `${slugify(station.name)}-${slugify(station.code)}-food-delivery-in-train`;
    const stationUrl = `${SITE_URL}/stations/${stationSlug}`;

    return {
      "@type": "ListItem",
      position: index + 1,
      name: `${station.name} (${station.code})`,
      url: stationUrl,
    };
  });

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${canonical}#webpage`,
        url: canonical,
        name: `Order Food in Train ${fullTrain}`,
        description: `View active restaurants for train ${fullTrain} and enter your PNR to check food delivery options for your journey.`,
        isPartOf: {
          "@type": "WebSite",
          "@id": `${SITE_URL}/#website`,
          url: SITE_URL,
          name: "RailEats",
        },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${canonical}#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: SITE_URL,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Food in Train",
            item: `${SITE_URL}/order-food-in-train`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: `Train ${trainNumber}`,
            item: canonical,
          },
        ],
      },
      ...(stationItems.length > 0
        ? [
            {
              "@type": "ItemList",
              "@id": `${canonical}#delivery-stations`,
              name: `Food Delivery Stations for Train ${fullTrain}`,
              url: canonical,
              numberOfItems: stationItems.length,
              itemListElement: stationItems,
            },
          ]
        : []),
      {
        "@type": "Service",
        "@id": `${canonical}#train-food-service`,
        name: `Train food delivery for ${fullTrain}`,
        provider: {
          "@type": "Organization",
          "@id": `${SITE_URL}#organization`,
          name: "RailEats",
          url: SITE_URL,
        },
        areaServed: {
          "@type": "Place",
          name: `Railway stations served by train ${fullTrain}`,
        },
        url: canonical,
      },
      {
        "@type": "FAQPage",
        "@id": `${canonical}#faq`,
        mainEntity: faq.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      },
    ],
  };

  return (
    <>
      <section
        aria-labelledby="train-seo-summary"
        style={{
          width: "100%",
          maxWidth: 720,
          margin: "0 auto",
          padding: "12px 10px 0",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 18,
            background: "#ffffff",
            padding: "14px 15px",
          }}
        >
          <h1
            id="train-seo-summary"
            style={{
              margin: 0,
              fontSize: "clamp(18px, 4vw, 24px)",
              lineHeight: 1.25,
              fontWeight: 850,
              color: "#0f172a",
            }}
          >
            Order Food in Train {fullTrain}
          </h1>

          <p style={{ margin: "8px 0 0", fontSize: 13, lineHeight: 1.65, color: "#475569" }}>
            Check food delivery options for train {fullTrain}. RailEats shows active restaurant options at supported railway stations on the route. Enter your PNR before ordering so the journey date and eligible delivery stations can be checked for your trip.
          </p>

          {stations.length > 0 ? (
            <div style={{ marginTop: 13 }}>
              <h2 style={{ margin: 0, fontSize: 16, lineHeight: 1.35, fontWeight: 800, color: "#1e293b" }}>
                Food Delivery Stations for Train {trainNumber}
              </h2>
              <div style={{ display: "grid", gap: 8, marginTop: 9 }}>
                {stations.slice(0, 30).map((station: any) => {
                  const stationSlug = `${slugify(station.name)}-${slugify(station.code)}-food-delivery-in-train`;
                  return (
                    <Link
                      key={station.code}
                      href={`/stations/${stationSlug}`}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        alignItems: "center",
                        border: "1px solid #e2e8f0",
                        borderRadius: 12,
                        padding: "9px 10px",
                        textDecoration: "none",
                        color: "#1e293b",
                        background: "#f8fafc",
                        fontSize: 12,
                        fontWeight: 750,
                      }}
                    >
                      <span>
                        {station.name} ({station.code})
                        {station.state ? `, ${station.state}` : ""}
                      </span>
                      <span style={{ color: "#f97316", whiteSpace: "nowrap" }}>View food</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      {children}
    </>
  );
}