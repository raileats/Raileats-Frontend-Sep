import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const { phone } = await req.json();

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  await supabase.from("otp_codes").insert({
    phone,
    otp,
  });

  console.log("🔥 OTP:", otp);

  return Response.json({ success: true });
}
