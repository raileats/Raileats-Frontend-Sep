export const metadata = {
  title: "FAQ | RailEats – Food Delivery in Train",
  description:
    "Find answers to common questions about ordering food in train with RailEats, including delivery, payments, cancellation, refunds, and support.",
};

export default function FAQPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">
        Frequently Asked Questions (FAQ) – RailEats
      </h1>

      <div className="space-y-4">
        <div>
          <h2 className="font-semibold">
            1. What is RailEats?
          </h2>
          <p>
            RailEats is an online food delivery platform that allows train
            passengers to order fresh, hygienic, and restaurant-quality food
            during their train journey. Food is delivered at selected railway
            stations directly to the passenger’s train seat.
          </p>
        </div>

        <div>
          <h2 className="font-semibold">
            2. How can I order food in train using RailEats?
          </h2>
          <p>You can place an order by following these steps:</p>
          <ul className="list-disc pl-6">
            <li>Enter your train number or PNR</li>
            <li>Select the station where you want food delivery</li>
            <li>Choose food from available partner restaurants</li>
            <li>Place your order using online payment or Cash on Delivery</li>
            <li>Receive food at your train seat at the selected station</li>
          </ul>
        </div>

        <div>
          <h2 className="font-semibold">
            3. At which stations does RailEats deliver food?
          </h2>
          <p>
            RailEats delivers food at selected railway stations across India.
            Availability depends on your train route, station halt time, and
            partner restaurant coverage.
          </p>
        </div>

        <div>
          <h2 className="font-semibold">
            4. Can I order food without a PNR?
          </h2>
          <p>
            Yes, in most cases you can order using your train number. However,
            providing a PNR helps ensure accurate delivery and better
            coordination.
          </p>
        </div>

        <div>
          <h2 className="font-semibold">
            5. Is the food safe and hygienic?
          </h2>
          <p>
            Yes. RailEats partners only with licensed and verified restaurants
            that follow standard hygiene and food safety practices.
          </p>
        </div>

        <div>
          <h2 className="font-semibold">
            6. What payment options are available?
          </h2>
          <ul className="list-disc pl-6">
            <li>Online payments (UPI, cards, wallets – as available)</li>
            <li>Cash on Delivery (COD) at selected stations</li>
          </ul>
          <p>
            Available payment options may vary by location and order value.
          </p>
        </div>

        <div>
          <h2 className="font-semibold">
            7. When should I place my food order?
          </h2>
          <p>
            We recommend placing your order well in advance before the train
            reaches the selected station. Orders are accepted based on station
            halt time and restaurant cut-off rules.
          </p>
        </div>

        <div>
          <h2 className="font-semibold">
            8. Can I cancel my order after placing it?
          </h2>
          <p>
            Cancellation depends on the order preparation status and cut-off
            time. Once food preparation has started, cancellation may not be
            possible.
          </p>
        </div>

        <div>
          <h2 className="font-semibold">
            9. Will I get a refund if my order is cancelled?
          </h2>
          <p>
            Refunds, if applicable, are processed according to our Cancellation
            & Refund Policy and credited to the original payment method.
          </p>
        </div>

        <div>
          <h2 className="font-semibold">
            10. What happens if my train is delayed?
          </h2>
          <p>
            RailEats attempts to coordinate delivery based on updated train
            timings. However, delivery depends on station halt time and
            restaurant availability.
          </p>
        </div>

        <div>
          <h2 className="font-semibold">
            11. What if my train skips the delivery station?
          </h2>
          <p>
            If the train does not stop at the selected delivery station or halt
            time is insufficient, delivery may not be possible and will be
            handled as per our policies.
          </p>
        </div>

        <div>
          <h2 className="font-semibold">
            12. How will I know when my food is delivered?
          </h2>
          <p>
            You will receive order updates via SMS or phone call from the
            delivery partner or restaurant.
          </p>
        </div>

        <div>
          <h2 className="font-semibold">
            13. Can I modify my order after placing it?
          </h2>
          <p>
            Order modifications are generally not allowed after confirmation, as
            restaurants start preparing food immediately.
          </p>
        </div>

        <div>
          <h2 className="font-semibold">
            14. What if I receive incorrect or damaged food?
          </h2>
          <p>
            Please contact RailEats customer support immediately. We will review
            the issue and assist you as per our policies.
          </p>
        </div>

        <div>
          <h2 className="font-semibold">
            15. How can I contact RailEats customer support?
          </h2>
          <p>
            You can contact RailEats customer support through the Help / Support
            section on our website or app, or via the contact details shared
            during order confirmation.
          </p>
        </div>
      </div>

      <p className="pt-4 text-sm text-gray-600">
        For more details, please refer to our Terms & Conditions, Privacy Policy,
        and Cancellation & Refund Policy.
      </p>
    </div>
  );
}

