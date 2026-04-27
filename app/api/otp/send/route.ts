import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const phone = body.phone;

    if (!phone) {
      return NextResponse.json({ success: false, error: "No phone" });
    }

    // 🔥 random OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 🔥 insert in DB
    const { error } = await supabase.from("otp_codes").insert([
      {
        phone,
        otp,
        created_at: new Date().toISOString(),
      },
    ]);

    if (error) {
      console.log("DB ERROR:", error);
      return NextResponse.json({ success: false });
    }

    console.log("OTP:", otp); // debug

    return NextResponse.json({ success: true });

  } catch (err) {
    console.log("SERVER ERROR:", err);
    return NextResponse.json({ success: false });
  }
}
