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
        start_time,
        end_time
      `)
      .eq("restro_code", restroCode)
      .eq("menu_status", 1)
      .order("menu_type_rank", { ascending: true })
      .order("base_price", { ascending: true });

    // 🔥 FIX: DB error hone par bhi empty na bhejo silently
    if (error) {
      console.error("MENU API ERROR:", error);

      return NextResponse.json({
        ok: true,   // ⚠️ important
        items: [],  // empty but not crash
      });
    }

    const formatted = (data || []).map((item) => ({
      id: Number(item.item_code),
      item_name: item.item_name || "",
      item_description: item.item_description || "",
      item_category: item.menu_type || "",
      base_price: Number(item.base_price || 0),
      start_time: item.start_time,
      end_time: item.end_time,
      status: "ON",
    }));

    return NextResponse.json({
      ok: true,
      items: formatted,
    });

  } catch (e) {
    console.error("RESTRO MENU API ERROR:", e);

    // 🔥 NEVER BREAK FRONTEND
    return NextResponse.json({
      ok: true,
      items: [],
    });
  }
}
