// app/orders/[orderId]/page.tsx
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type OrderItem = {
  item_id: number | string;
  name: string;
  qty: number;
  base_price: number;
  line_total?: number | null;
};

type Order = {
  id: string;
  created_at?: string;
  status?: string; // e.g. PLACED, CONFIRMED, PREPARING, DISPATCHED, DELIVERED, CANCELLED
  restro_code?: string | number;
  pricing?: {
    subtotal: number;
    delivery_fee?: number;
    total: number;
    currency?: string;
  };
  customer?: {
    full_name?: string;
    phone?: string;
    pnr?: string | null;
  };
  delivery?: {
    train_no?: string;
    coach?: string;
    seat?: string;
    note?: string | null;
  };
  items?: OrderItem[];
};

const ADMIN_BASE =
  process.env.NEXT_PUBLIC_ADMIN_APP_URL || "https://admin.raileats.in";

export async function generateMetadata({ params }: { params: { orderId: string } }): Promise<Metadata> {
  return {
    title: `Order ${params.orderId} | RailEats`,
  };
}

async function fetchOrder(orderId: string): Promise<Order | null> {
  // Supported shapes:
  // 1) { ok:true, order:{...} }  2) { data:{...} }  3) {...order}
  const url = `${ADMIN_BASE.replace(/\/$/, "")}/api/orders/${encodeURIComponent(orderId)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  const j = await res.json().catch(() => ({}));
  const order: Order =
    j?.order ??
    j?.data ??
    (j?.id || j?.pricing || j?.items ? j : null);
  return (order as Order) || null;
}

function money(n?: number, currency = "INR") {
  if (typeof n !== "number") return "—";
  const v = n.toFixed(2).replace(/\.00$/, "");
  return (currency === "INR" ? "₹" : "") + v;
}

export default async function Page({ params }: { params: { orderId: string } }) {
  const order = await fetchOrder(params.orderId);

  if (!order) {
    return (
      <main className="max-w-3xl mx-auto px-3 sm:px-6 py-10">
        <div className="bg-white rounded shadow p-6">
          <h1 className="text-xl font-semibold">Order not found</h1>
          <p className="mt-2 text-sm text-gray-600">
            We couldn’t find details for Order ID <strong>{params.orderId}</strong>.
          </p>
          <div className="mt-4 flex gap-2">
            <a href="/orders/track" className="rounded border px-3 py-2 text-sm">Find my order</a>
            <a href="/" className="rounded bg-green-600 text-white px-3 py-2 text-sm">Home</a>
          </div>
        </div>
      </main>
    );
  }

  const lines = order.items ?? [];
  const pr = order.pricing ?? { subtotal: 0, delivery_fee: 0, total: 0, currency: "INR" };

  return (
    <main className="max-w-4xl mx-auto px-3 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl sm:text-3xl font-bold leading-tight">
          Order #{order.id}
        </h1>
        <a href="/orders" className="text-sm rounded border px-3 py-1.5">My Orders</a>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Summary */}
        <section className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded shadow p-4">
            <div className="text-sm text-gray-500">
              Placed: {order.created_at ? new Date(order.created_at).toLocaleString() : "—"}
            </div>
            <div className="mt-1">
              <span className="inline-block rounded bg-blue-50 text-blue-700 px-2 py-1 text-sm">
                Status: {order.status || "PLACED"}
              </span>
            </div>

            <div className="mt-4">
              <h2 className="font-semibold mb-2">Items</h2>
              {lines.length === 0 ? (
                <p className="text-sm text-gray-600">No items recorded.</p>
              ) : (
                <div className="space-y-2">
                  {lines.map((ln) => {
                    const rowTotal = ln.line_total ?? ln.qty * ln.base_price;
                    return (
                      <div key={`${ln.item_id}`} className="flex items-center justify-between">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{ln.name}</div>
                          <div className="text-xs text-gray-500">
                            {money(ln.base_price, pr.currency)} × {ln.qty}
                          </div>
                        </div>
                        <div className="w-24 text-right font-medium">{money(rowTotal, pr.currency)}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Delivery / Passenger */}
          <div className="bg-white rounded shadow p-4">
            <h2 className="font-semibold mb-2">Delivery in Train</h2>
            <div className="grid sm:grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-gray-500">Train</div>
                <div className="font-medium">{order.delivery?.train_no || "—"}</div>
              </div>
              <div>
                <div className="text-gray-500">Coach</div>
                <div className="font-medium">{order.delivery?.coach || "—"}</div>
              </div>
              <div>
                <div className="text-gray-500">Seat</div>
                <div className="font-medium">{order.delivery?.seat || "—"}</div>
              </div>
            </div>
            {order.delivery?.note && (
              <p className="mt-2 text-sm text-gray-600">
                <span className="text-gray-500">Note:</span> {order.delivery.note}
              </p>
            )}

            <h2 className="font-semibold mt-4 mb-2">Passenger</h2>
            <div className="grid sm:grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-gray-500">Name</div>
                <div className="font-medium">{order.customer?.full_name || "—"}</div>
              </div>
              <div>
                <div className="text-gray-500">Phone</div>
                <div className="font-medium">{order.customer?.phone || "—"}</div>
              </div>
              <div>
                <div className="text-gray-500">PNR</div>
                <div className="font-medium">{order.customer?.pnr || "—"}</div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <aside>
          <div className="bg-white rounded shadow p-4">
            <h2 className="font-semibold mb-3">Summary</h2>
            <div className="space-y-1 text-sm">
              <div className="flex items-center justify-between">
                <span>Subtotal</span>
                <span>{money(pr.subtotal, pr.currency)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Delivery Fee</span>
                <span>{pr.delivery_fee ? money(pr.delivery_fee, pr.currency) : "FREE"}</span>
              </div>
              <div className="flex items-center justify-between font-semibold text-base pt-1 border-t">
                <span>Total</span>
                <span>{money(pr.total, pr.currency)}</span>
              </div>
            </div>

            <div className="mt-4">
              <a href="/" className="w-full inline-block text-center rounded bg-green-600 text-white py-2">
                Order more food
              </a>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
