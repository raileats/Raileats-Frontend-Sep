"use client";

import { useParams, useRouter } from "next/navigation";

export default function OrderDetailsPage() {
  const router = useRouter();
  const params = useParams();

  const orderId = String(params.orderid || "");

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="sticky top-0 flex items-center justify-between border-b bg-white px-4 py-4 shadow">
        <button
          onClick={() => router.back()}
          className="h-10 w-10 rounded-full border text-xl font-bold"
        >
          ←
        </button>

        <h1 className="text-lg font-bold">Order Details</h1>

        <div className="w-10" />
      </div>

      <div className="mx-auto max-w-screen-sm p-4">
        <div className="rounded-2xl bg-white p-5 shadow">
          <h2 className="text-xl font-bold text-slate-900">
            Order #{orderId}
          </h2>

          <p className="mt-3 text-slate-600">
            Order details page is under development.
          </p>
        </div>
      </div>
    </main>
  );
}
