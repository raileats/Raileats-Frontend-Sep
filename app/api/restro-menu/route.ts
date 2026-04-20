export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { serviceClient } from "../../lib/supabaseServer";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const restroCode = url.searchParams.get("restro");

    if (!restroCode) {
      return NextResponse.json(
        { ok: false, error: "missing_restro" },
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
      .order("menu_type_rank", { ascending: true })
      .order("base_price", { ascending: true });

    if (error) {
      console.error("MENU API ERROR:", error);
      return NextResponse.json(
        { ok: false, error: "db_error" },
        { status: 500 }
      );
    }

    /* ✅ SAFE FORMAT FIX */
    const formatted = (data || []).map((item) => {
      return {
        id: Number(item.item_code),

        item_name: item.item_name || "",
        item_description: item.item_description || "",
        item_category: (item.menu_type || "").trim(),

        base_price: Number(item.base_price || 0),

        // 🔥 FIX: DO NOT slice blindly
        start_time: item.start_time
          ? item.start_time.toString().substring(0, 5)
          : null,

        end_time: item.end_time
          ? item.end_time.toString().substring(0, 5)
          : null,

        status: "ON",
      };
    });

    return NextResponse.json({
      ok: true,
      count: formatted.length,
      items: formatted,
    });

  } catch (e) {
    console.error("RESTRO MENU API ERROR:", e);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}
