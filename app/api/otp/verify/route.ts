import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const { phone, otp } = await req.json();

    if (!phone || !otp) {
      return NextResponse.json({ success: false });
    }

    // 🔥 latest OTP match
    const { data, error } = await supabase
      .from("otp_codes")
      .select("*")
      .eq("phone", phone)
      .eq("otp", otp)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      console.log("VERIFY ERROR:", error);
      return NextResponse.json({ success: false });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ success: false });
    }

    console.log("✅ OTP VERIFIED:", phone);

    return NextResponse.json({ success: true });

  } catch (err) {
    console.log("VERIFY CATCH ERROR:", err);
    return NextResponse.json({ success: false });
  }
}
