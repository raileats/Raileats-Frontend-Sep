export async function POST() {
  // TODO: integrate real SMS gateway
  return Response.json({ success: true, hint: "Use 111111 in dev" });
}
