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

/* 🔥 STATUS NORMALIZE */
function isActive(item: any) {
  const raw =
    item.status ??
    item.item_status ??
    item.is_active ??
    item.active;

  return String(raw || "").trim().toUpperCase() === "ON";
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

    const menuItems = Array.isArray(data) ? data : data.items || [];

    /* ================= DEBUG (TEMP) ================= */
    console.log(
      "STATUS CHECK:",
      menuItems.map((i: any) => ({
        name: i.item_name,
        status: i.status,
      }))
    );

    /* ================= FINAL FILTER ================= */
    const filteredItems = menuItems.filter((item: any) => {

      /* 🔥 STATUS FILTER (MAIN FIX) */
      if (!isActive(item)) return false;

      /* 🔥 TIME FILTER */
      const start = formatTime(item.start_time || item.startTime);
      const end = formatTime(item.end_time || item.endTime);

      const startMin = timeToMinutes(start);
      const endMin = timeToMinutes(end);

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
