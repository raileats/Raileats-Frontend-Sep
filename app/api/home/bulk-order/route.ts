import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function cleanText(value: unknown, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = cleanText(body?.name, 120);
    const mobile = String(body?.mobile ?? "").replace(/\D/g, "").slice(-10);
    const trainNumber = cleanText(body?.trainNumber, 80);
    const message = cleanText(body?.message, 1000);

    if (!name) {
      return NextResponse.json(
        { ok: false, message: "Name is required." },
        { status: 400 }
      );
    }

    if (!/^[6-9][0-9]{9}$/.test(mobile)) {
      return NextResponse.json(
        { ok: false, message: "A valid 10-digit mobile number is required." },
        { status: 400 }
      );
    }

    const { error } = await serviceClient.from("BulkOrderRequests").insert({
      Name: name,
      Mobile: mobile,
      TrainNumber: trainNumber || null,
      Message: message || null,
      Status: "New",
      Source: "Customer Website",
      CreatedAt: new Date().toISOString(),
    });

    if (error) {
      console.error("BULK ORDER INSERT ERROR =>", error);

      return NextResponse.json(
        { ok: false, message: "Unable to save the bulk order request." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("BULK ORDER REQUEST ERROR =>", error);

    return NextResponse.json(
      { ok: false, message: "Invalid bulk order request." },
      { status: 400 }
    );
  }
}
