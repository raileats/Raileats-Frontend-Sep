import Link from "next/link";

export const metadata = {
  title: "About RailEats | Online Food Delivery in Train",
  description:
    "RailEats is an online food delivery platform for train passengers in India, helping passengers order restaurant meals at supported railway stations and get food delivered to their train seat.",
};

export default function About() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">About RailEats – Online Food Delivery in Train</h1>
      <p>RailEats is an online food delivery platform for train passengers in India. We help passengers order fresh restaurant food for supported journeys and receive meals at selected railway stations directly at their train seat.</p>
      <p>Passengers can search using their train number or PNR, select an available delivery station, browse restaurant menus and place an order for their journey.</p>

      <h2 className="text-xl font-semibold">What We Do</h2>
      <p>RailEats connects train passengers with restaurant partners near supported railway stations. The platform is designed to make ordering food during a train journey easier, with availability depending on the route, station, restaurant and journey timing.</p>

      <h2 className="text-xl font-semibold">How RailEats Works</h2>
      <ol className="list-decimal pl-6 space-y-1">
        <li>Enter your train number or PNR.</li>
        <li>Select the station where you want food delivery.</li>
        <li>Browse available menus from restaurant partners.</li>
        <li>Choose your payment option and place the order.</li>
        <li>Receive the food at your train seat at the supported delivery station.</li>
      </ol>

      <h2 className="text-xl font-semibold">Why Choose RailEats?</h2>
      <ul className="list-disc pl-6 space-y-1">
        <li>Restaurant food for supported train journeys</li>
        <li>Delivery at selected railway stations</li>
        <li>Train, PNR and station based ordering options</li>
        <li>Multiple food choices from available restaurants</li>
        <li>Customer support for order assistance</li>
      </ul>

      <h2 className="text-xl font-semibold">Coverage & Availability</h2>
      <p>RailEats service availability varies by railway station, train route, restaurant and timing. Browse supported <Link href="/stations" className="font-semibold text-orange-700">railway stations</Link> to explore available locations.</p>

      <h2 className="text-xl font-semibold">Explore Train Food</h2>
      <p>Looking for a restaurant, offer or ordering information? Explore our <Link href="/popular-restaurants-train-journey" className="font-semibold text-orange-700">popular train food restaurants</Link>, <Link href="/offers" className="font-semibold text-orange-700">train food offers</Link> and <Link href="/faq" className="font-semibold text-orange-700">train food FAQs</Link>.</p>

      <h2 className="text-xl font-semibold">Food Safety & Quality</h2>
      <p>Food safety and service quality are important parts of the RailEats experience. Restaurant availability and menu options depend on the partners active at each supported station.</p>

      <h2 className="text-xl font-semibold">Customer Support</h2>
      <p>For order queries, delivery updates or service-related concerns, visit our <Link href="/contact" className="font-semibold text-orange-700">RailEats customer support</Link> page.</p>

      <p className="font-medium">RailEats aims to make train journeys easier by connecting passengers with convenient restaurant food delivery at supported railway stations across India.</p>
    </div>
  );
}
