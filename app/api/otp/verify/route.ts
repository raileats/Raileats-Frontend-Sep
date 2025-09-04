export async function POST(request: Request) {
  const { otp } = await request.json().catch(() => ({ otp: "" }));
  const ok = otp === "111111"; // demo only
  return Response.json({ success: ok });
}
