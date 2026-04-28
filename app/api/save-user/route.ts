import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const phone = body.phone || body.mobile || "";
    const name = body.name || "";
    const email = body.email || null; // ✅ optional

    // 🔥 ONLY REQUIRED FIELDS
    if (!phone || !name) {
      return NextResponse.json(
        { error: "Name & Mobile required" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("users")
      .upsert(
        [
          {
            mobile: phone,   // ✅ match DB column
            name: name,
            email: email,    // optional
          },
        ],
        { onConflict: "mobile" } // ✅ correct
      );

    if (error) {
      console.error("SAVE USER ERROR:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (e: any) {
    console.error("SAVE USER CATCH:", e);
    return NextResponse.json(
      { error: e.message },
      { status: 500 }
    );
  }
}
