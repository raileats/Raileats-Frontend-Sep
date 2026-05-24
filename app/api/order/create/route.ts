export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("RECEIVING FRONTEND BODY =>", body);

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
      Items, // Frontend mapped array list
    } = body;

    // 1. Validations
    if (!CustomerMobile) {
      return NextResponse.json(
        { ok: false, error: "mobile_required", message: "Mobile number is required" },
        { status: 400 }
      );
    }

    if (!Items || Items.length === 0) {
      return NextResponse.json(
        { ok: false, error: "cart_empty", message: "No items found in cart" },
        { status: 400 }
      );
    }

    // 2. Insert Main Order into "Orders" Table
    const { data: orderData, error: orderError } = await serviceClient
      .from("Orders")
      .insert({
        RestroCode: Number(RestroCode || 0),
        RestroName: RestroName || "Unknown Restaurant",
        StationCode: StationCode || "N/A",
        StationName: StationName || "N/A",
        DeliveryDate: DeliveryDate,
        DeliveryTime: DeliveryTime,
        TrainNumber: TrainNumber || "N/A", // Fixed compilation mismatch typo here
        Coach: Coach || null,
        Seat: Seat || null,
        CustomerName: CustomerName || "Guest",
        CustomerMobile: CustomerMobile,
        SubTotal: Number(SubTotal || 0),
        GSTAmount: Number(GSTAmount || 0),
        PlatformCharge: Number(PlatformCharge || 0),
        TotalAmount: Number(TotalAmount || 0),
        PaymentMode: PaymentMode || "COD",
        Status: Status || "Booked",
        JourneyPayload: body, // Backup raw snapshot reference
      })
      .select()
      .single();

    if (orderError) {
      console.error("SUPABASE MAIN ORDER INSERT ERROR =>", JSON.stringify(orderError, null, 2));
      return NextResponse.json(
        { ok: false, error: orderError.code, message: orderError.message },
        { status: 500 }
      );
    }

    // 3. Extract the Auto-generated OrderId
    const targetOrderId = orderData.OrderId;

    // 4. Map Frontend Items to Match Your Exact "OrderItems" Schema
    const orderItemsPayload = Items.map((item: any) => {
      const singleItemPrice = Number(item.price || item.selling_price || 0);
      const itemQty = Number(item.qty || item.quantity || 1);
      
      // Parse safe fallback value for item tracker bigint column type constraint
      const parsedItemCode = item.id ? parseInt(item.id.toString(), 10) : 0;

      return {
        OrderId: targetOrderId,
        RestroCode: Number(RestroCode || 0),
        ItemCode: isNaN(parsedItemCode) ? 0 : parsedItemCode, 
        ItemName: item.name || "Unknown Item",
        ItemDescription: item.description || null,
        ItemCategory: item.category || null,
        Cuisine: item.cuisine || null,
        MenuType: item.menu_type || null,
        BasePrice: singleItemPrice, 
        GSTPercent: Number(item.gst_percent || 5.00), 
        SellingPrice: singleItemPrice,
        Quantity: itemQty,
        LineTotal: singleItemPrice * itemQty, 
      };
    });

    // 5. Bulk Insert Rows into "OrderItems" Table
    const { error: itemsError } = await serviceClient
      .from("OrderItems")
      .insert(orderItemsPayload);

    if (itemsError) {
      console.error("SUPABASE ORDER ITEMS BULK INSERT ERROR =>", JSON.stringify(itemsError, null, 2));
      
      -- Rollback structure safeguard: Items fail ho jayein to partial main order delete kar do database consistency ke liye
      await serviceClient.from("Orders").delete().eq("OrderId", targetOrderId);

      return NextResponse.json(
        { ok: false, error: itemsError.code, message: "Transaction failed at items insertion block." },
        { status: 500 }
      );
    }

    // 6. Perfect Response Return
    return NextResponse.json({
      ok: true,
      orderId: targetOrderId,
      totalAmount: orderData.TotalAmount,
    });

  } catch (e: any) {
    console.error("CRITICAL EXCEPTION IN API ROUTE =>", e);
    return NextResponse.json(
      { ok: false, error: "server_crash", message: e.message },
      { status: 500 }
    );
  }
}
