import { NextResponse } from "next/server";
import { serviceClient } from "../../../lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type OrderRow = {
  OrderId?: string | null;
  RestroCode?: number | string | null;
  RestroName?: string | null;
  StationCode?: string | null;
  StationName?: string | null;
  DeliveryDate?: string | null;
  DeliveryTime?: string | null;
  TrainNumber?: string | null;
  Coach?: string | null;
  Seat?: string | null;
  CustomerName?: string | null;
  CustomerMobile?: string | null;
  TotalAmount?: number | string | null;
  PaymentMode?: string | null;
  Status?: string | null;
  created_at?: string | null;
  CreatedAt?: string | null;
};

type RestroRow = {
  RestroCode?: number | string | null;
  RestroDisplayPhoto?: string | null;
  DisplayImage?: string | null;
  Image?: string | null;
};

function normalizeMobile(value: string | null) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

function normalizeRestroImage(value: unknown) {
  const image = String(value ?? "").trim();

  if (!image) return "/raileats-logo.png";

  if (image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }

  const clean = image.replace(/^\/+/, "");

  return `https://ygisiztmuzwxpnvhwrmr.supabase.co/storage/v1/object/public/RestroDisplayPhoto/${clean}`;
}

function getRestroFileName(restroCode: unknown) {
  const code = String(restroCode ?? "").trim();
  return code ? `${code}.webp` : "";
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const mobile = normalizeMobile(url.searchParams.get("mobile"));

    if (!mobile) {
      return NextResponse.json(
        { ok: false, error: "mobile_required", orders: [] },
        { status: 400 },
      );
    }

    const { data, error } = await serviceClient
      .from("Orders")
      .select(
        [
          "OrderId",
          "RestroCode",
          "RestroName",
          "StationCode",
          "StationName",
          "DeliveryDate",
          "DeliveryTime",
          "TrainNumber",
          "Coach",
          "Seat",
          "CustomerName",
          "CustomerMobile",
          "TotalAmount",
          "PaymentMode",
          "Status",
          "created_at",
          "CreatedAt",
        ].join(","),
      )
      .or(`CustomerMobile.eq.${mobile},CustomerMobile.eq.+91${mobile}`)
      .order("DeliveryDate", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("PROFILE ORDERS FETCH ERROR:", error);
      return NextResponse.json(
        { ok: false, error: "db_fetch_failed", orders: [] },
        { status: 500 },
      );
    }

    const rows = Array.isArray(data) ? (data as OrderRow[]) : [];
    const restroCodes = Array.from(
      new Set(
        rows
          .map((order) => Number(order.RestroCode))
          .filter((code) => Number.isFinite(code) && code > 0),
      ),
    );

    const imageByRestroCode = new Map<string, string>();

    if (restroCodes.length > 0) {
      const { data: restros, error: restroError } = await serviceClient
        .from("RestroMaster")
        .select("RestroCode,RestroDisplayPhoto,DisplayImage,Image")
        .in("RestroCode", restroCodes);

      if (restroError) {
        console.error("PROFILE RESTRO IMAGE FETCH ERROR:", restroError);
      }

      for (const restro of ((restros || []) as RestroRow[])) {
        const code = String(restro.RestroCode ?? "");
        const image =
          restro.RestroDisplayPhoto || restro.DisplayImage || restro.Image;
        if (code) imageByRestroCode.set(code, normalizeRestroImage(image));
      }
    }

    const orders = rows
      .filter((order) => normalizeMobile(order.CustomerMobile || "") === mobile)
      .map((order) => {
        const restroCode = String(order.RestroCode ?? "");
        const fallbackFile = getRestroFileName(restroCode);

        return {
          orderId: order.OrderId || "",
          restroCode,
          restroName: order.RestroName || "RailEats Restaurant",
          stationCode: order.StationCode || "",
          stationName: order.StationName || "",
          deliveryDate: order.DeliveryDate || "",
          deliveryTime: order.DeliveryTime || "",
          trainNumber: order.TrainNumber || "",
          coach: order.Coach || "",
          seat: order.Seat || "",
          totalAmount: Number(order.TotalAmount || 0),
          paymentMode: order.PaymentMode || "",
          status: order.Status || "booked",
          bookedAt: order.created_at || order.CreatedAt || "",
          imageUrl:
            imageByRestroCode.get(restroCode) ||
            normalizeRestroImage(fallbackFile),
        };
      });

    orders.sort((a, b) => {
      const aDate = new Date(`${a.deliveryDate || ""}T${a.deliveryTime || "00:00:00"}`).getTime();
      const bDate = new Date(`${b.deliveryDate || ""}T${b.deliveryTime || "00:00:00"}`).getTime();
      return (Number.isFinite(bDate) ? bDate : 0) - (Number.isFinite(aDate) ? aDate : 0);
    });

    return NextResponse.json({
      ok: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("PROFILE ORDERS API ERROR:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "server_error",
        orders: [],
      },
      { status: 500 },
    );
  }
}
