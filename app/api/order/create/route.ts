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
      Items, 
    } = body;

    // 1. Strict Validations
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

    // Safety fallback for RestroCode to prevent strict constraint crashes
    const validRestroCode = RestroCode ? Number(RestroCode) : null;
    if (!validRestroCode) {
      return NextResponse.json(
        { ok: false, error: "invalid_restro_code", message: "Valid Restaurant Code is required" },
        { status: 400 }
      );
    }

    // 2. Insert Main Order into "Orders" Table
    const { data: orderData, error: orderError } = await serviceClient
      .from("Orders")
      .insert({
        RestroCode: validRestroCode,
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
        SubTotal: Number(SubTotal || 0),
        GSTAmount: Number(GSTAmount || 0),
        PlatformCharge: Number(PlatformCharge || 0),
        TotalAmount: Number(TotalAmount || 0),
        PaymentMode: PaymentMode || "COD",
        Status: Status || "Booked",
        JourneyPayload: body, 
      })
      .select()
      .single();

    if (orderError) {
      console.error("SUPABASE MAIN ORDER INSERT ERROR =>", orderError.message);
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
      
      // Fast safe standard base-10 numerical parsing for ItemCode
      const parsedItemCode = item.id ? parseInt(item.id.toString(), 10) : 0;

      return {
        OrderId: targetOrderId,
        RestroCode: validRestroCode,
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
      console.error("SUPABASE ORDER ITEMS BULK INSERT ERROR =>", itemsError.message);
      
      // Safe Rollback Transaction logic
      await serviceClient.from("Orders").delete().eq("OrderId", targetOrderId);

      return NextResponse.json(
        { ok: false, error: itemsError.code, message: "Transaction failed at items insertion block." },
        { status: 500 }
      );
    }

    // 6. Perfect Clean Response Return
    return NextResponse.json({
      ok: true,
      orderId: targetOrderId,
      totalAmount: orderData.TotalAmount,
    });

  } catch (e: any) {
    console.error("CRITICAL EXCEPTION IN API ROUTE =>", e.message);
    return NextResponse.json(
      { ok: false, error: "server_crash", message: e.message },
      { status: 500 }
    );
  }
}
