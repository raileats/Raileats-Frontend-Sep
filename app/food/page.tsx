import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Train Food Categories | RailEats",
  description: "Explore train food categories including pure veg, Jain, biryani, thali, breakfast, South Indian, Chinese and non-veg food options on RailEats.",
  alternates: { canonical: "https://www.raileats.in/food" },
  robots: { index: true, follow: true },
};

const categories = [
  ["pure-veg-food-in-train", "Pure Veg Food in Train"],
  ["jain-food-in-train", "Jain Food in Train"],
  ["biryani-in-train", "Biryani in Train"],
  ["pizza-in-train", "Pizza in Train"],
  ["thali-in-train", "Thali in Train"],
  ["south-indian-food-in-train", "South Indian Food in Train"],
  ["chinese-food-in-train", "Chinese Food in Train"],
  ["breakfast-in-train", "Breakfast in Train"],
  ["non-veg-food-in-train", "Non-Veg Food in Train"],
];

export default function FoodHubPage() {
  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: "24px 16px 48px", color: "#172033" }}>
      <nav aria-label="Breadcrumb" style={{ fontSize: 13, marginBottom: 18 }}>
        <Link href="/">Home</Link> <span aria-hidden>›</span> <span>Food Categories</span>
      </nav>
      <section style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 20, padding: "24px 20px" }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "#c2410c" }}>RailEats</p>
        <h1 style={{ margin: "8px 0 0", fontSize: "clamp(28px, 5vw, 42px)", lineHeight: 1.12 }}>Train Food Categories</h1>
        <p style={{ margin: "14px 0 0", fontSize: 16, lineHeight: 1.7, color: "#475569" }}>Explore food preferences and meal types for train journeys. Search your PNR, train number or station to see which restaurants and menu items are currently available for your journey.</p>
        <div style={{ marginTop: 18 }}><Link href="/" style={{ display: "inline-block", background: "#f97316", color: "#fff", padding: "11px 16px", borderRadius: 12, fontWeight: 800, textDecoration: "none" }}>Search Your Journey</Link></div>
      </section>
      <section style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 24 }}>Browse Food Types</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
          {categories.map(([slug, label]) => <Link key={slug} href={`/food/${slug}`} style={{ border: "1px solid #e2e8f0", borderRadius: 14, padding: 16, textDecoration: "none", color: "#0f172a", fontWeight: 800, background: "#fff" }}>{label}<span style={{ display: "block", marginTop: 5, fontSize: 13, fontWeight: 600, color: "#64748b" }}>Check current availability →</span></Link>)}
        </div>
      </section>
      <section style={{ marginTop: 30, background: "#f8fafc", borderRadius: 18, padding: 20 }}>
        <h2 style={{ fontSize: 22, marginTop: 0 }}>Availability is journey-specific</h2>
        <p style={{ marginBottom: 0, lineHeight: 1.7, color: "#475569" }}>Food categories are discovery pages. The live ordering flow remains the source of truth for restaurant availability, menu items, prices, minimum order and delivery timing on a particular train journey.</p>
      </section>
    </main>
  );
}
