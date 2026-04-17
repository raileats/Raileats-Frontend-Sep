export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabaseServer";

function generateOrderId() {
  const now = new Date();
  const ts =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0") +
    String(now.getHours()).padStart(2, "0") +
    String(now.getMinutes()).padStart(2, "0") +
    String(now.getSeconds()).padStart(2, "0");

  return `RE-${ts}-${Math.floor(Math.random() * 1000)}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("BODY =>", body);

    const {
      pnr,
      trainNumber,
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

    if (!items || !items.length) {
      return NextResponse.json(
        { ok: false, error: "cart_empty" },
        { status: 400 }
      );
    }

    // ✅ CALCULATIONS
    const subTotal = items.reduce(
      (s: number, i: any) =>
        s + Number(i.selling_price || i.price || 0) * Number(i.qty || 0),
      0
    );

    const gst = Math.round(subTotal * 0.05);
    const delivery = 20;
    const total = subTotal + gst + delivery;

    // ✅ JOURNEY PAYLOAD (IMPORTANT)
    const journeyPayload = {
      pnr: pnr || "0000000000",
      name: customerName,
      seat: body.seat,
      coach: body.coach,
      mobile: customerMobile,
      trainNo: trainNumber,
      deliveryDate: arrivalDate,
      deliveryTime: arrivalTime,
    };

    const { data, error } = await serviceClient
      .from("Orders")
      .insert({
        OrderId: generateOrderId(),

        RestroCode: Number(restroCode),
        RestroName: restroName,

        StationCode: stationCode,
        StationName: stationName || stationCode,

        DeliveryDate: arrivalDate,
        DeliveryTime: arrivalTime,

        TrainNumber: trainNumber,

        Coach: body.coach,
        Seat: body.seat,

        CustomerName: customerName,
        CustomerMobile: customerMobile,

        SubTotal: subTotal,
        GSTAmount: gst,
        PlatformCharge: delivery,
        TotalAmount: total,

        PaymentMode: paymentMode || "COD",
        Status: "Booked",

        JourneyPayload: journeyPayload,
      })
      .select()
      .single();

    if (error) {
    console.error("SUPABASE FULL ERROR =>", JSON.stringify(error, null, 2));
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      orderId: data.OrderId,
      totalAmount: total,
    });

  } catch (e: any) {
    console.error("SERVER ERROR =>", e);
    return NextResponse.json(
      { ok: false, error: e.message },
      { status: 500 }
    );
  }
}
