export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { serviceClient } from "../../lib/supabaseServer";

/* ================= MENU TYPE DETECTOR ================= */

function detectMenuType(name: string) {
  const n = String(name || "").toLowerCase();

  if (n.includes("combo")) return "Combos";
  if (n.includes("thali")) return "Thalis";
  if (n.includes("biryani")) return "Biryani";
  if (n.includes("rice")) return "Rice";
  if (n.includes("roti")) return "Breads";
  if (n.includes("paratha")) return "Breads";
  if (n.includes("curry")) return "Curries";
  if (n.includes("pizza")) return "Pizza";
  if (n.includes("burger")) return "Burgers";
  if (n.includes("momos")) return "Momos";
  if (n.includes("roll")) return "Rolls";
  if (n.includes("snack")) return "Snacks";

  return "Meals";
}

/* ================= VEG / NONVEG DETECTOR ================= */

function detectVegType(
  item: any
) {
  const raw =
    String(
      item?.item_category ||
      item?.food_type ||
      item?.veg_type ||
      ""
    )
      .trim()
      .toLowerCase();

  if (
    raw.includes("non") ||
    raw.includes("egg") ||
    raw.includes("chicken") ||
    raw.includes("mutton")
  ) {
    return "Non-Veg";
  }

  const itemName = String(
    item?.item_name || ""
  ).toLowerCase();

  if (
    itemName.includes("chicken") ||
    itemName.includes("mutton") ||
    itemName.includes("fish") ||
    itemName.includes("egg")
  ) {
    return "Non-Veg";
  }

  return "Veg";
}

/* ================= API ================= */

export async function GET(req: Request) {

  try {

    const url = new URL(req.url);

    const restroCode =
      url.searchParams.get("restro");

    if (!restroCode) {
      return NextResponse.json(
        {
          ok: false,
          error: "missing_restro",
        },
        {
          status: 400,
        }
      );
    }

    const supa = serviceClient;

    /* ================= FETCH ================= */

    const { data, error } = await supa
      .from("RestroMenuItems")
      .select(`
        item_code,
        item_name,
        item_description,
        item_category,
        menu_type,
        base_price,
        start_time,
        end_time,
        status
      `)
      .eq("restro_code", restroCode);

    if (error) {

      console.error(
        "MENU API ERROR:",
        error
      );

      return NextResponse.json(
        {
          ok: false,
          error: error.message,
        },
        {
          status: 500,
        }
      );
    }

    /* ================= FILTER ================= */

    const filtered =
      (data || []).filter(
        (item: any) =>
          String(item.status || "")
            .trim()
            .toUpperCase() === "ON"
      );

    /* ================= FORMAT ================= */

    const formatted = filtered.map(
      (item: any) => {

        const vegType =
          detectVegType(item);

        const menuType =
          item?.menu_type &&
          item.menu_type !== "Meals"
            ? item.menu_type
            : detectMenuType(
                item?.item_name || ""
              );

        return {

          id: Number(
            item.item_code
          ),

          item_name:
            item.item_name || "",

          item_description:
            item.item_description || "",

          /* ✅ VEG / NONVEG */
          item_category: vegType,

          /* ✅ THALI / COMBO / RICE */
          menu_type: menuType,

          base_price: Number(
            item.base_price || 0
          ),

          start_time:
            item.start_time || null,

          end_time:
            item.end_time || null,

          status:
            item.status || "ON",
        };
      }
    );

    return NextResponse.json({
      ok: true,
      count: formatted.length,
      items: formatted,
    });

  } catch (e) {

    console.error(
      "RESTRO MENU API ERROR:",
      e
    );

    return NextResponse.json(
      {
        ok: false,
        error: "server_error",
      },
      {
        status: 500,
      }
    );
  }
}
