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

    // 🔥 NO TIME FILTER AT ALL
    const { data, error } = await supa
      .from("RestroMenuItems")
      .select(`
        item_code,
        item_name,
        item_description,
        menu_type,
        menu_type_rank,
        base_price,
        start_time,
        end_time,
        menu_status
      `)
      .eq("restro_code", restroCode)
      .order("menu_type_rank", { ascending: true })
      .order("base_price", { ascending: true });

    if (error) {
      console.error("MENU API ERROR:", error);
      return NextResponse.json(
        { ok: false, error: "db_error" },
        { status: 500 }
      );
    }

    // 🔥 IMPORTANT: DON'T FILTER menu_status STRICTLY
    const formatted = (data || []).map((item) => ({
      id: Number(item.item_code),

      item_name: item.item_name || "",
      item_description: item.item_description || "",

      // ✅ EXACT category pass
      item_category: (item.menu_type || "").trim(),

      base_price: Number(item.base_price || 0),

      // ✅ keep original time (DON'T SLICE WRONG)
      start_time: item.start_time || null,
      end_time: item.end_time || null,

      status: "ON",
    }));

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
