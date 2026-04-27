import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,   // ✅ FIX
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { phone } = await req.json();

    if (!phone) {
      return NextResponse.json({ error: "Phone required" }, { status: 400 });
    }

    // 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // save in DB
    const { error } = await supabase.from("otp_codes").insert([
      {
        phone,
        otp,
        created_at: new Date().toISOString(),
      },
    ]);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // ⚠️ TESTING: return OTP in response (later remove)
    return NextResponse.json({ success: true, otp });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
