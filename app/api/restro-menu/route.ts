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

    // 🔥 SIMPLE QUERY (NO FILTER, NO ERROR)
    const { data, error } = await supa
      .from("RestroMenuItems")
      .select("*")
      .eq("restro_code", restroCode);

    if (error) {
      console.error("DB ERROR:", error.message);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    // 🔥 SAFE FORMAT
    const formatted = (data || []).map((item: any) => ({
      id: Number(item.item_code),

      item_name: item.item_name || "",
      item_description: item.item_description || "",

      item_category: item.menu_type || "",

      base_price: Number(item.base_price || 0),

      start_time: item.start_time
        ? String(item.start_time).slice(0, 5)
        : null,
      end_time: item.end_time
        ? String(item.end_time).slice(0, 5)
        : null,

      status: "ON",
    }));

    return NextResponse.json({
      ok: true,
      count: formatted.length,
      items: formatted,
    });

  } catch (e: any) {
    console.error("SERVER ERROR:", e);
    return NextResponse.json(
      { ok: false, error: e.message },
      { status: 500 }
    );
  }
}
