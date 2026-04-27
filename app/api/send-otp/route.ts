import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const { phone } = await req.json();

    if (!phone) {
      return NextResponse.json({ success: false });
    }

    // 🔥 generate random OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    // 🔥 save in DB
    await supabase.from("otp_codes").insert({
      phone,
      otp,
    });

    console.log("OTP GENERATED:", phone, otp);

    return NextResponse.json({ success: true });

  } catch (e) {
    console.log(e);
    return NextResponse.json({ success: false });
  }
}
