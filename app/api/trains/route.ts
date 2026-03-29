import { NextResponse } from "next/server";
import { serviceClient } from "../../lib/supabaseServer";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const search = (url.searchParams.get("search") || "").trim();

  if (!search) {
    return NextResponse.json([]);
  }

  const supa = serviceClient;

  // Search both trainName and trainNumber using OR
  const { data, error } = await supa
    .from("TrainRoute")
    .select("trainNumber, trainName")
    .or(`trainName.ilike.%${search}%,trainNumber.eq.${isNaN(Number(search)) ? -1 : Number(search)}`)
    .limit(50);

  if (error) {
    console.error(error);
    return NextResponse.json([]);
  }

  // Remove duplicates
  const seen = new Set();
  const result = [];

  for (const row of (data || [])) {
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