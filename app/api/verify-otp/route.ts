import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const { phone, otp } = await req.json();

    const { data } = await supabase
      .from("otp_codes")
      .select("*")
      .eq("phone", phone)
      .eq("otp", otp)
      .order("created_at", { ascending: false })
      .limit(1);

    if (!data || data.length === 0) {
      return NextResponse.json({ success: false });
    }

    return NextResponse.json({ success: true });

  } catch (e) {
    console.log(e);
    return NextResponse.json({ success: false });
  }
}
