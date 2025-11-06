// app/api/orders/route.ts
import { NextResponse } from "next/server";

type OrderItem = { id?: number; name: string; price: number; qty: number };
type Order = {
  id: string;
  items: OrderItem[];
  journey?: any;
  subtotal: number;
  gst?: number;
  platformCharge?: number;
  total: number;
  paymentMode: "COD" | "ONLINE";
  status?: string;
  createdAt: string;
};

// In-memory store for demo (replace with DB in production)
const ORDERS_STORE: Order[] = [
  {
    id: "RE-240915-001",
    items: [
      { name: "Veg Thali", qty: 1, price: 250 },
      { name: "Water 1L", qty: 1, price: 30 },
      { name: "Paneer Roll", qty: 1, price: 120 },
    ],
    journey: { station: "NDLS", coach: "B3", seat: "32", passenger: "A Kumar", mobile: "98xxxxxx12" },
    subtotal: 400,
    gst: 20,
    platformCharge: 0,
    total: 420,
    paymentMode: "ONLINE",
    status: "PAID",
    createdAt: "2025-09-04T20:15:00.000Z",
  },
  {
    id: "RE-240916-002",
    items: [
      { name: "Paneer Thali", qty: 1, price: 260 },
      { name: "Tea", qty: 1, price: 50 },
    ],
    journey: { station: "CNB", coach: "S2", seat: "18", passenger: "S Sharma", mobile: "99xxxxxx45" },
    subtotal: 310,
    gst: 0,
    platformCharge: 0,
    total: 310,
    paymentMode: "COD",
    status: "BOOKED",
    createdAt: "2025-09-05T09:10:00.000Z",
  },
];

// GET -> return sample orders
export async function GET() {
  // For demo return the in-memory orders
  return NextResponse.json(ORDERS_STORE);
}

// POST -> create order (used by review page)
// Expected payload (JSON):
// {
//   items: [{name,price,qty}],
//   journey: {...},
//   subtotal: number,
//   gst: number,
//   platformCharge: number,
//   total: number,
//   paymentMode: "COD" | "ONLINE"
// }
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // basic validation
    if (!body || !Array.isArray(body.items) || typeof body.total !== "number") {
      return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    }

    // create an order id
    const orderId = "RE-" + new Date().toISOString().replace(/[-:TZ.]/g, "").slice(2, 14); // e.g. RE-250106123456
    const now = new Date().toISOString();

    const order: Order = {
      id: orderId,
      items: body.items,
      journey: body.journey || null,
      subtotal: Number(body.subtotal || 0),
      gst: Number(body.gst || 0),
      platformCharge: Number(body.platformCharge || 0),
      total: Number(body.total),
      paymentMode: body.paymentMode === "ONLINE" ? "ONLINE" : "COD",
      status: body.paymentMode === "ONLINE" ? "PAYMENT_PENDING" : "BOOKED",
      createdAt: now,
    };

    // store (demo)
    ORDERS_STORE.unshift(order);

    // notify admin webhook if configured (non-blocking)
    const adminWebhook = process.env.ADMIN_WEBHOOK_URL;
    if (adminWebhook) {
      // fire and forget
      fetch(adminWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "order_created", order }),
      }).catch((err) => {
        // don't fail order creation if notify fails
        console.error("admin webhook notify failed:", err);
      });
    }

    // Response: order id and order data (lite)
    return NextResponse.json({ ok: true, orderId, order });
  } catch (err) {
    console.error("orders.post", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
