// 🔴 IMPORTANT
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabaseServer";

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

    console.log("ORDER BODY =>", body);

    // ✅ VALIDATION
    if (!restroCode || !stationCode) {
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

    // ✅ SAFE TOTAL CALCULATION
    const totalAmount = items.reduce((sum: number, i: any) => {
      const price = Number(i.selling_price || i.price || 0);
      const qty = Number(i.qty || 0);
      return sum + price * qty;
    }, 0);

    console.log("TOTAL =>", totalAmount);

    if (!totalAmount || isNaN(totalAmount)) {
      return NextResponse.json(
        { ok: false, error: "invalid_total" },
        { status: 400 }
      );
    }

    // ✅ INSERT ORDER
    const { data: order, error } = await serviceClient
      .from("Orders")
      .insert({
        pnr: pnr || null,
        train_number: trainNumber || null,
        train_name: trainName || null,

        restro_code: String(restroCode),
        restro_name: restroName || "Restaurant",

        station_code: stationCode || "NA",
        station_name: stationName || "Station",

        arrival_date: arrivalDate || null,
        arrival_time: arrivalTime || null,

        payment_mode: paymentMode || "COD",

        customer_name: customerName || "Guest",
        customer_mobile: customerMobile || "",

        total_amount: totalAmount,

        current_status: "BOOKED",
      })
      .select()
      .single();

    if (error || !order) {
      console.error("SUPABASE ERROR =>", error);
      return NextResponse.json(
        { ok: false, error: "order_create_failed" },
        { status: 500 }
      );
    }

    // ✅ STATUS HISTORY
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
    });

  } catch (e) {
    console.error("SERVER ERROR =>", e);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}
