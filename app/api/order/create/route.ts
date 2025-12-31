// 🔴 IMPORTANT: force dynamic (Vercel build fix)
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabaseServer";

/* ================= HELPERS ================= */

function generateOrderId() {
  const rnd = Math.floor(100000 + Math.random() * 900000);
  return `RE-${rnd}`;
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

    if (
      !restroCode ||
      !stationCode ||
      !arrivalDate ||
      !arrivalTime ||
      !items?.length
    ) {
      return NextResponse.json(
        { ok: false, error: "invalid_payload" },
        { status: 400 }
      );
    }

    const orderId = generateOrderId();

    const totalAmount = items.reduce(
      (sum: number, i: any) => sum + i.selling_price * i.qty,
      0
    );

    const supa = serviceClient;

    /* ================= INSERT ORDER ================= */

    const { data: order, error: orderErr } = await supa
      .from("orders")
      .insert({
        order_id: orderId,
        pnr,
        train_number: trainNumber,
        train_name: trainName,
        restro_code: restroCode,
        restro_name: restroName,
        station_code: stationCode,
        station_name: stationName,
        arrival_date: arrivalDate,
        arrival_time: arrivalTime,
        customer_name: customerName,
        customer_mobile: customerMobile,
        payment_mode: "COD",
        order_status: "PLACED",
        total_amount: totalAmount,
      })
      .select()
      .single();

    if (orderErr || !order) {
      console.error("ORDER INSERT ERROR:", orderErr);
      return NextResponse.json(
        { ok: false, error: "order_create_failed" },
        { status: 500 }
      );
    }

    /* ================= INSERT ORDER ITEMS ================= */

    const orderItems = items.map((i: any) => ({
      order_id: order.id,
      item_code: i.item_code,
      item_name: i.item_name,
      qty: i.qty,
      price: i.selling_price,
      total: i.selling_price * i.qty,
    }));

    const { error: itemsErr } = await supa
      .from("order_items")
      .insert(orderItems);

    if (itemsErr) {
      console.error("ITEM INSERT ERROR:", itemsErr);
      return NextResponse.json(
        { ok: false, error: "order_items_failed" },
        { status: 500 }
      );
    }

    /* ================= SUCCESS ================= */

    return NextResponse.json({
      ok: true,
      orderId,
      totalAmount,
      message: "Order placed successfully",
    });

  } catch (e) {
    console.error("ORDER CREATE API ERROR:", e);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}
