// 🔴 IMPORTANT: force dynamic (Vercel build fix)
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { serviceClient } from "../../lib/supabaseServer";

/* ================= HELPERS ================= */

// HH:MM → minutes
function toMinutes(t?: string | null): number | null {
  if (!t) return null;
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

/* ================= API ================= */

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const restro = (url.searchParams.get("restro") || "").trim();
    const arrival = (url.searchParams.get("arrival") || "").trim(); // HH:MM

    if (!restro || !arrival) {
      return NextResponse.json(
        { ok: false, error: "missing_params" },
        { status: 400 }
      );
    }

    const arrivalMinutes = toMinutes(arrival);
    if (arrivalMinutes === null) {
      return NextResponse.json(
        { ok: false, error: "invalid_arrival_time" },
        { status: 400 }
      );
    }

    const supa = serviceClient;

    /* ================= FETCH MENU ================= */

    const { data, error } = await supa
      .from("RestroMenuItems")
      .select(`
        item_code,
        item_name,
        item_description,
        item_category,
        item_cuisine,
        start_time,
        end_time,
        base_price,
        selling_price,
        menu_type,
        menu_type_rank,
        status
      `)
      .eq("restro_code", restro)
      .eq("status", "ON")
      .order("menu_type_rank", { ascending: true })
      .order("base_price", { ascending: true });

    if (error) {
      console.error("MENU QUERY ERROR:", error);
      return NextResponse.json(
        { ok: false, error: "db_error" },
        { status: 500 }
      );
    }

    /* ================= TIME FILTER ================= */

    const items = (data || []).filter(item => {
      const startMin = toMinutes(item.start_time);
      const endMin = toMinutes(item.end_time);

      if (startMin == null || endMin == null) return false;

      // normal same-day window
      if (startMin <= endMin) {
        return arrivalMinutes >= startMin && arrivalMinutes <= endMin;
      }

      // overnight window (example: 22:00 → 02:00)
      return arrivalMinutes >= startMin || arrivalMinutes <= endMin;
    });

    return NextResponse.json({
      ok: true,
      restroCode: Number(restro),
      arrivalTime: arrival,
      itemCount: items.length,
      items,
    });

  } catch (e) {
    console.error("MENU API ERROR:", e);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}
