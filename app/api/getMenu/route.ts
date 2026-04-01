import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

/* ================= HELPERS ================= */

function timeToMinutes(t: string) {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function formatTime(t: string) {
  if (!t) return "00:00";
  return t.slice(0, 5);
}

/* ================= API ================= */

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const arrival = searchParams.get("arrival") || "00:00";

  try {
    const filePath = path.join(process.cwd(), "public/data/dummyMenus.json");
    const jsonData = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(jsonData);

    const arrivalMin = timeToMinutes(arrival);

    /* ================= FILTER MENU ITEMS ================= */

    const menuItems = Array.isArray(data) ? data : data.items || [];

const filteredItems = menuItems.filter((item: any) => {
      const start = formatTime(item.start_time || "00:00");
      const end = formatTime(item.end_time || "23:59");

      const startMin = timeToMinutes(start);
      const endMin = timeToMinutes(end);

      // ✅ ONLY show if train time is inside item time range
      return arrivalMin >= startMin && arrivalMin <= endMin;
    });

    return NextResponse.json({
      ok: true,
      items: filteredItems,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}
