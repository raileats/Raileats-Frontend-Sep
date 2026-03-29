import { NextResponse } from "next/server";
import { serviceClient } from "../../lib/supabaseServer";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const search = (url.searchParams.get("search") || "").trim();

  if (!search) {
    return NextResponse.json([]);
  }

  const supa = serviceClient;

  const { data, error } = await supa
    .from("TrainRoute")
    .select("trainNumber, trainName")
    .or(`trainNumber.ilike.%${search}%,trainName.ilike.%${search}%`)
    .limit(10);

  if (error) {
    console.error(error);
    return NextResponse.json([]);
  }

  // remove duplicates
  const seen = new Set();
  const result = [];

  for (const row of data || []) {
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
