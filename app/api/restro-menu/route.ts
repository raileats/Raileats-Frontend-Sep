// 🔴 IMPORTANT: force dynamic (Vercel build fix)
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { serviceClient } from "../../lib/supabaseServer";

/* ================= HELPERS ================= */

function normalize(v: any) {
  return String(v ?? "").trim().toUpperCase();
}

/* ================= API ================= */

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const restroCode = (url.searchParams.get("restroCode") || "").trim();
    const arrivalTime = (url.searchParams.get("arrivalTime") || "").trim(); // HH:mm:ss

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
        item_category,
        item_cuisine,
        menu_type,
        menu_type_rank,
        start_time,
        end_time,
        base_price,
        gst_percent,
        selling_price
      `)
      .eq("restro_code", restroCode)
      .eq("status", "ON")
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
      restroCode,
      arrivalTime,
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
