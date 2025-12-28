import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cancellation & Refund Policy | RailEats",
  description:
    "Read RailEats Cancellation & Refund Policy including cut-off time rules, refunds, failed deliveries, train delays, and refund timelines.",
};

export default function CancellationRefundPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">
        Cancellation & Refund Policy – RailEats
      </h1>

      <p className="text-sm text-gray-600">
        Last Updated: 01-01-2026
      </p>

      <p>
        This policy outlines the rules for order cancellation, refunds, and
        service limitations applicable to orders placed on the RailEats
        platform.
      </p>

      <h2 className="text-xl font-semibold">
        1. Understanding Cut-Off Time
      </h2>
      <p>
        Cut-Off Time is the last time before which an order can be cancelled. It
        is calculated based on delivery station, train arrival time, halt
        duration, and restaurant preparation time.
      </p>
      <p>
        The cut-off time is clearly shown before order confirmation. Once the
        cut-off time passes, food preparation begins and the order becomes
        non-cancellable.
      </p>

      <h2 className="text-xl font-semibold">
        2. Customer-Initiated Cancellations
      </h2>
      <h3 className="font-medium">Before Cut-Off Time</h3>
      <ul className="list-disc pl-6">
        <li>Orders cancelled before cut-off time are eligible for a full refund.</li>
        <li>Refund is processed to the original payment method.</li>
      </ul>

      <h3 className="font-medium mt-2">After Cut-Off Time</h3>
      <ul className="list-disc pl-6">
        <li>Orders cancelled after cut-off time are not eligible for a refund.</li>
        <li>Food preparation has already started.</li>
      </ul>

      <h2 className="text-xl font-semibold">
        3. RailEats-Initiated Cancellations
      </h2>
      <p>RailEats may cancel an order due to:</p>
      <ul className="list-disc pl-6">
        <li>Restaurant unavailability</li>
        <li>Operational or technical issues</li>
        <li>Train not stopping at the selected station</li>
        <li>Insufficient halt time</li>
        <li>Force majeure events</li>
      </ul>
      <p>
        In such cases, a full refund will be processed provided food preparation
        has not started.
      </p>

      <h2 className="text-xl font-semibold">
        4. Train Delays, Early Arrivals & Route Changes
      </h2>
      <p>
        RailEats attempts best-effort delivery based on live train updates.
        Delivery is not guaranteed if the train arrives too early, is
        excessively delayed, or the station is skipped.
      </p>
      <p>
        Refund eligibility depends on preparation status at the time of
        disruption.
      </p>

      <h2 className="text-xl font-semibold">
        5. Failed Deliveries & No-Show Cases
      </h2>
      <p>No refund will be issued if:</p>
      <ul className="list-disc pl-6">
        <li>Passenger is unreachable at delivery time</li>
        <li>Incorrect contact or coach details are provided</li>
        <li>Passenger is not present at seat during delivery</li>
      </ul>

      <h2 className="text-xl font-semibold">
        6. Incorrect, Missing, or Damaged Food
      </h2>
      <p>
        Issues must be reported immediately upon delivery. RailEats will verify
        the complaint and resolution may include a partial or full refund,
        depending on the case.
      </p>

      <h2 className="text-xl font-semibold">
        7. Refund Timelines
      </h2>
      <ul className="list-disc pl-6">
        <li>Online payments: 5–7 working days</li>
        <li>Timelines depend on banks and payment gateways</li>
        <li>COD refunds (if applicable) are processed via alternate methods</li>
      </ul>

      <h2 className="text-xl font-semibold">
        8. No Cash Refunds
      </h2>
      <p>
        RailEats does not offer cash refunds. All refunds are processed digitally
        for security and audit purposes.
      </p>

      <h2 className="text-xl font-semibold">
        9. Abuse & Misuse Prevention
      </h2>
      <p>
        RailEats reserves the right to decline refunds or restrict accounts in
        cases of repeated cancellations, misuse, or fraudulent behavior.
      </p>

      <h2 className="text-xl font-semibold">
        10. Policy Changes
      </h2>
      <p>
        RailEats may revise this policy from time to time. Updated policies will
        be effective immediately upon being published on the platform.
      </p>

      <h2 className="text-xl font-semibold">
        11. Contact Support
      </h2>
      <p>
        For cancellation or refund assistance, please contact RailEats through
        the Help / Support section available on the website or app.
      </p>

      <p className="pt-4 font-medium">
        Orders can be cancelled only before the cut-off time shown during
        checkout. Once food preparation begins, cancellation and refunds are not
        allowed. Refunds, if applicable, are processed within 5–7 working days.
      </p>
    </div>
  );
}

