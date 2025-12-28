import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | RailEats",
  description:
    "Read RailEats Privacy Policy to understand how we collect, use, store, and protect your personal information while using our food delivery services in train.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">
        Privacy Policy – RailEats
      </h1>

      <p className="text-sm text-gray-600">
        Last Updated: 01-01-2026
      </p>

      <p>
        RailEats (“we”, “our”, “us”) respects your privacy and is committed to
        protecting the personal information of users (“you”, “your”) who access
        or use our website, mobile application, and services.
      </p>

      <p>
        This Privacy Policy explains how we collect, use, store, and protect
        your information when you use RailEats.
      </p>

      <h2 className="text-xl font-semibold">1. Information We Collect</h2>

      <h3 className="font-medium">a. Personal Information</h3>
      <ul className="list-disc pl-6">
        <li>Name</li>
        <li>Mobile number</li>
        <li>Email address</li>
        <li>Train number / PNR</li>
        <li>Coach and seat details (for delivery coordination)</li>
      </ul>

      <h3 className="font-medium">b. Payment Information</h3>
      <p>
        Payment details are processed securely by third-party payment gateways.
        RailEats does not store card or UPI details.
      </p>

      <h3 className="font-medium">c. Technical Information</h3>
      <ul className="list-disc pl-6">
        <li>Device type</li>
        <li>IP address</li>
        <li>Browser data</li>
        <li>Cookies and usage analytics</li>
      </ul>

      <h2 className="text-xl font-semibold">2. How We Use Your Information</h2>
      <ul className="list-disc pl-6">
        <li>Process and deliver food orders</li>
        <li>Coordinate delivery at railway stations</li>
        <li>Communicate order updates and support</li>
        <li>Process payments and refunds</li>
        <li>Improve our services and user experience</li>
        <li>Prevent fraud and misuse</li>
      </ul>

      <h2 className="text-xl font-semibold">3. Sharing of Information</h2>
      <p>We may share limited information with:</p>
      <ul className="list-disc pl-6">
        <li>Partner restaurants (order preparation)</li>
        <li>Delivery partners (handover at station)</li>
        <li>Payment gateways (transaction processing)</li>
        <li>Legal or regulatory authorities, if required by law</li>
      </ul>
      <p>
        We do not sell or rent your personal data to third parties.
      </p>

      <h2 className="text-xl font-semibold">4. Data Security</h2>
      <p>
        RailEats follows reasonable security practices to protect your data from
        unauthorized access, misuse, or disclosure. However, no method of
        transmission over the internet is 100% secure.
      </p>

      <h2 className="text-xl font-semibold">5. Cookies & Tracking Technologies</h2>
      <ul className="list-disc pl-6">
        <li>Enhance website performance</li>
        <li>Understand user behavior</li>
        <li>Improve service quality</li>
      </ul>
      <p>
        You can control cookie settings through your browser.
      </p>

      <h2 className="text-xl font-semibold">6. Data Retention</h2>
      <ul className="list-disc pl-6">
        <li>Order fulfillment</li>
        <li>Legal and accounting purposes</li>
        <li>Dispute resolution</li>
      </ul>
      <p>Data is not stored longer than necessary.</p>

      <h2 className="text-xl font-semibold">7. User Rights</h2>
      <ul className="list-disc pl-6">
        <li>Access your personal data</li>
        <li>Request correction or deletion</li>
        <li>Withdraw consent (subject to legal requirements)</li>
      </ul>
      <p>
        Requests can be made through the Support section.
      </p>

      <h2 className="text-xl font-semibold">8. Third-Party Links</h2>
      <p>
        RailEats may contain links to third-party websites. We are not
        responsible for the privacy practices of such websites.
      </p>

      <h2 className="text-xl font-semibold">9. Children’s Privacy</h2>
      <p>
        RailEats services are not intended for children under the age of 18. We
        do not knowingly collect data from minors.
      </p>

      <h2 className="text-xl font-semibold">10. Policy Updates</h2>
      <p>
        RailEats reserves the right to update this Privacy Policy at any time.
        Changes will be effective immediately upon posting on the platform.
      </p>

      <h2 className="text-xl font-semibold">11. Contact Us</h2>
      <p>
        For privacy-related concerns, please contact RailEats through the Help /
        Support section available on our website or app.
      </p>

      <p className="pt-4 font-medium">
        RailEats collects personal information only to process orders and provide
        services. We do not sell user data. Payments are processed securely via
        trusted payment gateways.
      </p>
    </div>
  );
}

