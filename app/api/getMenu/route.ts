import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

/* ================= HELPERS ================= */

function timeToMinutes(t: string) {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function formatTime(t: any) {
  if (!t) return "00:00";
  return String(t).slice(0, 5);
}

/* 🔥 STATUS NORMALIZER */
function isActive(status: any) {
  return String(status || "").trim().toUpperCase() === "ON";
}

/* ================= API ================= */

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const arrival = (searchParams.get("arrival") || "00:00").slice(0, 5);

    const arrivalMin = timeToMinutes(arrival);

    /* ================= READ FILE ================= */
    const filePath = path.join(process.cwd(), "public/data/dummyMenus.json");
    const jsonData = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(jsonData);

    /* ================= FIX STRUCTURE ================= */
    const menuItems = Array.isArray(data) ? data : data.items || [];

    /* ================= FILTER ================= */
    const filteredItems = menuItems.filter((item: any) => {

      /* 🔥 STATUS FILTER (FIX) */
      if (!isActive(item.status)) return false;

      const start = formatTime(item.start_time || item.startTime);
      const end = formatTime(item.end_time || item.endTime);

      const startMin = timeToMinutes(start);
      const endMin = timeToMinutes(end);

      /* 🔥 HARD BLOCK (UNCHANGED) */
      if (item.item_name === "Chicken Curry") return false;

      /* 🔥 TIME FILTER */
      if (arrivalMin < startMin || arrivalMin > endMin) return false;

      return true;
    });

    /* ================= RETURN ================= */
    return NextResponse.json({
      ok: true,
      items: filteredItems.map((item: any) => ({
        item_code: item.item_code,
        item_name: item.item_name,
        item_description: item.item_description,
        selling_price: item.selling_price,
        menu_type: item.menu_type,
        status: item.status,

        start_time: item.start_time || item.startTime,
        end_time: item.end_time || item.endTime,
      })),
    });

  } catch (err: any) {
    console.error("API ERROR:", err);

    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}
