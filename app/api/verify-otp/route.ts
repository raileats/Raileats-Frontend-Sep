import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const { phone, otp } = await req.json();

  const { data } = await supabase
    .from("otp_codes")
    .select("*")
    .eq("phone", phone)
    .eq("otp", otp)
    .eq("used", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!data) {
    return Response.json({ success: false });
  }

  await supabase
    .from("otp_codes")
    .update({ used: true })
    .eq("id", data.id);

  return Response.json({ success: true });
}
