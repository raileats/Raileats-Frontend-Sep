// 🔴 IMPORTANT: force dynamic (Vercel build fix)
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabaseServer"; // ✅ FIXED PATH

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
      paymentMode,
      customerName,
      customerMobile,
      items,
    } = body;

    if (!restroCode || !stationCode || !arrivalDate || !arrivalTime) {
      return NextResponse.json(
        { ok: false, error: "missing_required_fields" },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { ok: false, error: "cart_empty" },
        { status: 400 }
      );
    }

    const totalAmount = items.reduce(
      (sum: number, i: any) =>
        sum + Number(i.selling_price) * Number(i.qty),
      0
    );

    const { data: order, error } = await serviceClient
      .from("Orders")
      .insert({
        pnr: pnr || null,
        train_number: trainNumber || null,
        train_name: trainName || null,
        restro_code: restroCode,
        restro_name: restroName,
        station_code: stationCode,
        station_name: stationName,
        arrival_date: arrivalDate,
        arrival_time: arrivalTime,
        payment_mode: paymentMode || "COD",
        customer_name: customerName || "Guest",
        customer_mobile: customerMobile || "",
        total_amount: totalAmount,
        current_status: "BOOKED",
      })
      .select()
      .single();

    if (error || !order) {
      console.error("ORDER CREATE ERROR:", error);
      return NextResponse.json(
        { ok: false, error: "order_create_failed" },
        { status: 500 }
      );
    }

    await serviceClient.from("OrderStatusHistory").insert({
      order_id: order.id,
      old_status: null,
      new_status: "BOOKED",
      changed_by: "system",
      remarks: "Order created",
    });

    return NextResponse.json({
      ok: true,
      orderId: order.id,
      totalAmount,
      status: "BOOKED",
    });

  } catch (e) {
    console.error("ORDER CREATE API ERROR:", e);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}
