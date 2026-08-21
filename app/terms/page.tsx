import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms & Conditions | RailEats Train Food Delivery",
  description:
    "Read the RailEats Terms & Conditions covering train food ordering, station delivery, payments, cancellations, refunds and user responsibilities.",
};

export default function TermsPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Terms & Conditions – RailEats</h1>
      <p className="text-sm text-gray-600">Last Updated: [Add Date]</p>
      <p>These Terms & Conditions govern the use of RailEats services. By accessing or using RailEats, you agree to be bound by these Terms.</p>

      <h2 className="text-xl font-semibold">1. About RailEats</h2>
      <p>RailEats is an online food delivery platform that enables train passengers to order food from partner restaurants and receive delivery at selected railway stations during their train journey. RailEats acts as a technology and service facilitator and does not prepare or manufacture food itself.</p>

      <h2 className="text-xl font-semibold">2. Service Availability</h2>
      <ul className="list-disc pl-6 space-y-1"><li>Food delivery is available only at selected railway stations.</li><li>Availability depends on train halt time, restaurant operating hours and cut-off rules.</li><li>RailEats may accept or reject an order based on operational feasibility.</li></ul>

      <h2 className="text-xl font-semibold">3. User Responsibilities</h2>
      <ul className="list-disc pl-6 space-y-1"><li>Provide accurate train, station and contact details.</li><li>Remain reachable by phone during delivery.</li><li>Be present at your seat at the delivery station.</li><li>Use the platform for lawful purposes only.</li></ul>

      <h2 className="text-xl font-semibold">4. Ordering & Delivery</h2>
      <ul className="list-disc pl-6 space-y-1"><li>Orders must be placed before the displayed cut-off time.</li><li>Delivery is attempted at the selected station and train coach.</li><li>Delivery is subject to station regulations and halt duration.</li><li>Delivery may not be possible if a train arrives early, is excessively delayed or skips the station.</li></ul>

      <h2 className="text-xl font-semibold">5. Pricing & Payments</h2>
      <ul className="list-disc pl-6 space-y-1"><li>Prices are displayed before order confirmation.</li><li>Additional charges, if any, are shown before confirmation.</li><li>Online payment or Cash on Delivery may be available depending on the order.</li></ul>

      <h2 className="text-xl font-semibold">6. Cancellations & Refunds</h2>
      <p>Cancellation requests are governed by the <Link href="/cancellation-refund" className="font-semibold text-orange-700">Cancellation & Refund Policy</Link>. Orders once prepared may not be eligible for cancellation. Refunds, if applicable, are processed according to the applicable policy.</p>

      <h2 className="text-xl font-semibold">7. Train Delays & Unforeseen Events</h2>
      <p>Service can be affected by train delays, early arrivals, route changes, insufficient station halt time, railway operational issues or other unforeseen events.</p>

      <h2 className="text-xl font-semibold">8. Food Quality & Liability</h2>
      <p>Food preparation and product quality are the responsibility of partner restaurants. RailEats facilitates the ordering and delivery service.</p>

      <h2 className="text-xl font-semibold">9. User Conduct</h2>
      <ul className="list-disc pl-6 space-y-1"><li>Do not misuse the platform.</li><li>Do not place fraudulent or fake orders.</li><li>Do not harass delivery partners or restaurant staff.</li><li>Do not use the service for unlawful activity.</li></ul>

      <h2 className="text-xl font-semibold">10. Intellectual Property</h2>
      <p>RailEats content, logos, text and platform design are protected by applicable intellectual-property laws. Unauthorized copying or misuse is prohibited.</p>

      <h2 className="text-xl font-semibold">11. Modifications to Terms</h2>
      <p>RailEats may update these Terms when necessary. Continued use of the platform after an update constitutes acceptance of the revised Terms.</p>

      <h2 className="text-xl font-semibold">12. Governing Law</h2>
      <p>These Terms are governed by the laws of India, subject to applicable jurisdiction.</p>

      <h2 className="text-xl font-semibold">13. Helpful RailEats Resources</h2>
      <div className="grid gap-3 sm:grid-cols-2"><Link href="/" className="rounded-xl border p-4 font-semibold">Order Food in Train</Link><Link href="/stations" className="rounded-xl border p-4 font-semibold">Browse Railway Stations</Link><Link href="/faq" className="rounded-xl border p-4 font-semibold">Train Food FAQs</Link><Link href="/contact" className="rounded-xl border p-4 font-semibold">Contact Support</Link></div>

      <h2 className="text-xl font-semibold">14. Contact Information</h2>
      <p>For questions about these Terms, please visit the <Link href="/contact" className="font-semibold text-orange-700">RailEats customer support</Link> page.</p>

      <p className="pt-4 font-medium">By continuing to use RailEats, you agree to our Terms & Conditions, Privacy Policy and Cancellation Policy.</p>
    </div>
  );
}
