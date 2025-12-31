// 🔴 IMPORTANT: force dynamic (Vercel build fix)
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { serviceClient } from "../../../lib/supabaseServer";

/* ================= API ================= */

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    // Optional filters
    const status = url.searchParams.get("status"); // PLACED, ACCEPTED, etc
    const date = url.searchParams.get("date");     // YYYY-MM-DD
    const restroCode = url.searchParams.get("restroCode");

    let query = serviceClient
      .from("orders")
      .select(`
        id,
        order_number,
        order_status,
        total_amount,
        payment_mode,
        payment_status,

        train_number,
        train_name,
        pnr,

        restro_code,
        restro_name,
        station_code,
        station_name,
        arrival_date,
        arrival_time,

        customer_name,
        customer_mobile,

        created_at
      `)
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("order_status", status);
    }

    if (date) {
      query = query.eq("arrival_date", date);
    }

    if (restroCode) {
      query = query.eq("restro_code", Number(restroCode));
    }

    const { data, error } = await query;

    if (error) {
      console.error("ADMIN ORDERS FETCH ERROR:", error);
      return NextResponse.json(
        { ok: false, error: "db_fetch_failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      count: data?.length || 0,
      orders: data || [],
    });

  } catch (e) {
    console.error("ADMIN ORDERS API ERROR:", e);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}
