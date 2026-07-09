export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabaseServer";

function normalizeMobile(value: unknown) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length > 10 && digits.startsWith("91")) return digits.slice(-10);
  return digits.slice(-10);
}

function mobileCandidates(mobile: string) {
  const clean = normalizeMobile(mobile);
  const values = [clean, `91${clean}`, `+91${clean}`].filter(Boolean);
  return values.filter((value, index) => values.indexOf(value) === index);
}

function isActiveAgent(value: unknown) {
  const text = String(value || "").trim().toLowerCase();
  return text === "active" || text === "1" || text === "true" || text === "yes";
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const mobile = normalizeMobile(url.searchParams.get("mobile"));

    if (!mobile) {
      return NextResponse.json(
        { ok: false, active: false, error: "mobile_required" },
        { status: 400 }
      );
    }

    const { data, error } = await serviceClient
      .from("customers")
      .select("customer_id,mobile,name,email,user_type_agent")
      .in("mobile", mobileCandidates(mobile))
      .limit(1);

    if (error) {
      console.error("AGENT STATUS FETCH ERROR:", error);
      return NextResponse.json(
        { ok: false, active: false, error: "db_fetch_failed" },
        { status: 500 }
      );
    }

    const customer = Array.isArray(data) && data.length > 0 ? data[0] : null;

    return NextResponse.json({
      ok: true,
      active: isActiveAgent(customer?.user_type_agent),
      customerId: customer?.customer_id || null,
      mobile: normalizeMobile(customer?.mobile || mobile),
      name: customer?.name || "",
      email: customer?.email || "",
      userTypeAgent: customer?.user_type_agent || "Inactive",
    });
  } catch (error) {
    console.error("AGENT STATUS API ERROR:", error);
    return NextResponse.json(
      { ok: false, active: false, error: "server_error" },
      { status: 500 }
    );
  }
}
