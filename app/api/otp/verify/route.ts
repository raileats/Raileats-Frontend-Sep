import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phone, otp } = body;

    if (!phone || !otp) {
      return NextResponse.json({ success: false });
    }

    const { data, error } = await supabase
      .from("otp_codes")
      .select("*")
      .eq("phone", phone)
      .eq("otp", otp)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return NextResponse.json({ success: false });
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.log(err);
    return NextResponse.json({ success: false });
  }
}
