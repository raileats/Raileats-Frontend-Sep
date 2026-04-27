import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("BODY:", body);

    const { phone } = body;

    if (!phone) {
      return NextResponse.json({ success: false, error: "No phone" });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    console.log("OTP:", otp);

    const { data, error } = await supabase
      .from("otp_codes")
      .insert([{ phone, otp }]);

    if (error) {
      console.log("SUPABASE ERROR:", error);
      return NextResponse.json({
        success: false,
        error: error.message,
      });
    }

    console.log("INSERT SUCCESS:", data);

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.log("SERVER ERROR:", err);
    return NextResponse.json({
      success: false,
      error: err.message,
    });
  }
}
