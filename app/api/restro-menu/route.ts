// 🔴 IMPORTANT: force dynamic
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { serviceClient } from "../../lib/supabaseServer";

/* ================= API ================= */

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const restroCode = url.searchParams.get("restro");
    const arrivalTime = url.searchParams.get("arrivalTime"); // HH:mm:ss

    if (!restroCode || !arrivalTime) {
      return NextResponse.json(
        { ok: false, error: "missing_params" },
        { status: 400 }
      );
    }

    const supa = serviceClient;

    const { data, error } = await supa
      .from("RestroMenuItems")
      .select(`
        item_code,
        item_name,
        item_description,
        menu_type,
        menu_type_rank,
        base_price,
        gst_percent,
        selling_price,
        start_time,
        end_time
      `)
      .eq("restro_code", restroCode)
      .eq("menu_status", 1)
      .lte("start_time", arrivalTime)
      .gte("end_time", arrivalTime)
      .order("menu_type_rank", { ascending: true })
      .order("base_price", { ascending: true });

    if (error) {
      console.error("MENU API ERROR:", error);
      return NextResponse.json(
        { ok: false, error: "db_error" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      count: data?.length || 0,
      items: data || [],
    });

  } catch (e) {
    console.error("RESTRO MENU API ERROR:", e);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}
