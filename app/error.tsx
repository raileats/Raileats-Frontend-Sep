"use client";

import { useEffect } from "react";
import Link from "next/link";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("RailEats Error:", error);
  }, [error]);

  return (
    <main className="flex min-h-[80vh] items-center justify-center bg-white px-6 py-12">
      <div className="mx-auto max-w-2xl text-center">
        <img
          src="/raileats-logo.png"
          alt="RailEats"
          className="mx-auto h-24 w-24 object-contain"
        />

        <h1 className="mt-6 text-3xl font-bold text-slate-900">
          Something went wrong
        </h1>

        <p className="mt-4 text-slate-600 leading-7">
          We're sorry, something unexpected happened while loading this page.
        </p>

        <p className="mt-2 text-slate-600 leading-7">
          Please try again or continue browsing RailEats.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <button
            onClick={() => reset()}
            className="rounded-lg bg-amber-500 px-6 py-3 font-semibold text-white transition hover:bg-amber-600"
          >
            Try Again
          </button>

          <Link
            href="/"
            className="rounded-lg border border-amber-500 px-6 py-3 font-semibold text-amber-600 transition hover:bg-amber-50"
          >
            Go to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
