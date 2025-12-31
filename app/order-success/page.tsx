"use client";

import { useSearchParams, useRouter } from "next/navigation";

/* ================= PAGE ================= */

export default function OrderSuccessPage() {
  const params = useSearchParams();
  const router = useRouter();

  const orderId = params.get("orderId");
  const amount = params.get("amount");

  if (!orderId) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-xl font-bold text-red-600">
          Invalid Order
        </h1>
        <button
          className="mt-4 px-4 py-2 bg-green-600 text-white rounded"
          onClick={() => router.push("/")}
        >
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-6 rounded-lg shadow-md max-w-md w-full text-center space-y-4">
        <div className="text-green-600 text-4xl">✅</div>

        <h1 className="text-2xl font-bold">
          Order Placed Successfully
        </h1>

        <div className="text-sm text-gray-600">
          Thank you for your order. Your food will be delivered
          at your seat.
        </div>

        <div className="border rounded p-3 text-left text-sm bg-gray-50 space-y-1">
          <div>
            <b>Order ID:</b> {orderId}
          </div>
          {amount && (
            <div>
              <b>Total Amount:</b> ₹{amount}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <button
            onClick={() => router.push("/")}
            className="w-full bg-green-600 text-white py-2 rounded"
          >
            Order More Food
          </button>

          <button
            onClick={() => router.push("/")}
            className="w-full border border-gray-300 py-2 rounded"
          >
            Go to Home
          </button>
        </div>
      </div>
    </div>
  );
}
