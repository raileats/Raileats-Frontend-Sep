import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { phone, name, email } = await req.json();

    if (!phone || !name || !email) {
      return NextResponse.json(
        { error: "All fields required" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("users")
      .upsert(
        [{ phone, name, email }],
        { onConflict: "phone" } // 🔥 update if exists
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
