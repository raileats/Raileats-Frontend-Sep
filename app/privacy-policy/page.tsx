import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | RailEats Train Food Delivery",
  description:
    "Read the RailEats Privacy Policy to understand how personal information is collected, used, stored and protected when using train food delivery services.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Privacy Policy – RailEats</h1>
      <p className="text-sm text-gray-600">Last Updated: 01-01-2026</p>
      <p>RailEats respects your privacy and is committed to protecting personal information of users who access or use our website, application and services.</p>
      <p>This Privacy Policy explains how we collect, use, store and protect information when you use RailEats.</p>

      <h2 className="text-xl font-semibold">1. Information We Collect</h2>
      <h3 className="font-medium">Personal Information</h3>
      <ul className="list-disc pl-6"><li>Name</li><li>Mobile number</li><li>Email address</li><li>Train number / PNR</li><li>Coach and seat details for delivery coordination</li></ul>
      <h3 className="font-medium">Payment Information</h3>
      <p>Payment details are processed securely by third-party payment gateways. RailEats does not store card or UPI details.</p>
      <h3 className="font-medium">Technical Information</h3>
      <ul className="list-disc pl-6"><li>Device type</li><li>IP address</li><li>Browser data</li><li>Cookies and usage analytics</li></ul>

      <h2 className="text-xl font-semibold">2. How We Use Your Information</h2>
      <ul className="list-disc pl-6"><li>Process and deliver food orders</li><li>Coordinate delivery at railway stations</li><li>Communicate order updates and support</li><li>Process payments and refunds</li><li>Improve services and user experience</li><li>Prevent fraud and misuse</li></ul>

      <h2 className="text-xl font-semibold">3. Sharing of Information</h2>
      <p>Limited information may be shared with partner restaurants, delivery partners, payment gateways and legal or regulatory authorities when required by law. We do not sell or rent personal data to third parties.</p>

      <h2 className="text-xl font-semibold">4. Data Security</h2>
      <p>RailEats follows reasonable security practices to protect data from unauthorized access, misuse or disclosure. No internet transmission method is completely secure.</p>

      <h2 className="text-xl font-semibold">5. Cookies & Tracking Technologies</h2>
      <p>Cookies and analytics may be used to improve website performance, understand usage and improve service quality. You can control cookie settings through your browser.</p>

      <h2 className="text-xl font-semibold">6. Data Retention</h2>
      <p>Information may be retained as necessary for order fulfillment, legal and accounting purposes and dispute resolution. Data is not retained longer than necessary for these purposes.</p>

      <h2 className="text-xl font-semibold">7. User Rights</h2>
      <ul className="list-disc pl-6"><li>Access personal data</li><li>Request correction or deletion</li><li>Withdraw consent subject to applicable legal requirements</li></ul>
      <p>Requests can be made through the <Link href="/contact" className="font-semibold text-orange-700">RailEats support</Link> page.</p>

      <h2 className="text-xl font-semibold">8. Third-Party Links</h2>
      <p>RailEats may contain links to third-party websites. We are not responsible for the privacy practices of those websites.</p>

      <h2 className="text-xl font-semibold">9. Policy Updates</h2>
      <p>RailEats may update this Privacy Policy when necessary. Changes become effective when posted on the platform.</p>

      <h2 className="text-xl font-semibold">10. Useful RailEats Pages</h2>
      <div className="grid gap-3 sm:grid-cols-2"><Link href="/" className="rounded-xl border p-4 font-semibold">Order Food in Train</Link><Link href="/faq" className="rounded-xl border p-4 font-semibold">Train Food FAQs</Link><Link href="/terms" className="rounded-xl border p-4 font-semibold">Terms & Conditions</Link><Link href="/cancellation-refund" className="rounded-xl border p-4 font-semibold">Cancellation & Refund</Link></div>

      <h2 className="text-xl font-semibold">11. Contact Us</h2>
      <p>For privacy-related concerns, please contact RailEats through our <Link href="/contact" className="font-semibold text-orange-700">customer support</Link> page.</p>

      <p className="pt-4 font-medium">RailEats uses personal information to process orders and provide services. Payments are processed through payment gateways.</p>
    </div>
  );
}
