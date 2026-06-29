import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Not Found (404)",
  description:
    "The page you are looking for could not be found. Continue your journey with RailEats and order fresh food in train from trusted restaurants across India.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function NotFound() {
  return (
    <main className="flex min-h-[80vh] items-center justify-center bg-white px-6 py-12">
      <div className="mx-auto max-w-2xl text-center">
        <div className="mb-6">
          <img
            src="/raileats-logo.png"
            alt="RailEats"
            className="mx-auto h-24 w-24 object-contain"
          />
        </div>

        <p className="text-7xl font-extrabold text-amber-500">404</p>

        <h1 className="mt-4 text-3xl font-bold text-slate-900">
          Page Not Found
        </h1>

        <p className="mt-4 text-base leading-7 text-slate-600">
          Sorry, the page you are looking for doesn't exist or may have been
          moved.
        </p>

        <p className="mt-2 text-base leading-7 text-slate-600">
          Continue exploring RailEats and order fresh food in train from trusted
          restaurants across India.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            href="/"
            className="rounded-lg bg-amber-500 px-6 py-3 font-semibold text-white transition hover:bg-amber-600"
          >
            Go to Home
          </Link>

          <Link
            href="/order-food-in-train"
            className="rounded-lg border border-amber-500 px-6 py-3 font-semibold text-amber-600 transition hover:bg-amber-50"
          >
            Order Food
          </Link>
        </div>

        <div className="mt-10 rounded-xl border border-slate-200 bg-slate-50 p-6 text-left">
          <h2 className="text-lg font-semibold text-slate-900">
            Looking for food delivery in train?
          </h2>

          <p className="mt-3 text-slate-600">
            Search using your Train Number, PNR Number or Railway Station to
            discover available restaurants and get fresh food delivered directly
            to your seat.
          </p>
        </div>
      </div>
    </main>
  );
}
