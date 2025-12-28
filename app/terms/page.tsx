import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions | RailEats",
  description:
    "Read the Terms & Conditions governing the use of RailEats services, including ordering, delivery, payments, cancellations, and user responsibilities.",
};

export default function TermsPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">
        Terms & Conditions – RailEats
      </h1>

      <p className="text-sm text-gray-600">
        Last Updated: [Add Date]
      </p>

      <p>
        These Terms & Conditions (“Terms”) govern the use of the RailEats website,
        mobile application, and services. By accessing or using RailEats, you
        agree to be bound by these Terms. If you do not agree, please do not use
        our services.
      </p>

      <h2 className="text-xl font-semibold">1. About RailEats</h2>
      <p>
        RailEats is an online food delivery platform that enables train passengers
        to order food from partner restaurants and receive delivery at selected
        railway stations during their train journey.
      </p>
      <p>
        RailEats acts as a technology and service facilitator and does not
        prepare or manufacture food itself.
      </p>

      <h2 className="text-xl font-semibold">2. Service Availability</h2>
      <ul className="list-disc pl-6 space-y-1">
        <li>Food delivery is available only at selected railway stations.</li>
        <li>
          Availability depends on train halt time, restaurant operating hours,
          and cut-off rules.
        </li>
        <li>
          RailEats reserves the right to accept or reject any order based on
          operational feasibility.
        </li>
      </ul>

      <h2 className="text-xl font-semibold">3. User Responsibilities</h2>
      <ul className="list-disc pl-6 space-y-1">
        <li>You provide accurate train, station, and contact details.</li>
        <li>You remain reachable via phone during delivery.</li>
        <li>You ensure presence at your seat at the delivery station.</li>
        <li>You use the platform for lawful purposes only.</li>
      </ul>
      <p>
        RailEats is not responsible for failed deliveries due to incorrect
        details provided by the user.
      </p>

      <h2 className="text-xl font-semibold">4. Ordering & Delivery</h2>
      <ul className="list-disc pl-6 space-y-1">
        <li>Orders must be placed before the cut-off time displayed.</li>
        <li>Delivery is attempted at the selected station and train coach.</li>
        <li>
          Delivery is subject to station regulations and halt duration.
        </li>
        <li>
          RailEats does not guarantee delivery if the train arrives early,
          is excessively delayed, or skips the station.
        </li>
      </ul>

      <h2 className="text-xl font-semibold">5. Pricing & Payments</h2>
      <ul className="list-disc pl-6 space-y-1">
        <li>Prices are displayed before order confirmation.</li>
        <li>Additional charges, if any, are clearly mentioned.</li>
        <li>
          Payments can be made via online methods or Cash on Delivery
          (where available).
        </li>
        <li>
          RailEats reserves the right to change prices or payment modes
          without prior notice.
        </li>
      </ul>

      <h2 className="text-xl font-semibold">6. Cancellations & Refunds</h2>
      <p>
        Cancellation requests are governed by the Cancellation & Refund Policy.
        Orders once prepared may not be eligible for cancellation. Refunds, if
        applicable, are processed within the stated timeline to the original
        payment method.
      </p>

      <h2 className="text-xl font-semibold">
        7. Train Delays & Unforeseen Events
      </h2>
      <p>
        RailEats is not liable for service disruption due to train delays, early
        arrivals, route changes, insufficient station halt time, railway
        operational issues, or force majeure events.
      </p>

      <h2 className="text-xl font-semibold">8. Food Quality & Liability</h2>
      <p>
        Food quality, quantity, and preparation are the responsibility of partner
        restaurants. RailEats ensures onboarding of licensed and verified
        restaurants but is not liable for individual taste preferences or minor
        variations in food presentation.
      </p>

      <h2 className="text-xl font-semibold">9. User Conduct</h2>
      <ul className="list-disc pl-6 space-y-1">
        <li>Misuse the platform</li>
        <li>Place fraudulent or fake orders</li>
        <li>Harass delivery partners or restaurant staff</li>
        <li>
          Attempt to damage RailEats’ reputation through false claims
        </li>
      </ul>
      <p>
        Violation may result in account suspension or permanent restriction.
      </p>

      <h2 className="text-xl font-semibold">10. Intellectual Property</h2>
      <p>
        All content, logos, text, and platform design belong to RailEats.
        Unauthorized copying, reproduction, or misuse is prohibited.
      </p>

      <h2 className="text-xl font-semibold">11. Limitation of Liability</h2>
      <p>
        RailEats’ liability, if any, shall be limited to the order value paid by
        the user. RailEats shall not be liable for indirect, incidental, or
        consequential damages.
      </p>

      <h2 className="text-xl font-semibold">12. Modifications to Terms</h2>
      <p>
        RailEats reserves the right to update or modify these Terms at any time.
        Continued use of the platform constitutes acceptance of revised Terms.
      </p>

      <h2 className="text-xl font-semibold">
        13. Governing Law & Jurisdiction
      </h2>
      <p>
        These Terms shall be governed by and construed in accordance with the
        laws of India. Any disputes shall be subject to the jurisdiction of
        Indian courts.
      </p>

      <h2 className="text-xl font-semibold">14. Contact Information</h2>
      <p>
        For queries related to these Terms, please contact RailEats through the
        Support section available on the website or app.
      </p>

      <p className="pt-4 font-medium">
        By continuing to use RailEats, you agree to our Terms & Conditions,
        Privacy Policy, and Cancellation Policy.
      </p>
    </div>
  );
}

