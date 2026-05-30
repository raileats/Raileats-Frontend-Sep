import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase env variables");
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

export async function POST(req: Request) {
  try {
    const { phone, otp } = await req.json();

    const { data, error } = await supabase
      .from("otp_codes")
      .select("*")
      .eq("phone", phone)
      .eq("otp", otp)
      .eq("used", false)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
    }

    const otpRow = data[0];

    const created = new Date(otpRow.created_at).getTime();
    const now = Date.now();

    if (now - created > 5 * 60 * 1000) {
      return NextResponse.json({ error: "OTP expired" }, { status: 400 });
    }

    await supabase.from("otp_codes").update({ used: true }).eq("id", otpRow.id);

    const maskedOtp = "XXX" + otpRow.otp.toString().slice(-3);

    return NextResponse.json({
      success: true,
      maskedOtp,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
