// app/orders/success/page.tsx
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Order Placed | RailEats",
};

export default function Page({ searchParams }: { searchParams: { orderId?: string } }) {
  const orderId = searchParams?.orderId || "—";
  return (
    <main className="max-w-3xl mx-auto px-3 sm:px-6 py-12">
      <div className="bg-white rounded shadow p-6 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Thank you! 🎉</h1>
        <p className="text-gray-700">
          Your order has been placed successfully.
        </p>
        <p className="mt-2">
          Order ID: <strong>{orderId}</strong>
        </p>

        <div className="mt-6 flex gap-3 justify-center">
          <a href="/orders" className="rounded border px-4 py-2">View Orders</a>
          <a href="/" className="rounded bg-green-600 text-white px-4 py-2">Go Home</a>
        </div>
      </div>
    </main>
  );
}
