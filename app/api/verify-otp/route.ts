import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { phone, otp } = await req.json();

    const { data, error } = await supabase
      .from("otp_codes")
      .select("*")
      .eq("phone", phone)
      .eq("otp", otp)
      .eq("used", false) // 🔥 only unused OTP
      .order("created_at", { ascending: false }) // 🔥 latest first
      .limit(1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
    }

    const otpRow = data[0];

    // 🔥 EXPIRY CHECK (5 min)
    const created = new Date(otpRow.created_at).getTime();
    const now = Date.now();

    if (now - created > 5 * 60 * 1000) {
      return NextResponse.json({ error: "OTP expired" }, { status: 400 });
    }

    // 🔥 MARK OTP AS USED
    await supabase
      .from("otp_codes")
      .update({ used: true })
      .eq("id", otpRow.id);

    // 🔥 MASK OTP (only last 3 digits visible)
    const maskedOtp =
      "XXX" + otpRow.otp.toString().slice(-3);

    return NextResponse.json({
      success: true,
      maskedOtp, // 🔥 optional for debug/UI
    });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
