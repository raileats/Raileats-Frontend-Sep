import { NextResponse } from "next/server";
import { serviceClient } from "../../lib/supabaseServer";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const search = (url.searchParams.get("search") || "").trim();

  if (!search) {
    return NextResponse.json([]);
  }

  const supa = serviceClient;

  // 🔥 ONLY trainName pe ilike (text field)
  const { data, error } = await supa
    .from("TrainRoute")
    .select("trainNumber, trainName")
    .ilike("trainName", `%${search}%`)
    .limit(50);

  if (error) {
    console.error(error);
    return NextResponse.json([]);
  }

  // 🔥 NUMBER filter manually (IMPORTANT)
  const filtered = (data || []).filter((t: any) =>
    String(t.trainNumber).includes(search)
  );

  // 🔥 REMOVE DUPLICATES
  const seen = new Set();
  const result = [];

  for (const row of filtered) {
    const key = `${row.trainNumber}-${row.trainName}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push({
        train_no: row.trainNumber,
        train_name: row.trainName,
      });
    }
  }

  return NextResponse.json(result);
}
