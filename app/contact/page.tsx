"use client";

import { useRouter } from "next/navigation";

export default function ContactPage() {
  const router = useRouter();

  return (
    <main className="mx-auto w-full max-w-screen-sm p-4 space-y-4">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Contact Us</h1>

        <button
          onClick={() => router.back()}
          className="text-lg font-bold text-gray-600"
        >
          ✕
        </button>
      </div>

      {/* CARD */}
      <div className="rounded-xl border bg-white p-4 space-y-4 shadow">

        {/* EMAIL */}
        <div>
          <p className="text-sm text-gray-500">Email</p>
          <a
            href="mailto:railrats@gmail.com"
            className="text-lg font-medium text-yellow-700"
          >
            railrats@gmail.com
          </a>
        </div>

        {/* PHONE */}
        <div>
          <p className="text-sm text-gray-500">Call Center</p>
          <a
            href="tel:1111111111"
            className="text-lg font-medium text-yellow-700"
          >
            1111111111
          </a>
        </div>

        {/* WHATSAPP */}
        <div>
          <p className="text-sm text-gray-500">WhatsApp</p>
          <a
            href="https://wa.me/911111111111"
            target="_blank"
            className="text-lg font-medium text-green-600"
          >
            Chat on WhatsApp
          </a>
        </div>

        {/* SUPPORT HOURS */}
        <div>
          <p className="text-sm text-gray-500">Support Hours</p>
          <p className="text-lg font-medium">
            9:00 AM – 9:00 PM (All Days)
          </p>
        </div>

        {/* LOCATION */}
        <div>
          <p className="text-sm text-gray-500">Service Area</p>
          <p className="text-lg font-medium">
            Pan India Train Delivery 🚆
          </p>
        </div>

      </div>

      {/* FAQ BUTTON */}
      <button
        onClick={() => router.push("/faq")}
        className="w-full bg-yellow-600 text-white py-2 rounded"
      >
        View FAQ
      </button>

    </main>
  );
}
