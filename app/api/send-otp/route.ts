import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phone } = body;

    if (!phone) {
      return NextResponse.json({ success: false, error: "No phone" });
    }

    // 🔥 random OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    console.log("OTP:", otp);

    const { error } = await supabase.from("otp_codes").insert([
      {
        phone,
        otp,
      },
    ]);

    if (error) {
      console.log("DB ERROR:", error);
      return NextResponse.json({ success: false });
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.log("SERVER ERROR:", err);
    return NextResponse.json({ success: false });
  }
}
