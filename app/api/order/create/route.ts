// 🔴 IMPORTANT: force dynamic (Vercel build fix)
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { serviceClient } from "../../../lib/supabaseServer";

/* ================= HELPERS ================= */

// simple readable order number
function generateOrderNumber() {
  const d = new Date();
  const y = d.getFullYear().toString().slice(-2);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `RE${y}${m}${day}${rand}`;
}

/* ================= API ================= */

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      pnr,
      trainNumber,
      trainName,

      restroCode,
      restroName,

      stationCode,
      stationName,
      arrivalDate,
      arrivalTime,

      customerName,
      customerMobile,

      items,
    } = body;

    // 🔐 Basic validation
    if (
      !restroCode ||
      !stationCode ||
      !arrivalDate ||
      !arrivalTime ||
      !items ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return NextResponse.json(
        { ok: false, error: "invalid_payload" },
        { status: 400 }
      );
    }

    // 🔐 Server-side total calculation
    const totalAmount = items.reduce((sum, i) => {
      return sum + Number(i.selling_price) * Number(i.qty || 1);
    }, 0);

    if (totalAmount <= 0) {
      return NextResponse.json(
        { ok: false, error: "invalid_total" },
        { status: 400 }
      );
    }

    const orderNumber = generateOrderNumber();

    const supa = serviceClient;

    const { error } = await supa.from("orders").insert({
      order_number: orderNumber,
      order_status: "PLACED",

      train_number: trainNumber || null,
      train_name: trainName || null,
      pnr: pnr || null,

      restro_code: restroCode,
      restro_name: restroName,

      station_code: stationCode,
      station_name: stationName,
      arrival_date: arrivalDate,
      arrival_time: arrivalTime,

      customer_name: customerName || "Guest",
      customer_mobile: customerMobile || "0000000000",

      total_amount: totalAmount,
      payment_mode: "COD",
      payment_status: "PENDING",

      items,
    });

    if (error) {
      console.error("ORDER INSERT ERROR:", error);
      return NextResponse.json(
        { ok: false, error: "db_insert_failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      orderId: orderNumber,
      totalAmount,
    });

  } catch (e) {
    console.error("ORDER CREATE API ERROR:", e);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}
