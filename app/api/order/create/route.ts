export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("RECEIVING FRONTEND BODY =>", body);

    // Frontend se direct PascalCase mapping ko destructure kar rahe hain
    const {
      RestroCode,
      RestroName,
      StationCode,
      StationName,
      DeliveryDate,
      DeliveryTime,
      TrainNumber,
      Coach,
      Seat,
      CustomerName,
      CustomerMobile,
      SubTotal,
      GSTAmount,
      PlatformCharge,
      TotalAmount,
      PaymentMode,
      Status,
      JourneyPayload,
    } = body;

    // Validation
    if (!CustomerMobile) {
      return NextResponse.json(
        { ok: false, error: "customer_mobile_missing", message: "Mobile number required" },
        { status: 400 }
      );
    }

    // Double Check Calculations (Backend Safeguard)
    const backendSubTotal = Number(SubTotal || 0);
    const backendGst = Number(GSTAmount || Math.round(backendSubTotal * 0.05));
    const backendDelivery = Number(PlatformCharge || 20);
    const backendTotal = Number(TotalAmount || (backendSubTotal + backendGst + backendDelivery));

    // Inserting strictly matching your Supabase Table Constraints
    const { data, error } = await serviceClient
      .from("Orders")
      .insert({
        // OrderId column yahan pass nahi kar rahe, database default logic sequence trigger karega
        RestroCode: Number(RestroCode || 0),
        RestroName: RestroName || "Unknown Restaurant",
        StationCode: StationCode || "N/A",
        StationName: StationName || "N/A",
        DeliveryDate: DeliveryDate,
        DeliveryTime: DeliveryTime,
        TrainNumber: TrainNumber || "N/A",
        Coach: Coach || null,
        Seat: Seat || null,
        CustomerName: CustomerName || "Guest",
        CustomerMobile: CustomerMobile,
        SubTotal: backendSubTotal,
        GSTAmount: backendGst,
        PlatformCharge: backendDelivery,
        TotalAmount: backendTotal,
        PaymentMode: PaymentMode || "COD",
        Status: Status || "Booked", // Sync with initial booked stage logging trigger
        JourneyPayload: JourneyPayload || {}, // Holds custom nested structured array item details safely
      })
      .select()
      .single();

    if (error) {
      console.error("SUPABASE INTERACTION ERROR =>", JSON.stringify(error, null, 2));
      return NextResponse.json(
        { ok: false, error: error.code, message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      orderId: data.OrderId, // Supabase ka return kiya hua default database ID mil jayega
      totalAmount: backendTotal,
    });

  } catch (e: any) {
    console.error("CRITICAL ROUTE SERVER ERROR =>", e);
    return NextResponse.json(
      { ok: false, error: "server_crash", message: e.message },
      { status: 500 }
    );
  }
}
