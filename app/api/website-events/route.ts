export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
    },
  }
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const eventName = String(body?.event_name || "").trim();

    if (!eventName) {
      return NextResponse.json(
        {
          ok: false,
          error: "event_name is required",
        },
        { status: 400 }
      );
    }

    const forwardedFor = req.headers.get("x-forwarded-for");
    const ipAddress =
      forwardedFor?.split(",")?.[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      null;

    const userAgent = req.headers.get("user-agent") || "";

    const payload = {
      event_name: eventName,
      section: body?.section || null,
      page_url: body?.page_url || null,
      page_path: body?.page_path || null,
      user_name: body?.user_name || null,
      user_email: body?.user_email || null,
      user_mobile: body?.user_mobile || null,
      session_id: body?.session_id || null,
      device: body?.device || null,
      browser: body?.browser || null,
      ip_address: ipAddress,
      metadata: {
        ...(body?.metadata || {}),
        user_agent: userAgent,
      },
    };

    const { error } = await supabase
      .from("WebsiteEvents")
      .insert(payload);

    if (error) {
      console.error("Website event insert error:", error);

      return NextResponse.json(
        {
          ok: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
    });
  } catch (err: any) {
    console.error("Website event API failed:", err);

    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Server error",
      },
      { status: 500 }
    );
  }
}
