import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, Search, Store, Train } from "lucide-react";
import PnrSearchBox from "@/components/PnrSearchBox";
import { serviceClient } from "../lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const SITE_URL = "https://www.raileats.in";
const PAGE_URL = `${SITE_URL}/stations`;
const PAGE_SIZE = 1000;

export const metadata: Metadata = {
  title: "Railway Stations for Train Food Delivery | RailEats",
  description:
    "Browse active railway stations served by RailEats, see the number of available restaurants and order fresh food for delivery to your train seat.",
  alternates: { canonical: PAGE_URL },
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
    type: "website",
    url: PAGE_URL,
    siteName: "RailEats",
    title: "Railway Stations for Train Food Delivery | RailEats",
    description:
      "Find active RailEats restaurants at railway stations across India and order food in train.",
    images: [`${SITE_URL}/raileats-logo.png`],
  },
};

type RestroRow = {
  RestroCode?: string | number | null;
  RestroName?: string | null;
  StationCode?: string | null;
  StationName?: string | null;
  State?: string | null;
  District?: string | null;
  RaileatsStatus?: unknown;
};

type FssaiRow = {
  RestroCode?: string | number | null;
  expiry_date?: string | null;
  status?: unknown;
  created_at?: string | null;
};

type StationMasterRow = {
  StationCode?: string | null;
  StationName?: string | null;
  State?: string | null;
  District?: string | null;
};

type Station = {
  code: string;
  name: string;
  state: string;
  district: string;
  restaurantCount: number;
  href: string;
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeRestroCode(value: unknown) {
  const raw = clean(value);
  if (!raw) return "";
  const number = Number(raw);
  return Number.isFinite(number) ? String(number) : raw.toUpperCase();
}

function isActive(value: unknown) {
  const normalized = clean(value).toLowerCase();
  return (
    value === true ||
    value === 1 ||
    ["1", "on", "active", "true", "yes", "valid", "approved"].includes(
      normalized
    )
  );
}

function slugify(value: unknown) {
  return clean(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseDateKey(value: unknown) {
  const raw = clean(value);
  if (!raw) return null;

  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  const indian = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  let year: number;
  let month: number;
  let day: number;

  if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]);
    day = Number(iso[3]);
  } else if (indian) {
    year = Number(indian[3]);
    month = Number(indian[2]);
    day = Number(indian[1]);
  } else {
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return null;
    year = date.getUTCFullYear();
    month = date.getUTCMonth() + 1;
    day = date.getUTCDate();
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return year * 10000 + month * 100 + day;
}

function indiaTodayKey() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return Number(values.year) * 10000 + Number(values.month) * 100 + Number(values.day);
}

async function fetchAll<T>(table: string, select: string): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await serviceClient
      .from(table)
      .select(select)
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    const page = (data || []) as T[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return rows;
}

async function getStations(): Promise<Station[]> {
  try {
    const [restros, stationRows] = await Promise.all([
      fetchAll<RestroRow>(
        "RestroMaster",
        "RestroCode,RestroName,StationCode,StationName,State,District,RaileatsStatus"
      ),
      fetchAll<StationMasterRow>(
        "Stations",
        "StationCode,StationName,State,District"
      ),
    ]);

    const stationMaster = new Map<string, StationMasterRow>();
    for (const row of stationRows) {
      const stationCode = clean(row.StationCode).toUpperCase();
      if (stationCode && !stationMaster.has(stationCode)) {
        stationMaster.set(stationCode, row);
      }
    }

    const stations = new Map<string, Omit<Station, "href"> & { restros: Set<string> }>();
    for (const row of restros) {
      const restroCode = normalizeRestroCode(row.RestroCode);
      const stationCode = clean(row.StationCode).toUpperCase();
      const master = stationMaster.get(stationCode);
      const stationName = clean(row.StationName) || clean(master?.StationName) || stationCode;
      if (
        !isActive(row.RaileatsStatus) ||
        !restroCode ||
        !stationCode
      ) {
        continue;
      }

      const existing = stations.get(stationCode);
      if (existing) {
        existing.restros.add(restroCode);
        existing.restaurantCount = existing.restros.size;
      } else {
        stations.set(stationCode, {
          code: stationCode,
          name: stationName,
          state: clean(row.State) || clean(master?.State),
          district: clean(row.District) || clean(master?.District),
          restaurantCount: 1,
          restros: new Set([restroCode]),
        });
      }
    }

    return Array.from(stations.values())
      .map(({ restros: _restros, ...station }) => ({
        ...station,
        href: `/stations/${slugify(station.name)}-${slugify(
          station.code
        )}-food-delivery-in-train`,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error("Stations directory loading error:", error);
    return [];
  }
}

export default async function StationsPage() {
  const stations = await getStations();
  const totalRestaurants = stations.reduce(
    (total, station) => total + station.restaurantCount,
    0
  );

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "RailEats train food delivery stations",
    numberOfItems: stations.length,
    itemListElement: stations.map((station, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: `${station.name} Railway Station (${station.code})`,
      url: `${SITE_URL}${station.href}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList).replace(/</g, "\\u003c") }}
      />
      <main className="stations-page">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link href="/">Home</Link><span>›</span><span>Stations</span>
        </nav>

        <section className="hero-section">
          <div className="eyebrow">RailEats Active Stations</div>
          <h1>Food Delivery at Railway Stations</h1>
          <p>
            Choose a railway station to view active restaurants and order fresh
            food for delivery directly to your train seat.
          </p>
          <div className="hero-stats">
            <span><Train size={17} /> {stations.length} Active Stations</span>
            <span><Store size={17} /> {totalRestaurants} Active Restaurants</span>
          </div>
        </section>

        <PnrSearchBox />

        <section className="directory-heading">
          <div>
            <h2>All Active Railway Stations</h2>
            <p>Click a station to see its available restaurants and menus.</p>
          </div>
          <span>{stations.length} Stations</span>
        </section>

        {stations.length ? (
          <section className="station-list" aria-label="Active railway stations">
            {stations.map((station) => (
              <Link className="station-card" href={station.href} key={station.code}>
                <div className="station-icon"><MapPin size={23} /></div>
                <div className="station-info">
                  <h3>{station.name}</h3>
                  <p>
                    {station.code}
                    {station.district ? ` · ${station.district}` : ""}
                    {station.state ? `, ${station.state}` : ""}
                  </p>
                  <strong>
                    {station.restaurantCount} Active Restaurant
                    {station.restaurantCount === 1 ? "" : "s"}
                  </strong>
                </div>
                <span className="view-button">View Restaurants</span>
              </Link>
            ))}
          </section>
        ) : (
          <section className="empty-state">
            <Search size={32} />
            <h2>Stations are being updated</h2>
            <p>Enter your PNR above to check food delivery for your journey.</p>
          </section>
        )}

        <section className="content-section">
          <h2>Order Food in Train at Your Preferred Station</h2>
          <p>
            RailEats connects railway passengers with active restaurant partners
            at stations across India. Select a station, compare available outlets,
            open a restaurant menu and add your preferred meals to the cart.
          </p>
          <p>
            Restaurant availability is checked using the outlet's active status
            and valid FSSAI details. For journey-specific availability, enter your
            10-digit PNR above.
          </p>
        </section>
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .stations-page{width:100%;max-width:760px;min-height:70vh;margin:0 auto;padding:8px 10px 92px;box-sizing:border-box;display:flex;flex-direction:column;gap:12px}
        .breadcrumbs{display:flex;align-items:center;gap:7px;padding:2px 3px;color:#64748b;font-size:12px}.breadcrumbs a{color:#2563eb;font-weight:700;text-decoration:none}
        .hero-section,.content-section,.empty-state{background:#fff;border:1px solid #e2e8f0;border-radius:18px;padding:18px 16px;box-shadow:0 2px 10px rgba(15,23,42,.04)}
        .eyebrow{color:#64748b;font-size:10px;font-weight:800;letter-spacing:.5px;text-transform:uppercase}.hero-section h1{margin:7px 0 0;color:#1e293b;font-size:clamp(22px,5vw,30px);line-height:1.18}.hero-section p,.content-section p{margin:9px 0 0;color:#64748b;font-size:13px;line-height:1.65}
        .hero-stats{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}.hero-stats span{display:flex;align-items:center;gap:6px;border-radius:999px;background:#fff7ed;color:#c2410c;padding:8px 11px;font-size:12px;font-weight:850}
        .directory-heading{display:flex;justify-content:space-between;align-items:flex-end;gap:10px;padding:7px 3px}.directory-heading h2{margin:0;color:#1e293b;font-size:18px}.directory-heading p{margin:3px 0 0;color:#64748b;font-size:12px}.directory-heading>span{flex:none;border-radius:999px;background:#eff6ff;color:#2563eb;padding:6px 10px;font-size:11px;font-weight:850}
        .station-list{display:grid;gap:10px}.station-card{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:12px;padding:14px;background:#fff;border:1px solid #e2e8f0;border-radius:17px;color:inherit;text-decoration:none;box-shadow:0 2px 9px rgba(15,23,42,.04);transition:.18s ease}.station-card:hover{border-color:#fdba74;transform:translateY(-1px);box-shadow:0 7px 18px rgba(249,115,22,.1)}
        .station-icon{width:45px;height:45px;border-radius:14px;background:#fff7ed;color:#f97316;display:grid;place-items:center}.station-info{min-width:0}.station-info h3{margin:0;color:#1e293b;font-size:15px;line-height:1.25}.station-info p{margin:4px 0;color:#64748b;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.station-info strong{color:#16a34a;font-size:11px}.view-button{border-radius:11px;background:#f97316;color:#fff;padding:10px 12px;font-size:11px;font-weight:900;white-space:nowrap}
        .empty-state{text-align:center;color:#64748b}.empty-state svg{color:#f97316}.empty-state h2{margin:9px 0 0;color:#1e293b;font-size:18px}.empty-state p{margin:6px 0 0;font-size:12px}.content-section h2{margin:0;color:#1e293b;font-size:19px}
        @media(max-width:560px){.station-card{grid-template-columns:auto minmax(0,1fr);gap:10px}.view-button{grid-column:1/-1;text-align:center;padding:9px}.hero-section,.content-section,.empty-state{padding:16px 14px}.directory-heading{align-items:flex-start}.directory-heading>span{margin-top:1px}}
      ` }} />
    </>
  );
}
