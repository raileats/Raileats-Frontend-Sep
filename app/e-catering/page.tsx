import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "eCatering Train Food Guide | RailEats",
  description: "Learn how train eCatering works, how to search by PNR or train, choose a delivery station and order food during a railway journey.",
  alternates: { canonical: "https://www.raileats.in/e-catering" },
  robots: { index: true, follow: true },
};

export default function ECateringPage() {
  const steps = [
    "Search your journey with PNR, train number or station.",
    "Review delivery stations and restaurants available for the selected journey.",
    "Choose food from the restaurant menu and check timing and minimum order.",
    "Confirm passenger, coach, seat and contact details.",
    "Place the order and stay reachable near the selected delivery station.",
  ];

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: "24px 16px 48px", color: "#172033" }}>
      <nav aria-label="Breadcrumb" style={{ fontSize: 13, marginBottom: 18 }}><Link href="/">Home</Link> <span aria-hidden>›</span> <span>eCatering</span></nav>
      <section style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 20, padding: "24px 20px" }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "#c2410c" }}>Train Food Guide</p>
        <h1 style={{ margin: "8px 0 0", fontSize: "clamp(28px, 5vw, 42px)", lineHeight: 1.12 }}>eCatering Food Delivery for Train Journeys</h1>
        <p style={{ margin: "14px 0 0", fontSize: 16, lineHeight: 1.7, color: "#475569" }}>Learn how online train food ordering works and use RailEats to search the restaurants and delivery stations currently available for your journey.</p>
        <div style={{ marginTop: 18 }}><Link href="/" style={{ display: "inline-block", background: "#f97316", color: "#fff", padding: "11px 16px", borderRadius: 12, fontWeight: 800, textDecoration: "none" }}>Search Your Journey</Link></div>
      </section>
      <section style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 24 }}>How Train eCatering Works</h2>
        <div style={{ display: "grid", gap: 10 }}>
          {steps.map((step, i) => <div key={step} style={{ display: "flex", gap: 12, alignItems: "flex-start", border: "1px solid #e2e8f0", borderRadius: 14, padding: 14 }}><strong style={{ minWidth: 28, height: 28, display: "grid", placeItems: "center", borderRadius: 999, background: "#fff7ed", color: "#c2410c" }}>{i + 1}</strong><span style={{ lineHeight: 1.6 }}>{step}</span></div>)}
        </div>
      </section>
      <section style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 24 }}>Useful Train Food Pages</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10 }}>
          <Link href="/food" style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, textDecoration: "none", fontWeight: 800, color: "#0f172a" }}>Food Categories</Link>
          <Link href="/stations" style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, textDecoration: "none", fontWeight: 800, color: "#0f172a" }}>Delivery Stations</Link>
          <Link href="/order-food-in-train" style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, textDecoration: "none", fontWeight: 800, color: "#0f172a" }}>Order Food in Train</Link>
          <Link href="/live-train-status" style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, textDecoration: "none", fontWeight: 800, color: "#0f172a" }}>Live Train Status</Link>
        </div>
      </section>
      <section style={{ marginTop: 28, background: "#f8fafc", borderRadius: 18, padding: 20 }}>
        <h2 style={{ fontSize: 22, marginTop: 0 }}>Availability and service notes</h2>
        <p style={{ lineHeight: 1.7, color: "#475569", marginBottom: 0 }}>Restaurant availability, menus, prices, order cut-offs and delivery stations can vary by train, journey date and restaurant operating status. RailEats shows the current options available in its ordering flow. This page is an informational guide and does not claim an affiliation with IRCTC unless explicitly stated elsewhere on the site.</p>
      </section>
    </main>
  );
}
